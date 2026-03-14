import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Verify admin
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin or scanner role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "scanner"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Scanner access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { qr_code, ticket_number, expected_event_id } = await req.json();
    const searchValue = (qr_code || ticket_number || "").trim();

    if (!searchValue) {
      return new Response(JSON.stringify({ error: "qr_code or ticket_number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find ticket by qr_code, full id, or short id prefix
    let ticket;
    const { data: byQr } = await adminClient
      .from("tickets")
      .select("*, events(title, date, time), ticket_types(name)")
      .eq("qr_code", searchValue)
      .maybeSingle();

    if (byQr) {
      ticket = byQr;
    } else {
      // Try by exact ticket ID (only if it looks like a valid UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(searchValue)) {
        const { data: byId } = await adminClient
          .from("tickets")
          .select("*, events(title, date, time), ticket_types(name)")
          .eq("id", searchValue)
          .maybeSingle();
        if (byId) ticket = byId;
      }

      if (!ticket) {
        // Flexible prefix search using id::text cast (UUID columns don't support ILIKE directly)
        const normalized = searchValue.toLowerCase();
        const compactHex = normalized.replace(/[^a-f0-9]/g, "");
        const normalizedInput = normalized.replace(/[^a-z0-9-]/g, "");

        if (compactHex.length >= 6) {
          // Fast path: search by id prefix using text cast
          const idPrefix = compactHex.slice(0, 8);
          const { data: byPrefix, error: byPrefixError } = await adminClient
            .from("tickets")
            .select("*, events(title, date, time), ticket_types(name)")
            .filter("id::text", "ilike", `${idPrefix}%`)
            .limit(1)
            .maybeSingle();

          if (byPrefixError) {
            console.warn("id::text prefix lookup failed:", byPrefixError.message);
          }

          if (byPrefix) {
            ticket = byPrefix;
          }

          // Fallback 1: try matching against qr_code parts
          if (!ticket) {
            const { data: byQrSuffix } = await adminClient
              .from("tickets")
              .select("*, events(title, date, time), ticket_types(name)")
              .ilike("qr_code", `%${compactHex}%`)
              .limit(1)
              .maybeSingle();

            ticket = byQrSuffix;
          }

          // Fallback 2 (robust): load recent tickets and match prefixes in JS
          if (!ticket) {
            const { data: recentTickets } = await adminClient
              .from("tickets")
              .select("*, events(title, date, time), ticket_types(name)")
              .order("created_at", { ascending: false })
              .limit(1000);

            if (recentTickets?.length) {
              ticket = recentTickets.find((t) => {
                const idLower = String(t.id || "").toLowerCase();
                const idNoDash = idLower.replace(/-/g, "");
                const qrLower = String(t.qr_code || "").toLowerCase();
                const qrCompact = qrLower.replace(/^tkt-/, "").replace(/[^a-z0-9]/g, "");

                return (
                  idLower.startsWith(normalizedInput) ||
                  idNoDash.startsWith(compactHex) ||
                  qrLower.includes(normalizedInput) ||
                  qrCompact.startsWith(compactHex)
                );
              });
            }
          }
        }
      }
    }

    if (!ticket) {
      return new Response(JSON.stringify({
        status: "invalid",
        message: "Ticket nicht gefunden",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cancelled
    if (ticket.status === "canceled" || ticket.status === "cancelled") {
      return new Response(JSON.stringify({
        status: "cancelled",
        message: "Ticket wurde storniert",
        ticket: {
          id: ticket.id,
          buyer_name: ticket.buyer_name,
          buyer_email: ticket.buyer_email,
          quantity: ticket.quantity,
          event_id: ticket.event_id,
          event_title: ticket.events?.title,
          event_date: ticket.events?.date,
          event_time: ticket.events?.time,
          ticket_type: ticket.ticket_types?.name || "Standard",
          qr_code: ticket.qr_code,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check already checked in
    if (ticket.checked_in) {
      return new Response(JSON.stringify({
        status: "already_redeemed",
        message: "Ticket bereits eingecheckt",
        ticket: {
          id: ticket.id,
          buyer_name: ticket.buyer_name,
          buyer_email: ticket.buyer_email,
          quantity: ticket.quantity,
          checked_in_at: ticket.checked_in_at,
          event_id: ticket.event_id,
          event_title: ticket.events?.title,
          event_date: ticket.events?.date,
          event_time: ticket.events?.time,
          ticket_type: ticket.ticket_types?.name || "Standard",
          qr_code: ticket.qr_code,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check wrong event (before check-in!)
    if (expected_event_id && ticket.event_id !== expected_event_id) {
      return new Response(JSON.stringify({
        status: "wrong_event",
        message: "Ticket gehört zu einem anderen Event",
        ticket: {
          id: ticket.id,
          buyer_name: ticket.buyer_name,
          buyer_email: ticket.buyer_email,
          quantity: ticket.quantity,
          event_id: ticket.event_id,
          event_title: ticket.events?.title,
          event_date: ticket.events?.date,
          event_time: ticket.events?.time,
          ticket_type: ticket.ticket_types?.name || "Standard",
          qr_code: ticket.qr_code,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check in the ticket
    const now = new Date().toISOString();
    await adminClient
      .from("tickets")
      .update({ checked_in: true, checked_in_at: now })
      .eq("id", ticket.id);

    return new Response(JSON.stringify({
      status: "success",
      message: "Ticket erfolgreich eingecheckt",
      ticket: {
        id: ticket.id,
        buyer_name: ticket.buyer_name,
        buyer_email: ticket.buyer_email,
        quantity: ticket.quantity,
        checked_in_at: now,
        event_id: ticket.event_id,
        event_title: ticket.events?.title,
        event_date: ticket.events?.date,
        event_time: ticket.events?.time,
        ticket_type: ticket.ticket_types?.name || "Standard",
        qr_code: ticket.qr_code,
        total_price: ticket.total_price,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-in-ticket error:", err);
    return new Response(JSON.stringify({ error: "Check-in failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
