// get-subscription-details: Fetches subscription data, payment method, and
// recent invoices from Stripe for the authenticated user's farm.
// Deployed under the cancel-subscription directory (repurposed).

import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
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

    // Look up farm via user's farm_id
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("farm_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRow?.farm_id) {
      return jsonResponse({ error: "User has no farm" }, 404);
    }

    // Get farm's Stripe IDs
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select(
        "stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, subscription_tier"
      )
      .eq("id", userRow.farm_id)
      .single();

    if (farmError || !farm) {
      return jsonResponse({ error: "Farm not found" }, 404);
    }

    if (!farm.stripe_customer_id) {
      return jsonResponse({ error: "No Stripe customer linked to this farm" }, 404);
    }

    if (!STRIPE_SECRET_KEY) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // Fetch subscription details (with latest invoice expanded)
    let subscription: Stripe.Subscription | null = null;
    if (farm.stripe_subscription_id) {
      subscription = await stripe.subscriptions.retrieve(
        farm.stripe_subscription_id,
        { expand: ["latest_invoice"] }
      );
    }

    // Fetch recent invoices
    const invoices = await stripe.invoices.list({
      customer: farm.stripe_customer_id,
      limit: 5,
    });

    // Fetch customer to get default payment method
    const customer = await stripe.customers.retrieve(
      farm.stripe_customer_id,
      { expand: ["default_source"] }
    );

    // Extract payment method info
    let paymentMethod: { brand: string; last4: string } | null = null;
    if (!customer.deleted) {
      const pmId =
        typeof customer.invoice_settings?.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings?.default_payment_method?.id;

      if (pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        if (pm.card) {
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
          };
        }
      }
    }

    // Extract subscription plan details
    let planName: string | null = null;
    let unitAmount: number | null = null;
    let currency: string | null = null;

    if (subscription) {
      const item = subscription.items.data[0];
      if (item?.price) {
        planName = item.price.nickname || farm.subscription_tier || null;
        unitAmount = item.price.unit_amount;
        currency = item.price.currency;
      }
    }

    // Format invoices for response
    const recentInvoices = invoices.data.map((inv) => ({
      date: inv.created,
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      invoice_pdf: inv.invoice_pdf,
    }));

    return jsonResponse(
      {
        subscription_status: subscription?.status ?? farm.subscription_status,
        current_period_end: subscription?.current_period_end ?? null,
        plan_name: planName,
        unit_amount: unitAmount,
        currency: currency,
        payment_method: paymentMethod,
        recent_invoices: recentInvoices,
      },
      200
    );
  } catch (error) {
    console.error("get-subscription-details error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
