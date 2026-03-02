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
    const { ticket_ids } = await req.json();
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return new Response(JSON.stringify({ error: "ticket_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden – admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch tickets
    const { data: tickets, error: ticketsErr } = await admin
      .from("tickets")
      .select("*")
      .in("id", ticket_ids);

    if (ticketsErr || !tickets || tickets.length === 0) {
      return new Response(JSON.stringify({ error: "Tickets not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only cancel confirmed tickets
    const confirmable = tickets.filter((t: any) => t.status === "confirmed");
    if (confirmable.length === 0) {
      return new Response(JSON.stringify({ error: "No confirmed tickets to cancel" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ticketIdsToCancel = confirmable.map((t: any) => t.id);
    const firstTicket = confirmable[0];
    const eventId = firstTicket.event_id;

    // 2. Update ticket status to 'cancelled'
    const { error: updateErr } = await admin
      .from("tickets")
      .update({ status: "canceled" })
      .in("id", ticketIdsToCancel);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to cancel tickets", details: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Restore sold counts on ticket_types
    const soldRestoreMap: Record<string, number> = {};
    for (const t of confirmable) {
      if (t.ticket_type_id) {
        soldRestoreMap[t.ticket_type_id] = (soldRestoreMap[t.ticket_type_id] || 0) + t.quantity;
      }
    }

    for (const [typeId, qty] of Object.entries(soldRestoreMap)) {
      const { data: tt } = await admin.from("ticket_types").select("sold").eq("id", typeId).single();
      if (tt) {
        await admin.from("ticket_types").update({ sold: Math.max(0, tt.sold - qty) }).eq("id", typeId);
      }
    }

    // Also restore events.tickets_sold
    const totalQtyRestored = confirmable.reduce((s: number, t: any) => s + t.quantity, 0);
    const { data: ev } = await admin.from("events").select("tickets_sold").eq("id", eventId).single();
    if (ev) {
      await admin.from("events").update({ tickets_sold: Math.max(0, (ev.tickets_sold || 0) - totalQtyRestored) }).eq("id", eventId);
    }

    // 4. Find existing invoice for these tickets
    const { data: existingInvoice } = await admin
      .from("invoices")
      .select("*")
      .eq("ticket_id", firstTicket.id)
      .neq("status", "cancelled")
      .limit(1)
      .single();

    let cancellationInvoiceNumber: string | null = null;
    let cancellationInvoiceId: string | null = null;

    if (existingInvoice) {
      // 5. Generate cancellation invoice (Stornorechnung)
      const { data: config } = await admin
        .from("invoice_config")
        .select("*")
        .limit(1)
        .single();

      // Generate new invoice number
      let invoiceNumber: string | null = null;
      const { data: rpcResult, error: numErr } = await admin.rpc("generate_invoice_number");
      if (numErr) {
        const { data: cfgRow } = await admin
          .from("invoice_config")
          .select("id, invoice_prefix, next_invoice_number")
          .limit(1)
          .single();
        if (cfgRow) {
          const prefix = cfgRow.invoice_prefix || "INV";
          const num = cfgRow.next_invoice_number || 1;
          const year = new Date().getFullYear();
          invoiceNumber = `${prefix}-${year}-${String(num).padStart(5, "0")}`;
          await admin
            .from("invoice_config")
            .update({ next_invoice_number: num + 1, updated_at: new Date().toISOString() })
            .eq("id", cfgRow.id);
        }
      } else {
        invoiceNumber = rpcResult;
      }

      if (invoiceNumber) {
        const now = new Date().toISOString();

        // Create cancellation invoice with negative amounts
        const { data: cancelInv, error: cancelErr } = await admin
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            buyer_name: existingInvoice.buyer_name,
            buyer_email: existingInvoice.buyer_email,
            buyer_address: existingInvoice.buyer_address,
            seller_name: existingInvoice.seller_name,
            seller_address: existingInvoice.seller_address,
            seller_tax_id: existingInvoice.seller_tax_id,
            seller_vat_id: existingInvoice.seller_vat_id,
            event_id: eventId,
            ticket_id: firstTicket.id,
            subtotal: -existingInvoice.subtotal,
            vat_rate: existingInvoice.vat_rate,
            vat_amount: -existingInvoice.vat_amount,
            total: -existingInvoice.total,
            status: "cancelled",
            issued_at: now,
            cancelled_at: now,
            cancellation_invoice_id: existingInvoice.id,
            notes: `Stornorechnung zu ${existingInvoice.invoice_number}`,
          })
          .select("id")
          .single();

        if (!cancelErr && cancelInv) {
          cancellationInvoiceId = cancelInv.id;
          cancellationInvoiceNumber = invoiceNumber;

          // Copy line items with negative amounts
          const { data: origItems } = await admin
            .from("invoice_line_items")
            .select("*")
            .eq("invoice_id", existingInvoice.id)
            .order("sort_order");

          if (origItems && origItems.length > 0) {
            const cancelItems = origItems.map((item: any) => ({
              invoice_id: cancelInv.id,
              description: `Storno: ${item.description}`,
              quantity: item.quantity,
              unit_price: -item.unit_price,
              vat_rate: item.vat_rate,
              vat_amount: -item.vat_amount,
              line_total: -item.line_total,
              sort_order: item.sort_order,
            }));
            await admin.from("invoice_line_items").insert(cancelItems);
          }

          // Mark original invoice as cancelled
          await admin
            .from("invoices")
            .update({
              status: "cancelled",
              cancelled_at: now,
              cancellation_invoice_id: cancelInv.id,
            })
            .eq("id", existingInvoice.id);
        } else {
          console.error("Cancellation invoice error:", cancelErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_count: ticketIdsToCancel.length,
        restored_quantity: totalQtyRestored,
        cancellation_invoice_id: cancellationInvoiceId,
        cancellation_invoice_number: cancellationInvoiceNumber,
        had_invoice: !!existingInvoice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cancel-ticket error:", err);
    return new Response(
      JSON.stringify({ error: "Cancellation failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
