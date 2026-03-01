import { useState, useEffect } from "react";
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
  Clock, MapPin, AlertCircle, ChevronRight,
} from "lucide-react";

/* ───── types ───── */
interface KPI {
  label: string;
  value: string;
  sub: string;
  trend: number;
  icon: React.ReactNode;
}

interface QuickEvent {
  id: string;
  title: string;
  date: string;
  image_url: string | null;
  genre: string | null;
  areas: string | null;
  ticket_quantity: number;
  tickets_sold: number;
}

/* ───── helpers ───── */
const fmt = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const pct = (sold: number, total: number) =>
  total > 0 ? Math.round((sold / total) * 100) : 0;

const availabilityLabel = (p: number) => {
  if (p >= 95) return { text: "Ausverkauft", cls: "text-destructive" };
  if (p >= 80) return { text: "Fast ausverkauft", cls: "text-orange-400" };
  if (p >= 60) return { text: "Nur noch wenige", cls: "text-yellow-400" };
  return { text: "Verfügbar", cls: "text-green-400" };
};

/* ───── component ───── */
const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { roles, isAdmin, loading: rolesLoading } = useUserRoles();
  const [events, setEvents] = useState<QuickEvent[]>([]);
  const [ticketStats, setTicketStats] = useState({ totalSold: 0, totalRevenue: 0, totalCapacity: 0, checkedIn: 0 });
  const [ticketTypes, setTicketTypes] = useState<{ name: string; sold: number; quantity: number; price: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // upcoming events
      const { data: ev } = await supabase
        .from("events")
        .select("id, title, date, image_url, genre, areas, ticket_quantity, tickets_sold")
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(3);
      if (ev) setEvents(ev as unknown as QuickEvent[]);

      // ticket stats (admin)
      if (isAdmin) {
        const { data: tickets } = await supabase
          .from("tickets")
          .select("quantity, total_price, checked_in");
        if (tickets) {
          const totalSold = tickets.reduce((s, t) => s + t.quantity, 0);
          const totalRevenue = tickets.reduce((s, t) => s + Number(t.total_price), 0);
          const checkedIn = tickets.filter((t) => t.checked_in).length;
          setTicketStats((p) => ({ ...p, totalSold, totalRevenue, checkedIn }));
        }

        const { data: evAll } = await supabase.from("events").select("ticket_quantity");
        if (evAll) {
          const totalCapacity = evAll.reduce((s, e) => s + (e.ticket_quantity || 0), 0);
          setTicketStats((p) => ({ ...p, totalCapacity }));
        }

        const { data: tt } = await supabase
          .from("ticket_types")
          .select("name, sold, quantity, price")
          .order("sold", { ascending: false })
          .limit(5);
        if (tt) setTicketTypes(tt as { name: string; sold: number; quantity: number; price: number }[]);
      }
    };
    load();
  }, [user, isAdmin]);

  if (authLoading || rolesLoading)
    return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const roleBadge = isAdmin ? "Admin" : "User";

  /* KPIs – live from DB when admin */
  const capacity = ticketStats.totalCapacity || 5000;
  const kpis: KPI[] = [
    { label: "Besucher erwartet", value: capacity.toLocaleString("de-DE"), sub: "+12% vs. Vorjahr", trend: 12, icon: <Users size={20} /> },
    { label: "Tickets verkauft", value: ticketStats.totalSold.toLocaleString("de-DE"), sub: `${pct(ticketStats.totalSold, capacity)}% Auslastung`, trend: pct(ticketStats.totalSold, capacity) > 50 ? 8 : -3, icon: <Ticket size={20} /> },
    { label: "Umsatz (Tickets)", value: fmt(ticketStats.totalRevenue), sub: `Ziel: ${fmt(250000)}`, trend: ticketStats.totalRevenue > 0 ? 15 : 0, icon: <DollarSign size={20} /> },
    { label: "Check-ins gesamt", value: ticketStats.checkedIn.toLocaleString("de-DE"), sub: "Live bei Event", trend: 0, icon: <QrCode size={20} /> },
  ];

  /* nav links */
  const navLinks = [
    { href: "/admin", label: "Analytics & Berichte", icon: <BarChart3 size={16} />, style: "bg-primary text-primary-foreground hover:bg-primary/90", adminOnly: false },
    { href: "/admin", label: "Erstattungen", icon: <ShieldAlert size={16} />, style: "bg-destructive text-destructive-foreground hover:bg-destructive/90", adminOnly: true },
    { href: "/admin", label: "Events verwalten", icon: <Calendar size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: false },
    { href: "/admin", label: "Rollen & Rechte", icon: <Users size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: true },
    { href: "/scanner", label: "Ticket Scanner", icon: <QrCode size={16} />, style: "bg-green-600 text-white hover:bg-green-700", adminOnly: false },
    { href: "/admin", label: "Eventübersicht", icon: <Eye size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: true },
    { href: "/admin", label: "Kundendatenbank", icon: <Users size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: true },
    { href: "/admin", label: "Newsletter", icon: <Mail size={16} />, style: "bg-muted text-foreground hover:bg-muted/80", adminOnly: true },
  ];

  const totalTickets = events.reduce((s, e) => s + (e.ticket_quantity || 0), 0);
  const totalSold = events.reduce((s, e) => s + (e.tickets_sold || 0), 0);
  const overallPct = pct(totalSold, totalTickets);

  return (
    <section className="section-padding" aria-label="Dashboard">
      <div className="container mx-auto max-w-7xl">
        {/* Session bar */}
        <div className="gradient-card rounded-xl mb-6 overflow-hidden">
          <AdminSessionBar roles={roles} />

          {/* ─── Hero ─── */}
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

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2" role="navigation" aria-label="Admin-Navigation">
              {navLinks
                .filter((l) => !l.adminOnly || isAdmin)
                .map((l) => (
                  <Link
                    key={l.label}
                    to={l.href}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-display tracking-wider rounded-md transition-colors ${l.style}`}
                  >
                    {l.icon} {l.label.toUpperCase()}
                  </Link>
                ))}
            </div>
          </ScrollReveal>
        </div>

        {/* ─── KPIs (admin only) ─── */}
        {isAdmin && (
          <ScrollReveal delay={0.1}>
            <div className="mb-8" aria-labelledby="kpi-heading">
              <div className="flex items-center gap-2 mb-1">
                <h2 id="kpi-heading" className="font-display text-2xl tracking-wider text-foreground">
                  LIVE <span className="text-gradient">KPIs</span>
                </h2>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4">
                <AlertCircle size={12} /> Platzhalterdaten – wird mit Backend-Anbindung live befüllt
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpis.map((k) => (
                  <div key={k.label} className="gradient-card rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">{k.icon}</span>
                      {k.trend !== 0 && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${k.trend > 0 ? "text-green-400" : "text-destructive"}`}>
                          {k.trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(k.trend)}%
                        </span>
                      )}
                    </div>
                    <p className="font-display text-2xl md:text-3xl tracking-wider text-foreground">{k.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 uppercase tracking-wider">{k.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ─── Quick-Access Widgets ─── */}
        <div className="space-y-6">
          {/* Nächste Events – full width */}
          <ScrollReveal delay={0.15}>
            <div aria-labelledby="next-events-heading">
              <h2 id="next-events-heading" className="font-display text-2xl tracking-wider text-foreground mb-4">
                NÄCHSTE <span className="text-gradient">EVENTS</span>
              </h2>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Keine kommenden Events.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {events.map((ev) => {
                    const d = new Date(ev.date);
                    const p = pct(ev.tickets_sold || 0, ev.ticket_quantity || 1);
                    return (
                      <Link
                        key={ev.id}
                        to={`/tickets/${ev.id}`}
                        className="gradient-card rounded-xl overflow-hidden border border-border/50 hover-lift group"
                      >
                        <div className="relative h-40 bg-muted">
                          {ev.image_url ? (
                            <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Calendar size={32} />
                            </div>
                          )}
                          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-display tracking-wider bg-background/80 backdrop-blur rounded-md text-foreground">
                            {d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                          </span>
                          {ev.genre && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary border border-primary/30">
                              {ev.genre}
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-display text-lg tracking-wider text-foreground truncate group-hover:text-primary transition-colors">
                            {ev.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock size={12} /> {d.toLocaleDateString("de-DE")}
                            {ev.areas && (
                              <>
                                <MapPin size={12} /> {ev.areas}
                              </>
                            )}
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{ev.tickets_sold}/{ev.ticket_quantity} Tickets</span>
                              <span className={availabilityLabel(p).cls}>{availabilityLabel(p).text}</span>
                            </div>
                            <Progress value={p} className="h-1.5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* 2-col: Line-Up + Tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line-Up Highlights */}
            <ScrollReveal delay={0.2}>
              <div className="gradient-card rounded-xl p-6 border border-border/50 h-full" aria-labelledby="lineup-heading">
                <h2 id="lineup-heading" className="font-display text-xl tracking-wider text-foreground mb-4 flex items-center gap-2">
                  <Music size={18} className="text-primary" /> LINE-UP <span className="text-gradient">HIGHLIGHTS</span>
                </h2>

                {/* Headliner spotlight */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border/30">
                  <p className="text-[10px] uppercase tracking-widest text-primary mb-1">Headliner Spotlight</p>
                  <div className="space-y-2">
                    {["DJ Snake", "Martin Garrix", "Tiësto"].map((act, i) => (
                      <div key={act} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="font-display tracking-wider text-foreground">{act}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule highlights */}
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Schedule Highlights</p>
                <div className="space-y-1.5">
                  {[
                    { time: "22:00", act: "Warm-Up Set", genre: "Deep House", color: "bg-blue-500/20 text-blue-400" },
                    { time: "23:30", act: "Main Stage", genre: "EDM", color: "bg-primary/20 text-primary" },
                    { time: "01:00", act: "Peak Hour", genre: "Techno", color: "bg-purple-500/20 text-purple-400" },
                    { time: "03:00", act: "Closing Set", genre: "Melodic", color: "bg-green-500/20 text-green-400" },
                  ].map((s) => (
                    <div key={s.time} className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground font-mono text-xs w-12">{s.time}</span>
                      <span className="text-foreground flex-1">{s.act}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${s.color}`}>{s.genre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Tickets & Verfügbarkeit */}
            <ScrollReveal delay={0.25}>
              <div className="gradient-card rounded-xl p-6 border border-border/50 h-full" aria-labelledby="tickets-heading">
                <h2 id="tickets-heading" className="font-display text-xl tracking-wider text-foreground mb-4 flex items-center gap-2">
                  <Ticket size={18} className="text-primary" /> TICKETS & <span className="text-gradient">VERFÜGBARKEIT</span>
                </h2>

                {/* Overall */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Gesamtauslastung</span>
                    <span className="font-display text-foreground">{overallPct}%</span>
                  </div>
                  <Progress value={overallPct} className="h-3 rounded-full" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalSold.toLocaleString("de-DE")} / {totalTickets.toLocaleString("de-DE")} Tickets verkauft
                  </p>
                </div>

                {/* Ticket categories */}
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Ticket-Kategorien</p>
                <div className="space-y-3">
                  {(ticketTypes.length > 0
                    ? ticketTypes
                    : [
                        { name: "Early Bird", sold: 500, quantity: 500, price: 29.99 },
                        { name: "Regular", sold: 1200, quantity: 2000, price: 49.99 },
                        { name: "VIP", sold: 180, quantity: 300, price: 99.99 },
                        { name: "Backstage", sold: 12, quantity: 50, price: 199.99 },
                      ]
                  ).map((t) => {
                    const tp = pct(t.sold, t.quantity);
                    const av = availabilityLabel(tp);
                    return (
                      <div key={t.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">{t.name}</span>
                            <span className="text-xs text-muted-foreground">{fmt(t.price)}</span>
                          </div>
                          <span className={`text-xs font-medium ${av.cls}`}>{av.text}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={tp} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground w-16 text-right">
                            {t.sold}/{t.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  to="/admin"
                  className="flex items-center gap-1 text-sm text-primary hover:underline mt-4"
                >
                  Alle Tickettypen verwalten <ChevronRight size={14} />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
