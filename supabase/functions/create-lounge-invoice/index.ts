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
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch booking
    const { data: booking, error: bErr } = await admin
      .from("lounge_bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch event info
    const { data: event } = await admin
      .from("events")
      .select("title, date, time, vat_rate")
      .eq("id", booking.event_id)
      .single();

    // Fetch lounge info
    const { data: lounge } = await admin
      .from("lounges")
      .select("name, min_spend")
      .eq("id", booking.lounge_id)
      .single();

    // Fetch invoice config
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
    ].filter(Boolean).join(", ");

    // Generate invoice number
    let invoiceNumber: string | null = null;
    const { data: rpcResult, error: numErr } = await admin.rpc("generate_invoice_number");
    if (numErr) {
      // Fallback
      const { data: cfgRow } = await admin
        .from("invoice_config")
        .select("id, invoice_prefix, next_invoice_number")
        .limit(1)
        .single();
      if (!cfgRow) {
        return new Response(JSON.stringify({ error: "Failed to generate invoice number" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const prefix = cfgRow.invoice_prefix || "INV";
      const num = cfgRow.next_invoice_number || 1;
      invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(num).padStart(5, "0")}`;
      await admin
        .from("invoice_config")
        .update({ next_invoice_number: num + 1, updated_at: new Date().toISOString() })
        .eq("id", cfgRow.id);
    } else {
      invoiceNumber = rpcResult;
    }

    if (!invoiceNumber) {
      return new Response(JSON.stringify({ error: "Failed to generate invoice number" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vatRate = Number(event?.vat_rate) || 19;
    const amount = booking.deposit_amount || 0;
    const subtotal = +(amount / (1 + vatRate / 100)).toFixed(2);
    const vatAmount = +(amount - subtotal).toFixed(2);

    const now = new Date().toISOString();
    const loungeName = lounge?.name || "Lounge";
    const eventTitle = event?.title || "Event";

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        buyer_name: booking.user_name,
        buyer_email: booking.user_email,
        buyer_address: null,
        seller_name: sellerName,
        seller_address: sellerAddress,
        seller_tax_id: config?.tax_id || null,
        seller_vat_id: config?.vat_id || null,
        event_id: booking.event_id,
        ticket_id: null,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total: amount,
        status: "paid",
        issued_at: now,
        paid_at: now,
        notes: `Lounge-Buchung: ${loungeName} – ${eventTitle}`,
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

    // Create line item
    const { error: itemsErr } = await admin.from("invoice_line_items").insert({
      invoice_id: invoice.id,
      description: `${eventTitle} – ${loungeName} (Anzahlung / Mindestverzehr)`,
      quantity: 1,
      unit_price: subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      line_total: amount,
      sort_order: 0,
    });

    if (itemsErr) console.error("Line item insert error:", itemsErr);

    // Mark deposit as paid
    await admin
      .from("lounge_bookings")
      .update({ deposit_paid: true })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-lounge-invoice error:", err);
    return new Response(
      JSON.stringify({ error: "Invoice creation failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
