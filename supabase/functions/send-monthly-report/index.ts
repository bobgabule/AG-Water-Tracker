import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { farmId } = await req.json();

    if (!farmId || typeof farmId !== "string") {
      return jsonResponse({ error: "Missing or invalid farmId" }, 400);
    }

    if (!RESEND_API_KEY) {
      return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Supabase environment not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get recipient emails
    const { data: recipients, error: recipErr } = await supabase
      .from("report_email_recipients")
      .select("email")
      .eq("farm_id", farmId);

    if (recipErr) throw recipErr;
    if (!recipients || recipients.length === 0) {
      return jsonResponse({ error: "No recipients configured" }, 400);
    }

    // 2. Get farm name
    const { data: farm } = await supabase
      .from("farms")
      .select("name")
      .eq("id", farmId)
      .single();

    const farmName = farm?.name ?? "Your Farm";

    // 3. Get all wells for this farm
    const { data: wells, error: wellErr } = await supabase
      .from("wells")
      .select("id, name, units, multiplier, wmis_number, meter_serial_number")
      .eq("farm_id", farmId);

    if (wellErr) throw wellErr;

    // 4. Get readings for these wells (current month)
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ).toISOString();

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
        .select(
          "well_id, value, recorded_at, gps_latitude, gps_longitude, notes",
        )
        .in("well_id", wellIds)
        .gte("recorded_at", monthStart)
        .lte("recorded_at", monthEnd)
        .order("recorded_at", { ascending: true });

      if (readingErr) throw readingErr;
      readings = readingData ?? [];
    }

    // 5. Generate CSV (RFC 4180 compliant)
    const wellMap = new Map(
      (wells ?? []).map((w) => [w.id, w]),
    );

    /** Quote a CSV field: wrap in double-quotes, escape inner quotes */
    function csvField(val: string | number | null | undefined): string {
      const str = String(val ?? "");
      return `"${str.replace(/"/g, '""')}"`;
    }

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

    const csvContent = csvRows.join("\n");

    // Encode CSV to base64 (Deno-compatible, safe for large files)
    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvContent);
    // Chunked conversion avoids stack overflow from spread on large arrays
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < csvBytes.length; i += CHUNK) {
      binary += String.fromCharCode(...csvBytes.subarray(i, i + CHUNK));
    }
    const csvBase64 = btoa(binary);

    // 6. Send email via Resend
    const emailAddresses = recipients.map((r) => r.email);
    const monthName = now.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    const safeFileName = farmName.replace(/[^a-zA-Z0-9_-]/g, "_");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AG Water Tracker <onboarding@resend.dev>",
        to: emailAddresses,
        subject: `${farmName} - Monthly Well Report - ${monthName}`,
        html: [
          `<p>Attached is the monthly well reading report for <strong>${farmName}</strong> for ${monthName}.</p>`,
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
      const resendError = await resendResponse.json();
      console.error("Resend API error:", JSON.stringify(resendError));
      return jsonResponse(
        {
          error: `Email service error: ${resendError?.message ?? "Unknown error"}`,
        },
        502,
      );
    }

    return jsonResponse(
      {
        success: true,
        message: `Report sent to ${emailAddresses.length} recipient(s)`,
      },
      200,
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
});
