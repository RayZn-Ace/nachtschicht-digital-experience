import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Ticket, Event, TicketType } from "@/types/database";
import { toast } from "sonner";
import {
  Search, Filter, Download, ChevronDown, ChevronUp,
  Eye, Calendar, CheckCircle, XCircle, Clock,
  Package, ArrowLeft, TrendingUp, Ticket as TicketIcon,
  Plus, Trash2, Pencil, BarChart3, Ban, Mail, FileText, Loader2
} from "lucide-react";

interface OrderWithDetails extends Ticket {
  event?: Event;
  ticket_type?: TicketType;
}

type StatusFilter = "all" | "confirmed" | "canceled" | "refunded";
type SubTab = "overview" | "sales" | "types";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500/20 text-green-400",
  canceled: "bg-destructive/20 text-destructive",
  refunded: "bg-yellow-500/20 text-yellow-400",
  pending: "bg-muted text-muted-foreground",
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  confirmed: CheckCircle,
  canceled: XCircle,
  refunded: Clock,
  pending: Clock,
};

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

const AdminTicketCenter = () => {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  // Sales filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail view
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<OrderWithDetails[]>([]);

  // Ticket type editing
  const [editingType, setEditingType] = useState<TicketType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: "", description: "", price: 0, quantity: 100, event_id: "" });
  const [showTypeForm, setShowTypeForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [ordersRes, eventsRes, typesRes] = await Promise.all([
      supabase.from("tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("date", { ascending: false }),
      supabase.from("ticket_types").select("*").order("sort_order"),
    ]);
    if (ordersRes.data) setOrders(ordersRes.data as unknown as OrderWithDetails[]);
    if (eventsRes.data) setEvents(eventsRes.data as unknown as Event[]);
    if (typesRes.data) setTicketTypes(typesRes.data as unknown as TicketType[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getEvent = (eventId: string) => events.find((e) => e.id === eventId);
  const getTicketType = (typeId: string | null) => typeId ? ticketTypes.find((t) => t.id === typeId) : null;

  const enrichedOrders = useMemo(() => orders.map((o) => ({
    ...o,
    event: getEvent(o.event_id),
    ticket_type: getTicketType(o.ticket_type_id) || undefined,
  })), [orders, events, ticketTypes]);

  const filtered = useMemo(() => enrichedOrders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (eventFilter !== "all" && o.event_id !== eventFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !o.buyer_email.toLowerCase().includes(q) &&
        !(o.buyer_name || "").toLowerCase().includes(q) &&
        !(o.qr_code || "").toLowerCase().includes(q) &&
        !o.id.toLowerCase().includes(q)
      ) return false;
    }
    if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(o.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }), [enrichedOrders, statusFilter, eventFilter, searchTerm, dateFrom, dateTo]);

  // Global stats
  const confirmedOrders = useMemo(() => enrichedOrders.filter((o) => o.status === "confirmed"), [enrichedOrders]);
  const totalRevenue = useMemo(() => confirmedOrders.reduce((s, o) => s + o.total_price, 0), [confirmedOrders]);
  const totalTicketsSold = useMemo(() => confirmedOrders.reduce((s, o) => s + o.quantity, 0), [confirmedOrders]);
  const totalCheckedIn = useMemo(() => enrichedOrders.filter((o) => o.checked_in).length, [enrichedOrders]);
  const avgOrderValue = confirmedOrders.length > 0 ? totalRevenue / confirmedOrders.length : 0;

  // Revenue by event
  const revenueByEvent = useMemo(() => {
    const map: Record<string, { title: string; revenue: number; tickets: number; date: string }> = {};
    confirmedOrders.forEach((o) => {
      const eid = o.event_id;
      if (!map[eid]) {
        const ev = getEvent(eid);
        map[eid] = { title: ev?.title || "Unbekannt", revenue: 0, tickets: 0, date: ev?.date || "" };
      }
      map[eid].revenue += o.total_price;
      map[eid].tickets += o.quantity;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [confirmedOrders, events]);

  // Revenue by ticket type
  const revenueByType = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; tickets: number }> = {};
    confirmedOrders.forEach((o) => {
      const name = o.ticket_type?.name || "Standard";
      if (!map[name]) map[name] = { name, revenue: 0, tickets: 0 };
      map[name].revenue += o.total_price;
      map[name].tickets += o.quantity;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [confirmedOrders]);

  // Recent sales (last 7 days)
  const recentRevenue = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return confirmedOrders
      .filter((o) => new Date(o.created_at) >= cutoff)
      .reduce((s, o) => s + o.total_price, 0);
  }, [confirmedOrders]);

  // CSV Export
  const exportCSV = (type: "summary" | "orders" | "tickets") => {
    let csv = "";
    if (type === "summary") {
      const eventId = eventFilter !== "all" ? eventFilter : null;
      const ev = eventId ? getEvent(eventId) : null;
      const relevantOrders = eventId ? enrichedOrders.filter((o) => o.event_id === eventId) : enrichedOrders;
      const confirmed = relevantOrders.filter((o) => o.status === "confirmed");
      const revenue = confirmed.reduce((s, o) => s + o.total_price, 0);
      const ticketCount = confirmed.reduce((s, o) => s + o.quantity, 0);

      csv = "Bereich A: Ticketverkäufe – Zusammenfassung\n";
      csv += `Event;${ev?.title || "Alle Events"}\n`;
      csv += `Eventdatum;${ev ? new Date(ev.date).toLocaleDateString("de-DE") : "-"}\n`;
      csv += `Verkaufte Tickets (bestätigt);${ticketCount}\n`;
      csv += `Storniert;${relevantOrders.filter((o) => o.status === "canceled").reduce((s, o) => s + o.quantity, 0)}\n`;
      csv += `Erstattet;${relevantOrders.filter((o) => o.status === "refunded").reduce((s, o) => s + o.quantity, 0)}\n`;
      csv += `Umsatz brutto;${revenue.toFixed(2)}€\n`;
      csv += `Durchschnittl. Warenkorbwert;${confirmed.length > 0 ? (revenue / confirmed.length).toFixed(2) : "0.00"}€\n\n`;

      csv += "Kategorie;Menge;Umsatz\n";
      revenueByType.forEach((t) => { csv += `${t.name};${t.tickets};${t.revenue.toFixed(2)}€\n`; });
    } else if (type === "orders") {
      csv = "Order-ID;Bestelldatum;Käufername;E-Mail;Status;Menge;Brutto;Rabattcode;Check-in\n";
      filtered.forEach((o) => {
        csv += `${o.id};${new Date(o.created_at).toLocaleString("de-DE")};${o.buyer_name || "-"};${o.buyer_email};${o.status};${o.quantity};${o.total_price.toFixed(2)}€;${o.discount_code_id ? "Ja" : "-"};${o.checked_in ? "Ja" : "Nein"}\n`;
      });
    } else {
      csv = "Ticket-ID;Kategorie;Preis;Käufername;E-Mail;QR-Code;Status;Check-in;Scan-Zeitpunkt\n";
      filtered.forEach((o) => {
        csv += `${o.id};${o.ticket_type?.name || "Standard"};${o.total_price.toFixed(2)}€;${o.buyer_name || "-"};${o.buyer_email};${o.qr_code || "-"};${o.status};${o.checked_in ? "Ja" : "Nein"};${o.checked_in_at ? new Date(o.checked_in_at).toLocaleString("de-DE") : "-"}\n`;
      });
    }

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-${type}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export heruntergeladen");
  };

  const openDetail = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    const related = enrichedOrders.filter(
      (o) => o.buyer_email === order.buyer_email && o.event_id === order.event_id && o.created_at === order.created_at
    );
    setRelatedTickets(related);
  };

  // Ticket type CRUD
  const resetTypeForm = () => {
    setTypeForm({ name: "", description: "", price: 0, quantity: 100, event_id: "" });
    setEditingType(null);
    setShowTypeForm(false);
  };

  const saveTicketType = async () => {
    if (!typeForm.name.trim() || !typeForm.event_id) {
      toast.error("Name und Event sind Pflichtfelder");
      return;
    }
    const payload = {
      name: typeForm.name.trim(),
      description: typeForm.description || null,
      price: Number(typeForm.price),
      quantity: Number(typeForm.quantity),
      event_id: typeForm.event_id,
    };
    if (editingType) {
      const { error } = await supabase.from("ticket_types").update(payload).eq("id", editingType.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Ticketart aktualisiert!");
    } else {
      const existing = ticketTypes.filter((t) => t.event_id === typeForm.event_id);
      const { error } = await supabase.from("ticket_types").insert({ ...payload, sort_order: existing.length });
      if (error) { toast.error(error.message); return; }
      toast.success("Ticketart erstellt!");
    }
    resetTypeForm();
    fetchData();
  };

  const deleteTicketType = async (id: string) => {
    if (!confirm("Ticketart löschen?")) return;
    await supabase.from("ticket_types").delete().eq("id", id);
    toast.success("Gelöscht");
    fetchData();
  };

  const toggleTicketType = async (t: TicketType) => {
    await supabase.from("ticket_types").update({ is_active: !t.is_active }).eq("id", t.id);
    fetchData();
  };

  const startEditType = (t: TicketType) => {
    setTypeForm({ name: t.name, description: t.description || "", price: t.price, quantity: t.quantity, event_id: t.event_id });
    setEditingType(t);
    setShowTypeForm(true);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Ticketcenter wird geladen...</div>;

  // Detail View
  if (selectedOrder) {
    const ev = selectedOrder.event;
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={18} /> Zurück zur Übersicht
        </button>

        <div className="glass-card p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-2xl tracking-wider text-foreground">
                BESTELLUNG #{selectedOrder.id.substring(0, 8).toUpperCase()}
              </h2>
              <p className="text-sm text-muted-foreground">
                {new Date(selectedOrder.created_at).toLocaleString("de-DE")}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status] || STATUS_COLORS.pending}`}>
              {selectedOrder.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Käufer</p>
              <p className="text-foreground font-medium">{selectedOrder.buyer_name || "—"}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder.buyer_email}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Event</p>
              <p className="text-foreground font-medium">{ev?.title || "—"}</p>
              <p className="text-sm text-muted-foreground">
                {ev ? new Date(ev.date).toLocaleDateString("de-DE") + " – " + ev.time : "—"}
              </p>
            </div>
          </div>

          <h3 className="font-display text-lg tracking-wider text-foreground mb-3">TICKETS</h3>
          <div className="space-y-2 mb-6">
            {relatedTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.ticket_type?.name || "Standard"} × {t.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{t.qr_code || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{t.total_price.toFixed(2)}€</span>
                  {t.checked_in ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ Eingecheckt</span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Offen</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Zwischensumme</span>
              <span>{relatedTickets.reduce((s, t) => s + t.total_price, 0).toFixed(2)}€</span>
            </div>
            {selectedOrder.discount_code_id && (
              <div className="flex justify-between text-sm text-green-400 mb-1">
                <span>Rabatt</span>
                <span>— (Code verwendet)</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>Gesamt</span>
              <span>{relatedTickets.reduce((s, t) => s + t.total_price, 0).toFixed(2)}€</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {/* Cancel ticket */}
          {selectedOrder.status === "confirmed" && (
            <button
              onClick={async () => {
                if (!confirm("Ticket wirklich stornieren? Dies kann nicht rückgängig gemacht werden.")) return;
                const ticketIds = relatedTickets.map((t) => t.id);
                const { error } = await supabase
                  .from("tickets")
                  .update({ status: "canceled" })
                  .in("id", ticketIds);
                if (error) {
                  toast.error("Stornierung fehlgeschlagen: " + error.message);
                } else {
                  toast.success("Ticket(s) storniert");
                  setSelectedOrder(null);
                  fetchData();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-primary-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm"
            >
              <Ban size={16} /> Stornieren
            </button>
          )}

          {/* Download ticket PDF */}
          <button
            onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke("generate-ticket-pdf", {
                  body: { ticket_id: selectedOrder.id },
                });
                if (error) throw error;
                const blob = new Blob([data], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `ticket-${selectedOrder.id.slice(0, 8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err: any) {
                toast.error("PDF-Download fehlgeschlagen: " + (err.message || "Unbekannt"));
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm"
          >
            <Download size={16} /> Ticket-PDF
          </button>

          {/* Create invoice */}
          <button
            onClick={async () => {
              const ticketIds = relatedTickets.map((t) => t.id);
              try {
                const { data, error } = await supabase.functions.invoke("create-invoice", {
                  body: { ticket_ids: ticketIds },
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                toast.success(`Rechnung ${data.invoice_number} erstellt`);
              } catch (err: any) {
                toast.error("Rechnung fehlgeschlagen: " + (err.message || "Unbekannt"));
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm"
          >
            <FileText size={16} /> Rechnung erstellen
          </button>

          {/* Send ticket email */}
          <button
            onClick={async () => {
              const ticketIds = relatedTickets.map((t) => t.id);
              try {
                const { data, error } = await supabase.functions.invoke("send-ticket-email", {
                  body: { ticket_ids: ticketIds },
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                toast.success("Ticket-E-Mail gesendet! ✉️");
              } catch (err: any) {
                toast.error("E-Mail fehlgeschlagen: " + (err.message || "Unbekannt"));
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm"
          >
            <Mail size={16} /> Ticket per E-Mail senden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Sub-Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { id: "overview" as SubTab, label: "ÜBERSICHT", icon: BarChart3 },
          { id: "sales" as SubTab, label: "VERKÄUFE", icon: TicketIcon },
          { id: "types" as SubTab, label: "TICKETARTEN", icon: Package },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 font-display tracking-wider rounded-md transition-colors flex items-center gap-2 text-sm ${
              subTab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-primary">{totalRevenue.toFixed(2)}€</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              <p className="text-2xl font-bold text-foreground">{recentRevenue.toFixed(2)}€</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Tickets verkauft</p>
              <p className="text-2xl font-bold text-foreground">{totalTicketsSold}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">∅ Warenkorb</p>
              <p className="text-2xl font-bold text-foreground">{avgOrderValue.toFixed(2)}€</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Check-ins</p>
              <p className="text-2xl font-bold text-foreground">{totalCheckedIn}</p>
            </div>
          </div>

          {/* Revenue by Event */}
          <div className="glass-card p-6">
            <h3 className="font-display text-lg tracking-wider text-foreground mb-4">UMSATZ NACH EVENT</h3>
            {revenueByEvent.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Noch keine Verkäufe.</p>
            ) : (
              <div className="space-y-3">
                {revenueByEvent.map((ev) => {
                  const pct = totalRevenue > 0 ? (ev.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={ev.title}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate">{ev.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {ev.date ? new Date(ev.date).toLocaleDateString("de-DE") : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className="text-xs text-muted-foreground">{ev.tickets} Tickets</span>
                          <span className="text-sm font-bold text-foreground">{ev.revenue.toFixed(2)}€</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue by Ticket Type */}
          <div className="glass-card p-6">
            <h3 className="font-display text-lg tracking-wider text-foreground mb-4">UMSATZ NACH TICKETART</h3>
            {revenueByType.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Noch keine Verkäufe.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {revenueByType.map((t) => (
                  <div key={t.name} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <TicketIcon size={14} className="text-primary" />
                      <span className="text-sm text-foreground">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">{t.tickets}×</span>
                      <span className="text-sm font-bold text-foreground">{t.revenue.toFixed(2)}€</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportCSV("summary")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">
              <Download size={14} /> Zusammenfassung CSV
            </button>
            <button onClick={() => exportCSV("orders")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">
              <Download size={14} /> Checkouts CSV
            </button>
            <button onClick={() => exportCSV("tickets")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">
              <Download size={14} /> Tickets einzeln CSV
            </button>
          </div>
        </div>
      )}

      {/* ===== SALES TAB ===== */}
      {subTab === "sales" && (
        <div>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Bestellungen</p>
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Tickets gesamt</p>
              <p className="text-2xl font-bold text-foreground">{filtered.reduce((s, o) => s + o.quantity, 0)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Umsatz (bestätigt)</p>
              <p className="text-2xl font-bold text-primary">
                {filtered.filter((o) => o.status === "confirmed").reduce((s, o) => s + o.total_price, 0).toFixed(2)}€
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Eingecheckt</p>
              <p className="text-2xl font-bold text-foreground">{filtered.filter((o) => o.checked_in).length}</p>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suche (Name, E-Mail, Ticket-ID, QR-Code)..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-sm"
            >
              <Filter size={16} /> Filter {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showFilters && (
            <div className="glass-card p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-in">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm">
                  <option value="all">Alle</option>
                  <option value="confirmed">Bestätigt</option>
                  <option value="canceled">Storniert</option>
                  <option value="refunded">Erstattet</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Event</label>
                <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm">
                  <option value="all">Alle Events</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Von</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm" />
              </div>
            </div>
          )}

          {/* Orders list */}
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-center py-12 text-muted-foreground">Keine Bestellungen gefunden.</p>
            )}
            {filtered.map((order) => {
              const ev = order.event;
              const StatusIcon = STATUS_ICONS[order.status] || Clock;
              return (
                <div
                  key={order.id}
                  onClick={() => openDetail(order)}
                  className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-colors"
                  role="button"
                  tabIndex={0}
                >
                  <StatusIcon size={20} className={order.status === "confirmed" ? "text-green-400" : order.status === "canceled" ? "text-destructive" : "text-muted-foreground"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">#{order.id.substring(0, 8).toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                        {order.status}
                      </span>
                      {order.checked_in && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ check-in</span>}
                    </div>
                    <p className="text-sm text-foreground truncate">
                      {order.buyer_name || order.buyer_email} — {ev?.title || "Event gelöscht"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("de-DE")} · {order.quantity}× · {order.ticket_type?.name || "Standard"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">{order.total_price.toFixed(2)}€</p>
                  </div>
                  <Eye size={16} className="text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== TICKET TYPES TAB ===== */}
      {subTab === "types" && (
        <div className="space-y-6">
          {/* Add/Edit Form */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg tracking-wider text-foreground">
                {editingType ? "TICKETART BEARBEITEN" : "NEUE TICKETART"}
              </h3>
              {!showTypeForm && (
                <button onClick={() => setShowTypeForm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  <Plus size={14} /> HINZUFÜGEN
                </button>
              )}
            </div>

            {showTypeForm && (
              <div className="space-y-3">
                {/* Presets */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Schnellauswahl:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TYPES.map((p) => (
                      <button key={p.name} type="button"
                        onClick={() => setTypeForm({ ...typeForm, name: p.name, price: p.price })}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
                        {p.name} ({p.price}€)
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Event *</label>
                    <select value={typeForm.event_id} onChange={(e) => setTypeForm({ ...typeForm, event_id: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                      <option value="">Event wählen</option>
                      {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                    <input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="z.B. Early Bird"
                      className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Preis (€)</label>
                    <input type="number" step="0.01" value={typeForm.price || ""} onChange={(e) => setTypeForm({ ...typeForm, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Kontingent</label>
                    <input type="number" value={typeForm.quantity || ""} onChange={(e) => setTypeForm({ ...typeForm, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Beschreibung</label>
                    <input value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} placeholder="optional"
                      className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={saveTicketType} className="px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 text-sm">
                    {editingType ? "SPEICHERN" : "ERSTELLEN"}
                  </button>
                  <button onClick={resetTypeForm} className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted text-sm">
                    ABBRECHEN
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ticket types grouped by event */}
          {events.filter((ev) => ticketTypes.some((t) => t.event_id === ev.id)).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Noch keine Ticketarten erstellt.</p>
          ) : (
            events.filter((ev) => ticketTypes.some((t) => t.event_id === ev.id)).map((ev) => {
              const evTypes = ticketTypes.filter((t) => t.event_id === ev.id);
              const evRevenue = confirmedOrders.filter((o) => o.event_id === ev.id).reduce((s, o) => s + o.total_price, 0);
              const evSold = evTypes.reduce((s, t) => s + t.sold, 0);
              const evTotal = evTypes.reduce((s, t) => s + t.quantity, 0);
              return (
                <div key={ev.id} className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-lg tracking-wider text-foreground">{ev.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ev.date).toLocaleDateString("de-DE")} · {evSold}/{evTotal} verkauft · {evRevenue.toFixed(2)}€ Umsatz
                      </p>
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${evTotal > 0 ? (evSold / evTotal) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="divide-y divide-border/50">
                    {evTypes.map((t) => (
                      <div key={t.id} className={`flex items-center gap-3 p-3 px-4 ${!t.is_active ? "opacity-50" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{t.name}</span>
                            {t.description && <span className="text-xs text-muted-foreground">· {t.description}</span>}
                          </div>
                        </div>
                        <span className="text-sm text-foreground font-medium shrink-0">{t.price.toFixed(2)}€</span>
                        <span className="text-xs text-muted-foreground shrink-0">{t.sold}/{t.quantity}</span>
                        <button onClick={() => toggleTicketType(t)}
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${t.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {t.is_active ? "Aktiv" : "Inaktiv"}
                        </button>
                        <button onClick={() => startEditType(t)} className="p-1 hover:bg-muted rounded-md text-foreground shrink-0">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteTicketType(t.id)} className="p-1 text-destructive hover:text-destructive/80 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTicketCenter;
