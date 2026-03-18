// stripe-webhook: Handles Stripe webhook events for subscription lifecycle
// management. Processes subscription.updated, subscription.deleted,
// invoice.payment_failed, and invoice.paid events.
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
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error("Missing Stripe configuration");
      return jsonResponse({ error: "Stripe not configured" }, 500);
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

    // Process event
    switch (event.type) {
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
          console.error("Failed to update farm on subscription.updated:", error);
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

    // Always return 200 to acknowledge receipt (Stripe retries on non-2xx)
    return jsonResponse({ received: true }, 200);
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
