import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TicketType } from "@/types/database";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil, X, Calendar } from "lucide-react";

const PRESET_TYPES = [
  { name: "Early Bird", price: 8 },
  { name: "Standard", price: 12 },
  { name: "Last Call", price: 15 },
  { name: "VIP", price: 25 },
  { name: "Ladies", price: 5 },
  { name: "Studenten", price: 8 },
  { name: "Gruppenticket (5er)", price: 45 },
  { name: "Fast Lane / Skip the Line", price: 20 },
  { name: "Geburtstag", price: 0 },
];

interface Props {
  eventId: string;
}

const AdminTicketTypes = ({ eventId }: Props) => {
  const [types, setTypes] = useState<TicketType[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: 0, quantity: 100, sale_start: "", sale_end: "", is_public: true });

  const fetchTypes = async () => {
    const { data } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order");
    if (data) setTypes(data as unknown as TicketType[]);
  };

  useEffect(() => { fetchTypes(); }, [eventId]);

  const resetForm = () => {
    setForm({ name: "", description: "", price: 0, quantity: 100, sale_start: "", sale_end: "", is_public: true });
    setEditingId(null);
    setShowAdd(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const payload: any = {
      event_id: eventId,
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price),
      quantity: Number(form.quantity),
      sort_order: types.length,
      sale_start: form.sale_start ? new Date(form.sale_start).toISOString() : null,
      sale_end: form.sale_end ? new Date(form.sale_end).toISOString() : null,
      is_public: form.is_public,
    };
    const { error } = await supabase.from("ticket_types").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticketart erstellt!");
    resetForm();
    fetchTypes();
  };

  const handleEdit = (t: TicketType) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || "",
      price: t.price,
      quantity: t.quantity,
      sale_start: t.sale_start ? t.sale_start.slice(0, 16) : "",
      sale_end: t.sale_end ? t.sale_end.slice(0, 16) : "",
      is_public: (t as any).is_public !== false,
    });
    setShowAdd(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    const payload: any = {
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price),
      quantity: Number(form.quantity),
      sale_start: form.sale_start ? new Date(form.sale_start).toISOString() : null,
      sale_end: form.sale_end ? new Date(form.sale_end).toISOString() : null,
      is_public: form.is_public,
    };
    const { error } = await supabase.from("ticket_types").update(payload).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticketart aktualisiert!");
    resetForm();
    fetchTypes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ticketart löschen?")) return;
    const { error } = await supabase.from("ticket_types").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      toast.error("Fehler beim Löschen: " + error.message);
      return;
    }
    toast.success("Gelöscht");
    fetchTypes();
  };

  const handleToggle = async (t: TicketType) => {
    await supabase.from("ticket_types").update({ is_active: !t.is_active }).eq("id", t.id);
    fetchTypes();
  };

  const addPreset = (preset: { name: string; price: number }) => {
    setForm({ ...form, name: preset.name, price: preset.price });
    setEditingId(null);
    setShowAdd(true);
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return null; }
  };

  const isFormOpen = showAdd || editingId;

  return (
    <div className="mt-4 border border-border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg tracking-wider text-foreground">TICKETARTEN</h3>
        <button
          onClick={() => { if (isFormOpen) resetForm(); else { resetForm(); setShowAdd(true); } }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {isFormOpen ? <><X size={14} /> SCHLIEßEN</> : <><Plus size={14} /> HINZUFÜGEN</>}
        </button>
      </div>

      {/* Presets - only for new */}
      {showAdd && !editingId && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">Schnellauswahl:</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESET_TYPES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => addPreset(p)}
                className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                {p.name} ({p.price}€)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {isFormOpen && (
        <div className="mb-3 p-3 border border-border rounded-md bg-background/50">
          <p className="text-xs font-medium text-foreground mb-2">
            {editingId ? "TICKETART BEARBEITEN" : "NEUE TICKETART"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Titel *</label>
              <input
                placeholder="z.B. Early Bird"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Beschreibung</label>
              <input
                placeholder="Optional"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Eintrittspreis (€)</label>
              <input
                placeholder="0.00"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kapazität</label>
              <input
                type="number"
                placeholder="100"
                value={form.quantity || ""}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Calendar size={12} /> Verkaufsstart (optional)
              </label>
              <input
                type="datetime-local"
                value={form.sale_start}
                onChange={(e) => setForm({ ...form, sale_start: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Calendar size={12} /> Verkaufsende (optional)
              </label>
              <input
                type="datetime-local"
                value={form.sale_end}
                onChange={(e) => setForm({ ...form, sale_end: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-sm text-foreground">Im Verkauf</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {form.is_public ? "Sichtbar im Ticketshop" : "Nur intern / Freitickets"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              {editingId ? "AKTUALISIEREN" : "SPEICHERN"}
            </button>
            <button onClick={resetForm} className="px-4 py-1.5 text-sm border border-border text-foreground rounded-md hover:bg-muted">
              ABBRECHEN
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {types.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">Keine Ticketarten. Nutze die globalen Ticketfelder oder füge spezifische Arten hinzu.</p>
      ) : (
        <div className="space-y-2">
          {types.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 p-2 rounded-md border ${t.is_active ? 'border-border' : 'border-border/50 opacity-50'}`}>
              <GripVertical size={14} className="text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{t.name}</span>
                  {t.description && <span className="text-xs text-muted-foreground">{t.description}</span>}
                </div>
                {(t.sale_start || t.sale_end) && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar size={10} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t.sale_start ? `Ab ${formatDateTime(t.sale_start)}` : ""}
                      {t.sale_start && t.sale_end ? " – " : ""}
                      {t.sale_end ? `Bis ${formatDateTime(t.sale_end)}` : ""}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm text-foreground font-medium">{t.price}€</span>
              <span className="text-xs text-muted-foreground">{t.sold}/{t.quantity}</span>
              <button onClick={() => handleToggle(t)} className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                {t.is_active ? "Aktiv" : "Inaktiv"}
              </button>
              <span className={`text-xs px-2 py-0.5 rounded-full ${(t as any).is_public !== false ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {(t as any).is_public !== false ? "Im Verkauf" : "Intern"}
              </span>
              <button onClick={() => handleEdit(t)} className="text-foreground hover:text-primary transition-colors" title="Bearbeiten">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive/80" title="Löschen">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTicketTypes;
