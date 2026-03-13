import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, FileText, CalendarDays, Users, Trash2, Download, ArrowLeft, Loader2, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface U18Form {
  id: string;
  event_id: string | null;
  event_title: string;
  event_date: string | null;
  parent_name: string;
  parent_address: string;
  parent_zip: string | null;
  parent_city: string | null;
  parent_country: string;
  parent_birthday: string;
  parent_phone: string;
  minor_name: string;
  minor_address: string;
  minor_zip: string | null;
  minor_city: string | null;
  minor_country: string;
  minor_birthday: string;
  minor_phone: string;
  supervisor_name: string | null;
  supervisor_address: string | null;
  supervisor_zip: string | null;
  supervisor_city: string | null;
  supervisor_country: string | null;
  supervisor_email: string | null;
  supervisor_phone: string | null;
  supervisor_birthday: string | null;
  email: string;
  has_signature: boolean;
  has_supervisor_signature: boolean;
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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

const formatDateTime = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/* ─── Detail View ─── */
const DetailSection = ({ title, fields }: { title: string; fields: { label: string; value: string | null | undefined }[] }) => (
  <div className="space-y-1">
    <h4 className="text-xs font-display tracking-wider text-primary uppercase">{title}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
      {fields.map((f) => (
        <div key={f.label} className="flex gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">{f.label}:</span>
          <span className="text-foreground font-medium truncate">{f.value || "–"}</span>
        </div>
      ))}
    </div>
  </div>
);

const U18Detail = ({
  form,
  onBack,
  onDelete,
  onDownloadPdf,
  downloadingPdf,
}: {
  form: U18Form;
  onBack: () => void;
  onDelete: (id: string) => void;
  onDownloadPdf: (id: string) => void;
  downloadingPdf: boolean;
}) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft size={16} /> Zurück
      </button>
      <h3 className="font-display text-xl tracking-wider text-foreground flex-1">{form.minor_name}</h3>
      <Button
        variant="default"
        size="sm"
        onClick={() => onDownloadPdf(form.id)}
        disabled={downloadingPdf}
        className="font-display tracking-wider gap-1.5"
      >
        {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        PDF
      </Button>
      <button
        onClick={() => onDelete(form.id)}
        className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
        title="Löschen"
      >
        <Trash2 size={16} />
      </button>
    </div>

    {/* Meta */}
    <div className="glass-card p-4 space-y-1">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
          {calcAge(form.minor_birthday)} Jahre
        </span>
        {form.has_signature && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Eltern unterschrieben</span>
        )}
        {form.has_supervisor_signature && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Aufsicht unterschrieben</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Erstellt: {formatDateTime(form.created_at)} · E-Mail: <span className="text-foreground">{form.email}</span>
      </p>
    </div>

    {/* Event */}
    <div className="glass-card p-4">
      <DetailSection
        title="Veranstaltung"
        fields={[
          { label: "Event", value: form.event_title },
          { label: "Datum", value: form.event_date ? formatDate(form.event_date) : null },
        ]}
      />
    </div>

    {/* Parent */}
    <div className="glass-card p-4">
      <DetailSection
        title="Sorgeberechtigte Person"
        fields={[
          { label: "Name", value: form.parent_name },
          { label: "Anschrift", value: form.parent_address },
          { label: "PLZ", value: form.parent_zip },
          { label: "Ort", value: form.parent_city },
          { label: "Land", value: form.parent_country },
          { label: "Telefon", value: form.parent_phone },
          { label: "Geburtsdatum", value: formatDate(form.parent_birthday) },
          { label: "Alter", value: `${calcAge(form.parent_birthday)} Jahre` },
        ]}
      />
    </div>

    {/* Minor */}
    <div className="glass-card p-4">
      <DetailSection
        title="Minderjährige Person"
        fields={[
          { label: "Name", value: form.minor_name },
          { label: "Anschrift", value: form.minor_address },
          { label: "PLZ", value: form.minor_zip },
          { label: "Ort", value: form.minor_city },
          { label: "Land", value: form.minor_country },
          { label: "Telefon", value: form.minor_phone },
          { label: "Geburtsdatum", value: formatDate(form.minor_birthday) },
          { label: "Alter", value: `${calcAge(form.minor_birthday)} Jahre` },
        ]}
      />
    </div>

    {/* Supervisor */}
    <div className="glass-card p-4">
      <DetailSection
        title="Aufsichtsperson (18+)"
        fields={
          form.supervisor_name
            ? [
                { label: "Name", value: form.supervisor_name },
                { label: "Anschrift", value: form.supervisor_address },
                { label: "PLZ", value: form.supervisor_zip },
                { label: "Ort", value: form.supervisor_city },
                { label: "Land", value: form.supervisor_country },
                { label: "E-Mail", value: form.supervisor_email },
                { label: "Telefon", value: form.supervisor_phone },
                { label: "Geburtsdatum", value: form.supervisor_birthday ? formatDate(form.supervisor_birthday) : null },
                { label: "Alter", value: form.supervisor_birthday ? `${calcAge(form.supervisor_birthday)} Jahre` : null },
              ]
            : [{ label: "Status", value: "Wird nach Ausdruck eingetragen" }]
        }
      />
    </div>
  </div>
);

/* ─── Main Component ─── */
const AdminU18 = () => {
  const [forms, setForms] = useState<U18Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [selectedForm, setSelectedForm] = useState<U18Form | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("u18_forms")
      .select("*")
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
    if (selectedForm?.id === id) setSelectedForm(null);
    fetchForms();
  };

  const handleDownloadPdf = async (formId: string) => {
    setDownloadingPdf(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-u18-pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anonKey },
          body: JSON.stringify({ form_id: formId }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "PDF-Generierung fehlgeschlagen");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clubzettel-${formId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF heruntergeladen!");
    } catch (err: any) {
      toast.error(err.message || "PDF konnte nicht heruntergeladen werden.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Unique events for filter
  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    forms.forEach((f) => { if (f.event_id) map.set(f.event_id, f.event_title); });
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
  const today = forms.filter((f) => new Date(f.created_at).toDateString() === now.toDateString());
  const thisYear = forms.filter((f) => new Date(f.created_at).getFullYear() === now.getFullYear());

  const nextEvent = useMemo(() => {
    const upcoming = forms
      .filter((f) => f.event_date && new Date(f.event_date) >= now)
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
    if (upcoming.length === 0) return null;
    const eventDate = upcoming[0].event_date!;
    const count = forms.filter((f) => f.event_date === eventDate).length;
    return { date: eventDate, title: upcoming[0].event_title, count };
  }, [forms]);

  const avgSupervisorAge = useMemo(() => {
    const ages = forms.filter((f) => f.supervisor_birthday).map((f) => calcAge(f.supervisor_birthday!));
    return ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
  }, [forms]);

  const avgMinorAge = useMemo(() => {
    const ages = forms.map((f) => calcAge(f.minor_birthday));
    return ages.length ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10 : 0;
  }, [forms]);

  /* ─── Detail View ─── */
  if (selectedForm) {
    return (
      <U18Detail
        form={selectedForm}
        onBack={() => setSelectedForm(null)}
        onDelete={handleDelete}
        onDownloadPdf={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
      />
    );
  }

  /* ─── List View ─── */
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
            <div
              key={form.id}
              className="glass-card p-4 flex items-start gap-4 cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
              onClick={() => setSelectedForm(form)}
            >
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
                  {form.event_date && <> · {formatDate(form.event_date)}</>}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Elternteil: {form.parent_name}
                  {form.supervisor_name && <> · Aufsicht: {form.supervisor_name} ({calcAge(form.supervisor_birthday!)} J.)</>}
                </p>
                <p className="text-muted-foreground text-xs">{form.email} · {formatDateTime(form.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadPdf(form.id); }}
                  className="p-2 hover:bg-primary/20 rounded-md transition-colors text-primary"
                  title="PDF herunterladen"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(form.id); }}
                  className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminU18;
