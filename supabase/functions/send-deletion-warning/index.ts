// send-deletion-warning: Handles two actions from pg_cron:
// 1. delete_expired — Delete farms past their scheduled_delete_at, clean up auth accounts
// 2. send_warnings — Send email warnings at 30 and 7 days before scheduled deletion
//
// Deploy: npx supabase functions deploy send-deletion-warning --no-verify-jwt

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.agwatertracker.com";
const FROM_EMAIL =
  Deno.env.get("DELETION_WARNING_FROM_EMAIL") ?? "noreply@agwatertracker.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Delete farms where scheduled_delete_at <= NOW().
 * For each farm:
 *   1. Collect member user_ids from farm_members
 *   2. Delete the farm row (FK CASCADE handles wells, readings, allocations,
 *      farm_members, farm_invites, report_email_recipients)
 *   3. Delete auth accounts for members with no remaining farm memberships
 */
async function deleteExpiredFarms(
  supabaseAdmin: SupabaseClient
): Promise<{ deleted: number; auth_deleted: number }> {
  const { data: expiredFarms, error } = await supabaseAdmin
    .from("farms")
    .select("id, name")
    .not("scheduled_delete_at", "is", null)
    .lte("scheduled_delete_at", new Date().toISOString());

  if (error) {
    console.error("Failed to query expired farms:", error);
    return { deleted: 0, auth_deleted: 0 };
  }

  if (!expiredFarms || expiredFarms.length === 0) {
    console.log("No expired farms to delete");
    return { deleted: 0, auth_deleted: 0 };
  }

  let deletedCount = 0;
  let authDeletedCount = 0;

  for (const farm of expiredFarms) {
    // 1. Get member user_ids before deletion (FK CASCADE will remove farm_members)
    const { data: members } = await supabaseAdmin
      .from("farm_members")
      .select("user_id")
      .eq("farm_id", farm.id);

    const memberUserIds = members?.map((m: { user_id: string }) => m.user_id) ?? [];

    // 2. Delete farm (FK CASCADE handles all related data)
    const { error: deleteError } = await supabaseAdmin
      .from("farms")
      .delete()
      .eq("id", farm.id);

    if (deleteError) {
      console.error(`Failed to delete farm ${farm.id} (${farm.name}):`, deleteError);
      continue;
    }

    console.log(`Deleted farm ${farm.id} (${farm.name})`);

    // 3. Delete auth accounts for members with no remaining farm memberships
    for (const userId of memberUserIds) {
      const { data: otherMemberships } = await supabaseAdmin
        .from("farm_members")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!otherMemberships || otherMemberships.length === 0) {
        // User has no other farm memberships — safe to delete auth account
        const { error: authDeleteError } =
          await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
          console.error(
            `Failed to delete auth user ${userId}:`,
            authDeleteError
          );
        } else {
          console.log(`Deleted auth account for orphaned user ${userId}`);
          authDeletedCount++;
        }
      }
    }

    deletedCount++;
  }

  return { deleted: deletedCount, auth_deleted: authDeletedCount };
}

/**
 * Send deletion warning emails to farm owners at 30 and 7 days before
 * their scheduled_delete_at date.
 */
async function sendDeletionWarnings(
  supabaseAdmin: SupabaseClient
): Promise<{ emails_sent: number; farms_checked: number }> {
  const now = new Date();

  // Calculate date windows: exactly 30 days and 7 days from now (full day window)
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const thirtyDaysStart = new Date(thirtyDaysFromNow);
  thirtyDaysStart.setUTCHours(0, 0, 0, 0);
  const thirtyDaysEnd = new Date(thirtyDaysFromNow);
  thirtyDaysEnd.setUTCHours(23, 59, 59, 999);

  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysStart = new Date(sevenDaysFromNow);
  sevenDaysStart.setUTCHours(0, 0, 0, 0);
  const sevenDaysEnd = new Date(sevenDaysFromNow);
  sevenDaysEnd.setUTCHours(23, 59, 59, 999);

  // Find farms with scheduled_delete_at in the 30-day window
  const { data: farms30, error: err30 } = await supabaseAdmin
    .from("farms")
    .select("id, name, scheduled_delete_at")
    .gte("scheduled_delete_at", thirtyDaysStart.toISOString())
    .lte("scheduled_delete_at", thirtyDaysEnd.toISOString());

  if (err30) {
    console.error("Failed to query 30-day farms:", err30);
  }

  // Find farms with scheduled_delete_at in the 7-day window
  const { data: farms7, error: err7 } = await supabaseAdmin
    .from("farms")
    .select("id, name, scheduled_delete_at")
    .gte("scheduled_delete_at", sevenDaysStart.toISOString())
    .lte("scheduled_delete_at", sevenDaysEnd.toISOString());

  if (err7) {
    console.error("Failed to query 7-day farms:", err7);
  }

  interface FarmWarning {
    id: string;
    name: string;
    scheduled_delete_at: string;
    daysLeft: number;
  }

  const allFarms: FarmWarning[] = [
    ...(farms30 ?? []).map((f) => ({ ...f, daysLeft: 30 })),
    ...(farms7 ?? []).map((f) => ({ ...f, daysLeft: 7 })),
  ];

  let emailsSent = 0;

  for (const farm of allFarms) {
    // Find farm owner
    const { data: ownerMember } = await supabaseAdmin
      .from("farm_members")
      .select("user_id")
      .eq("farm_id", farm.id)
      .eq("role", "owner")
      .single();

    if (!ownerMember) {
      console.warn(`Farm ${farm.id} (${farm.name}) has no owner, skipping warning`);
      continue;
    }

    // Get owner's email from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
      ownerMember.user_id
    );
    const ownerEmail = authUser?.user?.email;

    if (!ownerEmail) {
      console.warn(
        `Farm ${farm.id} (${farm.name}) owner has no email, skipping warning`
      );
      continue;
    }

    const deleteDate = new Date(farm.scheduled_delete_at).toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", year: "numeric" }
    );

    const subject =
      farm.daysLeft === 7
        ? `URGENT: Your farm "${farm.name}" data will be deleted in 7 days`
        : `Your farm "${farm.name}" data will be deleted in 30 days`;

    const urgencyColor = farm.daysLeft === 7 ? "#dc2626" : "#d97706";
    const urgencyLabel = farm.daysLeft === 7 ? "URGENT" : "NOTICE";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgencyColor}; color: white; padding: 12px 24px; border-radius: 8px 8px 0 0;">
          <strong>${urgencyLabel}: Farm Data Deletion Warning</strong>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Your farm <strong>"${farm.name}"</strong> subscription has been canceled.</p>
          <p>All farm data (wells, readings, allocations, and user accounts) will be
          <strong>permanently deleted on ${deleteDate}</strong>.</p>
          <p>To keep your data, renew your subscription before the deletion date:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/subscription"
               style="display: inline-block; padding: 12px 24px; background: #166534; color: white;
                      text-decoration: none; border-radius: 8px; font-weight: bold;">
              Renew Subscription
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            If you have any questions, please contact support.
          </p>
        </div>
      </div>
    `;

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping email delivery");
      continue;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [ownerEmail],
          subject,
          html,
        }),
      });

      if (res.ok) {
        emailsSent++;
        console.log(
          `Sent ${farm.daysLeft}-day warning to ${ownerEmail} for farm ${farm.name}`
        );
      } else {
        const errBody = await res.text();
        console.error(
          `Failed to send email to ${ownerEmail} for farm ${farm.name}:`,
          errBody
        );
      }
    } catch (emailErr) {
      console.error(`Email send error for ${ownerEmail}:`, emailErr);
    }
  }

  return { emails_sent: emailsSent, farms_checked: allFarms.length };
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase configuration");
      return jsonResponse({ error: "Supabase not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    console.log(
      `send-deletion-warning invoked: action=${action}, source=${body?.source}`
    );

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "delete_expired") {
      const result = await deleteExpiredFarms(supabaseAdmin);
      console.log("delete_expired result:", result);
      return jsonResponse({ success: true, ...result }, 200);
    } else if (action === "send_warnings") {
      const result = await sendDeletionWarnings(supabaseAdmin);
      console.log("send_warnings result:", result);
      return jsonResponse({ success: true, ...result }, 200);
    } else {
      return jsonResponse(
        { error: `Unknown action: ${action ?? "none"}` },
        400
      );
    }
  } catch (error) {
    console.error("send-deletion-warning error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
