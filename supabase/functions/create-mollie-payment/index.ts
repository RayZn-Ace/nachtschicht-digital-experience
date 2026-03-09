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
    const mollieApiKey = Deno.env.get("MOLLIE_API_KEY");
    if (!mollieApiKey) {
      return new Response(JSON.stringify({ error: "MOLLIE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      event_id,
      user_id,
      cart,
      guest_name,
      guest_email,
      guest_phone,
      discount_code_id,
      final_total,
      total_fees,
      discount,
      raw_total,
      use_global_price,
      global_quantity,
      redirect_url,
    } = await req.json();

    if (!event_id || !guest_email || !guest_name || final_total == null) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For free tickets, create directly as confirmed
    if (final_total <= 0) {
      const qrCode = `TKT-${crypto.randomUUID()}`;
      let ticketIds: string[] = [];

      if (use_global_price) {
        const { data, error } = await adminClient.from("tickets").insert({
          event_id,
          user_id: user_id || null,
          quantity: global_quantity,
          total_price: 0,
          fee_amount: 0,
          buyer_email: guest_email,
          buyer_name: guest_name,
          buyer_phone: guest_phone || null,
          qr_code: qrCode,
          discount_code_id: discount_code_id || null,
          status: "confirmed",
        }).select("id");
        if (error) throw error;
        if (data) ticketIds = data.map((t: any) => t.id);
      } else {
        const inserts = Object.entries(cart as Record<string, { quantity: number; price: number; ticket_type_id: string }>)
          .filter(([_, item]) => item.quantity > 0)
          .map(([_, item]) => {
            const ticketSubtotal = item.price * item.quantity;
            const ticketDiscount = discount && raw_total > 0 ? discount * (ticketSubtotal / raw_total) : 0;
            const ticketFee = raw_total > 0 ? total_fees * (ticketSubtotal / raw_total) : 0;
            return {
              event_id,
              user_id: user_id || null,
              ticket_type_id: item.ticket_type_id,
              quantity: item.quantity,
              total_price: 0,
              fee_amount: 0,
              buyer_email: guest_email,
              buyer_name: guest_name,
              buyer_phone: guest_phone || null,
              qr_code: `TKT-${crypto.randomUUID()}`,
              discount_code_id: discount_code_id || null,
              status: "confirmed",
            };
          });
        const { data, error } = await adminClient.from("tickets").insert(inserts).select("id");
        if (error) throw error;
        if (data) ticketIds = data.map((t: any) => t.id);
      }

      // Increment discount uses
      if (discount_code_id) {
        const { data: dc } = await adminClient
          .from("discount_codes")
          .select("uses")
          .eq("id", discount_code_id)
          .single();
        if (dc) {
          await adminClient
            .from("discount_codes")
            .update({ uses: (dc as any).uses + 1 })
            .eq("id", discount_code_id);
        }
      }

      // Fire-and-forget: invoice + email
      if (ticketIds.length > 0) {
        fetch(`${supabaseUrl}/functions/v1/create-invoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ ticket_ids: ticketIds }),
        }).catch(console.error);
        fetch(`${supabaseUrl}/functions/v1/send-ticket-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ ticket_ids: ticketIds }),
        }).catch(console.error);
      }

      return new Response(JSON.stringify({ success: true, free: true, ticket_ids: ticketIds, qr_code: qrCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Paid tickets: create as pending, then create Mollie payment
    let ticketIds: string[] = [];
    const qrCode = `TKT-${crypto.randomUUID()}`;

    if (use_global_price) {
      const { data, error } = await adminClient.from("tickets").insert({
        event_id,
        user_id: user_id || null,
        quantity: global_quantity,
        total_price: final_total,
        fee_amount: total_fees || 0,
        buyer_email: guest_email,
        buyer_name: guest_name,
        buyer_phone: guest_phone || null,
        qr_code: qrCode,
        discount_code_id: discount_code_id || null,
        status: "pending",
      }).select("id");
      if (error) throw error;
      if (data) ticketIds = data.map((t: any) => t.id);
    } else {
      const inserts = Object.entries(cart as Record<string, { quantity: number; price: number; ticket_type_id: string }>)
        .filter(([_, item]) => item.quantity > 0)
        .map(([_, item]) => {
          const ticketSubtotal = item.price * item.quantity;
          const ticketDiscount = discount && raw_total > 0 ? discount * (ticketSubtotal / raw_total) : 0;
          const ticketFee = raw_total > 0 ? total_fees * (ticketSubtotal / raw_total) : 0;
          return {
            event_id,
            user_id: user_id || null,
            ticket_type_id: item.ticket_type_id,
            quantity: item.quantity,
            total_price: +(ticketSubtotal - ticketDiscount + ticketFee).toFixed(2),
            fee_amount: +ticketFee.toFixed(2),
            buyer_email: guest_email,
            buyer_name: guest_name,
            buyer_phone: guest_phone || null,
            qr_code: `TKT-${crypto.randomUUID()}`,
            discount_code_id: discount_code_id || null,
            status: "pending",
          };
        });
      const { data, error } = await adminClient.from("tickets").insert(inserts).select("id");
      if (error) throw error;
      if (data) ticketIds = data.map((t: any) => t.id);
    }

    // Fetch event title for Mollie description
    const { data: eventData } = await adminClient.from("events").select("title").eq("id", event_id).single();
    const eventTitle = eventData?.title || "Ticket";

    // Create Mollie payment
    const webhookUrl = `${supabaseUrl}/functions/v1/mollie-webhook`;
    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mollieApiKey}`,
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: final_total.toFixed(2),
        },
        description: `Ticket: ${eventTitle}`.substring(0, 255),
        redirectUrl: `${redirect_url}?payment=success&ticket_ids=${ticketIds.join(",")}`,
        webhookUrl,
        metadata: {
          ticket_ids: ticketIds,
          discount_code_id: discount_code_id || null,
        },
      }),
    });

    if (!mollieRes.ok) {
      const errBody = await mollieRes.text();
      console.error("Mollie error:", errBody);
      // Cleanup: delete pending tickets
      await adminClient.from("tickets").delete().in("id", ticketIds);
      return new Response(JSON.stringify({ error: "Payment creation failed", details: errBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const molliePayment = await mollieRes.json();
    const checkoutUrl = molliePayment._links?.checkout?.href;

    if (!checkoutUrl) {
      await adminClient.from("tickets").delete().in("id", ticketIds);
      return new Response(JSON.stringify({ error: "No checkout URL returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ checkoutUrl, ticket_ids: ticketIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Failed", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
