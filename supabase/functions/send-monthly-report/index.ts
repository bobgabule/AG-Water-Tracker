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

/** Format a farm address from its parts, omitting null fields */
function formatFarmAddress(farm: {
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}): string {
  const parts = [
    farm.street_address,
    farm.city,
    farm.state && farm.zip_code
      ? `${farm.state} ${farm.zip_code}`
      : (farm.state ?? farm.zip_code ?? null),
  ].filter((p): p is string => Boolean(p));
  return parts.join(", ");
}

/** Format GPS coordinates as "lat, lon" or empty string */
function formatGps(lat: number | null, lon: number | null): string {
  if (lat == null || lon == null) return "";
  return `${lat}, ${lon}`;
}

/** Format ISO date as MM/DD/YYYY or empty string */
function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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

  // 2. Get farm details (name + address)
  const { data: farm, error: farmErr } = await supabase
    .from("farms")
    .select("name, street_address, city, state, zip_code")
    .eq("id", farmId)
    .single();

  if (farmErr) {
    console.error("Failed to fetch farm details for", farmId, ":", farmErr.message);
  }

  const farmName = farm?.name ?? "Your Farm";
  const farmAddress = farm ? formatFarmAddress(farm) : "";

  if (!recipients || recipients.length === 0) {
    return { farmId, farmName, success: false, recipientCount: 0, error: "No recipients" };
  }

  // 3. Get all wells for this farm
  const { data: wells, error: wellErr } = await supabase
    .from("wells")
    .select("id, name, wmis_number, latitude, longitude, units, multiplier")
    .eq("farm_id", farmId)
    .order("name");

  if (wellErr) throw wellErr;

  // 4. Date range: 15th of prior month to now
  const now = new Date();
  const rangeStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15),
  ).toISOString();
  const rangeEnd = now.toISOString();

  const wellIds = (wells ?? []).map((w) => w.id);

  // 5. Get readings in range, ordered newest first for deduplication
  let readings: Array<{
    well_id: string;
    value: string;
    recorded_at: string;
    recorded_by: string | null;
  }> = [];

  if (wellIds.length > 0) {
    const { data: readingData, error: readingErr } = await supabase
      .from("readings")
      .select("well_id, value, recorded_at, recorded_by")
      .in("well_id", wellIds)
      .gte("recorded_at", rangeStart)
      .lte("recorded_at", rangeEnd)
      .order("recorded_at", { ascending: false });

    if (readingErr) throw readingErr;
    readings = readingData ?? [];
  }

  // Deduplicate: keep only the most recent reading per well
  const latestByWell = new Map<string, (typeof readings)[0]>();
  for (const r of readings) {
    if (!latestByWell.has(r.well_id)) {
      latestByWell.set(r.well_id, r);
    }
  }

  // 6. Get recorder names from users table
  const recorderIds = [
    ...new Set(
      [...latestByWell.values()]
        .map((r) => r.recorded_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const recorderMap = new Map<string, string>();
  if (recorderIds.length > 0) {
    const { data: userRows } = await supabase
      .from("users")
      .select("id, display_name, first_name, last_name")
      .in("id", recorderIds);

    for (const u of userRows ?? []) {
      const name =
        u.display_name ||
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        "Unknown";
      recorderMap.set(u.id, name);
    }
  }

  // 7. Generate CSV — one row per well, most recent reading only
  const csvRows = [
    "Farm Name,Farm Address,Well Name,WMIS#,GPS Coordinates,Date of Reading,Reading Unit,Reading Unit Multiplier,Actual Reading,Reading Logged By",
  ];

  for (const well of wells ?? []) {
    const reading = latestByWell.get(well.id);
    const recorderName = reading?.recorded_by
      ? (recorderMap.get(reading.recorded_by) ?? "Unknown")
      : "";

    csvRows.push(
      [
        csvField(farmName),
        csvField(farmAddress),
        csvField(well.name),
        csvField(well.wmis_number),
        csvField(formatGps(well.latitude, well.longitude)),
        csvField(reading ? formatDate(reading.recorded_at) : ""),
        csvField(well.units),
        csvField(well.multiplier),
        csvField(reading?.value ?? ""),
        csvField(recorderName),
      ].join(","),
    );
  }

  const csvBase64 = toBase64(csvRows.join("\n"));

  // 8. Send email via Resend
  const emailAddresses = recipients.map((r) => r.email);
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const safeFileName = farmName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const wellsWithReadings = latestByWell.size;

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
        `<p>Attached is the monthly well reading report for <strong>${escapeHtml(farmName)}</strong>.</p>`,
        `<p>Report period: ${formatDate(rangeStart)} \u2013 ${formatDate(rangeEnd)}</p>`,
        `<p>Wells in report: ${(wells ?? []).length}</p>`,
        `<p>Wells with readings: ${wellsWithReadings}</p>`,
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
