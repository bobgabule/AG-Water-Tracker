import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

/** Quote a CSV field: wrap in double-quotes, escape inner quotes */
function csvField(val: string | number | null | undefined): string {
  const str = String(val ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

/** Escape HTML special characters to prevent injection in email body */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Encode a string to base64 in chunks (avoids stack overflow for large files) */
function toBase64(content: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

interface FarmResult {
  farmId: string;
  farmName: string;
  success: boolean;
  recipientCount: number;
  error?: string;
}

/** Send a monthly report for a single farm. Returns a result summary. */
async function sendReportForFarm(
  supabase: SupabaseClient,
  farmId: string,
): Promise<FarmResult> {
  // 1. Get recipient emails
  const { data: recipients, error: recipErr } = await supabase
    .from("report_email_recipients")
    .select("email")
    .eq("farm_id", farmId);

  if (recipErr) throw recipErr;
  // 2. Get farm name
  const { data: farm } = await supabase
    .from("farms")
    .select("name")
    .eq("id", farmId)
    .single();

  const farmName = farm?.name ?? "Your Farm";

  if (!recipients || recipients.length === 0) {
    return { farmId, farmName, success: false, recipientCount: 0, error: "No recipients" };
  }

  // 3. Get all wells for this farm
  const { data: wells, error: wellErr } = await supabase
    .from("wells")
    .select("id, name, units, multiplier, wmis_number, meter_serial_number")
    .eq("farm_id", farmId);

  if (wellErr) throw wellErr;

  // 4. Get readings for these wells (current month)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const wellIds = (wells ?? []).map((w) => w.id);

  let readings: Array<{
    well_id: string;
    value: string;
    recorded_at: string;
    gps_latitude: number | null;
    gps_longitude: number | null;
    notes: string | null;
  }> = [];

  if (wellIds.length > 0) {
    const { data: readingData, error: readingErr } = await supabase
      .from("readings")
      .select("well_id, value, recorded_at, gps_latitude, gps_longitude, notes")
      .in("well_id", wellIds)
      .gte("recorded_at", monthStart)
      .lte("recorded_at", monthEnd)
      .order("recorded_at", { ascending: true });

    if (readingErr) throw readingErr;
    readings = readingData ?? [];
  }

  // 5. Generate CSV (RFC 4180 compliant)
  const wellMap = new Map((wells ?? []).map((w) => [w.id, w]));

  const csvRows = [
    "Well Name,WMIS Number,Meter Serial,Units,Multiplier,Reading Value,Recorded At,GPS Latitude,GPS Longitude,Notes",
  ];

  for (const reading of readings) {
    const well = wellMap.get(reading.well_id);
    csvRows.push(
      [
        csvField(well?.name),
        csvField(well?.wmis_number),
        csvField(well?.meter_serial_number),
        csvField(well?.units),
        csvField(well?.multiplier),
        csvField(reading.value),
        csvField(reading.recorded_at),
        csvField(reading.gps_latitude),
        csvField(reading.gps_longitude),
        csvField(reading.notes),
      ].join(","),
    );
  }

  const csvBase64 = toBase64(csvRows.join("\n"));

  // 6. Send email via Resend
  const emailAddresses = recipients.map((r) => r.email);
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const safeFileName = farmName.replace(/[^a-zA-Z0-9_-]/g, "_");

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AG Water Tracker <reports@agwatertracker.com>",
      to: emailAddresses,
      subject: `${farmName} - Monthly Well Report - ${monthName}`,
      html: [
        `<p>Attached is the monthly well reading report for <strong>${escapeHtml(farmName)}</strong> for ${monthName}.</p>`,
        `<p>Wells included: ${(wells ?? []).length}</p>`,
        `<p>Total readings: ${readings.length}</p>`,
      ].join(""),
      attachments: [
        {
          filename: `${safeFileName}_report_${now.toISOString().slice(0, 7)}.csv`,
          content: csvBase64,
        },
      ],
    }),
  });

  if (!resendResponse.ok) {
    const resendError = await resendResponse.json().catch(() => ({}));
    console.error("Resend API error for farm", farmId, ":", JSON.stringify(resendError));
    return {
      farmId,
      farmName,
      success: false,
      recipientCount: emailAddresses.length,
      error: resendError?.message ?? "Unknown email error",
    };
  }

  return { farmId, farmName, success: true, recipientCount: emailAddresses.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Supabase environment not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse body — empty body (from pg_cron) triggers batch mode
    const body = await req.json().catch(() => ({}));
    const farmId = body?.farmId;

    if (farmId && typeof farmId === "string") {
      // ── Single-farm mode (manual "Send Now" button) ──
      const result = await sendReportForFarm(supabase, farmId);

      if (!result.success) {
        return jsonResponse({ error: result.error ?? "Failed to send report" }, 502);
      }

      return jsonResponse(
        { success: true, message: `Report sent to ${result.recipientCount} recipient(s)` },
        200,
      );
    }

    // ── Batch mode (pg_cron trigger — no farmId) ──
    const { data: recipientRows, error: farmErr } = await supabase
      .from("report_email_recipients")
      .select("farm_id");

    if (farmErr) throw farmErr;

    // Deduplicate farm IDs
    const farmIds = [...new Set((recipientRows ?? []).map((r) => r.farm_id))];

    if (farmIds.length === 0) {
      return jsonResponse({ success: true, message: "No farms with recipients" }, 200);
    }

    const results: FarmResult[] = [];
    for (const id of farmIds) {
      try {
        results.push(await sendReportForFarm(supabase, id));
      } catch (err) {
        results.push({
          farmId: id,
          farmName: "",
          success: false,
          recipientCount: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return jsonResponse(
      {
        success: failed === 0,
        message: `Batch complete: ${succeeded} succeeded, ${failed} failed`,
        results,
      },
      failed === 0 ? 200 : 207,
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
});
