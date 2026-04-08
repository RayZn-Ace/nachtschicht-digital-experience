import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Trash2, Users, Calendar, Mail, Phone, MessageSquare, Clock, ShieldCheck, Shield, DollarSign, FileText, Loader2 } from "lucide-react";

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
  arrival_time: string | null;
  booking_type: string;
  deposit_amount: number;
  deposit_paid: boolean;
  notes: string | null;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: "Ausstehend", class: "bg-yellow-500/20 text-yellow-400" },
  confirmed: { label: "Bestätigt", class: "bg-green-500/20 text-green-400" },
  rejected: { label: "Abgelehnt", class: "bg-destructive/20 text-destructive" },
  cancelled: { label: "Storniert", class: "bg-muted text-muted-foreground" },
  replaced: { label: "Ersetzt", class: "bg-muted text-muted-foreground" },
};

const BOOKING_TYPE_MAP: Record<string, { label: string; icon: typeof ShieldCheck; class: string }> = {
  guaranteed: { label: "Garantiert", icon: ShieldCheck, class: "text-primary" },
  non_binding: { label: "Unverbindlich", icon: Shield, class: "text-muted-foreground" },
};

const AdminLoungeBookings = () => {
  const [bookings, setBookings] = useState<LoungeBooking[]>([]);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [lounges, setLounges] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past">("all");
  const [eventDates, setEventDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [bookingsRes, eventsRes, loungesRes] = await Promise.all([
      supabase.from("lounge_bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("id, title, date"),
      supabase.from("lounges").select("id, name"),
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data as any);
    if (eventsRes.data) {
      const map: Record<string, string> = {};
      eventsRes.data.forEach((e: any) => (map[e.id] = e.title));
      setEvents(map);
    }
    if (loungesRes.data) {
      const map: Record<string, string> = {};
      loungesRes.data.forEach((l: any) => (map[l.id] = l.name));
      setLounges(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("lounge_bookings").update({ status }).eq("id", id);
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success(status === "confirmed" ? "Reservierung bestätigt!" : "Reservierung abgelehnt.");

    // Send email notification
    if (status === "confirmed" || status === "rejected") {
      const booking = bookings.find((b) => b.id === id);
      if (booking) {
        const loungeName = lounges[booking.lounge_id] || "Lounge";
        const eventName = events[booking.event_id] || "Event";
        try {
          await supabase.functions.invoke("send-booking-email", {
            body: {
              to: booking.user_email,
              userName: booking.user_name,
              status,
              loungeName,
              eventName,
              guestCount: booking.guest_count,
            },
          });
        } catch (emailErr) {
          console.warn("E-Mail konnte nicht gesendet werden:", emailErr);
        }

        // Auto-create invoice for guaranteed bookings on confirm
        if (status === "confirmed" && booking.booking_type === "guaranteed" && booking.deposit_amount > 0) {
          try {
            const { data, error: invErr } = await supabase.functions.invoke("create-lounge-invoice", {
              body: { booking_id: id },
            });
            if (invErr) throw invErr;
            if (data?.error) throw new Error(data.error);
            toast.success(`Rechnung ${data.invoice_number} automatisch erstellt`);
          } catch (invErr: any) {
            console.warn("Rechnung konnte nicht erstellt werden:", invErr);
          }
        }
      }
    }

    fetchData();
  };

  const createInvoiceManual = async (bookingId: string) => {
    setCreatingInvoice(bookingId);
    try {
      const { data, error } = await supabase.functions.invoke("create-lounge-invoice", {
        body: { booking_id: bookingId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Rechnung ${data.invoice_number} erstellt`);
      fetchData();
    } catch (err: any) {
      toast.error("Rechnung fehlgeschlagen: " + (err.message || "Unbekannt"));
    } finally {
      setCreatingInvoice(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Reservierung wirklich löschen?")) return;
    const { error } = await supabase.from("lounge_bookings").delete().eq("id", id);
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Reservierung gelöscht.");
    fetchData();
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  // Stats
  const totalDeposits = bookings.filter(b => b.booking_type === "guaranteed").reduce((s, b) => s + b.deposit_amount, 0);
  const totalGuests = bookings.filter(b => b.status !== "rejected" && b.status !== "cancelled").reduce((s, b) => s + b.guest_count, 0);
  const guaranteedCount = bookings.filter(b => b.booking_type === "guaranteed" && b.status !== "rejected" && b.status !== "cancelled").length;
  const nonBindingCount = bookings.filter(b => b.booking_type === "non_binding" && b.status !== "rejected" && b.status !== "cancelled").length;

  if (loading) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{bookings.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gesamt</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-primary">{guaranteedCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Garantiert</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{nonBindingCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Unverbindlich</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{totalDeposits.toFixed(0)} €</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Anzahlungen</p>
        </div>
      </div>

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
            const typeInfo = BOOKING_TYPE_MAP[booking.booking_type] || BOOKING_TYPE_MAP.non_binding;
            const TypeIcon = typeInfo.icon;

            return (
              <div key={booking.id} className="glass-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display text-base tracking-wider text-foreground">{booking.user_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.class}`}>
                        {status.label}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 bg-muted ${typeInfo.class}`}>
                        <TypeIcon size={10} /> {typeInfo.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail size={12} /> {booking.user_email}</span>
                      {booking.user_phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {booking.user_phone}</span>}
                      <span className="flex items-center gap-1.5"><Users size={12} /> {booking.guest_count} Gäste</span>
                      {booking.arrival_time && <span className="flex items-center gap-1.5"><Clock size={12} /> Ankunft: {booking.arrival_time}</span>}
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(booking.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      {booking.deposit_amount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign size={12} /> Anzahlung: {booking.deposit_amount} € {booking.deposit_paid ? "✅" : "⏳"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
                      <span className="px-2 py-0.5 bg-muted rounded-full">{lounges[booking.lounge_id] || "Lounge"}</span>
                      <span className="px-2 py-0.5 bg-muted rounded-full">{events[booking.event_id] || "Event"}</span>
                    </div>
                    {(booking.message || booking.notes) && (
                      <p className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground italic">
                        <MessageSquare size={12} className="shrink-0 mt-0.5" /> {booking.notes || booking.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    {booking.status !== "confirmed" && (
                      <button onClick={() => updateStatus(booking.id, "confirmed")} className="p-2 hover:bg-green-500/20 rounded-md transition-colors text-green-400" title="Bestätigen">
                        <Check size={18} />
                      </button>
                    )}
                    {booking.status !== "rejected" && (
                      <button onClick={() => updateStatus(booking.id, "rejected")} className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive" title="Ablehnen">
                        <X size={18} />
                      </button>
                    )}
                    {booking.booking_type === "guaranteed" && booking.deposit_amount > 0 && !booking.deposit_paid && booking.status === "confirmed" && (
                      <button
                        onClick={() => createInvoiceManual(booking.id)}
                        disabled={creatingInvoice === booking.id}
                        className="p-2 hover:bg-primary/20 rounded-md transition-colors text-primary disabled:opacity-50"
                        title="Rechnung erstellen"
                      >
                        {creatingInvoice === booking.id ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                      </button>
                    )}
                    <button onClick={() => handleDelete(booking.id)} className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive" title="Löschen">
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
