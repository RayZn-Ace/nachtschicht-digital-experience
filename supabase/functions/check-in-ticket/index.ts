import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { ticketIdBounds, qrPrefix, canCheckIn } from "./lookup.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Missing configuration");

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

    const body = await req.json();
    const rawInput = body.qr_code || body.ticket_number;
    const expected_event_id = body.expected_event_id;
    if (typeof rawInput !== "string" || rawInput.trim().length < 6 || rawInput.length > 200 ||
        (expected_event_id !== undefined && (typeof expected_event_id !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(expected_event_id)))) {
      return new Response(JSON.stringify({ error: "Invalid ticket number or event" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const searchValue = rawInput.trim();
    const selection = "*, events(title, date, time), ticket_types(name)";
    const { data: byQr, error: qrError } = await adminClient.from("tickets")
      .select(selection).eq("qr_code", searchValue).limit(2);
    if (qrError) throw new Error("Ticket lookup failed");
    let matches = byQr || [];
    const bounds = ticketIdBounds(searchValue);
    if (!matches.length && bounds) {
      const { data, error } = await adminClient.from("tickets").select(selection)
        .gte("id", bounds.lower).lte("id", bounds.upper).limit(2);
      if (error) throw new Error("Ticket lookup failed");
      matches = data || [];
    }
    const prefix = qrPrefix(searchValue);
    if (!matches.length && prefix) {
      const { data, error } = await adminClient.from("tickets").select(selection)
        .ilike("qr_code", prefix).limit(2);
      if (error) throw new Error("Ticket lookup failed");
      matches = data || [];
    }
    if (matches.length > 1) {
      return new Response(JSON.stringify({ status: "invalid", message: "Ticketnummer nicht eindeutig. Bitte vollständigen QR-Code verwenden." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ticket = matches[0];

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

    if (!canCheckIn(ticket.status)) {
      return new Response(JSON.stringify({ status: "invalid", message: "Ticket ist nicht bezahlt oder bestätigt" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check in the ticket
    const now = new Date().toISOString();
    const { data: checked, error: checkError } = await adminClient
      .from("tickets")
      .update({ checked_in: true, checked_in_at: now })
      .eq("id", ticket.id)
      .eq("checked_in", false)
      .in("status", ["confirmed", "paid"])
      .select("id")
      .maybeSingle();
    if (checkError) throw new Error("Check-in write failed");
    if (!checked) return new Response(JSON.stringify({ status: "invalid", message: "Ticketstatus hat sich geändert. Bitte erneut prüfen." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

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
    console.error("check-in-ticket failed");
    return new Response(JSON.stringify({ error: "Check-in failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
