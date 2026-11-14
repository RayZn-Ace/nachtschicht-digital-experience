import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { withDeadline, READ_FAILURE_EVENT } from "@/lib/readDeadline";

export type AppRole = "admin" | "user" | "scanner";

interface UseUserRolesReturn {
  roles: AppRole[];
  isAdmin: boolean;
  isScanner: boolean;
  loading: boolean;
}

export const useUserRoles = (): UseUserRolesReturn => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setRoles([]);
    setLoading(!!user);
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await withDeadline(supabase.from("user_roles").select("role").eq("user_id", user.id));
        if (error) throw error;
        if (current) setRoles((data || []).map((r) => r.role as AppRole));
      } catch {
        if (current) {
          setRoles([]);
          window.dispatchEvent(new Event(READ_FAILURE_EVENT));
        }
      } finally {
        if (current) setLoading(false);
      }
    };

    fetchRoles();
    return () => { current = false; };
  }, [user]);

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isScanner: roles.includes("scanner") || roles.includes("admin"),
    loading,
  };
};
