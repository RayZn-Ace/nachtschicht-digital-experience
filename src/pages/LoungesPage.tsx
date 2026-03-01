import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Wine, Calendar, Check, X } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { parseAreas } from "@/lib/areas";
import type { Event } from "@/types/database";

interface Lounge {
  id: string;
  name: string;
  area_id: string;
  capacity: number;
  min_spend: number;
  price_per_person: number;
  image_url: string | null;
  description: string | null;
  sort_order: number;
}

interface Booking {
  lounge_id: string;
  event_id: string;
}

const LoungesPage = () => {
  const [lounges, setLounges] = useState<Lounge[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Booking form state
  const [bookingLounge, setBookingLounge] = useState<Lounge | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGuests, setFormGuests] = useState(2);
  const [formMessage, setFormMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [loungeRes, eventRes, bookingRes] = await Promise.all([
        supabase.from("lounges").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("events").select("*").eq("is_published", true).gte("date", new Date().toISOString()).order("date", { ascending: true }),
        supabase.from("lounge_bookings").select("lounge_id, event_id").neq("status", "cancelled"),
      ]);
      if (loungeRes.data) setLounges(loungeRes.data as any);
      if (eventRes.data) setEvents(eventRes.data as unknown as Event[]);
      if (bookingRes.data) setBookings(bookingRes.data as any);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Get all unique area_ids from lounges
  const loungeAreaIds = [...new Set(lounges.map((l) => l.area_id))];

  // Filter events that have at least one lounge area open
  const loungeEvents = events.filter((e) => {
    const areas = parseAreas(e.areas);
    return loungeAreaIds.some((aId) => areas.includes(aId));
  });

  // Selected event
  const currentEvent = loungeEvents.find((e) => e.id === selectedEvent);

  // Filter lounges to only show those whose area is open for the selected event
  const availableLounges = selectedEvent && currentEvent
    ? lounges.filter((l) => parseAreas(currentEvent.areas).includes(l.area_id))
    : [];

  // Check if a lounge is booked for the selected event
  const isBooked = (loungeId: string) =>
    bookings.some((b) => b.lounge_id === loungeId && b.event_id === selectedEvent);

  const handleBook = async () => {
    if (!bookingLounge || !selectedEvent) return;
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Bitte Name und E-Mail ausfüllen.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("lounge_bookings").insert({
      lounge_id: bookingLounge.id,
      event_id: selectedEvent,
      user_name: formName.trim(),
      user_email: formEmail.trim(),
      user_phone: formPhone.trim() || null,
      guest_count: formGuests,
      message: formMessage.trim() || null,
    } as any);
    if (error) {
      if (error.code === "23505") {
        toast.error("Diese Lounge ist für dieses Event bereits reserviert.");
      } else {
        toast.error("Fehler: " + error.message);
      }
    } else {
      toast.success("Lounge-Reservierung gesendet! 🎉 Wir melden uns bei dir.");
      setBookings((prev) => [...prev, { lounge_id: bookingLounge.id, event_id: selectedEvent }]);
      setBookingLounge(null);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormGuests(2);
      setFormMessage("");
    }
    setSubmitting(false);
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              VIP <span className="text-gradient">LOUNGES</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Sichere dir eine unserer exklusiven VIP Lounges.
              Wähle zuerst dein Event – verfügbare Lounges werden je nach offener Area angezeigt.
            </p>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Laden...</div>
        ) : loungeEvents.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            Aktuell keine Events mit Lounge-Bereichen verfügbar. Schau bald wieder vorbei!
          </div>
        ) : (
          <>
            {/* Event selector */}
            <ScrollReveal delay={0.1}>
              <div className="max-w-2xl mx-auto mb-10">
                <label className="text-sm text-muted-foreground mb-2 block font-medium">
                  <Calendar size={14} className="inline mr-1.5 -mt-0.5" />
                  EVENT WÄHLEN
                </label>
                <select
                  value={selectedEvent}
                  onChange={(e) => { setSelectedEvent(e.target.value); setBookingLounge(null); }}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">— Bitte Event wählen —</option>
                  {loungeEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} — {new Date(ev.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                    </option>
                  ))}
                </select>
              </div>
            </ScrollReveal>

            {/* Lounges grid */}
            {selectedEvent && availableLounges.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {availableLounges.map((lounge, i) => {
                  const booked = isBooked(lounge.id);
                  return (
                    <ScrollReveal key={lounge.id} delay={i * 0.1}>
                      <div className={`glass-card overflow-hidden hover-lift group ${booked ? "opacity-60" : ""}`}>
                        {/* Image */}
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={lounge.image_url || "/images/gallery-1.jpg"}
                            alt={lounge.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                          {booked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                              <span className="bg-destructive text-primary-foreground px-4 py-2 rounded-full font-display tracking-wider text-sm">
                                RESERVIERT
                              </span>
                            </div>
                          )}
                          <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                            {lounge.area_id === "mausefalle" ? "MAUSEFALLE" : "LA VIE"}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="p-5">
                          <h2 className="font-display text-2xl tracking-wider text-foreground mb-2">{lounge.name}</h2>
                          {lounge.description && (
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{lounge.description}</p>
                          )}

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <Users size={14} className="text-primary" />
                              max. {lounge.capacity} Personen
                            </span>
                            <span className="flex items-center gap-1">
                              <Wine size={14} className="text-primary" />
                              {lounge.min_spend}€ Mindestverzehr
                            </span>
                          </div>

                          <div className="flex items-center justify-between mb-3">
                            <span className="font-display text-xl text-foreground">
                              {lounge.price_per_person}€ <span className="text-sm text-muted-foreground font-sans">/ Person</span>
                            </span>
                          </div>

                          <button
                            onClick={() => !booked && setBookingLounge(lounge)}
                            disabled={booked}
                            className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {booked ? "RESERVIERT" : "JETZT RESERVIEREN"}
                          </button>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            )}

            {/* Booking Modal */}
            {bookingLounge && selectedEvent && currentEvent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setBookingLounge(null)}>
                <div className="glass-card p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="font-display text-2xl tracking-wider text-foreground">{bookingLounge.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentEvent.title} — {new Date(currentEvent.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <button onClick={() => setBookingLounge(null)} className="text-muted-foreground hover:text-foreground">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Info badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      max. {bookingLounge.capacity} Personen
                    </span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {bookingLounge.min_spend}€ Mindestverzehr
                    </span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {bookingLounge.price_per_person}€ / Person
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                      <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Dein Name"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">E-Mail *</label>
                      <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="deine@email.de"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Telefon</label>
                        <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+49 ..."
                          className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Anzahl Gäste *</label>
                        <input type="number" min={1} max={bookingLounge.capacity} value={formGuests}
                          onChange={(e) => setFormGuests(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nachricht / Anlass</label>
                      <textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)}
                        placeholder="z.B. Geburtstag, JGA, besondere Wünsche..." rows={3}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
                    </div>
                    <button onClick={handleBook} disabled={submitting}
                      className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {submitting ? "WIRD GESENDET..." : "RESERVIERUNG ABSENDEN"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default LoungesPage;
