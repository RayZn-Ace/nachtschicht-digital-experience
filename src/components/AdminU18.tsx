import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, FileText, CalendarDays, Users, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface U18Form {
  id: string;
  event_id: string | null;
  event_title: string;
  event_date: string | null;
  parent_name: string;
  parent_birthday: string;
  minor_name: string;
  minor_birthday: string;
  supervisor_name: string | null;
  supervisor_birthday: string | null;
  email: string;
  has_signature: boolean;
  created_at: string;
}

const calcAge = (birthday: string, refDate?: Date): number => {
  const birth = new Date(birthday);
  const today = refDate || new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const AdminU18 = () => {
  const [forms, setForms] = useState<U18Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("u18_forms")
      .select("id, event_id, event_title, event_date, parent_name, parent_birthday, minor_name, minor_birthday, supervisor_name, supervisor_birthday, email, has_signature, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      setForms((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchForms(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Clubzettel wirklich löschen?")) return;
    const { error } = await supabase.from("u18_forms").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Gelöscht");
    fetchForms();
  };

  // Unique events for filter
  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    forms.forEach((f) => {
      if (f.event_id) map.set(f.event_id, f.event_title);
    });
    return Array.from(map.entries());
  }, [forms]);

  // Filtered forms
  const filtered = useMemo(() => {
    return forms.filter((f) => {
      if (eventFilter !== "all" && f.event_id !== eventFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.minor_name.toLowerCase().includes(q) ||
          f.parent_name.toLowerCase().includes(q) ||
          f.email.toLowerCase().includes(q) ||
          f.event_title.toLowerCase().includes(q) ||
          (f.supervisor_name && f.supervisor_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [forms, search, eventFilter]);

  // Stats
  const now = new Date();
  const thisMonth = forms.filter((f) => {
    const d = new Date(f.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const today = forms.filter((f) => {
    const d = new Date(f.created_at);
    return d.toDateString() === now.toDateString();
  });

  const thisYear = forms.filter((f) => {
    return new Date(f.created_at).getFullYear() === now.getFullYear();
  });

  // Next upcoming event
  const nextEvent = useMemo(() => {
    const upcoming = forms
      .filter((f) => f.event_date && new Date(f.event_date) >= now)
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
    if (upcoming.length === 0) return null;
    const eventDate = upcoming[0].event_date!;
    const eventTitle = upcoming[0].event_title;
    const count = forms.filter((f) => f.event_date === eventDate).length;
    return { date: eventDate, title: eventTitle, count };
  }, [forms]);

  // Average supervisor age
  const avgSupervisorAge = useMemo(() => {
    const ages = forms
      .filter((f) => f.supervisor_birthday)
      .map((f) => calcAge(f.supervisor_birthday!));
    if (ages.length === 0) return 0;
    return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
  }, [forms]);

  // Average minor age (16 or 17)
  const avgMinorAge = useMemo(() => {
    const ages = forms.map((f) => calcAge(f.minor_birthday));
    if (ages.length === 0) return 0;
    return Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10;
  }, [forms]);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <FileText size={18} className="mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl text-foreground">{forms.length}</p>
          <p className="text-xs text-muted-foreground">Clubzettel Gesamt</p>
        </div>
        <div className="glass-card p-4 text-center">
          <CalendarDays size={18} className="mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl text-foreground">{thisMonth.length}</p>
          <p className="text-xs text-muted-foreground">Diesen Monat</p>
        </div>
        <div className="glass-card p-4 text-center">
          <FileText size={18} className="mx-auto mb-1 text-muted-foreground" />
          <p className="font-display text-2xl text-foreground">{today.length}</p>
          <p className="text-xs text-muted-foreground">Heute</p>
        </div>
        <div className="glass-card p-4 text-center">
          <CalendarDays size={18} className="mx-auto mb-1 text-muted-foreground" />
          <p className="font-display text-2xl text-foreground">{thisYear.length}</p>
          <p className="text-xs text-muted-foreground">Dieses Jahr</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Users size={18} className="mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl text-foreground">Ø {avgMinorAge}</p>
          <p className="text-xs text-muted-foreground">Alter Minderjährige</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Users size={18} className="mx-auto mb-1 text-muted-foreground" />
          <p className="font-display text-2xl text-foreground">Ø {avgSupervisorAge}</p>
          <p className="text-xs text-muted-foreground">Alter Aufsichtsperson</p>
        </div>
      </div>

      {/* Next event stat */}
      {nextEvent && (
        <div className="glass-card p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Nächstes Event</p>
            <p className="font-display text-lg text-foreground">
              {nextEvent.title} ({new Date(nextEvent.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })})
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl text-foreground">{nextEvent.count}</p>
            <p className="text-xs text-muted-foreground">Clubzettel ausgefüllt</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, E-Mail oder Event suchen..."
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full md:w-64 bg-muted border-border">
            <SelectValue placeholder="Nach Event filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Events</SelectItem>
            {eventOptions.map(([id, title]) => (
              <SelectItem key={id} value={id}>{title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground text-center py-12">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {search || eventFilter !== "all" ? "Keine Ergebnisse." : "Noch keine Clubzettel ausgefüllt."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((form) => (
            <div key={form.id} className="glass-card p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-base tracking-wider text-foreground">{form.minor_name}</h3>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {calcAge(form.minor_birthday)} Jahre
                  </span>
                  {form.has_signature && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Unterschrieben</span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  <span className="text-foreground">{form.event_title}</span>
                  {form.event_date && (
                    <> · {new Date(form.event_date).toLocaleDateString("de-DE")}</>
                  )}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Elternteil: {form.parent_name}
                  {form.supervisor_name && <> · Aufsicht: {form.supervisor_name} ({calcAge(form.supervisor_birthday!)} J.)</>}
                </p>
                <p className="text-muted-foreground text-xs">{form.email} · {new Date(form.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <button
                onClick={() => handleDelete(form.id)}
                className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive shrink-0"
                title="Löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminU18;
