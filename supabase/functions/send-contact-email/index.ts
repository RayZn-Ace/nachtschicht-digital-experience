const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "name, email, message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to club inbox
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Nachtschicht Kontakt <kontakt@nachtschicht-kaiserslautern.app>",
        to: ["info@nachtschicht-kaiserslautern.de"],
        reply_to: email,
        subject: `Kontaktanfrage: ${subject || "Allgemeine Anfrage"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="margin: 0 0 16px;">Neue Kontaktanfrage</h2>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 100px;">Name</td><td style="padding: 8px 0; font-weight: bold;">${name}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">E-Mail</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Betreff</td><td style="padding: 8px 0;">${subject || "—"}</td></tr>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="margin-top: 16px; color: #888; font-size: 12px;">Antwort direkt an: ${email}</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Email sending failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send confirmation to sender
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Nachtschicht <kontakt@nachtschicht-kaiserslautern.app>",
        to: [email],
        subject: "Wir haben deine Nachricht erhalten!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f13; color: #ffffff; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 24px; letter-spacing: 4px; margin: 0;">NACHTSCHICHT</h1>
              <p style="color: #888; font-size: 12px;">Kaiserslautern</p>
            </div>
            <div style="background: #1a1a22; border-radius: 12px; padding: 24px;">
              <h2 style="margin: 0 0 8px;">Hallo ${name}!</h2>
              <p style="color: #aaa; font-size: 14px;">Danke für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.</p>
              <div style="margin-top: 16px; padding: 16px; background: #0f0f13; border-radius: 8px;">
                <p style="color: #888; font-size: 12px; margin: 0 0 4px;">Deine Nachricht:</p>
                <p style="margin: 0; font-size: 13px; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
            <p style="text-align: center; color: #555; font-size: 11px; margin-top: 24px;">
              Nachtschicht · Zollamtstraße 28 · 67663 Kaiserslautern
            </p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-contact-email error:", err);
    return new Response(JSON.stringify({ error: "Failed", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
