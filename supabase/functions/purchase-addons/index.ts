// purchase-addons: Purchases additional wells and/or seats by updating the
// farm's Stripe subscription with prorated billing.

import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Add-on price IDs configured in Stripe
const STRIPE_ADDON_WELL_PRICE_ID = Deno.env.get("STRIPE_ADDON_WELL_PRICE_ID");
const STRIPE_ADDON_ADMIN_PRICE_ID = Deno.env.get(
  "STRIPE_ADDON_ADMIN_PRICE_ID"
);
const STRIPE_ADDON_METER_CHECKER_PRICE_ID = Deno.env.get(
  "STRIPE_ADDON_METER_CHECKER_PRICE_ID"
);

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

interface AddonRequest {
  wells: number;
  admin_seats: number;
  meter_checker_seats: number;
}

/** Maps add-on type to its Stripe price ID. */
function getAddonPriceId(
  type: "wells" | "admin_seats" | "meter_checker_seats"
): string | undefined {
  switch (type) {
    case "wells":
      return STRIPE_ADDON_WELL_PRICE_ID;
    case "admin_seats":
      return STRIPE_ADDON_ADMIN_PRICE_ID;
    case "meter_checker_seats":
      return STRIPE_ADDON_METER_CHECKER_PRICE_ID;
  }
}

/** Maps add-on type to the farms table column name. */
function getExtraColumn(
  type: "wells" | "admin_seats" | "meter_checker_seats"
): string {
  switch (type) {
    case "wells":
      return "extra_wells";
    case "admin_seats":
      return "extra_admin_seats";
    case "meter_checker_seats":
      return "extra_meter_checker_seats";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // -----------------------------------------------------------------------
    // Authenticate via JWT
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Parse & validate request body
    // -----------------------------------------------------------------------
    const body: AddonRequest = await req.json();
    const { wells = 0, admin_seats = 0, meter_checker_seats = 0 } = body;

    // All quantities must be non-negative integers
    if (
      !Number.isInteger(wells) ||
      !Number.isInteger(admin_seats) ||
      !Number.isInteger(meter_checker_seats) ||
      wells < 0 ||
      admin_seats < 0 ||
      meter_checker_seats < 0
    ) {
      return jsonResponse(
        { error: "Quantities must be non-negative integers" },
        400
      );
    }

    // At least one quantity must be > 0
    if (wells === 0 && admin_seats === 0 && meter_checker_seats === 0) {
      return jsonResponse(
        { error: "At least one add-on quantity must be greater than zero" },
        400
      );
    }

    // -----------------------------------------------------------------------
    // Validate user role (owner or grower)
    // -----------------------------------------------------------------------
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("farm_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userRow?.farm_id) {
      return jsonResponse({ error: "User has no farm" }, 404);
    }

    if (userRow.role !== "grower" && userRow.role !== "owner") {
      return jsonResponse(
        { error: "Only farm owners can purchase add-ons" },
        403
      );
    }

    // -----------------------------------------------------------------------
    // Fetch farm data
    // -----------------------------------------------------------------------
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select(
        "stripe_subscription_id, extra_wells, extra_admin_seats, extra_meter_checker_seats"
      )
      .eq("id", userRow.farm_id)
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

    if (!STRIPE_SECRET_KEY) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    // -----------------------------------------------------------------------
    // Retrieve current Stripe subscription
    // -----------------------------------------------------------------------
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    const subscription = await stripe.subscriptions.retrieve(
      farm.stripe_subscription_id
    );

    // Build a lookup of existing subscription items by price ID
    const existingItemsByPrice = new Map<
      string,
      { id: string; quantity: number }
    >();
    for (const item of subscription.items.data) {
      existingItemsByPrice.set(item.price.id, {
        id: item.id,
        quantity: item.quantity ?? 0,
      });
    }

    // -----------------------------------------------------------------------
    // Build subscription update items
    // -----------------------------------------------------------------------
    const addonTypes = ["wells", "admin_seats", "meter_checker_seats"] as const;
    const quantities: Record<string, number> = {
      wells,
      admin_seats,
      meter_checker_seats,
    };

    const items: Stripe.SubscriptionUpdateParams.Item[] = [];

    for (const addonType of addonTypes) {
      const qty = quantities[addonType];
      if (qty <= 0) continue;

      const priceId = getAddonPriceId(addonType);
      if (!priceId) {
        return jsonResponse(
          {
            error: `Stripe price not configured for ${addonType.replace(/_/g, " ")}`,
          },
          500
        );
      }

      const existing = existingItemsByPrice.get(priceId);
      if (existing) {
        // Increment existing item quantity
        items.push({
          id: existing.id,
          quantity: existing.quantity + qty,
        });
      } else {
        // Create new subscription item
        items.push({
          price: priceId,
          quantity: qty,
        });
      }
    }

    // -----------------------------------------------------------------------
    // Update the Stripe subscription (prorated, immediate charge)
    // -----------------------------------------------------------------------
    const updated = await stripe.subscriptions.update(
      farm.stripe_subscription_id,
      {
        items,
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
      }
    );

    // -----------------------------------------------------------------------
    // Update farms table with incremented extra counts
    // -----------------------------------------------------------------------
    const newExtraWells = (farm.extra_wells ?? 0) + wells;
    const newExtraAdminSeats = (farm.extra_admin_seats ?? 0) + admin_seats;
    const newExtraMeterCheckerSeats =
      (farm.extra_meter_checker_seats ?? 0) + meter_checker_seats;

    const updatePayload: Record<string, number> = {};
    if (wells > 0) updatePayload.extra_wells = newExtraWells;
    if (admin_seats > 0) updatePayload.extra_admin_seats = newExtraAdminSeats;
    if (meter_checker_seats > 0)
      updatePayload.extra_meter_checker_seats = newExtraMeterCheckerSeats;

    const { error: updateError } = await supabase
      .from("farms")
      .update(updatePayload)
      .eq("id", userRow.farm_id);

    if (updateError) {
      console.error("Failed to update farm extra counts:", updateError);
      // Stripe update succeeded but DB update failed -- log but don't fail
    }

    // Determine charged amount from the latest invoice if available
    let chargedAmount: number | null = null;
    if (updated.latest_invoice) {
      const invoiceId =
        typeof updated.latest_invoice === "string"
          ? updated.latest_invoice
          : updated.latest_invoice.id;
      const invoice = await stripe.invoices.retrieve(invoiceId);
      chargedAmount = invoice.total;
    }

    return jsonResponse(
      {
        success: true,
        charged_amount: chargedAmount,
        new_extra_wells: newExtraWells,
        new_extra_admin_seats: newExtraAdminSeats,
        new_extra_meter_checker_seats: newExtraMeterCheckerSeats,
      },
      200
    );
  } catch (error) {
    console.error("purchase-addons error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
