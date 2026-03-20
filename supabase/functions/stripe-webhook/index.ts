// stripe-webhook: Unified handler for all Stripe webhook events.
// Handles: checkout.session.completed (farm provisioning from landing),
// subscription.updated, subscription.deleted, invoice.payment_failed,
// invoice.paid (lifecycle management from main app).
//
// Deploy: npx supabase functions deploy stripe-webhook --no-verify-jwt

import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Service role client — no user JWT, admin access to update any farm
const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Find a farm ID by its Stripe customer ID.
 */
async function findFarmByCustomer(
  customerId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("farms")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  if (error || !data) return null;
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Handler: checkout.session.completed
// Provisions farm + invite + subscription + stripe_customers row
// (Merged from landing project's webhook handler)
// ---------------------------------------------------------------------------
async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const meta = session.metadata!;

  // Look up tier from stripe_prices (informational / future use)
  const { data: priceRow, error: priceErr } = await supabaseAdmin
    .from("stripe_prices")
    .select("subscription_tier_slug")
    .eq("stripe_price_id", meta.price_id)
    .single();

  if (priceErr) {
    console.error("Failed to look up price tier:", priceErr);
  }

  const tier = priceRow?.subscription_tier_slug ?? "unknown";

  // Step 1: Create farm row
  let farmId: string | null = null;

  const { data: newFarm, error: farmError } = await supabaseAdmin
    .from("farms")
    .insert({
      name: meta.farm_name,
      street_address: meta.street_address || null,
      city: meta.city || null,
      state: meta.state || null,
      zip_code: meta.zip_code || null,
      stripe_customer_id: session.customer as string,
      subscription_status: "active",
      subscription_tier: meta.tier_slug || tier,
    })
    .select("id")
    .single();

  if (farmError) {
    console.error("Failed to create farm:", farmError);

    // On webhook redelivery: skip-existing, create-missing
    const { data: existingFarm } = await supabaseAdmin
      .from("farms")
      .select("id")
      .eq("stripe_customer_id", session.customer as string)
      .single();

    if (existingFarm) {
      farmId = existingFarm.id;
      console.log("Using existing farm:", farmId);
    } else {
      console.error(
        "Cannot find or create farm -- skipping remaining provisioning"
      );
      return;
    }
  } else {
    farmId = newFarm.id;
  }

  console.log(
    `Provisioning farm ${farmId} (tier: ${tier}) for customer ${session.customer}`
  );

  // Step 2: Create farm_invite row (auto-matched by get_onboarding_status_impl on first PWA login)
  const { error: inviteError } = await supabaseAdmin
    .from("farm_invites")
    .insert({
      code: crypto.randomUUID(),
      farm_id: farmId,
      invited_phone: meta.phone,
      invited_first_name: meta.first_name,
      invited_last_name: meta.last_name,
      invited_email: meta.email,
      role: "owner",
      expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      max_uses: 1,
    });

  if (inviteError) {
    console.error("Failed to create farm invite:", inviteError);
    // log-and-continue per user decision
  }

  // Step 3: Create stripe_subscriptions row
  const { error: subError } = await supabaseAdmin
    .from("stripe_subscriptions")
    .insert({
      farm_id: farmId,
      stripe_subscription_id: session.subscription as string,
      stripe_price_id: meta.price_id,
      status: "active",
    });

  if (subError) {
    console.error("Failed to create stripe subscription:", subError);
    // log-and-continue
  }

  // Step 3a: Fetch full subscription object for billing period dates
  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const periodStart = new Date(
      stripeSubscription.current_period_start * 1000
    ).toISOString();
    const periodEnd = new Date(
      stripeSubscription.current_period_end * 1000
    ).toISOString();

    // Update stripe_subscriptions with period dates
    const { error: periodError } = await supabaseAdmin
      .from("stripe_subscriptions")
      .update({
        current_period_start: periodStart,
        current_period_end: periodEnd,
      })
      .eq("stripe_subscription_id", session.subscription as string);

    if (periodError) {
      console.error(
        "Failed to update subscription period dates:",
        periodError
      );
    }

    // Update farms with period end + subscription ID
    const { error: farmPeriodError } = await supabaseAdmin
      .from("farms")
      .update({
        current_period_end: periodEnd,
        stripe_subscription_id: session.subscription as string,
      })
      .eq("id", farmId);

    if (farmPeriodError) {
      console.error("Failed to update farm period end:", farmPeriodError);
    }
  } catch (err) {
    console.error(
      "Failed to retrieve subscription for period dates:",
      err instanceof Error ? err.message : "Unknown error"
    );
  }

  // Step 4: Create stripe_customers row (user_id=null, linked at first login)
  const { error: custError } = await supabaseAdmin
    .from("stripe_customers")
    .insert({
      user_id: null,
      stripe_customer_id: session.customer as string,
      email: meta.email,
      phone: meta.phone,
    });

  if (custError) {
    // May fail on redelivery due to UNIQUE constraint on stripe_customer_id -- that's fine
    console.error("Failed to create stripe customer:", custError);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    if (
      !STRIPE_SECRET_KEY ||
      !STRIPE_WEBHOOK_SECRET ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing required configuration");
      return jsonResponse({ error: "Server not configured" }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // Read raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return jsonResponse({ error: "Missing stripe-signature header" }, 400);
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return jsonResponse({ error: "Invalid signature" }, 400);
    }

    // Idempotency check via stripe_webhook_events table
    const { error: idempotencyError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
      });

    if (idempotencyError) {
      console.log(`Duplicate event, skipping: ${event.id}`);
      return jsonResponse({ received: true }, 200);
    }

    // Process event — if handler throws, remove idempotency row so Stripe can retry
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutCompleted(
            stripe,
            event.data.object as Stripe.Checkout.Session
          );
          break;
        }

        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const farmId = await findFarmByCustomer(sub.customer as string);
          if (!farmId) {
            console.error("No farm for customer", sub.customer);
            break;
          }

          const { error } = await supabaseAdmin
            .from("farms")
            .update({
              subscription_status: sub.status,
              current_period_end: new Date(
                sub.current_period_end * 1000
              ).toISOString(),
            })
            .eq("id", farmId);

          if (error) {
            console.error(
              "Failed to update farm on subscription.updated:",
              error
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const farmId = await findFarmByCustomer(sub.customer as string);
          if (!farmId) {
            console.error("No farm for customer", sub.customer);
            break;
          }

          const periodEnd = new Date(sub.current_period_end * 1000);
          const deleteAt = new Date(periodEnd);
          deleteAt.setFullYear(deleteAt.getFullYear() + 1);

          const { error } = await supabaseAdmin
            .from("farms")
            .update({
              subscription_status: "canceled",
              current_period_end: periodEnd.toISOString(),
              canceled_at: new Date().toISOString(),
              scheduled_delete_at: deleteAt.toISOString(),
            })
            .eq("id", farmId);

          if (error) {
            console.error(
              "Failed to update farm on subscription.deleted:",
              error
            );
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId =
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id;
          if (!customerId) break;

          const farmId = await findFarmByCustomer(customerId);
          if (!farmId) break;

          const { error } = await supabaseAdmin
            .from("farms")
            .update({
              subscription_status: "past_due",
            })
            .eq("id", farmId);

          if (error) {
            console.error(
              "Failed to update farm on invoice.payment_failed:",
              error
            );
          }
          break;
        }

        case "invoice.paid": {
          // Handles reactivation — if farm was canceled and owner renews,
          // clear the cancellation fields
          const invoice = event.data.object as Stripe.Invoice;
          const customerId =
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id;
          if (!customerId) break;

          const farmId = await findFarmByCustomer(customerId);
          if (!farmId) break;

          const { error } = await supabaseAdmin
            .from("farms")
            .update({
              subscription_status: "active",
              canceled_at: null,
              scheduled_delete_at: null,
            })
            .eq("id", farmId);

          if (error) {
            console.error("Failed to update farm on invoice.paid:", error);
          }
          break;
        }

        default:
          console.log("Unhandled event type:", event.type);
      }
    } catch (handlerError) {
      // Remove idempotency row so Stripe can retry this event
      await supabaseAdmin
        .from("stripe_webhook_events")
        .delete()
        .eq("stripe_event_id", event.id);
      throw handlerError;
    }

    // Always return 200 to acknowledge receipt (Stripe retries on non-2xx)
    return jsonResponse({ received: true }, 200);
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
