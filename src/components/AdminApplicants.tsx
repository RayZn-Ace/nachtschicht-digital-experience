import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Search, ChevronDown, Phone, Mail, Calendar, MessageSquare, Briefcase, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de as deLocale } from "date-fns/locale";

const STATUS_OPTIONS = [
  { value: "neu", label: "Neu", cls: "bg-blue-500/20 text-blue-400" },
  { value: "gespräch", label: "Gespräch vereinbart", cls: "bg-yellow-500/20 text-yellow-400" },
  { value: "abgesagt", label: "Abgesagt", cls: "bg-destructive/20 text-destructive" },
  { value: "eingestellt", label: "Eingestellt", cls: "bg-green-500/20 text-green-400" },
];

const JOB_LABELS: Record<string, string> = {
  theke: "🪩 Theke / Barkeeper",
  lager: "📦 Lagermitarbeiter",
  kasse: "💼 Kasse / Infobüro",
  garderobe: "🧦 Garderobe",
  lightjockey: "💡 Lightjockey",
  runner: "💰 Runner",
  fotograf: "💬 Fotograf / Videograf",
};

interface Application {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  email: string;
  phone: string;
  positions: string[];
  photo_url: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const AdminApplicants = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Bewerbungen konnten nicht geladen werden");
    }
    if (data) setApplications(data as unknown as Application[]);
    setLoading(false);
  };

  useEffect(() => { fetchApplications(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from("job_applications")
      .update({ status } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status aktualisiert");
      setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    }
    setSavingId(null);
  };

  const updateNotes = async (id: string, admin_notes: string) => {
    const { error } = await supabase
      .from("job_applications")
      .update({ admin_notes } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Notiz gespeichert");
      setApplications((prev) => prev.map((a) => a.id === id ? { ...a, admin_notes } : a));
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm("Bewerbung wirklich löschen?")) return;
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Bewerbung gelöscht");
      setApplications((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const filtered = applications.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.first_name.toLowerCase().includes(q) ||
        a.last_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.includes(q)
      );
    }
    return true;
  });

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = applications.filter((a) => a.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <p className="text-muted-foreground text-center py-8">Laden...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wider text-foreground flex items-center gap-2">
          <Users size={22} /> BEWERBER ({applications.length})
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
            className={`glass-card p-3 text-center transition-all ${statusFilter === s.value ? "ring-2 ring-primary" : ""}`}
          >
            <p className="font-display text-xl text-foreground">{statusCounts[s.value] || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, E-Mail oder Telefon suchen..."
          className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Keine Bewerbungen gefunden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => {
            const st = STATUS_OPTIONS.find((s) => s.value === app.status) || STATUS_OPTIONS[0];
            const isExpanded = expandedId === app.id;
            return (
              <div key={app.id} className="glass-card overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  {app.photo_url ? (
                    <img src={app.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Users size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm tracking-wider text-foreground truncate">
                      {app.first_name} {app.last_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {app.positions.map((p) => JOB_LABELS[p] || p).join(", ")}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(app.created_at), "dd.MM.yy")}
                  </span>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3 animate-fade-in">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail size={12} />
                        <a href={`mailto:${app.email}`} className="text-primary hover:underline truncate">{app.email}</a>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone size={12} />
                        <a href={`tel:${app.phone}`} className="text-foreground hover:text-primary">{app.phone}</a>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar size={12} />
                        <span className="text-foreground">{app.age} Jahre</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Briefcase size={12} />
                        <span className="text-foreground">{app.positions.length} Position(en)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {app.positions.map((p) => (
                        <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">
                          {JOB_LABELS[p] || p}
                        </span>
                      ))}
                    </div>

                    {app.message && (
                      <div className="flex gap-2 text-sm">
                        <MessageSquare size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-muted-foreground">{app.message}</p>
                      </div>
                    )}

                    {app.photo_url && (
                      <a href={app.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        📷 Bewerbungsfoto ansehen
                      </a>
                    )}

                    {/* Status actions */}
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          disabled={app.status === s.value || savingId === app.id}
                          onClick={() => updateStatus(app.id, s.value)}
                          className={`text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40 ${
                            app.status === s.value
                              ? `${s.cls} border-current`
                              : "bg-muted border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {savingId === app.id ? <Loader2 size={10} className="animate-spin inline mr-1" /> : null}
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Admin notes */}
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Admin-Notizen</label>
                      <textarea
                        defaultValue={app.admin_notes || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (app.admin_notes || "")) {
                            updateNotes(app.id, e.target.value);
                          }
                        }}
                        rows={2}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                        placeholder="Interne Notizen..."
                      />
                    </div>

                    <button
                      onClick={() => deleteApplication(app.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Bewerbung löschen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminApplicants;
