// create-portal-session: Creates a Stripe Billing Portal session for the
// authenticated user's farm. Supports optional deep-link flow types.

import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.agwatertracker.com";

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

    // Parse optional flow_type from body
    let flowType: string | undefined;
    try {
      const body = await req.json();
      flowType = body.flow_type;
    } catch {
      // No body or invalid JSON is fine — flow_type is optional
    }

    // Look up farm via farm_members
    const { data: memberRow, error: memberError } = await supabase
      .from("farm_members")
      .select("farm_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberRow?.farm_id) {
      return jsonResponse({ error: "User has no farm" }, 404);
    }

    // Get farm's Stripe customer ID and subscription ID (both needed)
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", memberRow.farm_id)
      .single();

    if (farmError || !farm) {
      return jsonResponse({ error: "Farm not found" }, 404);
    }

    if (!farm.stripe_customer_id) {
      return jsonResponse(
        { error: "No Stripe customer linked to this farm" },
        404
      );
    }

    if (!STRIPE_SECRET_KEY) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // Build portal session params
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: farm.stripe_customer_id,
      return_url: `${APP_URL}/subscription`,
    };

    // Deep-link to specific portal flow if requested
    if (flowType === "payment_method_update") {
      sessionParams.flow_data = {
        type: "payment_method_update",
      };
    } else if (flowType === "subscription_cancel") {
      if (!farm.stripe_subscription_id) {
        return jsonResponse(
          { error: "No active subscription to cancel" },
          400
        );
      }
      sessionParams.flow_data = {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: farm.stripe_subscription_id,
        },
      };
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    return jsonResponse({ url: session.url }, 200);
  } catch (error) {
    console.error("create-portal-session error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
