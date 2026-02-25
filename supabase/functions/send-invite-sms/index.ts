const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
const APP_URL = Deno.env.get("APP_URL") || "https://your-app.com";

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
  throw new Error("Missing required Twilio secrets (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)");
}

const E164_RE = /^\+[1-9]\d{1,14}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // JWT is verified at the Supabase Edge Runtime gateway — no manual check needed.
    const { phone, farmName } = await req.json();

    if (!phone || typeof phone !== "string" || !E164_RE.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid phone number (expected E.164 format)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const message = farmName
      ? `You've been invited to join "${farmName}" on AG Water Tracker. Tap here to get started: ${APP_URL}`
      : `You've been invited to AG Water Tracker. Tap here to get started: ${APP_URL}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_FROM_NUMBER,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.json();
      console.error("Twilio API error:", JSON.stringify(twilioError));
      return new Response(
        JSON.stringify({
          error: `Twilio error ${twilioError.code}: ${twilioError.message}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const twilioData = await twilioResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioData.sid }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
