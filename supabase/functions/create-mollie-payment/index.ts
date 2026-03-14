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

    // Helper: create individual ticket rows (one per unit) instead of one row with quantity > 1
    function buildIndividualInserts(
      baseFields: Record<string, any>,
      quantity: number,
      totalPrice: number,
      feeAmount: number,
      ticketTypeId?: string,
    ) {
      const pricePerTicket = +(totalPrice / quantity).toFixed(2);
      const feePerTicket = +(feeAmount / quantity).toFixed(2);
      const inserts = [];
      for (let i = 0; i < quantity; i++) {
        inserts.push({
          ...baseFields,
          ticket_type_id: ticketTypeId || null,
          quantity: 1,
          total_price: pricePerTicket,
          fee_amount: feePerTicket,
          qr_code: `TKT-${crypto.randomUUID()}`,
        });
      }
      return inserts;
    }

    // For free tickets, create directly as confirmed
    if (final_total <= 0) {
      let inserts: any[] = [];

      if (use_global_price) {
        inserts = buildIndividualInserts(
          {
            event_id,
            user_id: user_id || null,
            buyer_email: guest_email,
            buyer_name: guest_name,
            buyer_phone: guest_phone || null,
            discount_code_id: discount_code_id || null,
            status: "confirmed",
          },
          global_quantity,
          0,
          0,
        );
      } else {
        for (const [_, item] of Object.entries(cart as Record<string, { quantity: number; price: number; ticket_type_id: string }>)) {
          if (item.quantity <= 0) continue;
          inserts.push(...buildIndividualInserts(
            {
              event_id,
              user_id: user_id || null,
              buyer_email: guest_email,
              buyer_name: guest_name,
              buyer_phone: guest_phone || null,
              discount_code_id: discount_code_id || null,
              status: "confirmed",
            },
            item.quantity,
            0,
            0,
            item.ticket_type_id,
          ));
        }
      }

      const { data, error } = await adminClient.from("tickets").insert(inserts).select("id");
      if (error) throw error;
      const ticketIds = data?.map((t: any) => t.id) || [];

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

      return new Response(JSON.stringify({ success: true, free: true, ticket_ids: ticketIds }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Paid tickets: create as pending, then create Mollie payment
    let inserts: any[] = [];

    if (use_global_price) {
      inserts = buildIndividualInserts(
        {
          event_id,
          user_id: user_id || null,
          buyer_email: guest_email,
          buyer_name: guest_name,
          buyer_phone: guest_phone || null,
          discount_code_id: discount_code_id || null,
          status: "pending",
        },
        global_quantity,
        final_total,
        total_fees || 0,
      );
    } else {
      for (const [_, item] of Object.entries(cart as Record<string, { quantity: number; price: number; ticket_type_id: string }>)) {
        if (item.quantity <= 0) continue;
        const ticketSubtotal = item.price * item.quantity;
        const ticketDiscount = discount && raw_total > 0 ? discount * (ticketSubtotal / raw_total) : 0;
        const ticketFee = raw_total > 0 ? total_fees * (ticketSubtotal / raw_total) : 0;
        const totalForType = +(ticketSubtotal - ticketDiscount + ticketFee).toFixed(2);
        inserts.push(...buildIndividualInserts(
          {
            event_id,
            user_id: user_id || null,
            buyer_email: guest_email,
            buyer_name: guest_name,
            buyer_phone: guest_phone || null,
            discount_code_id: discount_code_id || null,
            status: "pending",
          },
          item.quantity,
          totalForType,
          +ticketFee.toFixed(2),
          item.ticket_type_id,
        ));
      }
    }

    const { data, error } = await adminClient.from("tickets").insert(inserts).select("id");
    if (error) throw error;
    const ticketIds = data?.map((t: any) => t.id) || [];

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
