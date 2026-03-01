import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TicketType } from "@/types/database";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";

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
  const [form, setForm] = useState({ name: "", description: "", price: 0, quantity: 100 });

  const fetchTypes = async () => {
    const { data } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order");
    if (data) setTypes(data as unknown as TicketType[]);
  };

  useEffect(() => { fetchTypes(); }, [eventId]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("ticket_types").insert({
      event_id: eventId,
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price),
      quantity: Number(form.quantity),
      sort_order: types.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Ticketart erstellt!");
    setForm({ name: "", description: "", price: 0, quantity: 100 });
    setShowAdd(false);
    fetchTypes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ticketart löschen?")) return;
    await supabase.from("ticket_types").delete().eq("id", id);
    toast.success("Gelöscht");
    fetchTypes();
  };

  const handleToggle = async (t: TicketType) => {
    await supabase.from("ticket_types").update({ is_active: !t.is_active }).eq("id", t.id);
    fetchTypes();
  };

  const addPreset = (preset: { name: string; price: number }) => {
    setForm({ ...form, name: preset.name, price: preset.price });
    setShowAdd(true);
  };

  return (
    <div className="mt-4 border border-border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg tracking-wider text-foreground">TICKETARTEN</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> HINZUFÜGEN
        </button>
      </div>

      {/* Presets */}
      {showAdd && (
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <input
              placeholder="Beschreibung"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <input
              type="number"
              placeholder="Preis €"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <input
              type="number"
              placeholder="Kontingent"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <button onClick={handleAdd} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            SPEICHERN
          </button>
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
                <span className="text-sm font-medium text-foreground">{t.name}</span>
                {t.description && <span className="text-xs text-muted-foreground ml-2">{t.description}</span>}
              </div>
              <span className="text-sm text-foreground font-medium">{t.price}€</span>
              <span className="text-xs text-muted-foreground">{t.sold}/{t.quantity}</span>
              <button onClick={() => handleToggle(t)} className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                {t.is_active ? "Aktiv" : "Inaktiv"}
              </button>
              <button onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive/80">
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
