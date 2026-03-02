import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Event, EventTag } from "@/types/database";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, LogOut, Image, Mail, FileText, BarChart3, Tags, Ticket, ShoppingCart, Sofa, Upload, X, Wine, Sparkles, Receipt, TrendingUp, Flag, Users } from "lucide-react";
import { CLUB_AREAS, parseAreas, formatAreas } from "@/lib/areas";
import AdminAlbums from "@/components/AdminAlbums";
import AdminNewsletter from "@/components/AdminNewsletter";
import AdminU18 from "@/components/AdminU18";
import AdminTracking from "@/components/AdminTracking";
import AdminTags from "@/components/AdminTags";
import AdminDiscountCodes from "@/components/AdminDiscountCodes";
import AdminTicketTypes from "@/components/AdminTicketTypes";
import AdminTicketCenter from "@/components/AdminTicketCenter";
import AdminLoungeBookings from "@/components/AdminLoungeBookings";
import AdminDrinks from "@/components/AdminDrinks";
import AdminHolidaySpecials from "@/components/AdminHolidaySpecials";
import AdminInvoiceConfig from "@/components/AdminInvoiceConfig";
import AdminEventRevenue from "@/components/AdminEventRevenue";
import AdminPhotoReports from "@/components/AdminPhotoReports";
import AdminApplicants from "@/components/AdminApplicants";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ALWAYS_OPEN_AREAS = ["openair", "bistro"];

interface Genre {
  id: string;
  name: string;
  is_default: boolean;
}

const AdminPage = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"events" | "ticketcenter" | "albums" | "newsletter" | "u18" | "tracking" | "tags" | "codes" | "lounges" | "drinks" | "holidays" | "invoiceconfig" | "revenue" | "reports" | "applicants">("events");
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [allTags, setAllTags] = useState<EventTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [eventTagsMap, setEventTagsMap] = useState<Record<string, EventTag[]>>({});
  const [formData, setFormData] = useState({
    title: "", subtitle: "", description: "", date: "", time: "22:00", end_time: "", genre: "", areas: "" as string,
    image_url: "", ticket_price: 0, ticket_quantity: 200, is_published: false, vat_rate: 19,
    has_muttizettel: false, has_abendkasse: false,
    fee_enabled: false, fee_type: "per_ticket", fee_mode: "fixed", fee_amount: 0,
  });
  const [selectedAreas, setSelectedAreas] = useState<string[]>(ALWAYS_OPEN_AREAS);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("date", { ascending: true });
    if (data) setEvents(data as unknown as Event[]);
  };

  const fetchGenres = async () => {
    const { data } = await supabase.from("genres").select("*").order("name");
    if (data) setGenres(data as Genre[]);
  };

  const fetchAllTags = async () => {
    const { data } = await supabase.from("event_tags").select("*").order("name");
    if (data) setAllTags(data as unknown as EventTag[]);
  };

  const fetchEventTagsMap = async () => {
    const { data } = await supabase.from("event_tag_assignments").select("event_id, tag_id");
    if (!data) return;
    // Build map: event_id -> tag objects
    const map: Record<string, EventTag[]> = {};
    data.forEach((a: any) => {
      if (!map[a.event_id]) map[a.event_id] = [];
      const tag = allTags.find((t) => t.id === a.tag_id);
      if (tag) map[a.event_id].push(tag);
    });
    setEventTagsMap(map);
  };

  useEffect(() => { fetchEvents(); fetchGenres(); fetchAllTags(); }, []);
  useEffect(() => { if (allTags.length > 0) fetchEventTagsMap(); }, [allTags]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const resetForm = () => {
    setFormData({ title: "", subtitle: "", description: "", date: "", time: "22:00", end_time: "", genre: "", areas: "", image_url: "", ticket_price: 0, ticket_quantity: 200, is_published: false, vat_rate: 19, has_muttizettel: false, has_abendkasse: false, fee_enabled: false, fee_type: "per_ticket", fee_mode: "fixed", fee_amount: 0 });
    setSelectedAreas(ALWAYS_OPEN_AREAS);
    setSelectedTagIds([]);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = async (event: Event) => {
    setEditing(event);
    const areas = parseAreas(event.areas);
    setSelectedAreas([...new Set([...areas, ...ALWAYS_OPEN_AREAS])]);
    setFormData({
      title: event.title, subtitle: (event as any).subtitle || "", description: event.description || "", date: event.date.split("T")[0],
      time: event.time, end_time: (event as any).end_time || "", genre: event.genre || "", areas: event.areas || "",
      image_url: event.image_url || "", ticket_price: event.ticket_price,
      ticket_quantity: event.ticket_quantity, is_published: event.is_published,
      vat_rate: (event as any).vat_rate ?? 19,
      has_muttizettel: (event as any).has_muttizettel ?? false,
      has_abendkasse: (event as any).has_abendkasse ?? false,
      fee_enabled: (event as any).fee_enabled ?? false,
      fee_type: (event as any).fee_type ?? "per_ticket",
      fee_mode: (event as any).fee_mode ?? "fixed",
      fee_amount: (event as any).fee_amount ?? 0,
    });
    // Load existing tag assignments for this event
    const { data } = await supabase.from("event_tag_assignments").select("tag_id").eq("event_id", event.id);
    setSelectedTagIds(data ? data.map((d: any) => d.tag_id) : []);
    setShowForm(true);
  };

  const toggleArea = (areaId: string) => {
    if (ALWAYS_OPEN_AREAS.includes(areaId)) return;
    setSelectedAreas((prev) => prev.includes(areaId) ? prev.filter((a) => a !== areaId) : [...prev, areaId]);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]);
  };

  const uploadEventImage = async (file: File) => {
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `events/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload-Fehler: " + error.message); setUploadingImage(false); return; }
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/event-images/${path}`;
    setFormData((prev) => ({ ...prev, image_url: imageUrl }));
    toast.success("Titelbild hochgeladen!");
    setUploadingImage(false);
  };

  const addGenre = async () => {
    if (!newGenre.trim()) return;
    const { error } = await supabase.from("genres").insert({ name: newGenre.trim() } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Genre erstellt!");
    setNewGenre("");
    fetchGenres();
  };

  const saveTagAssignments = async (eventId: string) => {
    // Delete existing assignments
    await supabase.from("event_tag_assignments").delete().eq("event_id", eventId);
    // Insert new ones
    if (selectedTagIds.length > 0) {
      const rows = selectedTagIds.map((tag_id) => ({ event_id: eventId, tag_id }));
      await supabase.from("event_tag_assignments").insert(rows);
    }
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      subtitle: formData.subtitle || null,
      end_time: formData.end_time || null,
      areas: formatAreas(selectedAreas),
      date: new Date(formData.date).toISOString(),
      ticket_price: Number(formData.ticket_price),
      ticket_quantity: Number(formData.ticket_quantity),
      vat_rate: Number(formData.vat_rate),
    };

    if (editing) {
      const { error } = await supabase.from("events").update(payload as any).eq("id", editing.id);
      if (error) { toast.error("Fehler: " + error.message); return; }
      await saveTagAssignments(editing.id);
      toast.success("Event aktualisiert!");
    } else {
      const { data, error } = await supabase.from("events").insert(payload as any).select("id").single();
      if (error) { toast.error("Fehler: " + error.message); return; }
      if (data) await saveTagAssignments((data as any).id);
      toast.success("Event erstellt!");
    }
    resetForm();
    fetchEvents();
    fetchEventTagsMap();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Event wirklich löschen?")) return;
    await supabase.from("event_tag_assignments").delete().eq("event_id", id);
    await supabase.from("events").delete().eq("id", id);
    toast.success("Event gelöscht");
    fetchEvents();
    fetchEventTagsMap();
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
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { id: "events", label: "EVENTS", icon: null },
            { id: "ticketcenter", label: "TICKETCENTER", icon: ShoppingCart },
            { id: "albums", label: "FOTOALBEN", icon: Image },
            { id: "newsletter", label: "NEWSLETTER", icon: Mail },
            { id: "u18", label: "MUTTIZETTEL", icon: FileText },
            { id: "tracking", label: "TRACKING", icon: BarChart3 },
            { id: "tags", label: "TAGS", icon: Tags },
            { id: "codes", label: "RABATTCODES", icon: Ticket },
            { id: "lounges", label: "LOUNGES", icon: Sofa },
            { id: "drinks", label: "GETRÄNKE", icon: Wine },
            { id: "holidays", label: "FEIERTAGE", icon: Sparkles },
            { id: "invoiceconfig", label: "RECHNUNGEN", icon: Receipt },
            { id: "revenue", label: "UMSATZ", icon: TrendingUp },
            { id: "reports", label: "MELDUNGEN", icon: Flag },
            { id: "applicants", label: "BEWERBER", icon: Users },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`px-5 py-2 font-display tracking-wider rounded-md transition-colors flex items-center gap-2 ${tab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {Icon && <Icon size={16} />} {label}
            </button>
          ))}
        </div>

        {tab === "applicants" ? (
          <AdminApplicants />
        ) : tab === "reports" ? (
          <AdminPhotoReports />
        ) : tab === "revenue" ? (
          <AdminEventRevenue />
        ) : tab === "invoiceconfig" ? (
          <AdminInvoiceConfig />
        ) : tab === "holidays" ? (
          <AdminHolidaySpecials />
        ) : tab === "drinks" ? (
          <AdminDrinks />
        ) : tab === "lounges" ? (
          <AdminLoungeBookings />
        ) : tab === "ticketcenter" ? (
          <AdminTicketCenter />
        ) : tab === "codes" ? (
          <AdminDiscountCodes />
        ) : tab === "tags" ? (
          <AdminTags />
        ) : tab === "tracking" ? (
          <AdminTracking />
        ) : tab === "u18" ? (
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
                <label className="text-sm text-foreground mb-1 block">Untertitel</label>
                <input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="z.B. Special Guest: DJ XY" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>

              {/* Genre dropdown with custom creation */}
              <div>
                <label className="text-sm text-foreground mb-1 block">Genre</label>
                <div className="flex gap-2">
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="flex-1 px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Bitte wählen</option>
                    {genres.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    placeholder="Neues Genre erstellen..."
                    className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && addGenre()}
                  />
                  <button onClick={addGenre} className="px-2.5 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">+</button>
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground mb-1 block">Datum *</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Beginn</label>
                <input value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} placeholder="22:00" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Ende</label>
                <input value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} placeholder="05:00" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>

              {/* Areas multi-select */}
              <div className="md:col-span-2">
                <label className="text-sm text-foreground mb-2 block">Areas (Räume) – welche Floors sind geöffnet?</label>
                <div className="flex flex-wrap gap-2">
                  {CLUB_AREAS.map((area) => {
                    const isAlwaysOpen = ALWAYS_OPEN_AREAS.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggleArea(area.id)}
                        disabled={isAlwaysOpen}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedAreas.includes(area.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                        } ${isAlwaysOpen ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        {area.name}
                        {area.genre && <span className="ml-1 opacity-70">· {area.genre}</span>}
                        {isAlwaysOpen && <span className="ml-1 opacity-70">· immer offen</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags multi-select */}
              {allTags.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm text-foreground mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedTagIds.includes(tag.id)
                            ? `${tag.color} border-current`
                            : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Titelbild Upload */}
              <div className="md:col-span-2">
                <label className="text-sm text-foreground mb-1 block">Titelbild</label>
                <div className="flex items-start gap-3">
                  {formData.image_url ? (
                    <div className="relative w-32 h-20 rounded-md overflow-hidden shrink-0">
                      <img src={formData.image_url} alt="Titelbild" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                        className="absolute top-1 right-1 p-0.5 bg-background/80 rounded-full text-foreground hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}
                  <label className="cursor-pointer flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadEventImage(e.target.files[0])}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm cursor-pointer">
                      <Upload size={16} />
                      {uploadingImage ? "Wird hochgeladen..." : "Bild hochladen"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Ticket price + VAT */}
              <div>
                <label className="text-sm text-foreground mb-1 block">Eintrittspreis (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Eintrittspreis"
                  value={formData.ticket_price || ""}
                  onChange={(e) => setFormData({ ...formData, ticket_price: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">MwSt.</label>
                <select
                  value={formData.vat_rate}
                  onChange={(e) => setFormData({ ...formData, vat_rate: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value={19}>19% MwSt.</option>
                  <option value={7}>7% MwSt.</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Ticketkontingent</label>
                <input
                  type="number"
                  placeholder="Ticketkontingent"
                  value={formData.ticket_quantity || ""}
                  onChange={(e) => setFormData({ ...formData, ticket_quantity: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-foreground mb-1 block">Beschreibung</label>
                <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.has_muttizettel} onChange={(e) => setFormData({ ...formData, has_muttizettel: e.target.checked })} className="accent-primary" />
                  <span className="text-sm text-foreground">Muttizettel erlaubt (U18)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.has_abendkasse} onChange={(e) => setFormData({ ...formData, has_abendkasse: e.target.checked })} className="accent-primary" />
                  <span className="text-sm text-foreground">Abendkasse verfügbar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })} className="accent-primary" />
                  <span className="text-sm text-foreground">Veröffentlicht</span>
                </label>
              </div>

              {/* Ticketgebühren */}
              <div className="md:col-span-2 border border-border rounded-lg p-4 bg-muted/30">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={formData.fee_enabled} onChange={(e) => setFormData({ ...formData, fee_enabled: e.target.checked })} className="accent-primary" />
                  <span className="text-sm font-medium text-foreground">Servicegebühr aktivieren</span>
                </label>
                {formData.fee_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Gebührenart</label>
                      <select
                        value={formData.fee_type}
                        onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="per_ticket">Pro Ticket</option>
                        <option value="per_order">Pro Bestellung</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Berechnungsart</label>
                      <select
                        value={formData.fee_mode}
                        onChange={(e) => setFormData({ ...formData, fee_mode: e.target.value })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="fixed">Fester Betrag (€)</option>
                        <option value="percent">Prozentual (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {formData.fee_mode === "percent" ? "Prozent (%)" : "Betrag (€)"}
                      </label>
                      <input
                        type="number"
                        step={formData.fee_mode === "percent" ? "0.1" : "0.01"}
                        value={formData.fee_amount || ""}
                        onChange={(e) => setFormData({ ...formData, fee_amount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder={formData.fee_mode === "percent" ? "z.B. 10" : "z.B. 2.50"}
                      />
                    </div>
                    {/* Preview */}
                    {formData.fee_amount > 0 && formData.ticket_price > 0 && (
                      <div className="md:col-span-3 p-3 bg-background/50 border border-border/50 rounded-md">
                        <p className="text-xs text-muted-foreground">
                          Vorschau: Ticketpreis {formData.ticket_price.toFixed(2)}€ + Servicegebühr{" "}
                          {formData.fee_mode === "percent"
                            ? `${formData.fee_amount}% = ${(formData.ticket_price * formData.fee_amount / 100).toFixed(2)}€`
                            : `${formData.fee_amount.toFixed(2)}€`
                          }
                          {" "}= <span className="text-foreground font-medium">
                            {(formData.ticket_price + (formData.fee_mode === "percent" ? formData.ticket_price * formData.fee_amount / 100 : formData.fee_amount)).toFixed(2)}€
                          </span>
                          {" "}({formData.fee_type === "per_ticket" ? "pro Ticket" : "pro Bestellung"})
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors">
                {editing ? "SPEICHERN" : "ERSTELLEN"}
              </button>
              {!formData.is_published && (
                <button
                  onClick={() => { setFormData((f) => ({ ...f, is_published: false })); handleSave(); }}
                  className="px-6 py-2 bg-muted text-foreground font-display tracking-wider rounded-md hover:bg-muted/80 transition-colors border border-border"
                >
                  ALS ENTWURF SPEICHERN
                </button>
              )}
              <button onClick={resetForm} className="px-6 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors">
                ABBRECHEN
              </button>
            </div>

            {/* Ticket Types - only for existing events */}
            {editing && <AdminTicketTypes eventId={editing.id} />}
          </div>
        )}

        <div className="space-y-3">
          {events.length === 0 && <p className="text-muted-foreground text-center py-12">Noch keine Events erstellt.</p>}
          {events.map((event) => {
            const eventAreas = parseAreas(event.areas);
            const eventTags = eventTagsMap[event.id] || [];
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
                    {(event as any).has_muttizettel && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">U18</span>
                    )}
                    {(event as any).has_abendkasse && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Abendkasse</span>
                    )}
                    {eventTags.map((tag) => (
                      <span key={tag.id} className={`text-xs px-2 py-0.5 rounded-full ${tag.color}`}>{tag.name}</span>
                    ))}
                  </div>
                  {(event as any).subtitle && (
                    <p className="text-muted-foreground text-xs italic">{(event as any).subtitle}</p>
                  )}
                  <p className="text-muted-foreground text-sm">
                    {new Date(event.date).toLocaleDateString("de-DE")} – {event.time}{(event as any).end_time ? ` bis ${(event as any).end_time}` : ""} | {event.genre} | {event.ticket_price}€ | {event.tickets_sold}/{event.ticket_quantity} Tickets
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
