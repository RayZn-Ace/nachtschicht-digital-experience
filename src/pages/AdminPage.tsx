import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/types/database";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, LogOut, Image, Mail, FileText } from "lucide-react";
import { CLUB_AREAS, parseAreas, formatAreas } from "@/lib/areas";
import AdminAlbums from "@/components/AdminAlbums";
import AdminNewsletter from "@/components/AdminNewsletter";
import AdminU18 from "@/components/AdminU18";

const AdminPage = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"events" | "albums" | "newsletter" | "u18">("events");
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", date: "", time: "22:00", genre: "", areas: "" as string,
    image_url: "", ticket_price: 0, ticket_quantity: 200, is_published: false,
  });
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("date", { ascending: true });
    if (data) setEvents(data as unknown as Event[]);
  };

  useEffect(() => { fetchEvents(); }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const resetForm = () => {
    setFormData({ title: "", description: "", date: "", time: "22:00", genre: "", areas: "", image_url: "", ticket_price: 0, ticket_quantity: 200, is_published: false });
    setSelectedAreas([]);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (event: Event) => {
    setEditing(event);
    const areas = parseAreas(event.areas);
    setSelectedAreas(areas);
    setFormData({
      title: event.title, description: event.description || "", date: event.date.split("T")[0],
      time: event.time, genre: event.genre || "", areas: event.areas || "",
      image_url: event.image_url || "", ticket_price: event.ticket_price,
      ticket_quantity: event.ticket_quantity, is_published: event.is_published,
    });
    setShowForm(true);
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreas((prev) => {
      const next = prev.includes(areaId) ? prev.filter((a) => a !== areaId) : [...prev, areaId];
      return next;
    });
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      areas: formatAreas(selectedAreas),
      date: new Date(formData.date).toISOString(),
      ticket_price: Number(formData.ticket_price),
      ticket_quantity: Number(formData.ticket_quantity),
    };

    if (editing) {
      const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
      if (error) { toast.error("Fehler: " + error.message); return; }
      toast.success("Event aktualisiert!");
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) { toast.error("Fehler: " + error.message); return; }
      toast.success("Event erstellt!");
    }
    resetForm();
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Event wirklich löschen?")) return;
    await supabase.from("events").delete().eq("id", id);
    toast.success("Event gelöscht");
    fetchEvents();
  };

  const togglePublish = async (event: Event) => {
    await supabase.from("events").update({ is_published: !event.is_published }).eq("id", event.id);
    fetchEvents();
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl md:text-5xl tracking-wider text-foreground">
            ADMIN <span className="text-gradient">DASHBOARD</span>
          </h1>
          <button onClick={signOut} className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors">
            <LogOut size={18} /> LOGOUT
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("events")}
            className={`px-5 py-2 font-display tracking-wider rounded-md transition-colors ${tab === "events" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            EVENTS
          </button>
          <button
            onClick={() => setTab("albums")}
            className={`px-5 py-2 font-display tracking-wider rounded-md transition-colors flex items-center gap-2 ${tab === "albums" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <Image size={16} /> FOTOALBEN
          </button>
          <button
            onClick={() => setTab("newsletter")}
            className={`px-5 py-2 font-display tracking-wider rounded-md transition-colors flex items-center gap-2 ${tab === "newsletter" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <Mail size={16} /> NEWSLETTER
          </button>
          <button
            onClick={() => setTab("u18")}
            className={`px-5 py-2 font-display tracking-wider rounded-md transition-colors flex items-center gap-2 ${tab === "u18" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <FileText size={16} /> MUTTIZETTEL
          </button>
        </div>

        {tab === "u18" ? (
          <AdminU18 />
        ) : tab === "newsletter" ? (
          <AdminNewsletter />
        ) : tab === "albums" ? (
          <AdminAlbums />
        ) : (
        <>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} /> NEUES EVENT
          </button>
        </div>

        {showForm && (
          <div className="glass-card p-6 mb-8 animate-fade-in">
            <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">
              {editing ? "EVENT BEARBEITEN" : "NEUES EVENT"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-foreground mb-1 block">Titel *</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Genre</label>
                <input value={formData.genre} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Datum *</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Uhrzeit</label>
                <input value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>

              {/* Areas multi-select */}
              <div className="md:col-span-2">
                <label className="text-sm text-foreground mb-2 block">Areas (Räume) – welche Floors sind geöffnet?</label>
                <div className="flex flex-wrap gap-2">
                  {CLUB_AREAS.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedAreas.includes(area.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {area.name}
                      {area.genre && <span className="ml-1 opacity-70">· {area.genre}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground mb-1 block">Bild-URL</label>
                <input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Ticketpreis (€)</label>
                <input type="number" step="0.01" value={formData.ticket_price} onChange={(e) => setFormData({ ...formData, ticket_price: Number(e.target.value) })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Ticket-Kontingent</label>
                <input type="number" value={formData.ticket_quantity} onChange={(e) => setFormData({ ...formData, ticket_quantity: Number(e.target.value) })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-foreground mb-1 block">Beschreibung</label>
                <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })} className="accent-primary" />
                <span className="text-sm text-foreground">Veröffentlicht</span>
              </label>
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

        <div className="space-y-3">
          {events.length === 0 && <p className="text-muted-foreground text-center py-12">Noch keine Events erstellt.</p>}
          {events.map((event) => {
            const eventAreas = parseAreas(event.areas);
            return (
              <div key={event.id} className="glass-card p-4 flex items-center gap-4">
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} className="w-16 h-16 rounded-md object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg tracking-wider text-foreground truncate">{event.title}</h3>
                    {event.is_published ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Live</span>
                    ) : (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Entwurf</span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {new Date(event.date).toLocaleDateString("de-DE")} – {event.time} | {event.genre} | {event.ticket_price}€ | {event.tickets_sold}/{event.ticket_quantity} Tickets
                  </p>
                  {eventAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {eventAreas.map((aId) => {
                        const area = CLUB_AREAS.find((a) => a.id === aId);
                        return area ? (
                          <span key={aId} className={`text-xs px-2 py-0.5 rounded-full ${area.color}`}>
                            {area.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => togglePublish(event)} className="p-2 hover:bg-muted rounded-md transition-colors text-foreground" title={event.is_published ? "Verstecken" : "Veröffentlichen"}>
                    {event.is_published ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button onClick={() => handleEdit(event)} className="p-2 hover:bg-muted rounded-md transition-colors text-foreground" title="Bearbeiten">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive" title="Löschen">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>
    </section>
  );
};

export default AdminPage;
