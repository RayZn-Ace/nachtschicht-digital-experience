import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X, Sofa, Upload, CheckSquare, Square } from "lucide-react";
import { CLUB_AREAS } from "@/lib/areas";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Lounge {
  id: string;
  name: string;
  area_id: string;
  capacity: number;
  min_spend: number;
  price_per_person: number;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  area_id: "lavie",
  capacity: 10,
  min_spend: 200,
  price_per_person: 20,
  image_url: "",
  description: "",
  sort_order: 0,
  is_active: true,
};

const AdminLoungeManagement = () => {
  const [lounges, setLounges] = useState<Lounge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lounge | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [events, setEvents] = useState<{ id: string; title: string; date: string }[]>([]);
  const [assignMap, setAssignMap] = useState<Record<string, string[]>>({});
  const [bulkLoungeIds, setBulkLoungeIds] = useState<string[]>([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  const fetchLounges = async () => {
    setLoading(true);
    const { data } = await supabase.from("lounges").select("*").order("sort_order");
    if (data) setLounges(data as any);
    setLoading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, date")
      .eq("is_published", true)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true });
    if (data) setEvents(data as any);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from("event_lounges").select("event_id, lounge_id");
    if (data) {
      const map: Record<string, string[]> = {};
      data.forEach((a: any) => {
        if (!map[a.event_id]) map[a.event_id] = [];
        map[a.event_id].push(a.lounge_id);
      });
      setAssignMap(map);
    }
  };

  useEffect(() => {
    fetchLounges();
    fetchEvents();
    fetchAssignments();
  }, []);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (lounge: Lounge) => {
    setEditing(lounge);
    setFormData({
      name: lounge.name,
      area_id: lounge.area_id,
      capacity: lounge.capacity,
      min_spend: lounge.min_spend,
      price_per_person: lounge.price_per_person,
      image_url: lounge.image_url || "",
      description: lounge.description || "",
      sort_order: lounge.sort_order,
      is_active: lounge.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    const payload = {
      ...formData,
      image_url: formData.image_url || null,
      description: formData.description || null,
    };

    if (editing) {
      const { error } = await supabase.from("lounges").update(payload as any).eq("id", editing.id);
      if (error) { toast.error("Fehler: " + error.message); return; }
      toast.success("Lounge aktualisiert!");
    } else {
      const { error } = await supabase.from("lounges").insert(payload as any);
      if (error) { toast.error("Fehler: " + error.message); return; }
      toast.success("Lounge erstellt!");
    }
    resetForm();
    fetchLounges();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Lounge wirklich löschen? Alle zugehörigen Buchungen und Event-Zuweisungen werden ebenfalls entfernt.")) return;
    await supabase.from("event_lounges").delete().eq("lounge_id", id);
    const { error } = await supabase.from("lounges").delete().eq("id", id);
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Lounge gelöscht.");
    fetchLounges();
  };

  const toggleActive = async (lounge: Lounge) => {
    await supabase.from("lounges").update({ is_active: !lounge.is_active }).eq("id", lounge.id);
    fetchLounges();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `lounges/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload-Fehler: " + error.message); setUploading(false); return; }
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/event-images/${path}`;
    setFormData((prev) => ({ ...prev, image_url: imageUrl }));
    toast.success("Bild hochgeladen!");
    setUploading(false);
  };

  // Bulk assign selected lounges to all future events
  const assignToAllEvents = async () => {
    if (bulkLoungeIds.length === 0) { toast.error("Keine Lounges ausgewählt"); return; }
    if (events.length === 0) { toast.error("Keine zukünftigen Events vorhanden"); return; }

    let count = 0;
    for (const event of events) {
      const existing = assignMap[event.id] || [];
      const toInsert = bulkLoungeIds.filter((id) => !existing.includes(id));
      if (toInsert.length > 0) {
        const rows = toInsert.map((lounge_id) => ({ event_id: event.id, lounge_id }));
        await supabase.from("event_lounges").insert(rows);
        count += toInsert.length;
      }
    }
    toast.success(`${count} Zuweisungen zu ${events.length} Events hinzugefügt`);
    setBulkLoungeIds([]);
    setShowBulkAssign(false);
    fetchAssignments();
  };

  const toggleBulkLounge = (id: string) => {
    setBulkLoungeIds((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);
  };

  const selectAllBulk = () => {
    const activeIds = lounges.filter((l) => l.is_active).map((l) => l.id);
    setBulkLoungeIds((prev) => prev.length === activeIds.length ? [] : activeIds);
  };

  // Group lounges by area
  const loungesByArea = CLUB_AREAS.map((area) => ({
    area,
    lounges: lounges.filter((l) => l.area_id === area.id),
  })).filter((g) => g.lounges.length > 0);

  const ungrouped = lounges.filter((l) => !CLUB_AREAS.some((a) => a.id === l.area_id));

  // Count how many events each lounge is assigned to
  const loungeEventCount = (loungeId: string) => {
    return Object.values(assignMap).filter((ids) => ids.includes(loungeId)).length;
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus size={16} /> NEUE LOUNGE
          </button>
          <button
            onClick={() => setShowBulkAssign(!showBulkAssign)}
            className={`flex items-center gap-2 px-4 py-2 font-display tracking-wider rounded-md transition-colors text-sm border ${
              showBulkAssign ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border hover:bg-muted/80"
            }`}
          >
            <CheckSquare size={16} /> AUF EVENTS ÜBERTRAGEN
          </button>
        </div>
      </div>

      {/* Bulk assign panel */}
      {showBulkAssign && (
        <div className="glass-card p-4 mb-4 animate-fade-in">
          <h3 className="font-display text-sm tracking-wider text-foreground mb-3">
            Lounges auf alle {events.length} zukünftigen Events übertragen
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={selectAllBulk}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
            >
              {bulkLoungeIds.length === lounges.filter((l) => l.is_active).length ? "Keine" : "Alle"} auswählen
            </button>
            {lounges.filter((l) => l.is_active).map((lounge) => (
              <button
                key={lounge.id}
                onClick={() => toggleBulkLounge(lounge.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  bulkLoungeIds.includes(lounge.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {bulkLoungeIds.includes(lounge.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                {lounge.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={assignToAllEvents}
              disabled={bulkLoungeIds.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
            >
              ÜBERTRAGEN ({bulkLoungeIds.length} Lounges → {events.length} Events)
            </button>
            <button onClick={() => { setShowBulkAssign(false); setBulkLoungeIds([]); }} className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors text-sm">
              ABBRECHEN
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h2 className="font-display text-xl tracking-wider text-foreground mb-4">
            {editing ? "LOUNGE BEARBEITEN" : "NEUE LOUNGE"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-foreground mb-1 block">Name *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="z.B. VIP Lounge 1"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Bereich</label>
              <select
                value={formData.area_id}
                onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {CLUB_AREAS.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Kapazität (Personen)</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Mindestverzehr (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.min_spend}
                onChange={(e) => setFormData({ ...formData, min_spend: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Preis pro Person (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_person}
                onChange={(e) => setFormData({ ...formData, price_per_person: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Sortierung</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1 block">Beschreibung</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1 block">Bild</label>
              <div className="flex items-start gap-3">
                {formData.image_url && (
                  <div className="relative w-32 h-24 rounded-md overflow-hidden shrink-0 border border-border">
                    <img src={formData.image_url} alt="Lounge" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setFormData({ ...formData, image_url: "" })}
                      className="absolute top-1 right-1 p-0.5 bg-background/80 rounded-full text-foreground hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm cursor-pointer">
                    <Upload size={16} /> {uploading ? "Wird hochgeladen..." : "Bild hochladen"}
                  </span>
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="accent-primary" />
                <span className="text-sm text-foreground">Aktiv (für Buchungen sichtbar)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors">
              {editing ? "SPEICHERN" : "ERSTELLEN"}
            </button>
            <button onClick={resetForm} className="px-6 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors">
              ABBRECHEN
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{lounges.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gesamt</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-primary">{lounges.filter((l) => l.is_active).length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aktiv</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{lounges.reduce((s, l) => s + l.capacity, 0)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plätze gesamt</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{CLUB_AREAS.filter((a) => lounges.some((l) => l.area_id === a.id)).length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bereiche</p>
        </div>
      </div>

      {/* Lounge list grouped by area */}
      <div className="space-y-4">
        {loungesByArea.map(({ area, lounges: areaLounges }) => (
          <div key={area.id}>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${area.color}`}>
              {area.name} ({areaLounges.length})
            </div>
            <div className="space-y-2">
              {areaLounges.map((lounge) => (
                <div key={lounge.id} className={`glass-card overflow-hidden ${!lounge.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3 p-3">
                    {lounge.image_url && (
                      <img src={lounge.image_url} alt={lounge.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm tracking-wider text-foreground">{lounge.name}</h3>
                        {lounge.is_active ? (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Aktiv</span>
                        ) : (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Inaktiv</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lounge.capacity} Pers. · {lounge.min_spend}€ Mindest. · {lounge.price_per_person}€/Pers. · {loungeEventCount(lounge.id)} Events
                      </p>
                      {lounge.description && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{lounge.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleActive(lounge)} className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground" title={lounge.is_active ? "Deaktivieren" : "Aktivieren"}>
                        {lounge.is_active ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                      <button onClick={() => handleEdit(lounge)} className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground" title="Bearbeiten">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(lounge.id)} className="p-2 hover:bg-destructive/10 rounded-md transition-colors text-destructive" title="Löschen">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {ungrouped.length > 0 && (
          <div>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 bg-muted text-muted-foreground">
              Ohne Bereich ({ungrouped.length})
            </div>
            <div className="space-y-2">
              {ungrouped.map((lounge) => (
                <div key={lounge.id} className={`glass-card p-3 flex items-center justify-between ${!lounge.is_active ? "opacity-50" : ""}`}>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-foreground">{lounge.name}</h3>
                    <p className="text-xs text-muted-foreground">{lounge.capacity} Pers. · {lounge.min_spend}€ Mindest.</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(lounge)} className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(lounge.id)} className="p-2 hover:bg-destructive/10 rounded-md transition-colors text-destructive"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {lounges.length === 0 && (
          <p className="text-muted-foreground text-center py-12">Noch keine Lounges angelegt.</p>
        )}
      </div>
    </div>
  );
};

export default AdminLoungeManagement;
