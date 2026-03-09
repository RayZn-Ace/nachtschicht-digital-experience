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
      return new Response("MOLLIE_API_KEY not configured", { status: 500 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Mollie sends payment ID as form-encoded body
    const formData = await req.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      return new Response("Missing payment id", { status: 400 });
    }

    // Fetch payment status from Mollie
    const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mollieApiKey}` },
    });

    if (!mollieRes.ok) {
      console.error("Failed to fetch Mollie payment:", await mollieRes.text());
      return new Response("Failed to fetch payment", { status: 500 });
    }

    const payment = await mollieRes.json();
    const paymentType = payment.metadata?.type || "ticket";

    // ─── LOUNGE BOOKING PAYMENTS ───
    if (paymentType === "lounge_booking") {
      const bookingId: string = payment.metadata?.booking_id;
      if (!bookingId) {
        console.error("No booking_id in lounge payment metadata");
        return new Response("OK", { status: 200 });
      }

      if (payment.status === "paid") {
        const { error: updateErr } = await adminClient
          .from("lounge_bookings")
          .update({ deposit_paid: true, status: "confirmed" })
          .eq("id", bookingId)
          .eq("status", "pending");

        if (updateErr) {
          console.error("Failed to confirm lounge booking:", updateErr);
          return new Response("DB error", { status: 500 });
        }

        // Fire-and-forget: send booking email + create invoice
        fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ booking_id: bookingId }),
        }).catch(console.error);

        fetch(`${supabaseUrl}/functions/v1/create-lounge-invoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ booking_id: bookingId }),
        }).catch(console.error);

        console.log(`Lounge payment ${paymentId} confirmed for booking ${bookingId}`);
      } else if (payment.status === "failed" || payment.status === "canceled" || payment.status === "expired") {
        await adminClient
          .from("lounge_bookings")
          .update({ status: "cancelled" })
          .eq("id", bookingId)
          .eq("status", "pending");

        console.log(`Lounge payment ${paymentId} ${payment.status} – booking cancelled`);
      }

      return new Response("OK", { status: 200 });
    }

    // ─── TICKET PAYMENTS (existing logic) ───
    const ticketIds: string[] = payment.metadata?.ticket_ids || [];
    const discountCodeId: string | null = payment.metadata?.discount_code_id || null;

    if (ticketIds.length === 0) {
      console.error("No ticket_ids in payment metadata");
      return new Response("OK", { status: 200 });
    }

    if (payment.status === "paid") {
      // Update tickets to confirmed
      const { error: updateErr } = await adminClient
        .from("tickets")
        .update({ status: "confirmed" })
        .in("id", ticketIds)
        .eq("status", "pending");

      if (updateErr) {
        console.error("Failed to confirm tickets:", updateErr);
        return new Response("DB error", { status: 500 });
      }

      // Increment discount uses
      if (discountCodeId) {
        const { data: dc } = await adminClient
          .from("discount_codes")
          .select("uses")
          .eq("id", discountCodeId)
          .single();
        if (dc) {
          await adminClient
            .from("discount_codes")
            .update({ uses: (dc as any).uses + 1 })
            .eq("id", discountCodeId);
        }
      }

      // Create invoice + send email (fire-and-forget)
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

      console.log(`Payment ${paymentId} confirmed for tickets: ${ticketIds.join(", ")}`);
    } else if (payment.status === "failed" || payment.status === "canceled" || payment.status === "expired") {
      // Mark tickets as cancelled
      await adminClient
        .from("tickets")
        .update({ status: "cancelled" })
        .in("id", ticketIds)
        .eq("status", "pending");

      console.log(`Payment ${paymentId} ${payment.status} – tickets cancelled`);
    }

    // Mollie expects 200 OK
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});
