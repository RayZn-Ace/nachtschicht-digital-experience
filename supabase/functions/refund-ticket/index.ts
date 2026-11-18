import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasCompleteTicketCoverage } from "../_shared/ticketCoverage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOLLIE = "https://api.mollie.com/v2";

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const mollieKey = Deno.env.get("MOLLIE_API_KEY");
    if (!mollieKey) return json({ error: "Mollie ist nicht eingerichtet" }, 500);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await anon.auth.getUser(authHeader.slice(7));
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Nur für Admins" }, 403);

    const body = await req.json().catch(() => null);
    const ids: string[] = Array.isArray(body?.ticket_ids) ? [...new Set(body.ticket_ids as string[])] : [];
    if (ids.length < 1 || ids.length > 200 || !ids.every((i) => typeof i === "string" && UUID.test(i))) {
      return json({ error: "Ungültige Ticketauswahl" }, 400);
    }

    if (body?.action === "status") {
      const { data: recs } = await admin.from("ticket_refunds")
        .select("id,ticket_ids,amount,status,mollie_payment_id,mollie_refund_id,error_message,created_at")
        .overlaps("ticket_ids", ids).order("created_at", { ascending: false }).limit(50);
      const out = [];
      for (const r of recs || []) {
        let live: string = r.status;
        let checked = false;
        if (r.mollie_refund_id && !["refunded", "failed", "canceled"].includes(r.status)) {
          const lr = await fetch(`${MOLLIE}/payments/${r.mollie_payment_id}/refunds/${r.mollie_refund_id}`, { headers: { Authorization: `Bearer ${mollieKey}` } });
          if (lr.ok) {
            const d = await lr.json();
            checked = true;
            if (d.status && d.status !== r.status) {
              live = d.status;
              await admin.from("ticket_refunds").update({ status: live }).eq("id", r.id);
            }
          } else console.error(`Mollie refund status failed [${lr.status}]`);
        } else checked = !!r.mollie_refund_id;
        out.push({ ticket_ids: r.ticket_ids, amount: r.amount, status: live, created_at: r.created_at, checked, error: r.status === "failed" ? "Von Mollie abgelehnt" : null });
      }
      return json({ refunds: out });
    }

    const { data: tickets, error: tErr } = await admin.from("tickets").select("*").in("id", ids);
    if (tErr || !tickets || !hasCompleteTicketCoverage(ids, tickets)) return json({ error: "Tickets nicht gefunden" }, 404);
    if (tickets.some((t: any) => t.status !== "confirmed")) return json({ error: "Nur bestätigte Tickets können erstattet werden" }, 400);
    const amount = +tickets.reduce((s: number, t: any) => s + Number(t.total_price), 0).toFixed(2);
    if (amount <= 0) return json({ error: "Diese Tickets wurden ohne Zahlung ausgestellt – nichts zu erstatten" }, 400);

    const { data: existing } = await admin.from("ticket_refunds").select("id,status").overlaps("ticket_ids", ids).neq("status", "failed");
    if (existing && existing.length > 0) return json({ error: "Für mindestens eins dieser Tickets läuft bereits eine Erstattung" }, 409);

    // Find Mollie payment: stored link first, otherwise search Mollie history
    let paymentId: string | null = null;
    const { data: links } = await admin.from("ticket_payments").select("ticket_id,mollie_payment_id").in("ticket_id", ids);
    const linked = new Set((links || []).map((l: any) => l.mollie_payment_id));
    if (links && links.length === ids.length && linked.size === 1) paymentId = [...linked][0] as string;
    if (links && linked.size > 1) return json({ error: "Die Tickets gehören zu verschiedenen Zahlungen – bitte einzeln erstatten" }, 400);

    let payment: any = null;
    if (!paymentId) {
      const oldest = Math.min(...tickets.map((t: any) => new Date(t.created_at).getTime())) - 2 * 86400000;
      let url: string | null = `${MOLLIE}/payments?limit=250`;
      for (let page = 0; url && page < 60 && !payment; page++) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${mollieKey}` } });
        if (!r.ok) return json({ error: "Mollie-Zahlungen konnten nicht abgerufen werden", status: r.status, details: await r.text() }, 502);
        const d = await r.json();
        const list: any[] = d._embedded?.payments || [];
        for (const p of list) {
          const meta: string[] = p.metadata?.ticket_ids || [];
          if (ids.every((i) => meta.includes(i))) { payment = p; break; }
        }
        const last = list[list.length - 1];
        if (!last || new Date(last.createdAt).getTime() < oldest) break;
        url = d._links?.next?.href || null;
      }
      if (!payment) return json({ error: "Keine passende Mollie-Zahlung gefunden (evtl. importiertes Ticket oder mehrere Bestellungen gemischt)" }, 404);
      paymentId = payment.id;
      const rows = (payment.metadata?.ticket_ids || []).filter((i: string) => UUID.test(i)).map((i: string) => ({ ticket_id: i, mollie_payment_id: payment.id }));
      if (rows.length) await admin.from("ticket_payments").upsert(rows, { onConflict: "ticket_id", ignoreDuplicates: true });
    } else {
      const r = await fetch(`${MOLLIE}/payments/${paymentId}`, { headers: { Authorization: `Bearer ${mollieKey}` } });
      if (!r.ok) return json({ error: "Mollie-Zahlung konnte nicht geladen werden", status: r.status, details: await r.text() }, 502);
      payment = await r.json();
    }

    if (payment.status !== "paid") return json({ error: `Zahlung ist nicht bezahlt (Status: ${payment.status})` }, 400);
    const remaining = Number(payment.amountRemaining?.value ?? payment.amount?.value ?? 0);
    if (amount > remaining + 0.001) return json({ error: `Erstattung (${amount.toFixed(2)} €) übersteigt den noch erstattbaren Betrag (${remaining.toFixed(2)} €)` }, 400);

    const idemKey = `refund-${await sha([...ids].sort().join(","))}`;
    const { data: rec, error: recErr } = await admin.from("ticket_refunds").insert({
      ticket_ids: ids, mollie_payment_id: paymentId, amount, status: "requested", requested_by: user.id, idempotency_key: idemKey,
    }).select("id").single();
    if (recErr || !rec) return json({ error: "Erstattung konnte nicht protokolliert werden" }, 500);

    const rr = await fetch(`${MOLLIE}/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mollieKey}`, "Content-Type": "application/json", "Idempotency-Key": idemKey },
      body: JSON.stringify({ amount: { currency: payment.amount?.currency || "EUR", value: amount.toFixed(2) }, description: `Erstattung ${ids.length} Ticket(s)`.slice(0, 140) }),
    });
    if (!rr.ok) {
      const details = await rr.text();
      console.error(`Mollie refund failed [${rr.status}]`);
      await admin.from("ticket_refunds").update({ status: "failed", error_message: details.slice(0, 1000) }).eq("id", rec.id);
      return json({ error: "Mollie hat die Erstattung abgelehnt", status: rr.status, details }, 502);
    }
    const refund = await rr.json();
    await admin.from("ticket_refunds").update({ status: refund.status || "queued", mollie_refund_id: refund.id }).eq("id", rec.id);

    // Cancel tickets + cancellation invoice via existing function
    const cr = await fetch(`${supabaseUrl}/functions/v1/cancel-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ ticket_ids: ids }),
    });
    const cancel = await cr.json().catch(() => ({}));
    return json({ success: true, amount, refund_id: refund.id, refund_status: refund.status, cancelled: cr.ok, cancel_result: cancel });
  } catch (e) {
    console.error("refund-ticket error", e);
    return json({ error: "Erstattung fehlgeschlagen", details: String(e) }, 500);
  }
});
