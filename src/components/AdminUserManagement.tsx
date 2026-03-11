import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Key, Users, Lock, RefreshCw, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface Permission {
  id: string;
  key: string;
  label: string;
  group_name: string;
}

interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
}

const ROLES = ["admin", "user"] as const;

const AdminUserManagement = () => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("user");

  // New permission form
  const [showPermForm, setShowPermForm] = useState(false);
  const [newPermKey, setNewPermKey] = useState("");
  const [newPermLabel, setNewPermLabel] = useState("");
  const [newPermGroup, setNewPermGroup] = useState("");

  // Expanded role in permissions tab
  const [expandedRole, setExpandedRole] = useState<string | null>("admin");

  const fetchUsers = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "list_users" },
    });
    if (error) { toast.error("Fehler beim Laden der Benutzer"); return; }
    setUsers(data.users || []);
  };

  const fetchUserRoles = async () => {
    // We need admin access to see all roles - use the edge function
    // For now fetch from user_roles table (admin has ALL access)
    const { data } = await supabase.from("user_roles").select("user_id, role");
    const map: Record<string, string[]> = {};
    (data || []).forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r.role);
    });
    setUserRoles(map);
  };

  const fetchPermissions = async () => {
    const { data } = await supabase.from("permissions").select("*").order("group_name, key");
    setPermissions((data as any) || []);
  };

  const fetchRolePermissions = async () => {
    const { data } = await supabase.from("role_permissions").select("*");
    setRolePermissions((data as any) || []);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchUserRoles(), fetchPermissions(), fetchRolePermissions()]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) { toast.error("E-Mail und Passwort sind erforderlich"); return; }
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "create_user", email: newEmail, password: newPassword, role: newRole },
    });
    if (error || data?.error) { toast.error(data?.error || "Fehler"); return; }
    toast.success("Benutzer erstellt!");
    setNewEmail(""); setNewPassword(""); setNewRole("user"); setShowCreateForm(false);
    loadAll();
  };

  const handleUpdateRoles = async (userId: string, roles: string[]) => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "update_roles", user_id: userId, roles },
    });
    if (error || data?.error) { toast.error(data?.error || "Fehler"); return; }
    toast.success("Rollen aktualisiert!");
    fetchUserRoles();
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Benutzer "${email}" wirklich löschen?`)) return;
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete_user", user_id: userId },
    });
    if (error || data?.error) { toast.error(data?.error || "Fehler"); return; }
    toast.success("Benutzer gelöscht!");
    loadAll();
  };

  const handleResetPassword = async (userId: string) => {
    const pw = prompt("Neues Passwort eingeben:");
    if (!pw) return;
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "reset_password", user_id: userId, new_password: pw },
    });
    if (error || data?.error) { toast.error(data?.error || "Fehler"); return; }
    toast.success("Passwort zurückgesetzt!");
  };

  const toggleRolePermission = async (role: string, permissionId: string) => {
    const existing = rolePermissions.find(rp => rp.role === role && rp.permission_id === permissionId);
    if (existing) {
      await supabase.from("role_permissions").delete().eq("id", existing.id);
    } else {
      await supabase.from("role_permissions").insert({ role, permission_id: permissionId } as any);
    }
    fetchRolePermissions();
  };

  const handleCreatePermission = async () => {
    if (!newPermKey || !newPermLabel) { toast.error("Key und Label sind erforderlich"); return; }
    const { error } = await supabase.from("permissions").insert({
      key: newPermKey, label: newPermLabel, group_name: newPermGroup || "Allgemein",
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Berechtigung erstellt!");
    setNewPermKey(""); setNewPermLabel(""); setNewPermGroup(""); setShowPermForm(false);
    fetchPermissions();
  };

  const handleDeletePermission = async (id: string, label: string) => {
    if (!confirm(`Berechtigung "${label}" löschen?`)) return;
    await supabase.from("role_permissions").delete().eq("permission_id", id);
    await supabase.from("permissions").delete().eq("id", id);
    toast.success("Gelöscht!");
    fetchPermissions();
    fetchRolePermissions();
  };

  // Group permissions by group_name
  const permGroups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.group_name]) acc[p.group_name] = [];
    acc[p.group_name].push(p);
    return acc;
  }, {});

  if (loading) return <div className="text-muted-foreground p-8">Laden...</div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="users" className="gap-2"><Users size={14} /> Benutzer</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2"><Shield size={14} /> Rollen & Rechte</TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wider text-foreground">BENUTZER</h2>
            <div className="flex gap-2">
              <button onClick={loadAll} className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground">
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                <Plus size={16} /> Neuer Benutzer
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="glass-card p-5 space-y-3 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground">Neuen Benutzer anlegen</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="email" placeholder="E-Mail" value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
                />
                <input
                  type="password" placeholder="Passwort" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
                />
                <select
                  value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateUser} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                  Erstellen
                </button>
                <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Users table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">E-Mail</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Rollen</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Erstellt</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Letzter Login</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const roles = userRoles[u.id] || [];
                    return (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="px-4 py-3 text-foreground font-medium">{u.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {ROLES.map(role => {
                              const active = roles.includes(role);
                              return (
                                <button
                                  key={role}
                                  onClick={() => {
                                    const newRoles = active
                                      ? roles.filter(r => r !== role)
                                      : [...roles, role];
                                    handleUpdateRoles(u.id, newRoles);
                                  }}
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                    active
                                      ? role === "admin"
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "bg-accent/20 text-accent-foreground border border-accent/30"
                                      : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                                  }`}
                                >
                                  {role}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("de-DE")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("de-DE") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleResetPassword(u.id)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Passwort zurücksetzen"
                            >
                              <Key size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Benutzer löschen"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── PERMISSIONS TAB ── */}
        <TabsContent value="permissions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wider text-foreground">ROLLEN & BERECHTIGUNGEN</h2>
            <button
              onClick={() => setShowPermForm(!showPermForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus size={16} /> Neue Berechtigung
            </button>
          </div>

          {showPermForm && (
            <div className="glass-card p-5 space-y-3 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground">Neue Berechtigung erstellen</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="Key (z.B. reports.view)" value={newPermKey}
                  onChange={e => setNewPermKey(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
                />
                <input
                  placeholder="Label (z.B. Reports ansehen)" value={newPermLabel}
                  onChange={e => setNewPermLabel(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
                />
                <input
                  placeholder="Gruppe (z.B. Inhalte)" value={newPermGroup}
                  onChange={e => setNewPermGroup(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreatePermission} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                  Erstellen
                </button>
                <button onClick={() => setShowPermForm(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Role permission matrix */}
          {ROLES.map(role => {
            const isExpanded = expandedRole === role;
            return (
              <div key={role} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : role)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield size={18} className={role === "admin" ? "text-primary" : "text-muted-foreground"} />
                    <span className="font-display text-lg tracking-wider text-foreground uppercase">{role}</span>
                    <span className="text-xs text-muted-foreground">
                      ({rolePermissions.filter(rp => rp.role === role).length} Rechte)
                    </span>
                  </div>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/30 px-5 py-4 space-y-4">
                    {Object.entries(permGroups).map(([group, perms]) => (
                      <div key={group}>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">{group}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {perms.map(perm => {
                            const active = rolePermissions.some(rp => rp.role === role && rp.permission_id === perm.id);
                            return (
                              <button
                                key={perm.id}
                                onClick={() => toggleRolePermission(role, perm.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                                  active
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-muted/50 text-muted-foreground border border-border/30 hover:bg-muted"
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                                  active ? "bg-primary border-primary" : "border-border"
                                }`}>
                                  {active && <Check size={10} className="text-primary-foreground" />}
                                </div>
                                <div>
                                  <div className="font-medium">{perm.label}</div>
                                  <div className="text-[10px] text-muted-foreground">{perm.key}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* List for deleting permissions */}
                    <div className="border-t border-border/20 pt-3 mt-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Berechtigungen verwalten</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {permissions.map(p => (
                          <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
                            {p.label}
                            <button onClick={() => handleDeletePermission(p.id, p.label)} className="hover:text-destructive">
                              <Trash2 size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUserManagement;
