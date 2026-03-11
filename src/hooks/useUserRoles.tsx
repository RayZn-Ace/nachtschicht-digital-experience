import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      setRoles((data || []).map((r) => r.role as AppRole));
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isScanner: roles.includes("scanner") || roles.includes("admin"),
    loading,
  };
};
