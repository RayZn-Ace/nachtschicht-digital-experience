import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Trash2, Users, Calendar, Mail, Phone, MessageSquare } from "lucide-react";

interface LoungeBooking {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  guest_count: number;
  message: string | null;
  status: string;
  created_at: string;
  lounge_id: string;
  event_id: string;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: "Ausstehend", class: "bg-yellow-500/20 text-yellow-400" },
  confirmed: { label: "Bestätigt", class: "bg-green-500/20 text-green-400" },
  rejected: { label: "Abgelehnt", class: "bg-destructive/20 text-destructive" },
};

const AdminLoungeBookings = () => {
  const [bookings, setBookings] = useState<LoungeBooking[]>([]);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [lounges, setLounges] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [bookingsRes, eventsRes, loungesRes] = await Promise.all([
      supabase.from("lounge_bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("id, title"),
      supabase.from("lounges").select("id, name"),
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (eventsRes.data) {
      const map: Record<string, string> = {};
      eventsRes.data.forEach((e) => (map[e.id] = e.title));
      setEvents(map);
    }
    if (loungesRes.data) {
      const map: Record<string, string> = {};
      loungesRes.data.forEach((l) => (map[l.id] = l.name));
      setLounges(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("lounge_bookings").update({ status }).eq("id", id);
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success(status === "confirmed" ? "Reservierung bestätigt!" : "Reservierung abgelehnt.");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Reservierung wirklich löschen?")) return;
    const { error } = await supabase.from("lounge_bookings").delete().eq("id", id);
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Reservierung gelöscht.");
    fetchData();
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "pending", "confirmed", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-display tracking-wider rounded-md transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "ALLE" : STATUS_MAP[f]?.label.toUpperCase()}
            {f !== "all" && (
              <span className="ml-1.5 opacity-70">({bookings.filter((b) => b.status === f).length})</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Keine Reservierungen gefunden.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
            return (
              <div key={booking.id} className="glass-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display text-base tracking-wider text-foreground">{booking.user_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail size={12} /> {booking.user_email}</span>
                      {booking.user_phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {booking.user_phone}</span>}
                      <span className="flex items-center gap-1.5"><Users size={12} /> {booking.guest_count} Gäste</span>
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(booking.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
                      <span className="px-2 py-0.5 bg-muted rounded-full">{lounges[booking.lounge_id] || "Lounge"}</span>
                      <span className="px-2 py-0.5 bg-muted rounded-full">{events[booking.event_id] || "Event"}</span>
                    </div>
                    {booking.message && (
                      <p className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground italic">
                        <MessageSquare size={12} className="shrink-0 mt-0.5" /> {booking.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    {booking.status !== "confirmed" && (
                      <button
                        onClick={() => updateStatus(booking.id, "confirmed")}
                        className="p-2 hover:bg-green-500/20 rounded-md transition-colors text-green-400"
                        title="Bestätigen"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    {booking.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(booking.id, "rejected")}
                        className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
                        title="Ablehnen"
                      >
                        <X size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(booking.id)}
                      className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
                      title="Löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLoungeBookings;
