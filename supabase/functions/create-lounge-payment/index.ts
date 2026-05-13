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
      lounge_id,
      event_id,
      user_id,
      user_name,
      user_email,
      user_phone,
      guest_count,
      arrival_time,
      booking_type,
      deposit_amount,
      service_fee,
      total_amount,
      notes,
      redirect_url,
    } = await req.json();

    if (!lounge_id || !event_id || !user_email || !user_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up stale bookings (aborted/cancelled/expired) so the unique (lounge_id,event_id) constraint doesn't block a new attempt.
    // Keep only confirmed or deposit-paid bookings.
    await adminClient.from("lounge_bookings")
      .delete()
      .eq("lounge_id", lounge_id)
      .eq("event_id", event_id)
      .in("status", ["pending", "cancelled", "expired", "failed"])
      .eq("deposit_paid", false);

    // Create booking record as pending
    const { data: booking, error: insertErr } = await adminClient.from("lounge_bookings").insert({
      lounge_id,
      event_id,
      user_id: user_id || null,
      user_name,
      user_email,
      user_phone: user_phone || null,
      guest_count,
      arrival_time,
      booking_type,
      deposit_amount: deposit_amount || 0,
      deposit_paid: false,
      notes: notes || null,
      message: notes || null,
      agreed_terms: true,
      status: "pending",
    }).select("id").single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bookingId = booking.id;

    // Non-binding bookings don't need payment
    if (booking_type === "non_binding" || total_amount <= 0) {
      return new Response(JSON.stringify({ success: true, free: true, booking_id: bookingId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch event + lounge names for description
    const [eventRes, loungeRes] = await Promise.all([
      adminClient.from("events").select("title").eq("id", event_id).single(),
      adminClient.from("lounges").select("name").eq("id", lounge_id).single(),
    ]);
    const eventTitle = eventRes.data?.title || "Event";
    const loungeName = loungeRes.data?.name || "Lounge";

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
          value: total_amount.toFixed(2),
        },
        description: `Lounge ${loungeName} – ${eventTitle}`.substring(0, 255),
        redirectUrl: `${redirect_url}?payment=success&booking_id=${bookingId}`,
        webhookUrl,
        metadata: {
          type: "lounge_booking",
          booking_id: bookingId,
        },
      }),
    });

    if (!mollieRes.ok) {
      const errBody = await mollieRes.text();
      console.error("Mollie error:", errBody);
      await adminClient.from("lounge_bookings").delete().eq("id", bookingId);
      return new Response(JSON.stringify({ error: "Payment creation failed", details: errBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const molliePayment = await mollieRes.json();
    const checkoutUrl = molliePayment._links?.checkout?.href;

    if (!checkoutUrl) {
      await adminClient.from("lounge_bookings").delete().eq("id", bookingId);
      return new Response(JSON.stringify({ error: "No checkout URL returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ checkoutUrl, booking_id: bookingId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Failed", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
