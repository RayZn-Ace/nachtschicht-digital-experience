import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Ticket, Event, TicketType } from "@/types/database";
import { toast } from "sonner";
import {
  Search, Filter, Download, FileText, Mail, ChevronDown, ChevronUp,
  Eye, X, Calendar, CreditCard, CheckCircle, XCircle, Clock,
  Package, ArrowLeft
} from "lucide-react";

interface OrderWithDetails extends Ticket {
  event?: Event;
  ticket_type?: TicketType;
}

type StatusFilter = "all" | "confirmed" | "canceled" | "refunded";

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

const AdminOrders = () => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail view
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<OrderWithDetails[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [ordersRes, eventsRes, typesRes] = await Promise.all([
      supabase.from("tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("date", { ascending: false }),
      supabase.from("ticket_types").select("*"),
    ]);
    if (ordersRes.data) setOrders(ordersRes.data as unknown as OrderWithDetails[]);
    if (eventsRes.data) setEvents(eventsRes.data as unknown as Event[]);
    if (typesRes.data) setTicketTypes(typesRes.data as unknown as TicketType[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getEvent = (eventId: string) => events.find((e) => e.id === eventId);
  const getTicketType = (typeId: string | null) => typeId ? ticketTypes.find((t) => t.id === typeId) : null;

  // Enriched orders
  const enrichedOrders = orders.map((o) => ({
    ...o,
    event: getEvent(o.event_id),
    ticket_type: getTicketType(o.ticket_type_id) || undefined,
  }));

  // Filtered orders
  const filtered = enrichedOrders.filter((o) => {
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
  });

  // Stats
  const totalRevenue = filtered.filter((o) => o.status === "confirmed").reduce((s, o) => s + o.total_price, 0);
  const totalTickets = filtered.reduce((s, o) => s + o.quantity, 0);
  const checkedInCount = filtered.filter((o) => o.checked_in).length;

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

      // By ticket type
      csv += "Kategorie;Menge;Umsatz\n";
      const byType: Record<string, { qty: number; rev: number; name: string }> = {};
      confirmed.forEach((o) => {
        const name = o.ticket_type?.name || "Standard";
        if (!byType[name]) byType[name] = { qty: 0, rev: 0, name };
        byType[name].qty += o.quantity;
        byType[name].rev += o.total_price;
      });
      Object.values(byType).forEach((t) => { csv += `${t.name};${t.qty};${t.rev.toFixed(2)}€\n`; });
    } else if (type === "orders") {
      csv = "Order-ID;Bestelldatum;Käufername;E-Mail;Status;Rechnungsnr.;Menge;Brutto;Rabattcode;Check-in\n";
      filtered.forEach((o) => {
        csv += `${o.id};${new Date(o.created_at).toLocaleString("de-DE")};${o.buyer_name || "-"};${o.buyer_email};${o.status};-;${o.quantity};${o.total_price.toFixed(2)}€;${o.discount_code_id ? "Ja" : "-"};${o.checked_in ? "Ja" : "Nein"}\n`;
      });
    } else {
      csv = "Ticket-ID;Order-ID;Kategorie;Preis;Käufername;E-Mail;QR-Code;Status;Check-in;Scan-Zeitpunkt\n";
      filtered.forEach((o) => {
        csv += `${o.id};${o.id};${o.ticket_type?.name || "Standard"};${o.total_price.toFixed(2)}€;${o.buyer_name || "-"};${o.buyer_email};${o.qr_code || "-"};${o.status};${o.checked_in ? "Ja" : "Nein"};${o.checked_in_at ? new Date(o.checked_in_at).toLocaleString("de-DE") : "-"}\n`;
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
    // Find related tickets (same buyer_email + event for grouped orders)
    const related = enrichedOrders.filter(
      (o) => o.buyer_email === order.buyer_email && o.event_id === order.event_id && o.created_at === order.created_at
    );
    setRelatedTickets(related);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Bestellungen werden geladen...</div>;

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

          {/* Customer info */}
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

          {/* Tickets in this order */}
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
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      ✓ Eingecheckt
                    </span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      Offen
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
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
          <button
            onClick={async () => {
              const ticketIds = relatedTickets.map((t) => t.id);
              if (ticketIds.length === 0) return;
              setCreatingInvoice(true);
              try {
                const { data, error } = await supabase.functions.invoke("create-invoice", {
                  body: { ticket_ids: ticketIds },
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                toast.success(`Rechnung ${data.invoice_number} erstellt`);
              } catch (err: any) {
                console.error("Invoice creation failed:", err);
                toast.error("Rechnung konnte nicht erstellt werden: " + (err.message || "Unbekannter Fehler"));
              } finally {
                setCreatingInvoice(false);
              }
            }}
            disabled={creatingInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileText size={16} /> {creatingInvoice ? "Wird erstellt..." : "Rechnung erstellen"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm opacity-60 cursor-not-allowed" disabled>
            <Mail size={16} /> E-Mail erneut senden (bald)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Bestellungen</p>
          <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Tickets gesamt</p>
          <p className="text-2xl font-bold text-foreground">{totalTickets}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Umsatz (bestätigt)</p>
          <p className="text-2xl font-bold text-primary">{totalRevenue.toFixed(2)}€</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Eingecheckt</p>
          <p className="text-2xl font-bold text-foreground">{checkedInCount}</p>
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
            >
              <option value="all">Alle</option>
              <option value="confirmed">Bestätigt</option>
              <option value="canceled">Storniert</option>
              <option value="refunded">Erstattet</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Event</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
            >
              <option value="all">Alle Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Von</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
            />
          </div>
        </div>
      )}

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => exportCSV("summary")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">
          <Download size={14} /> A: Zusammenfassung
        </button>
        <button onClick={() => exportCSV("orders")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">
          <Download size={14} /> B: Checkouts
        </button>
        <button onClick={() => exportCSV("tickets")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-xs">
          <Download size={14} /> C: Tickets einzeln
        </button>
      </div>

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
              aria-label={`Bestellung ${order.id.substring(0, 8)} anzeigen`}
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
  );
};

export default AdminOrders;
