import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MS = 550;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const replacePlaceholders = (html: string, sub: { email: string; name?: string | null }): string => {
  const name = sub.name || sub.email.split("@")[0];
  return html
    .replace(/\{\{NAME\}\}/gi, name)
    .replace(/\{\{EMAIL\}\}/gi, sub.email)
    .replace(/\{\{VORNAME\}\}/gi, name);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { newsletter_id, category_ids, extra_recipients } = await req.json();
    if (!newsletter_id) {
      return new Response(JSON.stringify({ error: "newsletter_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: newsletter, error: nlErr } = await adminClient
      .from("newsletters")
      .select("*")
      .eq("id", newsletter_id)
      .single();

    if (nlErr || !newsletter) {
      return new Response(JSON.stringify({ error: "Newsletter nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newsletter.status === "sent") {
      return new Response(JSON.stringify({ error: "Newsletter wurde bereits versendet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscribers – filtered by categories if provided
    let subscribers: { email: string; name?: string | null }[] = [];

    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      const { data: subCatRows } = await adminClient
        .from("newsletter_subscriber_categories")
        .select("subscriber_id")
        .in("category_id", category_ids);

      if (subCatRows && subCatRows.length > 0) {
        const subIds = [...new Set(subCatRows.map((r: any) => r.subscriber_id))];
        const { data: catSubs } = await adminClient
          .from("newsletter_subscribers")
          .select("email, name")
          .in("id", subIds)
          .eq("is_active", true);
        if (catSubs) subscribers = catSubs;
      }
    } else {
      const { data: allSubs } = await adminClient
        .from("newsletter_subscribers")
        .select("email, name")
        .eq("is_active", true);
      if (allSubs) subscribers = allSubs;
    }

    // Add extra manual recipients (deduplicate by email)
    if (extra_recipients && Array.isArray(extra_recipients)) {
      const existingEmails = new Set(subscribers.map((s) => s.email.toLowerCase()));
      for (const r of extra_recipients) {
        if (r.email && !existingEmails.has(r.email.toLowerCase())) {
          subscribers.push({ email: r.email, name: r.name || null });
          existingEmails.add(r.email.toLowerCase());
        }
      }
    }

    if (subscribers.length === 0) {
      return new Response(JSON.stringify({ error: "Keine Empfänger" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient
      .from("newsletters")
      .update({ status: "sending", total_recipients: subscribers.length })
      .eq("id", newsletter_id);

    const { data: config } = await adminClient
      .from("invoice_config")
      .select("company_name, email")
      .limit(1)
      .single();

    const senderName = config?.company_name || "Nachtschicht";
    const senderEmail = "noreply@smeanet.de";

    let totalSent = 0;
    let totalFailed = 0;
    const baseHtml = newsletter.body_html;

    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i];
      const personalizedHtml = replacePlaceholders(baseHtml, sub);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${senderName} <${senderEmail}>`,
            to: [sub.email],
            subject: replacePlaceholders(newsletter.subject, sub),
            html: personalizedHtml,
          }),
        });

        const resBody = await res.text();

        if (res.ok) {
          totalSent++;
          await adminClient.from("newsletter_sends").insert({
            newsletter_id,
            subscriber_email: sub.email,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        } else {
          totalFailed++;
          await adminClient.from("newsletter_sends").insert({
            newsletter_id,
            subscriber_email: sub.email,
            status: "failed",
            error_message: resBody.slice(0, 500),
          });
        }
      } catch (err) {
        totalFailed++;
        await adminClient.from("newsletter_sends").insert({
          newsletter_id,
          subscriber_email: sub.email,
          status: "failed",
          error_message: String(err).slice(0, 500),
        });
      }

      if (i < subscribers.length - 1) await sleep(RATE_LIMIT_MS);

      if ((i + 1) % 10 === 0 || i === subscribers.length - 1) {
        await adminClient
          .from("newsletters")
          .update({ total_sent: totalSent, total_failed: totalFailed })
          .eq("id", newsletter_id);
      }
    }

    await adminClient
      .from("newsletters")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        total_sent: totalSent,
        total_failed: totalFailed,
      })
      .eq("id", newsletter_id);

    return new Response(JSON.stringify({
      success: true,
      total_recipients: subscribers.length,
      total_sent: totalSent,
      total_failed: totalFailed,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-newsletter error:", err);
    return new Response(JSON.stringify({ error: "Versand fehlgeschlagen", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
