import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify caller is admin
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabase.auth.getUser(token);
  if (!caller) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: callerRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!callerRole) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action, ...payload } = await req.json();

  try {
    switch (action) {
      case "list_users": {
        const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        // Also fetch all roles (bypasses RLS with service role)
        const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
        return new Response(JSON.stringify({ users: data.users, roles: allRoles || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_user": {
        const { email, password, role } = payload;
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createError) throw createError;

        if (role) {
          await supabase.from("user_roles").insert({ user_id: userData.user.id, role });
        }

        return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_roles": {
        const { user_id, roles } = payload;
        // Delete existing roles
        await supabase.from("user_roles").delete().eq("user_id", user_id);
        // Insert new roles
        if (roles && roles.length > 0) {
          const rows = roles.map((role: string) => ({ user_id, role }));
          const { error } = await supabase.from("user_roles").insert(rows);
          if (error) throw error;
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id } = payload;
        await supabase.from("user_roles").delete().eq("user_id", user_id);
        const { error } = await supabase.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id, new_password } = payload;
        const { error } = await supabase.auth.admin.updateUserById(user_id, { password: new_password });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
