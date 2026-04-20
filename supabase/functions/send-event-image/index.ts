import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT = "mila@smea.info";
const FROM = "Nachtschicht <noreply@nachtschicht-kaiserslautern.app>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_id } = await req.json();
    if (!event_id) throw new Error("event_id is required");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: event, error } = await supabase
      .from("events")
      .select("id, title, subtitle, date, time, image_url, is_published")
      .eq("id", event_id)
      .maybeSingle();

    if (error) throw error;
    if (!event) throw new Error("Event not found");
    if (!event.is_published) {
      return new Response(JSON.stringify({ skipped: "not_published" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!event.image_url) {
      return new Response(JSON.stringify({ skipped: "no_image" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bild herunterladen
    const imgRes = await fetch(event.image_url);
    if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
    const imgBuf = new Uint8Array(await imgRes.arrayBuffer());

    // base64 (in Chunks, vermeidet Stack-Overflow)
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < imgBuf.length; i += chunkSize) {
      binary += String.fromCharCode(...imgBuf.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    // Dateiendung aus URL
    const urlPath = new URL(event.image_url).pathname;
    const extMatch = urlPath.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
    const ext = (extMatch?.[1] || "jpg").toLowerCase();
    const safeTitle = (event.title || "event").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    const filename = `${safeTitle}.${ext}`;

    const dateStr = event.date
      ? new Date(event.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; color:#111;">
        <h2 style="margin:0 0 12px;">Neues Event veröffentlicht</h2>
        <p><strong>${event.title}</strong>${event.subtitle ? `<br/><span style="color:#555">${event.subtitle}</span>` : ""}</p>
        <p>${dateStr}${event.time ? ` · ${event.time}` : ""}</p>
        <p>Das Titelbild ist als Anhang beigefügt.</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [RECIPIENT],
        subject: `Neues Event: ${event.title}`,
        html,
        attachments: [{ filename, content: base64 }],
      }),
    });

    if (!resendRes.ok) {
      const txt = await resendRes.text();
      console.error("Resend error:", resendRes.status, txt);
      throw new Error(`Resend failed: ${resendRes.status}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-event-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
