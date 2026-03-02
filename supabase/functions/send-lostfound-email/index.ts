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
    const { email, firstName, category, status } = await req.json();

    if (!email || !firstName || !status) {
      return new Response(JSON.stringify({ error: "email, firstName, status required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryLabels: Record<string, string> = {
      ausweis: "Ausweis",
      schmuck: "Schmuck",
      handy: "Handy",
      sonstiges: "Gegenstand",
    };

    const itemLabel = categoryLabels[category] || "Gegenstand";

    let subject: string;
    let bodyHtml: string;

    if (status === "found") {
      subject = `Dein ${itemLabel} wurde gefunden! – Nachtschicht Kaiserslautern`;
      bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Gute Nachrichten, ${firstName}! 🎉</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Dein <strong>${itemLabel}</strong> wurde gefunden und liegt zur Abholung bereit!
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Du kannst deinen Gegenstand während unserer Öffnungszeiten an der Garderobe abholen. 
            Bitte bringe einen gültigen Ausweis mit.
          </p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #333; font-size: 14px;">
              <strong>📍 Nachtschicht Kaiserslautern</strong><br/>
              Zollamtstraße 28, 67663 Kaiserslautern<br/>
              Tel: +49 631 3105759
            </p>
          </div>
          <p style="color: #999; font-size: 12px;">Diese E-Mail wurde automatisch versendet.</p>
        </div>
      `;
    } else {
      subject = `Fundgrube-Anfrage – Nachtschicht Kaiserslautern`;
      bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Hallo ${firstName},</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            leider konnten wir deinen <strong>${itemLabel}</strong> trotz intensiver Suche nicht finden.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Falls du weitere Fragen hast, kannst du uns jederzeit kontaktieren.
          </p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #333; font-size: 14px;">
              <strong>📍 Nachtschicht Kaiserslautern</strong><br/>
              Zollamtstraße 28, 67663 Kaiserslautern<br/>
              Tel: +49 631 3105759
            </p>
          </div>
          <p style="color: #999; font-size: 12px;">Diese E-Mail wurde automatisch versendet.</p>
        </div>
      `;
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Nachtschicht <noreply@smeanet.de>",
        to: [email],
        subject,
        html: bodyHtml,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Email sending failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
