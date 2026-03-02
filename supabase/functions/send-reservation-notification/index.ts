import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReservationNotification {
  name: string;
  email: string;
  phone?: string;
  date: string;
  guest_count: number;
  lounge_type: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ReservationNotification;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set – skipping reservation notification.");
      return new Response(
        JSON.stringify({ success: false, reason: "no_api_key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch admin email from invoice_config
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from("invoice_config")
      .select("email, company_name")
      .limit(1)
      .single();

    const adminEmail = config?.email;
    if (!adminEmail) {
      console.warn("No admin email configured in invoice_config – skipping.");
      return new Response(
        JSON.stringify({ success: false, reason: "no_admin_email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loungeLabels: Record<string, string> = {
      vip_classic: "VIP Lounge Classic (bis 10 Pers.)",
      vip_premium: "VIP Lounge Premium (bis 20 Pers.)",
      vip_table: "VIP Tisch (bis 6 Pers.)",
    };

    const formattedDate = new Date(body.date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const subject = `🆕 Neue VIP-Reservierung von ${body.name} – ${formattedDate}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #eee; padding: 32px; border-radius: 12px;">
        <h1 style="font-size: 22px; color: #a78bfa;">Neue Reservierung eingegangen 🎉</h1>
        <p>Es ist eine neue VIP-Reservierung über die Website eingegangen:</p>
        <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #aaa;">Name</td><td style="padding: 8px 0;">${body.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">E-Mail</td><td style="padding: 8px 0;"><a href="mailto:${body.email}" style="color: #a78bfa;">${body.email}</a></td></tr>
          ${body.phone ? `<tr><td style="padding: 8px 0; color: #aaa;">Telefon</td><td style="padding: 8px 0;">${body.phone}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #aaa;">Datum</td><td style="padding: 8px 0;">${formattedDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Gäste</td><td style="padding: 8px 0;">${body.guest_count}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Lounge</td><td style="padding: 8px 0;">${loungeLabels[body.lounge_type] || body.lounge_type}</td></tr>
          ${body.message ? `<tr><td style="padding: 8px 0; color: #aaa;">Nachricht</td><td style="padding: 8px 0;">${body.message}</td></tr>` : ""}
        </table>
        <p style="color: #888; font-size: 12px;">${config?.company_name || "Nachtschicht Kaiserslautern"}</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${config?.company_name || "Nachtschicht"} <noreply@resend.dev>`,
        to: [adminEmail],
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
