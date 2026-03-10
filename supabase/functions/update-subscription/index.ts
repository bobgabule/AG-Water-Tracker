// update-subscription: Handles plan upgrades/downgrades between Starter and Pro
// tiers via Stripe API. Supports proration preview mode.

import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const STRIPE_STARTER_PRICE_ID = Deno.env.get("STRIPE_STARTER_PRICE_ID");
const STRIPE_PRO_PRICE_ID = Deno.env.get("STRIPE_PRO_PRICE_ID");

const VALID_TIERS = ["starter", "pro"] as const;
type Tier = (typeof VALID_TIERS)[number];

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

function isTier(value: unknown): value is Tier {
  return typeof value === "string" && VALID_TIERS.includes(value as Tier);
}

function getPriceId(tier: Tier): string | undefined {
  return tier === "pro" ? STRIPE_PRO_PRICE_ID : STRIPE_STARTER_PRICE_ID;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Authenticate via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    // Parse request body
    const body = await req.json();
    const { target_tier, preview } = body;

    if (!isTier(target_tier)) {
      return jsonResponse(
        { error: "Invalid tier. Must be 'starter' or 'pro'" },
        400
      );
    }

    // Validate user role
    const { data: memberRow, error: memberError } = await supabase
      .from("farm_members")
      .select("farm_id, role")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberRow?.farm_id) {
      return jsonResponse({ error: "User has no farm" }, 404);
    }

    if (memberRow.role !== "super_admin" && memberRow.role !== "owner") {
      return jsonResponse(
        { error: "Only farm owners can change the subscription plan" },
        403
      );
    }

    // Get farm's Stripe and subscription details
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select(
        "stripe_customer_id, stripe_subscription_id, subscription_tier"
      )
      .eq("id", memberRow.farm_id)
      .single();

    if (farmError || !farm) {
      return jsonResponse({ error: "Farm not found" }, 404);
    }

    if (!farm.stripe_subscription_id) {
      return jsonResponse(
        { error: "No active subscription found for this farm" },
        404
      );
    }

    if (!farm.stripe_customer_id) {
      return jsonResponse(
        { error: "No Stripe customer linked to this farm" },
        404
      );
    }

    // Prevent no-op
    if (target_tier === farm.subscription_tier) {
      return jsonResponse({ error: "Already on this plan" }, 400);
    }

    const priceId = getPriceId(target_tier);
    if (!priceId) {
      return jsonResponse(
        { error: "Stripe price not configured for target tier" },
        500
      );
    }

    if (!STRIPE_SECRET_KEY) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // Retrieve current subscription to get the item ID
    const sub = await stripe.subscriptions.retrieve(
      farm.stripe_subscription_id
    );
    const currentItem = sub.items.data[0];

    if (!currentItem) {
      return jsonResponse(
        { error: "Subscription has no items" },
        500
      );
    }

    // Determine direction: starter -> pro = upgrade, pro -> starter = downgrade
    const isUpgrade = target_tier === "pro";
    const prorationBehavior: Stripe.SubscriptionUpdateParams.ProrationBehavior =
      isUpgrade ? "always_invoice" : "none";

    // Preview mode: return proration estimate without executing
    if (preview) {
      const invoicePreview = await stripe.invoices.createPreview({
        customer: farm.stripe_customer_id,
        subscription: farm.stripe_subscription_id,
        subscription_items: [{ id: currentItem.id, price: priceId }],
        subscription_proration_behavior: isUpgrade
          ? "always_invoice"
          : "none",
      });

      return jsonResponse(
        {
          preview: true,
          proration_amount: invoicePreview.total,
          currency: invoicePreview.currency,
          lines: invoicePreview.lines.data.map((line) => ({
            description: line.description,
            amount: line.amount,
            period: line.period,
          })),
        },
        200
      );
    }

    // Execute the subscription update
    const updated = await stripe.subscriptions.update(
      farm.stripe_subscription_id,
      {
        items: [{ id: currentItem.id, price: priceId }],
        proration_behavior: prorationBehavior,
        payment_behavior: "pending_if_incomplete",
      }
    );

    // Update farms table with new subscription state
    const { error: updateError } = await supabase
      .from("farms")
      .update({
        subscription_tier: target_tier,
        subscription_status: updated.status,
        current_period_end: new Date(
          updated.current_period_end * 1000
        ).toISOString(),
      })
      .eq("id", memberRow.farm_id);

    if (updateError) {
      console.error("Failed to update farm record:", updateError);
      // Stripe update succeeded but DB update failed -- log but don't fail the response
    }

    // For upgrades, get proration amount from latest invoice
    let prorationAmount: number | null = null;
    if (isUpgrade && updated.latest_invoice) {
      const invoiceId =
        typeof updated.latest_invoice === "string"
          ? updated.latest_invoice
          : updated.latest_invoice.id;
      const invoice = await stripe.invoices.retrieve(invoiceId);
      prorationAmount = invoice.total;
    }

    return jsonResponse(
      {
        success: true,
        subscription_status: updated.status,
        current_period_end: updated.current_period_end,
        proration_amount: prorationAmount,
      },
      200
    );
  } catch (error) {
    console.error("update-subscription error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
