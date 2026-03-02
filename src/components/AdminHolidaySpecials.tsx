import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";

interface HolidaySpecial {
  id: string;
  title: string;
  date_label: string;
  hours: string;
  note_de: string | null;
  note_en: string | null;
  sort_order: number;
  is_active: boolean;
}

const empty = { title: "", date_label: "", hours: "", note_de: "", note_en: "", sort_order: 0, is_active: true };

const AdminHolidaySpecials = () => {
  const [items, setItems] = useState<HolidaySpecial[]>([]);
  const [editing, setEditing] = useState<HolidaySpecial | null>(null);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  const fetch_ = async () => {
    const { data } = await supabase.from("holiday_specials").select("*").order("sort_order");
    if (data) setItems(data as unknown as HolidaySpecial[]);
  };

  useEffect(() => { fetch_(); }, []);

  const resetForm = () => { setForm(empty); setEditing(null); setShowForm(false); };

  const handleEdit = (item: HolidaySpecial) => {
    setEditing(item);
    setForm({ title: item.title, date_label: item.date_label, hours: item.hours, note_de: item.note_de || "", note_en: item.note_en || "", sort_order: item.sort_order, is_active: item.is_active });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Titel erforderlich"); return; }
    const payload = { ...form, note_de: form.note_de || null, note_en: form.note_en || null, sort_order: Number(form.sort_order) };

    if (editing) {
      const { error } = await supabase.from("holiday_specials").update(payload as any).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Aktualisiert!");
    } else {
      const { error } = await supabase.from("holiday_specials").insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Erstellt!");
    }
    resetForm();
    fetch_();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Wirklich löschen?")) return;
    await supabase.from("holiday_specials").delete().eq("id", id);
    toast.success("Gelöscht");
    fetch_();
  };

  const toggleActive = async (item: HolidaySpecial) => {
    await supabase.from("holiday_specials").update({ is_active: !item.is_active } as any).eq("id", item.id);
    fetch_();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-2xl tracking-wider text-foreground">FEIERTAGS-SPECIALS</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors">
          <Plus size={18} /> NEU
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h3 className="font-display text-xl tracking-wider text-foreground mb-4">{editing ? "BEARBEITEN" : "NEU ANLEGEN"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-foreground mb-1 block">Titel *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. Silvester / New Year's Eve" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Datum-Label</label>
              <input value={form.date_label} onChange={(e) => setForm({ ...form, date_label: e.target.value })} placeholder="z.B. 31. Dezember" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Öffnungszeiten</label>
              <input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="z.B. 22:00 – 06:00 Uhr" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Sortierung</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1 block">Hinweis (Deutsch)</label>
              <input value={form.note_de} onChange={(e) => setForm({ ...form, note_de: e.target.value })} placeholder="z.B. Exklusive Silvesterparty – nur mit Ticket!" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1 block">Hinweis (Englisch)</label>
              <input value={form.note_en} onChange={(e) => setForm({ ...form, note_en: e.target.value })} placeholder="z.B. Exclusive NYE party – ticket only!" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              <label className="text-sm text-foreground">Aktiv</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors">SPEICHERN</button>
            <button onClick={resetForm} className="px-6 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors">ABBRECHEN</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`glass-card p-4 flex items-center justify-between ${!item.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              <GripVertical size={16} className="text-muted-foreground" />
              <div>
                <span className="font-display tracking-wider text-foreground">{item.title}</span>
                <span className="text-muted-foreground text-sm ml-3">{item.date_label}</span>
                <span className="text-primary text-sm ml-3">{item.hours}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(item)} className={`px-2 py-1 text-xs rounded ${item.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                {item.is_active ? "Aktiv" : "Inaktiv"}
              </button>
              <button onClick={() => handleEdit(item)} className="p-2 text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-center py-8">Noch keine Feiertags-Specials angelegt.</p>}
      </div>
    </div>
  );
};

export default AdminHolidaySpecials;
