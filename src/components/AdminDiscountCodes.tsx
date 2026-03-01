import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiscountCode, Event } from "@/types/database";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Tag } from "lucide-react";

const AdminDiscountCodes = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: 10,
    max_uses: "" as string | number,
    event_id: "" as string,
    valid_until: "",
  });

  const fetchCodes = async () => {
    const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    if (data) setCodes(data as unknown as DiscountCode[]);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("id, title, date").order("date", { ascending: true });
    if (data) setEvents(data as unknown as Event[]);
  };

  useEffect(() => { fetchCodes(); fetchEvents(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  };

  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error("Code eingeben!"); return; }
    const { error } = await supabase.from("discount_codes").insert({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      event_id: form.event_id || null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Code existiert bereits!" : error.message);
      return;
    }
    toast.success("Rabattcode erstellt!");
    setForm({ code: "", discount_type: "percent", discount_value: 10, max_uses: "", event_id: "", valid_until: "" });
    setShowForm(false);
    fetchCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Code löschen?")) return;
    await supabase.from("discount_codes").delete().eq("id", id);
    toast.success("Gelöscht");
    fetchCodes();
  };

  const handleToggle = async (code: DiscountCode) => {
    await supabase.from("discount_codes").update({ is_active: !code.is_active }).eq("id", code.id);
    fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code kopiert!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(true); generateCode(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} /> NEUER CODE
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 animate-fade-in">
          <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">RABATTCODE ERSTELLEN</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-foreground mb-1 block">Code *</label>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="flex-1 px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                  placeholder="z.B. VIP2024"
                />
                <button onClick={generateCode} className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm hover:bg-muted/80">
                  🎲
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Rabatttyp</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, discount_type: "percent" })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${form.discount_type === "percent" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"}`}
                >
                  % Prozent
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, discount_type: "fixed" })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${form.discount_type === "fixed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"}`}
                >
                  € Festbetrag
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">
                Rabatt ({form.discount_type === "percent" ? "%" : "€"})
              </label>
              <input
                type="number"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Max. Nutzungen (leer = unbegrenzt)</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Unbegrenzt"
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Nur für Event (optional)</label>
              <select
                value={form.event_id}
                onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Alle Events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Gültig bis (optional)</label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90">
              ERSTELLEN
            </button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 border border-border text-foreground rounded-md hover:bg-muted">
              ABBRECHEN
            </button>
          </div>
        </div>
      )}

      {/* Code list */}
      <div className="space-y-3">
        {codes.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Noch keine Rabattcodes erstellt.</p>
        ) : codes.map((code) => (
          <div key={code.id} className={`glass-card p-4 flex items-center gap-4 ${!code.is_active ? 'opacity-50' : ''}`}>
            <Tag size={20} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-lg font-bold text-foreground">{code.code}</span>
                <button onClick={() => copyCode(code.code)} className="text-muted-foreground hover:text-foreground">
                  <Copy size={14} />
                </button>
                <span className={`text-xs px-2 py-0.5 rounded-full ${code.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {code.is_active ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                {code.discount_type === "percent" ? `${code.discount_value}%` : `${code.discount_value}€`} Rabatt
                {code.max_uses ? ` · ${code.uses}/${code.max_uses} genutzt` : ` · ${code.uses}× genutzt`}
                {code.valid_until && ` · bis ${new Date(code.valid_until).toLocaleDateString("de-DE")}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleToggle(code)} className="px-3 py-1 text-xs border border-border rounded-md hover:bg-muted text-foreground">
                {code.is_active ? "Deaktivieren" : "Aktivieren"}
              </button>
              <button onClick={() => handleDelete(code.id)} className="p-2 hover:bg-destructive/20 rounded-md text-destructive">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDiscountCodes;
