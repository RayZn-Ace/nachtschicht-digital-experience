import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, Ticket, DollarSign, Users, Calendar,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

interface EventRow {
  id: string; title: string; date: string; ticket_quantity: number; tickets_sold: number;
  ticket_price: number; genre: string | null; areas: string | null;
}
interface TicketRow {
  event_id: string; quantity: number; total_price: number; status: string;
  created_at: string; fee_amount: number; checked_in: boolean;
}
interface BookingRow {
  event_id: string; status: string; deposit_amount: number; booking_type: string;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const KpiCard = ({
  icon: Icon, label, value, trend, sub,
}: {
  icon: any; label: string; value: string; trend?: number; sub?: string;
}) => (
  <div className="glass-card p-4">
    <div className="flex items-center justify-between mb-2">
      <Icon size={18} className="text-muted-foreground" />
      {trend !== undefined && trend !== 0 && (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${trend > 0 ? "text-green-400" : "text-destructive"}`}>
          {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="font-display text-2xl tracking-wider text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</p>
    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const AdminControlling = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [ev, tk, bk] = await Promise.all([
        supabase.from("events").select("id, title, date, ticket_quantity, tickets_sold, ticket_price, genre, areas").order("date", { ascending: false }),
        supabase.from("tickets").select("event_id, quantity, total_price, status, created_at, fee_amount, checked_in"),
        supabase.from("lounge_bookings").select("event_id, status, deposit_amount, booking_type"),
      ]);
      if (ev.data) setEvents(ev.data as any);
      if (tk.data) setTickets(tk.data as any);
      if (bk.data) setBookings(bk.data as any);
      setLoading(false);
    };
    fetch();
  }, []);

  const confirmed = useMemo(() => tickets.filter((t) => t.status === "confirmed"), [tickets]);

  // Global KPIs
  const kpis = useMemo(() => {
    const totalRevenue = confirmed.reduce((s, t) => s + Number(t.total_price), 0);
    const totalFees = confirmed.reduce((s, t) => s + Number(t.fee_amount || 0), 0);
    const totalTickets = confirmed.reduce((s, t) => s + t.quantity, 0);
    const totalCheckedIn = confirmed.filter((t) => t.checked_in).length;
    const avgOrderValue = confirmed.length > 0 ? totalRevenue / confirmed.length : 0;
    const loungeRevenue = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + Number(b.deposit_amount), 0);

    // 30d comparison
    const now = new Date();
    const d30 = startOfDay(subDays(now, 30));
    const d60 = startOfDay(subDays(now, 60));
    const last30 = confirmed.filter((t) => new Date(t.created_at) >= d30);
    const prev30 = confirmed.filter((t) => {
      const d = new Date(t.created_at);
      return d >= d60 && d < d30;
    });
    const rev30 = last30.reduce((s, t) => s + Number(t.total_price), 0);
    const revPrev = prev30.reduce((s, t) => s + Number(t.total_price), 0);
    const revTrend = revPrev > 0 ? Math.round(((rev30 - revPrev) / revPrev) * 100) : 0;
    const tk30 = last30.reduce((s, t) => s + t.quantity, 0);
    const tkPrev = prev30.reduce((s, t) => s + t.quantity, 0);
    const tkTrend = tkPrev > 0 ? Math.round(((tk30 - tkPrev) / tkPrev) * 100) : 0;

    return { totalRevenue, totalFees, totalTickets, totalCheckedIn, avgOrderValue, loungeRevenue, revTrend, tkTrend };
  }, [confirmed, bookings]);

  // Revenue by event (top 10)
  const revenueByEvent = useMemo(() => {
    const map: Record<string, { title: string; revenue: number; tickets: number; date: string }> = {};
    confirmed.forEach((t) => {
      const ev = events.find((e) => e.id === t.event_id);
      if (!ev) return;
      if (!map[ev.id]) map[ev.id] = { title: ev.title, revenue: 0, tickets: 0, date: ev.date };
      map[ev.id].revenue += Number(t.total_price);
      map[ev.id].tickets += t.quantity;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [confirmed, events]);

  // Revenue by genre
  const revenueByGenre = useMemo(() => {
    const map: Record<string, number> = {};
    confirmed.forEach((t) => {
      const ev = events.find((e) => e.id === t.event_id);
      const genre = ev?.genre || "Sonstiges";
      map[genre] = (map[genre] || 0) + Number(t.total_price);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [confirmed, events]);

  // Daily revenue last 30 days
  const dailyRevenue = useMemo(() => {
    const data: { date: string; label: string; revenue: number; tickets: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayEnd = endOfDay(day);
      const dayTickets = confirmed.filter((t) => {
        const d = new Date(t.created_at);
        return d >= day && d <= dayEnd;
      });
      data.push({
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "dd.MM", { locale: de }),
        revenue: dayTickets.reduce((s, t) => s + Number(t.total_price), 0),
        tickets: dayTickets.reduce((s, t) => s + t.quantity, 0),
      });
    }
    return data;
  }, [confirmed]);

  // Event comparison table
  const eventComparison = useMemo(() => {
    return events.slice(0, 20).map((ev) => {
      const evTickets = confirmed.filter((t) => t.event_id === ev.id);
      const revenue = evTickets.reduce((s, t) => s + Number(t.total_price), 0);
      const sold = evTickets.reduce((s, t) => s + t.quantity, 0);
      const checkedIn = evTickets.filter((t) => t.checked_in).length;
      const capacity = ev.ticket_quantity || 0;
      const utilization = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;
      const checkInRate = sold > 0 ? Math.round((checkedIn / sold) * 100) : 0;
      const loungeBookingsCount = bookings.filter((b) => b.event_id === ev.id && b.status !== "cancelled" && b.status !== "rejected").length;

      return { ...ev, revenue, sold, checkedIn, utilization, checkInRate, loungeBookingsCount };
    });
  }, [events, confirmed, bookings]);

  if (loading) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  return (
    <div className="space-y-6">
      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="Gesamtumsatz" value={fmtCurrency(kpis.totalRevenue)} trend={kpis.revTrend} />
        <KpiCard icon={Ticket} label="Tickets verkauft" value={kpis.totalTickets.toLocaleString("de-DE")} trend={kpis.tkTrend} />
        <KpiCard icon={Users} label="Bestellungen" value={confirmed.length.toLocaleString("de-DE")} />
        <KpiCard icon={BarChart3} label="Ø Bestellwert" value={fmtCurrency(kpis.avgOrderValue)} />
        <KpiCard icon={DollarSign} label="Servicegebühren" value={fmtCurrency(kpis.totalFees)} />
        <KpiCard icon={DollarSign} label="Lounge-Anzahlungen" value={fmtCurrency(kpis.loungeRevenue)} />
      </div>

      {/* Revenue Chart */}
      <div className="glass-card p-5">
        <h3 className="font-display text-lg tracking-wider text-foreground mb-4">UMSATZ LETZTE 30 TAGE</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}€`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: number) => [fmtCurrency(value), "Umsatz"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Events */}
        <div className="glass-card p-5">
          <h3 className="font-display text-lg tracking-wider text-foreground mb-4">TOP EVENTS NACH UMSATZ</h3>
          <div className="space-y-2">
            {revenueByEvent.map((ev, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.tickets} Tickets</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-primary shrink-0 ml-2">{fmtCurrency(ev.revenue)}</span>
              </div>
            ))}
            {revenueByEvent.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Keine Daten</p>}
          </div>
        </div>

        {/* Genre Distribution */}
        <div className="glass-card p-5">
          <h3 className="font-display text-lg tracking-wider text-foreground mb-4">UMSATZ NACH GENRE</h3>
          {revenueByGenre.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueByGenre} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {revenueByGenre.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                {revenueByGenre.map((g, i) => (
                  <div key={g.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-foreground truncate">{g.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{fmtCurrency(g.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Keine Daten</p>
          )}
        </div>
      </div>

      {/* Event Comparison Table */}
      <div className="glass-card p-5">
        <h3 className="font-display text-lg tracking-wider text-foreground mb-4">EVENT-VERGLEICH</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border">
                <th className="text-left py-2 px-2">Event</th>
                <th className="text-left py-2 px-2">Datum</th>
                <th className="text-right py-2 px-2">Verkauft</th>
                <th className="text-right py-2 px-2">Auslastung</th>
                <th className="text-right py-2 px-2">Check-in</th>
                <th className="text-right py-2 px-2">Lounges</th>
                <th className="text-right py-2 px-2">Umsatz</th>
              </tr>
            </thead>
            <tbody>
              {eventComparison.map((ev) => (
                <tr key={ev.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2 text-foreground max-w-[180px] truncate">{ev.title}</td>
                  <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                    {new Date(ev.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </td>
                  <td className="py-2 px-2 text-right text-foreground">{ev.sold}/{ev.ticket_quantity}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={ev.utilization >= 80 ? "text-green-400" : ev.utilization >= 50 ? "text-foreground" : "text-muted-foreground"}>
                      {ev.utilization}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{ev.checkInRate}%</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{ev.loungeBookingsCount}</td>
                  <td className="py-2 px-2 text-right text-primary font-medium">{fmtCurrency(ev.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminControlling;
