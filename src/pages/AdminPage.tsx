import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Event, EventTag } from "@/types/database";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, LogOut, Image, Mail, FileText, BarChart3, Tags, Ticket, ShoppingCart, Sofa, Upload, X, Wine, Sparkles, Receipt, TrendingUp, Flag, Users, Copy } from "lucide-react";
import AdminEventTickets from "@/components/AdminEventTickets";
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
import AdminControlling from "@/components/AdminControlling";
import AdminPhotoReports from "@/components/AdminPhotoReports";
import AdminApplicants from "@/components/AdminApplicants";
import AdminCustomers from "@/components/AdminCustomers";
import AdminLostAndFound from "@/components/AdminLostAndFound";
import AdminCsvMigration from "@/components/AdminCsvMigration";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ALWAYS_OPEN_AREAS = ["openair", "bistro"];

interface Genre {
  id: string;
  name: string;
  is_default: boolean;
}

const AdminPage = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ["events", "ticketcenter", "albums", "newsletter", "u18", "tracking", "tags", "codes", "lounges", "drinks", "holidays", "invoiceconfig", "revenue", "controlling", "reports", "applicants", "customers", "lostfound", "csvmigration"] as const;
  type TabType = typeof validTabs[number];
  const urlTab = searchParams.get("tab") as TabType | null;
  const [tab, setTabState] = useState<TabType>(validTabs.includes(urlTab as any) ? urlTab! : "events");

  const setTab = (t: TabType) => {
    setTabState(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab as any)) {
      setTabState(urlTab);
    }
  }, [urlTab]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventFilter, setEventFilter] = useState<"published" | "draft" | "past">("published");
  const [editing, setEditing] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ticketsEvent, setTicketsEvent] = useState<Event | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [allTags, setAllTags] = useState<EventTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [eventTagsMap, setEventTagsMap] = useState<Record<string, EventTag[]>>({});
  const [eventStats, setEventStats] = useState<Record<string, { sold: number; revenue: number; checkedIn: number; totalTickets: number }>>({});
  const [formData, setFormData] = useState({
    title: "", subtitle: "", description: "", date: "", time: "22:00", end_time: "", genre: "", areas: "" as string,
    image_url: "", ticket_price: 0, ticket_quantity: 200, is_published: false, is_featured: false, vat_rate: 19,
    has_muttizettel: false, has_abendkasse: false,
    fee_enabled: false, fee_type: "per_ticket", fee_mode: "fixed", fee_amount: 0,
  });
  const [selectedAreas, setSelectedAreas] = useState<string[]>(ALWAYS_OPEN_AREAS);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("date", { ascending: true });
    if (data) setEvents(data as unknown as Event[]);
  };

  const fetchEventStats = async () => {
    const { data: tickets } = await supabase.from("tickets").select("event_id, quantity, total_price, checked_in, status");
    if (!tickets) return;
    const stats: Record<string, { sold: number; revenue: number; checkedIn: number; totalTickets: number }> = {};
    tickets.forEach((t: any) => {
      if (!stats[t.event_id]) stats[t.event_id] = { sold: 0, revenue: 0, checkedIn: 0, totalTickets: 0 };
      if (t.status === "confirmed") {
        stats[t.event_id].sold += t.quantity;
        stats[t.event_id].revenue += t.total_price;
        stats[t.event_id].totalTickets += 1;
        if (t.checked_in) stats[t.event_id].checkedIn += 1;
      }
    });
    setEventStats(stats);
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

  useEffect(() => { fetchEvents(); fetchGenres(); fetchAllTags(); fetchEventStats(); }, []);
  useEffect(() => { if (allTags.length > 0) fetchEventTagsMap(); }, [allTags]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const resetForm = () => {
    setFormData({ title: "", subtitle: "", description: "", date: "", time: "22:00", end_time: "", genre: "", areas: "", image_url: "", ticket_price: 0, ticket_quantity: 200, is_published: false, is_featured: false, vat_rate: 19, has_muttizettel: false, has_abendkasse: false, fee_enabled: false, fee_type: "per_ticket", fee_mode: "fixed", fee_amount: 0 });
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
      is_featured: (event as any).is_featured ?? false,
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

  const createAndSelectTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const { data, error } = await supabase.from("event_tags").insert({ name } as any).select("*").single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      const newTag = data as unknown as EventTag;
      setAllTags((prev) => [...prev, newTag]);
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      toast.success(`Tag "${name}" erstellt`);
    }
    setNewTagName("");
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

  const handleDuplicate = async (event: Event) => {
    const payload = {
      title: event.title + " (Kopie)",
      subtitle: (event as any).subtitle || null,
      description: event.description || null,
      date: event.date,
      time: event.time,
      end_time: (event as any).end_time || null,
      genre: event.genre || null,
      areas: event.areas || null,
      image_url: event.image_url || null,
      ticket_price: event.ticket_price,
      ticket_quantity: event.ticket_quantity,
      tickets_sold: 0,
      is_published: false,
      is_featured: (event as any).is_featured ?? false,
      vat_rate: (event as any).vat_rate ?? 19,
      has_muttizettel: (event as any).has_muttizettel ?? false,
      has_abendkasse: (event as any).has_abendkasse ?? false,
      fee_enabled: (event as any).fee_enabled ?? false,
      fee_type: (event as any).fee_type ?? "per_ticket",
      fee_mode: (event as any).fee_mode ?? "fixed",
      fee_amount: (event as any).fee_amount ?? 0,
    };
    const { data, error } = await supabase.from("events").insert(payload as any).select("id").single();
    if (error) { toast.error("Fehler beim Duplizieren: " + error.message); return; }
    // Copy tag assignments
    if (data) {
      const newId = (data as any).id;
      const { data: tags } = await supabase.from("event_tag_assignments").select("tag_id").eq("event_id", event.id);
      if (tags && tags.length > 0) {
        await supabase.from("event_tag_assignments").insert(tags.map((t: any) => ({ event_id: newId, tag_id: t.tag_id })));
      }
      // Copy ticket types
      const { data: ttypes } = await supabase.from("ticket_types").select("*").eq("event_id", event.id);
      if (ttypes && ttypes.length > 0) {
        const newTypes = ttypes.map((tt: any) => ({
          event_id: newId,
          name: tt.name,
          description: tt.description,
          price: tt.price,
          quantity: tt.quantity,
          sold: 0,
          sort_order: tt.sort_order,
          is_active: tt.is_active,
          sale_start: tt.sale_start,
          sale_end: tt.sale_end,
          fee_override_enabled: tt.fee_override_enabled,
          fee_amount_override: tt.fee_amount_override,
          fee_mode_override: tt.fee_mode_override,
        }));
        await supabase.from("ticket_types").insert(newTypes);
      }
    }
    toast.success("Event dupliziert!");
    fetchEvents();
    fetchEventTagsMap();
  };

  return (
    <section>
      <div className="max-w-7xl mx-auto">


        {tab === "csvmigration" ? (
          <AdminCsvMigration />
        ) : tab === "lostfound" ? (
          <AdminLostAndFound />
        ) : tab === "customers" ? (
          <AdminCustomers />
        ) : tab === "applicants" ? (
          <AdminApplicants />
        ) : tab === "reports" ? (
          <AdminPhotoReports />
        ) : tab === "controlling" ? (
          <AdminControlling />
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
                <div className="flex gap-1.5 mt-2">
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Neuen Tag erstellen..."
                    className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createAndSelectTag())}
                  />
                  <button type="button" onClick={createAndSelectTag} className="px-2.5 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">+</button>
                </div>
              </div>

              {/* Titelbild Upload */}
              <div className="md:col-span-2">
                <label className="text-sm text-foreground mb-1 block">Titelbild</label>
                <div className="flex items-start gap-3">
                  {formData.image_url ? (
                    <div className="relative w-full max-w-lg rounded-md overflow-hidden shrink-0 border border-border" style={{ aspectRatio: '1920/1080' }}>
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
                  placeholder="Abendkasse"
                  value={formData.ticket_price || ""}
                  onChange={(e) => setFormData({ ...formData, ticket_price: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">MwSt. (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.vat_rate}
                  onChange={(e) => setFormData({ ...formData, vat_rate: Number(e.target.value) })}
                  placeholder="z.B. 19"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
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
                <label className="flex items-center gap-2 cursor-pointer" title={!formData.is_featured && events.filter((e: any) => e.is_featured && e.id !== editing?.id).length >= 3 ? "Maximal 3 Favoriten möglich" : ""}>
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    disabled={!formData.is_featured && events.filter((e: any) => e.is_featured && e.id !== editing?.id).length >= 3}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="accent-primary"
                  />
                  <span className={`text-sm ${!formData.is_featured && events.filter((e: any) => e.is_featured && e.id !== editing?.id).length >= 3 ? "text-muted-foreground" : "text-foreground"}`}>
                    ⭐ Highlight auf Startseite {events.filter((e: any) => e.is_featured && e.id !== editing?.id).length >= 3 && !formData.is_featured ? "(max. 3)" : ""}
                  </span>
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
            const stats = eventStats[event.id] || { sold: 0, revenue: 0, checkedIn: 0, totalTickets: 0 };
            return (
              <div key={event.id} className="glass-card overflow-hidden">
                {/* Header row: image + title + status */}
                <div className="flex items-start gap-3 p-3 sm:p-4">
                  {event.image_url && (
                    <img src={event.image_url} alt={event.title} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base sm:text-lg tracking-wider text-foreground leading-tight line-clamp-2">{event.title}</h3>
                      {event.is_published ? (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full shrink-0 font-medium">Live</span>
                      ) : (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0 font-medium">Entwurf</span>
                      )}
                    </div>
                    {(event as any).subtitle && (
                      <p className="text-muted-foreground text-xs italic truncate mt-0.5">{(event as any).subtitle}</p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1">
                      {new Date(event.date).toLocaleDateString("de-DE")} · {event.time}{(event as any).end_time ? `–${(event as any).end_time}` : ""} · {event.genre} · {event.ticket_price}€
                    </p>
                  </div>
                </div>

                {/* Badges row */}
                {((event as any).has_muttizettel || (event as any).has_abendkasse || eventTags.length > 0 || eventAreas.length > 0) && (
                  <div className="flex flex-wrap gap-1 px-3 sm:px-4 pb-2">
                    {(event as any).has_muttizettel && (
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">U18</span>
                    )}
                    {(event as any).has_abendkasse && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">AK</span>
                    )}
                    {eventTags.map((tag) => (
                      <span key={tag.id} className={`text-[10px] px-1.5 py-0.5 rounded-full ${tag.color}`}>{tag.name}</span>
                    ))}
                    {eventAreas.map((aId) => {
                      const area = CLUB_AREAS.find((a) => a.id === aId);
                      return area ? (
                        <span key={aId} className={`text-[10px] px-1.5 py-0.5 rounded-full ${area.color}`}>
                          {area.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* KPI Stats row */}
                <div className="grid grid-cols-3 gap-px bg-border/30 mx-3 sm:mx-4 mb-2 rounded-md overflow-hidden text-center">
                  <div className="bg-muted/30 py-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground block">Verkauft</span>
                    <span className="text-xs font-medium text-foreground">{stats.sold}/{event.ticket_quantity}</span>
                  </div>
                  <div className="bg-muted/30 py-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground block">Umsatz</span>
                    <span className="text-xs font-medium text-foreground">{stats.revenue.toFixed(0)}€</span>
                  </div>
                  <div className="bg-muted/30 py-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground block">Check-in</span>
                    <span className="text-xs font-medium text-foreground">{stats.checkedIn}/{stats.totalTickets}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex border-t border-border/30">
                  <button onClick={() => setTicketsEvent(event)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 hover:bg-primary/10 transition-colors text-primary text-xs font-medium min-h-[44px]" title="Tickets">
                    <Ticket size={15} /> <span className="hidden xs:inline">Tickets</span>
                  </button>
                  <button onClick={() => togglePublish(event)} className="flex-1 flex items-center justify-center py-2.5 hover:bg-muted transition-colors text-muted-foreground min-h-[44px]" title={event.is_published ? "Verstecken" : "Veröffentlichen"}>
                    {event.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button onClick={() => handleDuplicate(event)} className="flex-1 flex items-center justify-center py-2.5 hover:bg-muted transition-colors text-muted-foreground min-h-[44px]" title="Duplizieren">
                    <Copy size={15} />
                  </button>
                  <button onClick={() => handleEdit(event)} className="flex-1 flex items-center justify-center py-2.5 hover:bg-muted transition-colors text-muted-foreground min-h-[44px]" title="Bearbeiten">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="flex-1 flex items-center justify-center py-2.5 hover:bg-destructive/10 transition-colors text-destructive min-h-[44px]" title="Löschen">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>

      {/* Ticket management modal */}
      {ticketsEvent && (
        <AdminEventTickets event={ticketsEvent} onClose={() => setTicketsEvent(null)} />
      )}
    </section>
  );
};

export default AdminPage;
