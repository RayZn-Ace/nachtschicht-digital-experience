import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_URL = "https://qsjmnnnhfeupsxptjvsa.supabase.co/functions/v1/sync-inbound";
const SOURCE_PROJECT = "nachtaktiv";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auth: either service-role internal call or admin user
  const authHeader = req.headers.get("authorization");
  const isInternalCall = req.headers.get("x-internal-call") === "true";

  if (!isInternalCall && authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { type } = await req.json();

    if (!["events", "ticket_categories", "orders", "tickets", "event_series"].includes(type)) {
      return new Response(JSON.stringify({ error: `Unknown sync type: ${type}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read data from local DB
    let data: any[] = [];
    let error: any = null;

    switch (type) {
      case "events": {
        const res = await supabase.from("events").select("*");
        data = res.data || [];
        error = res.error;
        break;
      }
      case "ticket_categories": {
        const res = await supabase.from("ticket_types").select("*");
        data = res.data || [];
        error = res.error;
        break;
      }
      case "orders": {
        // Orders = tickets with buyer info (the purchase records)
        const res = await supabase.from("tickets").select("*");
        data = res.data || [];
        error = res.error;
        break;
      }
      case "tickets": {
        const res = await supabase.from("tickets").select("*");
        data = res.data || [];
        error = res.error;
        break;
      }
      case "event_series": {
        // Event tags as series
        const res = await supabase.from("event_tags").select("*");
        data = res.data || [];
        error = res.error;
        break;
      }
    }

    if (error) {
      throw new Error(`DB read error: ${error.message}`);
    }

    // Send to target
    const syncKey = Deno.env.get("SYNC_API_KEY");
    if (!syncKey) {
      throw new Error("SYNC_API_KEY secret not configured");
    }

    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-key": syncKey,
      },
      body: JSON.stringify({
        type,
        data,
        source_project: SOURCE_PROJECT,
      }),
    });

    const result = await response.text();

    return new Response(JSON.stringify({
      success: true,
      type,
      records_sent: data.length,
      target_status: response.status,
      target_response: result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
