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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user with their JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reason } = await req.json().catch(() => ({ reason: null }));

    // Use service role for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const userId = user.id;
    const anonymizedEmail = `deleted-user-${userId.slice(0, 8)}@example.invalid`;

    // 1. Anonymize profile data (soft delete)
    await adminClient.from("profiles").update({
      first_name: null,
      last_name: null,
      display_name: "Gelöschter Nutzer",
      email: anonymizedEmail,
      salutation: null,
      birthday: null,
      avatar_url: null,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      gdpr_consent_at: null,
      gdpr_agb_consent_at: null,
    }).eq("user_id", userId);

    // 2. Anonymize buyer info on tickets (but keep financial data intact)
    await adminClient.from("tickets").update({
      buyer_name: "Gelöschter Nutzer",
      buyer_email: anonymizedEmail,
    }).eq("user_id", userId);

    // 3. Log the deletion
    await adminClient.from("account_deletions").insert({
      user_id: userId,
      method: "self-service",
      reason: reason || null,
    });

    // 4. Delete the auth user (this invalidates all sessions/tokens)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Account deletion failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
