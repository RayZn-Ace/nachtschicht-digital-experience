import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Only existing admins may create new admin accounts
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const { data: { user: caller } } = await supabase.auth.getUser(token);
  if (!caller) return json({ error: "Unauthorized" }, 401);
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: caller.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const { email, password } = await req.json();
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return json({ error: "Invalid input" }, 400);
  }

  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) return json({ error: createError.message }, 400);

  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: userData.user.id, role: "admin" });
  if (roleError) return json({ error: roleError.message }, 400);

  return json({ success: true, user_id: userData.user.id });
});
