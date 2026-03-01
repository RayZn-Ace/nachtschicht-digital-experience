import { useAuth } from "@/hooks/useAuth";
import { LogOut, Shield } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRoles";

interface AdminSessionBarProps {
  roles: AppRole[];
}

const AdminSessionBar = ({ roles }: AdminSessionBarProps) => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border rounded-t-xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield size={14} />
        <span>{user?.email}</span>
        {roles.map((role) => (
          <span
            key={role}
            className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-medium uppercase tracking-wider"
          >
            {role}
          </span>
        ))}
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Abmelden"
      >
        <LogOut size={14} /> Abmelden
      </button>
    </div>
  );
};

export default AdminSessionBar;
