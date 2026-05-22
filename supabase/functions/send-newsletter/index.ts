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

    const { newsletter_id, category_ids, list_ids, buyer_event_ids, send_to_all, extra_recipients } = await req.json();
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

    // Build recipients map: email -> name (dedup'd)
    const recipientMap = new Map<string, string | null>();

    const addSub = (s: { email: string; name?: string | null }) => {
      const key = s.email.toLowerCase();
      if (!recipientMap.has(key)) recipientMap.set(key, s.name || null);
    };

    const fetchAllSubsByIds = async (ids: string[]) => {
      const out: { email: string; name: string | null }[] = [];
      const chunk = 500;
      for (let i = 0; i < ids.length; i += chunk) {
        const slice = ids.slice(i, i + chunk);
        const { data } = await adminClient
          .from("newsletter_subscribers")
          .select("email, name, is_active")
          .in("id", slice);
        if (data) data.filter((r: any) => r.is_active).forEach((r: any) => out.push(r));
      }
      return out;
    };

    // 1) Tags
    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      const { data: subCatRows } = await adminClient
        .from("newsletter_subscriber_categories")
        .select("subscriber_id")
        .in("category_id", category_ids);
      if (subCatRows && subCatRows.length > 0) {
        const subIds = [...new Set(subCatRows.map((r: any) => r.subscriber_id))];
        const rows = await fetchAllSubsByIds(subIds);
        rows.forEach(addSub);
      }
    }

    // 2) Lists
    if (list_ids && Array.isArray(list_ids) && list_ids.length > 0) {
      const { data: memberRows } = await adminClient
        .from("newsletter_list_members")
        .select("subscriber_id")
        .in("list_id", list_ids);
      if (memberRows && memberRows.length > 0) {
        const subIds = [...new Set(memberRows.map((r: any) => r.subscriber_id))];
        const rows = await fetchAllSubsByIds(subIds);
        rows.forEach(addSub);
      }
    }

    // 3) Event buyers
    if (buyer_event_ids && Array.isArray(buyer_event_ids) && buyer_event_ids.length > 0) {
      let from = 0;
      const batch = 1000;
      while (true) {
        const { data } = await adminClient
          .from("tickets")
          .select("buyer_email, buyer_name")
          .in("event_id", buyer_event_ids)
          .eq("status", "confirmed")
          .range(from, from + batch - 1);
        if (!data || data.length === 0) break;
        data.forEach((r: any) => r.buyer_email && addSub({ email: r.buyer_email, name: r.buyer_name }));
        if (data.length < batch) break;
        from += batch;
      }
    }

    // 4) Send-to-all fallback (or no specific selection given)
    const noSelection = !category_ids?.length && !list_ids?.length && !buyer_event_ids?.length;
    if (send_to_all || noSelection) {
      let from = 0;
      const batch = 1000;
      while (true) {
        const { data } = await adminClient
          .from("newsletter_subscribers")
          .select("email, name")
          .eq("is_active", true)
          .range(from, from + batch - 1);
        if (!data || data.length === 0) break;
        data.forEach((r: any) => addSub(r));
        if (data.length < batch) break;
        from += batch;
      }
    }

    // 5) Manual extras
    if (extra_recipients && Array.isArray(extra_recipients)) {
      for (const r of extra_recipients) {
        if (r.email) addSub({ email: r.email, name: r.name || null });
      }
    }

    const subscribers: { email: string; name?: string | null }[] = Array.from(recipientMap.entries())
      .map(([email, name]) => ({ email, name }));

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
    const senderEmail = "noreply@nachtschicht-kaiserslautern.app";

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
