import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Loader2, PackageCheck, PackageX } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface LostItem {
  id: string;
  event_date: string;
  category: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Offen", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "found", label: "Gefunden", color: "bg-green-500/20 text-green-400" },
  { value: "not_found", label: "Nicht gefunden", color: "bg-destructive/20 text-destructive" },
];

const CATEGORY_LABELS: Record<string, string> = {
  ausweis: "🪪 Ausweis",
  schmuck: "💍 Schmuck",
  handy: "📱 Handy",
  sonstiges: "📦 Sonstiges",
};

const AdminLostAndFound = () => {
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lost_and_found")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Fundgrube-Anfragen.");
    } else {
      setItems((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAction = async (item: LostItem, newStatus: "found" | "not_found") => {
    setSendingEmail(item.id + newStatus);

    // 1. Update status
    const { error: updateError } = await supabase
      .from("lost_and_found")
      .update({ status: newStatus } as any)
      .eq("id", item.id);

    if (updateError) {
      toast.error("Status konnte nicht geändert werden.");
      setSendingEmail(null);
      return;
    }

    // 2. Send email
    const { error: emailError } = await supabase.functions.invoke("send-lostfound-email", {
      body: {
        email: item.email,
        firstName: item.first_name,
        category: item.category,
        status: newStatus,
        customMessage: customMessages[item.id] || "",
      },
    });

    if (emailError) {
      toast.error("Status aktualisiert, aber E-Mail konnte nicht gesendet werden.");
    } else {
      toast.success(
        newStatus === "found"
          ? `✅ ${item.first_name} wurde benachrichtigt – Gegenstand gefunden!`
          : `📧 ${item.first_name} wurde benachrichtigt – leider nicht gefunden.`
      );
    }

    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
    setSendingEmail(null);
  };

  const handleSaveNotes = async (id: string) => {
    const notes = editingNotes[id] ?? "";
    const { error } = await supabase
      .from("lost_and_found")
      .update({ admin_notes: notes } as any)
      .eq("id", id);
    if (error) {
      toast.error("Notizen konnten nicht gespeichert werden.");
    } else {
      toast.success("Notizen gespeichert.");
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, admin_notes: notes } : i));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Anfrage wirklich löschen?")) return;
    const { error } = await supabase.from("lost_and_found").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
    } else {
      toast.success("Anfrage gelöscht.");
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const getStatusInfo = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl tracking-wider text-foreground">
          <Search className="inline mr-2 text-primary" size={22} />
          FUND<span className="text-gradient">GRUBE</span>
        </h2>
        <span className="text-sm text-muted-foreground">{filtered.length} Anfragen</span>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          Alle ({items.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = items.filter((i) => i.status === s.value).length;
          return (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === s.value ? "bg-primary text-primary-foreground" : `${s.color} hover:opacity-80`}`}
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-8">Lade Anfragen...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Keine Anfragen vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const statusInfo = getStatusInfo(item.status);
            const isExpanded = expandedId === item.id;
            const isOpen = item.status === "open";
            return (
              <div key={item.id} className="border border-border rounded-lg bg-card overflow-hidden">
                {/* Summary row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <span className="text-lg">{CATEGORY_LABELS[item.category]?.split(" ")[0] || "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {item.first_name} {item.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Event: {format(new Date(item.event_date), "dd.MM.yyyy")} · Eingereicht: {format(new Date(item.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3 bg-background/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Telefon</span>
                        <a href={`tel:${item.phone}`} className="text-primary hover:underline">{item.phone}</a>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">E-Mail</span>
                        <a href={`mailto:${item.email}`} className="text-primary hover:underline">{item.email}</a>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Kategorie</span>
                        <span className="text-foreground">{CATEGORY_LABELS[item.category] || item.category}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Event-Datum</span>
                        <span className="text-foreground">{format(new Date(item.event_date), "dd.MM.yyyy")}</span>
                      </div>
                    </div>

                    {item.description && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Beschreibung</span>
                        <p className="text-sm text-foreground bg-muted p-2 rounded">{item.description}</p>
                      </div>
                    )}

                    {/* Admin notes */}
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Admin-Notizen</span>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-1.5 text-sm bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                          placeholder="Interne Notizen..."
                          value={editingNotes[item.id] ?? item.admin_notes ?? ""}
                          onChange={(e) => setEditingNotes({ ...editingNotes, [item.id]: e.target.value })}
                        />
                        <button
                          onClick={() => handleSaveNotes(item.id)}
                          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          Speichern
                        </button>
                      </div>
                    </div>

                    {/* Custom email message */}
                    {isOpen && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Zusätzliche Nachricht an den Kunden (optional)</span>
                        <textarea
                          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                          rows={2}
                          placeholder="z.B. 'Bitte bringe deinen Personalausweis mit' oder 'Wir haben am Freitag bis 18 Uhr geöffnet'..."
                          value={customMessages[item.id] || ""}
                          onChange={(e) => setCustomMessages({ ...customMessages, [item.id]: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Action buttons + Delete */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {isOpen ? (
                        <>
                          <button
                            onClick={() => handleAction(item, "found")}
                            disabled={sendingEmail !== null}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {sendingEmail === item.id + "found" ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                            Gefunden
                          </button>
                          <button
                            onClick={() => handleAction(item, "not_found")}
                            disabled={sendingEmail !== null}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                          >
                            {sendingEmail === item.id + "not_found" ? <Loader2 size={14} className="animate-spin" /> : <PackageX size={14} />}
                            Nicht gefunden
                          </button>
                        </>
                      ) : (
                        <span className={`text-sm px-3 py-1.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label} – Kunde wurde benachrichtigt
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="ml-auto text-destructive hover:text-destructive/80 p-1.5 rounded hover:bg-destructive/10"
                        title="Löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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

export default AdminLostAndFound;
