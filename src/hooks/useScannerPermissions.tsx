import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

export interface ScannerPermissions {
  canScan: boolean;
  showStats: boolean;
  showGuestName: boolean;
  showGuestEmail: boolean;
  showTicketType: boolean;
  showEventInfo: boolean;
  loading: boolean;
}

export const useScannerPermissions = (): ScannerPermissions => {
  const { user } = useAuth();
  const { roles, isAdmin, loading: rolesLoading } = useUserRoles();
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rolesLoading || !user) {
      setLoading(rolesLoading);
      return;
    }

    // Admins get everything
    if (isAdmin) {
      setPerms({
        "scanner.scan": true,
        "scanner.stats": true,
        "scanner.guest_name": true,
        "scanner.guest_email": true,
        "scanner.ticket_type": true,
        "scanner.event_info": true,
      });
      setLoading(false);
      return;
    }

    const fetchPerms = async () => {
      // Get all role_permissions for the user's roles that start with scanner.
      const { data: rolePermsData } = await supabase
        .from("role_permissions")
        .select("permission_id, role")
        .in("role", roles);

      if (!rolePermsData || rolePermsData.length === 0) {
        setPerms({});
        setLoading(false);
        return;
      }

      const permIds = rolePermsData.map((rp) => rp.permission_id);

      const { data: permData } = await supabase
        .from("permissions")
        .select("key")
        .in("id", permIds)
        .like("key", "scanner.%");

      const map: Record<string, boolean> = {};
      (permData || []).forEach((p) => {
        map[p.key] = true;
      });
      setPerms(map);
      setLoading(false);
    };

    fetchPerms();
  }, [user, roles, isAdmin, rolesLoading]);

  return {
    canScan: perms["scanner.scan"] ?? false,
    showStats: perms["scanner.stats"] ?? false,
    showGuestName: perms["scanner.guest_name"] ?? false,
    showGuestEmail: perms["scanner.guest_email"] ?? false,
    showTicketType: perms["scanner.ticket_type"] ?? false,
    showEventInfo: perms["scanner.event_info"] ?? false,
    loading,
  };
};
