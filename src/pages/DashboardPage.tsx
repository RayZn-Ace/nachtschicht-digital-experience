import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import AdminSessionBar from "@/components/AdminSessionBar";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, ShieldAlert, Calendar, QrCode, Users, Mail,
  TrendingUp, TrendingDown, Ticket, DollarSign, Eye, Music,
  Clock, MapPin, AlertCircle, ChevronRight, ShoppingCart,
  ArrowUpRight, Filter, ShoppingBag, Trash2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfMonth, startOfYear, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";

/* ───── types ───── */
interface TicketRow {
  id: string;
  event_id: string;
  quantity: number;
  total_price: number;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  buyer_name: string | null;
  buyer_email: string;
  qr_code: string | null;
  created_at: string;
  ticket_type_id: string | null;
}

interface EventRow {
  id: string;
  title: string;
  date: string;
  image_url: string | null;
  genre: string | null;
  areas: string | null;
  ticket_quantity: number;
  tickets_sold: number;
}

interface TicketTypeRow {
  id: string;
  name: string;
  sold: number;
  quantity: number;
  price: number;
  event_id: string;
}

type TimePeriod = "today" | "7d" | "30d" | "month" | "year" | "all";
type ChartMode = "tickets" | "revenue";

/* ───── helpers ───── */
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const pct = (sold: number, total: number) =>
  total > 0 ? Math.round((sold / total) * 100) : 0;

const availabilityLabel = (p: number) => {
  if (p >= 95) return { text: "Ausverkauft", cls: "text-destructive" };
  if (p >= 80) return { text: "Fast ausverkauft", cls: "text-orange-400" };
  if (p >= 60) return { text: "Nur noch wenige", cls: "text-yellow-400" };
  return { text: "Verfügbar", cls: "text-green-400" };
};

const getDateRange = (period: TimePeriod): { from: Date; to: Date } => {
  const now = new Date();
  const to = endOfDay(now);
  switch (period) {
    case "today": return { from: startOfDay(now), to };
    case "7d": return { from: startOfDay(subDays(now, 7)), to };
    case "30d": return { from: startOfDay(subDays(now, 30)), to };
    case "month": return { from: startOfMonth(now), to };
    case "year": return { from: startOfYear(now), to };
    default: return { from: new Date("2020-01-01"), to };
  }
};

/* ───── component ───── */
const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { roles, isAdmin, loading: rolesLoading } = useUserRoles();

  // Raw data
  const [allTickets, setAllTickets] = useState<TicketRow[]>([]);
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [allTicketTypes, setAllTicketTypes] = useState<TicketTypeRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Global filters
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30d");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [chartMode, setChartMode] = useState<ChartMode>("tickets");

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const [ticketsRes, eventsRes, typesRes] = await Promise.all([
      supabase.from("tickets").select("id, event_id, quantity, total_price, status, checked_in, checked_in_at, buyer_name, buyer_email, qr_code, created_at, ticket_type_id").order("created_at", { ascending: false }),
      supabase.from("events").select("id, title, date, image_url, genre, areas, ticket_quantity, tickets_sold").order("date", { ascending: true }),
      supabase.from("ticket_types").select("id, name, sold, quantity, price, event_id"),
    ]);
    if (ticketsRes.data) setAllTickets(ticketsRes.data as unknown as TicketRow[]);
    if (eventsRes.data) setAllEvents(eventsRes.data as unknown as EventRow[]);
    if (typesRes.data) setAllTicketTypes(typesRes.data as unknown as TicketTypeRow[]);
    setDataLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const range = getDateRange(timePeriod);
    return allTickets.filter((t) => {
      const d = new Date(t.created_at);
      if (!isWithinInterval(d, { start: range.from, end: range.to })) return false;
      if (eventFilter !== "all" && t.event_id !== eventFilter) return false;
      return true;
    });
  }, [allTickets, timePeriod, eventFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const confirmed = filteredTickets.filter((t) => t.status === "confirmed");
    const refunded = filteredTickets.filter((t) => t.status === "refunded");
    const totalRevenue = confirmed.reduce((s, t) => s + Number(t.total_price), 0);
    const refundedRevenue = refunded.reduce((s, t) => s + Number(t.total_price), 0);
    const netRevenue = totalRevenue - refundedRevenue;
    const totalSold = confirmed.reduce((s, t) => s + t.quantity, 0);
    const checkedIn = filteredTickets.filter((t) => t.checked_in).length;
    const orderCount = confirmed.length;
    const aov = orderCount > 0 ? netRevenue / orderCount : 0;

    // Previous period for comparison
    const range = getDateRange(timePeriod);
    const duration = range.to.getTime() - range.from.getTime();
    const prevFrom = new Date(range.from.getTime() - duration);
    const prevTo = new Date(range.from.getTime() - 1);
    const prevTickets = allTickets.filter((t) => {
      const d = new Date(t.created_at);
      if (d < prevFrom || d > prevTo) return false;
      if (eventFilter !== "all" && t.event_id !== eventFilter) return false;
      return t.status === "confirmed";
    });
    const prevRevenue = prevTickets.reduce((s, t) => s + Number(t.total_price), 0);
    const prevSold = prevTickets.reduce((s, t) => s + t.quantity, 0);
    const prevAOV = prevTickets.length > 0 ? prevRevenue / prevTickets.length : 0;

    const revTrend = prevRevenue > 0 ? Math.round(((netRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const soldTrend = prevSold > 0 ? Math.round(((totalSold - prevSold) / prevSold) * 100) : 0;
    const aovTrend = prevAOV > 0 ? Math.round(((aov - prevAOV) / prevAOV) * 100) : 0;

    return { netRevenue, totalRevenue, refundedRevenue, totalSold, checkedIn, orderCount, aov, revTrend, soldTrend, aovTrend };
  }, [filteredTickets, allTickets, timePeriod, eventFilter]);

  // Chart data (last 30 days)
  const chartData = useMemo(() => {
    const days = 30;
    const data: { date: string; label: string; tickets: number; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayEnd = endOfDay(day);
      const dayTickets = allTickets.filter((t) => {
        const d = new Date(t.created_at);
        if (d < day || d > dayEnd) return false;
        if (eventFilter !== "all" && t.event_id !== eventFilter) return false;
        return t.status === "confirmed";
      });
      data.push({
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "dd.MM", { locale: de }),
        tickets: dayTickets.reduce((s, t) => s + t.quantity, 0),
        revenue: dayTickets.reduce((s, t) => s + Number(t.total_price), 0),
      });
    }
    return data;
  }, [allTickets, eventFilter]);

  // Last 10 orders
  const lastOrders = useMemo(() => {
    return filteredTickets
      .filter((t) => t.status === "confirmed")
      .slice(0, 10);
  }, [filteredTickets]);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    return allEvents.filter((e) => new Date(e.date) >= new Date()).slice(0, 3);
  }, [allEvents]);

  const getEventTitle = (id: string) => allEvents.find((e) => e.id === id)?.title || "—";

  if (authLoading || rolesLoading)
    return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const roleBadge = isAdmin ? "Admin" : "User";

  const timePeriods: { key: TimePeriod; label: string }[] = [
    { key: "today", label: "Heute" },
    { key: "7d", label: "7 Tage" },
    { key: "30d", label: "30 Tage" },
    { key: "month", label: "Monat" },
    { key: "year", label: "Jahr" },
    { key: "all", label: "Gesamt" },
  ];

  const navLinks = [
    { href: "/admin", label: "Analytics & Berichte", icon: <BarChart3 size={16} />, style: "bg-primary text-primary-foreground hover:bg-primary/90", adminOnly: false },
    { href: "/admin", label: "Erstattungen", icon: <ShieldAlert size={16} />, style: "bg-destructive text-destructive-foreground hover:bg-destructive/90", adminOnly: true },
    { href: "/admin", label: "Events verwalten", icon: <Calendar size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: false },
    { href: "/admin", label: "Rollen & Rechte", icon: <Users size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: true },
    { href: "/scanner", label: "Ticket Scanner", icon: <QrCode size={16} />, style: "bg-green-600 text-white hover:bg-green-700", adminOnly: false },
    { href: "/admin", label: "Newsletter", icon: <Mail size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: true },
  ];

  const totalTicketsUpcoming = upcomingEvents.reduce((s, e) => s + (e.ticket_quantity || 0), 0);
  const totalSoldUpcoming = upcomingEvents.reduce((s, e) => s + (e.tickets_sold || 0), 0);
  const overallPct = pct(totalSoldUpcoming, totalTicketsUpcoming);

  // Ticket types for the widget
  const displayTicketTypes = allTicketTypes.length > 0
    ? allTicketTypes.slice(0, 5)
    : [];

  return (
    <section className="section-padding" aria-label="Dashboard">
      <div className="container mx-auto max-w-7xl">
        {/* Session bar */}
        <div className="gradient-card rounded-xl mb-6 overflow-hidden">
          <AdminSessionBar roles={roles} />

          <ScrollReveal className="p-6 md:p-10">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-display text-4xl md:text-6xl tracking-wider text-foreground">
                DASH<span className="text-gradient">BOARD</span>
              </h1>
              <span className="px-3 py-1 text-xs font-display tracking-widest rounded-full bg-primary/20 text-primary border border-primary/30 uppercase">
                {roleBadge}
              </span>
            </div>
            <p className="text-muted-foreground max-w-xl mb-6">
              Zentrale Übersicht für Events, Tickets, Umsätze und Kundenverwaltung.
            </p>

            <div className="flex flex-wrap gap-2" role="navigation" aria-label="Admin-Navigation">
              {navLinks
                .filter((l) => !l.adminOnly || isAdmin)
                .map((l) => (
                  <Link key={l.label} to={l.href} className={`flex items-center gap-2 px-4 py-2 text-sm font-display tracking-wider rounded-md transition-colors ${l.style}`}>
                    {l.icon} {l.label.toUpperCase()}
                  </Link>
                ))}
            </div>

            {/* Profile links (all users) */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30" role="navigation" aria-label="Profil-Navigation">
              <Link to="/meine-bestellungen" className="flex items-center gap-2 px-4 py-2 text-sm font-display tracking-wider rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors">
                <ShoppingBag size={16} /> MEINE BESTELLUNGEN
              </Link>
              <Link to="/meine-tickets" className="flex items-center gap-2 px-4 py-2 text-sm font-display tracking-wider rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors">
                <Ticket size={16} /> MEINE TICKETS
              </Link>
              <Link to="/account-loeschen" className="flex items-center gap-2 px-4 py-2 text-sm font-display tracking-wider rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Trash2 size={16} /> ACCOUNT LÖSCHEN
              </Link>
            </div>
          </ScrollReveal>
        </div>

        {/* ─── Global Filters ─── */}
        {isAdmin && (
          <ScrollReveal delay={0.05}>
            <div className="glass-card p-4 mb-6 flex flex-col md:flex-row gap-3 items-start md:items-center" role="toolbar" aria-label="Dashboard-Filter">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter size={16} /> Zeitraum:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {timePeriods.map((tp) => (
                  <button
                    key={tp.key}
                    onClick={() => setTimePeriod(tp.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-display tracking-wider transition-colors ${
                      timePeriod === tp.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tp.label}
                  </button>
                ))}
              </div>
              <div className="md:ml-auto">
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-xs"
                >
                  <option value="all">Alle Events</option>
                  {allEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ─── KPIs ─── */}
        {isAdmin && (
          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              {/* Revenue */}
              <div className="gradient-card rounded-xl p-4 border border-border/50 lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={20} className="text-muted-foreground" />
                  {kpis.revTrend !== 0 && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${kpis.revTrend > 0 ? "text-green-400" : "text-destructive"}`}>
                      {kpis.revTrend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(kpis.revTrend)}%
                    </span>
                  )}
                </div>
                <p className="font-display text-2xl md:text-3xl tracking-wider text-foreground">{fmtCurrency(kpis.netRevenue)}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Umsatz (netto)</p>
              </div>

              {/* Tickets sold */}
              <div className="gradient-card rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Ticket size={20} className="text-muted-foreground" />
                  {kpis.soldTrend !== 0 && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${kpis.soldTrend > 0 ? "text-green-400" : "text-destructive"}`}>
                      {kpis.soldTrend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(kpis.soldTrend)}%
                    </span>
                  )}
                </div>
                <p className="font-display text-2xl md:text-3xl tracking-wider text-foreground">{kpis.totalSold.toLocaleString("de-DE")}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Tickets verkauft</p>
              </div>

              {/* Orders */}
              <div className="gradient-card rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart size={20} className="text-muted-foreground" />
                </div>
                <p className="font-display text-2xl md:text-3xl tracking-wider text-foreground">{kpis.orderCount}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Bestellungen</p>
              </div>

              {/* AOV */}
              <div className="gradient-card rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <ArrowUpRight size={20} className="text-muted-foreground" />
                  {kpis.aovTrend !== 0 && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${kpis.aovTrend > 0 ? "text-green-400" : "text-destructive"}`}>
                      {kpis.aovTrend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(kpis.aovTrend)}%
                    </span>
                  )}
                </div>
                <p className="font-display text-2xl md:text-3xl tracking-wider text-foreground">{fmtCurrency(kpis.aov)}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Ø Bestellwert</p>
              </div>

              {/* Check-ins */}
              <div className="gradient-card rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <QrCode size={20} className="text-muted-foreground" />
                </div>
                <p className="font-display text-2xl md:text-3xl tracking-wider text-foreground">{kpis.checkedIn}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Check-ins</p>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ─── Sales Chart ─── */}
        {isAdmin && (
          <ScrollReveal delay={0.15}>
            <div className="gradient-card rounded-xl p-6 border border-border/50 mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display text-xl tracking-wider text-foreground flex items-center gap-2">
                  <BarChart3 size={18} className="text-primary" /> VERKÄUFE <span className="text-gradient">30 TAGE</span>
                </h2>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setChartMode("tickets")}
                    className={`px-3 py-1 rounded-md text-xs font-display tracking-wider ${
                      chartMode === "tickets" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    TICKETS
                  </button>
                  <button
                    onClick={() => setChartMode("revenue")}
                    className={`px-3 py-1 rounded-md text-xs font-display tracking-wider ${
                      chartMode === "revenue" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    UMSATZ
                  </button>
                </div>
              </div>
              <div className="h-64 md:h-80">
                {dataLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Laden...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "hsl(0, 0%, 60%)" }}
                        interval={4}
                        axisLine={{ stroke: "hsl(0, 0%, 18%)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(0, 0%, 60%)" }}
                        axisLine={{ stroke: "hsl(0, 0%, 18%)" }}
                        tickFormatter={chartMode === "revenue" ? (v) => `${v}€` : undefined}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(0, 0%, 8%)",
                          border: "1px solid hsl(0, 0%, 18%)",
                          borderRadius: "8px",
                          fontSize: 12,
                          color: "hsl(0, 0%, 95%)",
                        }}
                        formatter={(value: number) =>
                          chartMode === "revenue"
                            ? [fmtCurrency(value), "Umsatz"]
                            : [value, "Tickets"]
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey={chartMode}
                        stroke="hsl(0, 85%, 50%)"
                        strokeWidth={2}
                        fill="url(#salesGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ─── Last 10 Orders + Upcoming Events ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Last 10 Orders */}
          {isAdmin && (
            <ScrollReveal delay={0.2} className="lg:col-span-2">
              <div className="gradient-card rounded-xl p-6 border border-border/50 h-full" aria-labelledby="orders-heading">
                <h2 id="orders-heading" className="font-display text-xl tracking-wider text-foreground mb-4 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-primary" /> LETZTE <span className="text-gradient">BESTELLUNGEN</span>
                </h2>

                {lastOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Keine Bestellungen im gewählten Zeitraum.</p>
                ) : (
                  <div className="space-y-2">
                    {lastOrders.map((order) => (
                      <Link
                        key={order.id}
                        to="/admin"
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                          <DollarSign size={14} className="text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground font-medium truncate">
                              {order.buyer_name || order.buyer_email}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{order.id.substring(0, 6).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {getEventTitle(order.event_id)} · {order.quantity}× Tickets
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{fmtCurrency(Number(order.total_price))}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(order.created_at), "dd.MM. HH:mm", { locale: de })}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  to="/admin"
                  className="flex items-center gap-1 text-sm text-primary hover:underline mt-4"
                  onClick={() => {/* tab=orders would need state, linking to admin for now */}}
                >
                  Alle Bestellungen anzeigen <ChevronRight size={14} />
                </Link>
              </div>
            </ScrollReveal>
          )}

          {/* Upcoming Events */}
          <ScrollReveal delay={0.25} className={isAdmin ? "" : "lg:col-span-3"}>
            <div className="gradient-card rounded-xl p-6 border border-border/50 h-full" aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="font-display text-xl tracking-wider text-foreground mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-primary" /> NÄCHSTE <span className="text-gradient">EVENTS</span>
              </h2>

              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Keine kommenden Events.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((ev) => {
                    const d = new Date(ev.date);
                    const p = pct(ev.tickets_sold || 0, ev.ticket_quantity || 1);
                    return (
                      <Link
                        key={ev.id}
                        to={`/tickets/${ev.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                          {ev.image_url ? (
                            <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Calendar size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {ev.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(d, "dd.MM.yyyy", { locale: de })} · {ev.genre || "—"}
                          </p>
                          <div className="mt-1">
                            <Progress value={p} className="h-1" />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-medium ${availabilityLabel(p).cls}`}>
                            {p}%
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>

        {/* ─── Tickets & Availability ─── */}
        {isAdmin && displayTicketTypes.length > 0 && (
          <ScrollReveal delay={0.3}>
            <div className="gradient-card rounded-xl p-6 border border-border/50 mb-6" aria-labelledby="ticket-types-heading">
              <h2 id="ticket-types-heading" className="font-display text-xl tracking-wider text-foreground mb-4 flex items-center gap-2">
                <Ticket size={18} className="text-primary" /> TICKET <span className="text-gradient">KATEGORIEN</span>
              </h2>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Gesamtauslastung (kommende Events)</span>
                  <span className="font-display text-foreground">{overallPct}%</span>
                </div>
                <Progress value={overallPct} className="h-2.5 rounded-full" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayTicketTypes.map((t) => {
                  const tp = pct(t.sold, t.quantity);
                  const av = availabilityLabel(tp);
                  return (
                    <div key={t.id} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{t.name}</span>
                        <span className={`text-xs ${av.cls}`}>{av.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={tp} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{t.sold}/{t.quantity}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{fmtCurrency(t.price)} / Ticket</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ─── Heatmap Placeholder ─── */}
        {isAdmin && (
          <ScrollReveal delay={0.35}>
            <div className="gradient-card rounded-xl p-6 border border-border/50 mb-6">
              <h2 className="font-display text-xl tracking-wider text-foreground mb-2 flex items-center gap-2">
                <MapPin size={18} className="text-primary" /> HERKUNFT <span className="text-gradient">HEATMAP</span>
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-8 text-center justify-center">
                <AlertCircle size={16} />
                <span>Heatmap wird verfügbar, sobald Adressdaten beim Checkout erfasst werden. Erfordert Geolocation-Integration.</span>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
};

export default DashboardPage;
