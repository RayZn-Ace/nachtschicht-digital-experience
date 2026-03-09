import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  to: string;
  userName: string;
  status: "confirmed" | "rejected";
  loungeName: string;
  eventName: string;
  guestCount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, userName, status, loungeName, eventName, guestCount } =
      (await req.json()) as BookingEmailRequest;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set – skipping email send.");
      return new Response(
        JSON.stringify({ success: false, reason: "no_api_key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isConfirmed = status === "confirmed";

    const subject = isConfirmed
      ? `✅ Deine Lounge-Reservierung wurde bestätigt – ${eventName}`
      : `❌ Deine Lounge-Reservierung wurde abgelehnt – ${eventName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #eee; padding: 32px; border-radius: 12px;">
        <h1 style="font-size: 24px; color: ${isConfirmed ? "#22c55e" : "#ef4444"};">
          ${isConfirmed ? "Reservierung bestätigt! 🎉" : "Reservierung abgelehnt"}
        </h1>
        <p>Hallo <strong>${userName}</strong>,</p>
        ${
          isConfirmed
            ? `<p>deine Lounge-Reservierung wurde bestätigt. Wir freuen uns auf dich!</p>`
            : `<p>leider konnten wir deine Lounge-Reservierung nicht bestätigen. Bitte kontaktiere uns bei Fragen.</p>`
        }
        <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #aaa;">Event</td><td style="padding: 8px 0;">${eventName}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Lounge</td><td style="padding: 8px 0;">${loungeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Gäste</td><td style="padding: 8px 0;">${guestCount}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Status</td><td style="padding: 8px 0; color: ${isConfirmed ? "#22c55e" : "#ef4444"};">${isConfirmed ? "Bestätigt" : "Abgelehnt"}</td></tr>
        </table>
        <p style="color: #888; font-size: 12px;">Nachtschicht Kaiserslautern</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Nachtschicht <noreply@nachtschicht-kaiserslautern.app>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ success: false, error: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
