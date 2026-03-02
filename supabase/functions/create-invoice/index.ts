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

    // Fetch all tickets
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

    // All tickets belong to the same event & buyer
    const firstTicket = tickets[0];
    const eventId = firstTicket.event_id;

    // Fetch event for title & VAT rate
    const { data: event } = await admin
      .from("events")
      .select("title, date, time, vat_rate")
      .eq("id", eventId)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ticket type names if applicable
    const typeIds = tickets.map((t: any) => t.ticket_type_id).filter(Boolean);
    let ticketTypeMap: Record<string, string> = {};
    if (typeIds.length > 0) {
      const { data: types } = await admin
        .from("ticket_types")
        .select("id, name")
        .in("id", typeIds);
      if (types) {
        for (const t of types) {
          ticketTypeMap[t.id] = t.name;
        }
      }
    }

    // Fetch invoice config for seller info
    const { data: config } = await admin
      .from("invoice_config")
      .select("*")
      .limit(1)
      .single();

    const sellerName = config?.company_name || "Nachtschicht Kaiserslautern";
    const sellerAddress = [
      config?.company_address,
      [config?.company_zip, config?.company_city].filter(Boolean).join(" "),
      config?.company_country,
    ]
      .filter(Boolean)
      .join(", ");

    // Build buyer address from ticket billing fields
    const buyerAddress = [
      firstTicket.billing_name,
      firstTicket.billing_street,
      [firstTicket.billing_zip, firstTicket.billing_city].filter(Boolean).join(" "),
      firstTicket.billing_country && firstTicket.billing_country !== "Deutschland"
        ? firstTicket.billing_country
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Generate invoice number
    let invoiceNumber: string | null = null;
    const { data: rpcResult, error: numErr } = await admin.rpc("generate_invoice_number");
    if (numErr) {
      console.error("RPC generate_invoice_number failed:", numErr);
      const { data: cfgRow, error: cfgErr } = await admin
        .from("invoice_config")
        .select("id, invoice_prefix, next_invoice_number")
        .limit(1)
        .single();
      if (cfgErr || !cfgRow) {
        return new Response(
          JSON.stringify({ error: "Failed to generate invoice number", details: numErr?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const prefix = cfgRow.invoice_prefix || "INV";
      const num = cfgRow.next_invoice_number || 1;
      const year = new Date().getFullYear();
      invoiceNumber = `${prefix}-${year}-${String(num).padStart(5, "0")}`;
      await admin
        .from("invoice_config")
        .update({ next_invoice_number: num + 1, updated_at: new Date().toISOString() })
        .eq("id", cfgRow.id);
    } else {
      invoiceNumber = rpcResult;
    }

    if (!invoiceNumber) {
      return new Response(
        JSON.stringify({ error: "Failed to generate invoice number" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate totals
    const vatRate = Number(event.vat_rate) || 19;
    const totalBrutto = tickets.reduce((s: number, t: any) => s + Number(t.total_price), 0);
    const totalFees = tickets.reduce((s: number, t: any) => s + Number(t.fee_amount || 0), 0);
    const ticketBruttoExFees = totalBrutto - totalFees;
    const subtotal = +(totalBrutto / (1 + vatRate / 100)).toFixed(2);
    const vatAmount = +(totalBrutto - subtotal).toFixed(2);

    const primaryTicketId = tickets[0].id;

    // Create invoice
    const now = new Date().toISOString();
    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        buyer_name: firstTicket.buyer_name || firstTicket.buyer_email,
        buyer_email: firstTicket.buyer_email,
        buyer_address: buyerAddress || null,
        seller_name: sellerName,
        seller_address: sellerAddress,
        seller_tax_id: config?.tax_id || null,
        seller_vat_id: config?.vat_id || null,
        event_id: eventId,
        ticket_id: primaryTicketId,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total: totalBrutto,
        status: "paid",
        issued_at: now,
        paid_at: now,
      })
      .select("id")
      .single();

    if (invErr || !invoice) {
      console.error("Invoice insert error:", invErr);
      return new Response(
        JSON.stringify({ error: "Failed to create invoice", details: invErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create line items – one per ticket row (ticket price lines)
    const lineItems: any[] = [];
    let sortIdx = 0;

    tickets.forEach((t: any) => {
      const typeName = t.ticket_type_id
        ? ticketTypeMap[t.ticket_type_id] || "Ticket"
        : "Eintrittskarte";
      const ticketFee = Number(t.fee_amount || 0);
      const ticketBrutto = Number(t.total_price) - ticketFee;
      const ticketNetto = +(ticketBrutto / (1 + vatRate / 100)).toFixed(2);
      const ticketVat = +(ticketBrutto - ticketNetto).toFixed(2);
      const unitPriceBrutto = t.quantity > 0 ? +(ticketBrutto / t.quantity).toFixed(2) : 0;
      const unitPriceNetto = +(unitPriceBrutto / (1 + vatRate / 100)).toFixed(2);

      lineItems.push({
        invoice_id: invoice.id,
        description: `${event.title} – ${typeName}`,
        quantity: t.quantity,
        unit_price: unitPriceNetto,
        vat_rate: vatRate,
        vat_amount: ticketVat,
        line_total: ticketBrutto,
        sort_order: sortIdx++,
      });
    });

    // Add fee as separate line item if any
    if (totalFees > 0) {
      const feeNetto = +(totalFees / (1 + vatRate / 100)).toFixed(2);
      const feeVat = +(totalFees - feeNetto).toFixed(2);
      lineItems.push({
        invoice_id: invoice.id,
        description: "Servicegebühr",
        quantity: 1,
        unit_price: feeNetto,
        vat_rate: vatRate,
        vat_amount: feeVat,
        line_total: totalFees,
        sort_order: sortIdx++,
      });
    }

    const { error: itemsErr } = await admin
      .from("invoice_line_items")
      .insert(lineItems);

    if (itemsErr) {
      console.error("Line items insert error:", itemsErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-invoice error:", err);
    return new Response(
      JSON.stringify({ error: "Invoice creation failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
