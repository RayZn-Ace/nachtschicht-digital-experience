import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, RotateCcw, CheckCircle2, Clock, XCircle, Search, Users, Ticket } from "lucide-react";
import { toast } from "sonner";

interface EventSummary {
  id: string;
  title: string;
  date: string;
  time: string | null;
  end_date: string | null;
  end_time: string | null;
}

interface TicketRow {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  quantity: number;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  qr_code: string | null;
  created_at: string;
  total_price: number;
  ticket_type_name: string;
}

type EventTab = "current" | "upcoming" | "past";

const isEventPast = (e: EventSummary, now: Date): boolean => {
  let effectiveEndDate: string;
  if (e.end_date) {
    effectiveEndDate = e.end_date;
  } else {
    const startDate = (e.date || "").split(/[T ]/)[0];
    const endTime = e.end_time || e.time || "23:59";
    const startTime = e.time || "22:00";
    if (endTime < startTime) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      effectiveEndDate = nextDay.toISOString().split("T")[0];
    } else {
      effectiveEndDate = startDate;
    }
  }
  const endTime = e.end_time || "23:59";
  const endDateTime = new Date(`${effectiveEndDate}T${endTime}:00`);
  return endDateTime < now;
};

const isEventCurrent = (e: EventSummary, now: Date): boolean => {
  const startDate = (e.date || "").split(/[T ]/)[0];
  const startTime = e.time || "22:00";
  // Event is "current" if it starts today (within a window) and hasn't ended
  const startDateTime = new Date(`${startDate}T${startTime}:00`);
  // Consider current if start is within 12 hours from now (same day) and not past
  const hoursUntilStart = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return !isEventPast(e, now) && hoursUntilStart <= 12 && hoursUntilStart >= -24;
};

const AdminLiveCheckin = () => {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [activeTab, setActiveTab] = useState<EventTab>("current");
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("id, title, date, time, end_date, end_time")
      .order("date", { ascending: true });
    if (data) setEvents(data as EventSummary[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const fetchTickets = useCallback(async (eventId: string) => {
    setTicketsLoading(true);
    let allTickets: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("tickets")
        .select("id, buyer_name, buyer_email, quantity, status, checked_in, checked_in_at, qr_code, created_at, total_price, ticket_type_id")
        .eq("event_id", eventId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (!data || data.length === 0) break;
      allTickets = allTickets.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Fetch ticket type names
    const typeIds = [...new Set(allTickets.map((t) => t.ticket_type_id).filter(Boolean))];
    let typeMap: Record<string, string> = {};
    if (typeIds.length > 0) {
      const { data: types } = await supabase
        .from("ticket_types")
        .select("id, name")
        .in("id", typeIds);
      if (types) types.forEach((t: any) => { typeMap[t.id] = t.name; });
    }

    setTickets(allTickets.map((t) => ({
      ...t,
      ticket_type_name: t.ticket_type_id ? (typeMap[t.ticket_type_id] || "Standard") : "Standard",
    })));
    setTicketsLoading(false);
  }, []);

  // Auto-refresh tickets every 10s
  useEffect(() => {
    if (!selectedEvent || !autoRefresh) return;
    const interval = setInterval(() => fetchTickets(selectedEvent.id), 10000);
    return () => clearInterval(interval);
  }, [selectedEvent, autoRefresh, fetchTickets]);

  const handleSelectEvent = (event: EventSummary) => {
    setSelectedEvent(event);
    setSearch("");
    fetchTickets(event.id);
  };

  const handleResetCheckin = async (ticketId: string) => {
    if (!confirm("Check-in wirklich zurücksetzen?")) return;
    const { error } = await supabase
      .from("tickets")
      .update({ checked_in: false, checked_in_at: null })
      .eq("id", ticketId);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Check-in zurückgesetzt");
    if (selectedEvent) fetchTickets(selectedEvent.id);
  };

  const now = new Date();

  const categorizedEvents = {
    current: events.filter((e) => isEventCurrent(e, now)),
    upcoming: events.filter((e) => !isEventPast(e, now) && !isEventCurrent(e, now)),
    past: events.filter((e) => isEventPast(e, now)).reverse(),
  };

  const filteredTickets = tickets.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (t.buyer_name || "").toLowerCase().includes(s) ||
      t.buyer_email.toLowerCase().includes(s) ||
      (t.qr_code || "").toLowerCase().includes(s) ||
      t.id.toLowerCase().includes(s) ||
      t.ticket_type_name.toLowerCase().includes(s)
    );
  });

  const checkedInCount = tickets.filter((t) => t.checked_in).length;
  const totalCount = tickets.length;

  if (selectedEvent) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => { setSelectedEvent(null); setTickets([]); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Zurück
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-display tracking-wider text-foreground">{selectedEvent.title}</h2>
            <p className="text-sm text-muted-foreground">
              {new Date(selectedEvent.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
              {selectedEvent.time && ` · ${selectedEvent.time} Uhr`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTickets(selectedEvent.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <RefreshCw size={14} /> Aktualisieren
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto (10s)
            </label>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalCount}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Gesamt</div>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{checkedInCount}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Eingecheckt</div>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-amber-500">{totalCount - checkedInCount}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Offen</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-green-500 h-full rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(checkedInCount / totalCount) * 100}%` : "0%" }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}% eingecheckt
        </p>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, E-Mail, Ticket-ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Tickets table */}
        {ticketsLoading ? (
          <div className="text-center text-muted-foreground py-8">Lade Tickets...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Ticket-Nr.</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">E-Mail</th>
                  <th className="pb-2 pr-3">Typ</th>
                  <th className="pb-2 pr-3">Eingecheckt</th>
                  <th className="pb-2 pr-3">Gekauft</th>
                  <th className="pb-2">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-3">
                      {t.checked_in ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <Clock size={18} className="text-amber-500" />
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground font-mono text-xs">{t.qr_code || t.id.slice(0, 8)}</td>
                    <td className="py-2.5 pr-3 font-medium text-foreground">{t.buyer_name || "–"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{t.buyer_email}</td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-primary/10 text-primary">
                        {t.ticket_type_name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {t.checked_in && t.checked_in_at
                        ? new Date(t.checked_in_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "–"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5">
                      {t.checked_in && (
                        <button
                          onClick={() => handleResetCheckin(t.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          title="Check-in zurücksetzen"
                        >
                          <RotateCcw size={12} /> Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {search ? "Keine Tickets gefunden" : "Keine Tickets vorhanden"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const tabs: { key: EventTab; label: string; count: number }[] = [
    { key: "current", label: "Aktuell", count: categorizedEvents.current.length },
    { key: "upcoming", label: "Zukünftig", count: categorizedEvents.upcoming.length },
    { key: "past", label: "Vergangen", count: categorizedEvents.past.length },
  ];

  const displayEvents = categorizedEvents[activeTab];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display tracking-wider text-foreground">Live Check-in Übersicht</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === t.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Event list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">Lade Events...</div>
      ) : displayEvents.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          Keine {activeTab === "current" ? "aktuellen" : activeTab === "upcoming" ? "zukünftigen" : "vergangenen"} Events
        </div>
      ) : (
        <div className="space-y-2">
          {displayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => handleSelectEvent(event)}
              className="w-full glass-card p-4 text-left hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                    {event.time && ` · ${event.time} Uhr`}
                  </p>
                </div>
                <Ticket size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLiveCheckin;
