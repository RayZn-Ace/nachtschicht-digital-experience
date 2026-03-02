import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wine, Calendar, X } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import LoungeReservationWizard from "@/components/LoungeReservationWizard";
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
  booking_type: string;
  status: string;
}

const LoungesPage = () => {
  const [lounges, setLounges] = useState<Lounge[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedLounge, setSelectedLounge] = useState<Lounge | null>(null);

  const fetchData = async () => {
    try {
      const [loungeRes, eventRes, bookingRes] = await Promise.all([
        supabase.from("lounges").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("events").select("*").eq("is_published", true).gte("date", new Date().toISOString()).order("date", { ascending: true }),
        supabase.from("lounge_bookings").select("lounge_id, event_id, booking_type, status").neq("status", "cancelled").neq("status", "rejected"),
      ]);
      if (loungeRes.error || eventRes.error || bookingRes.error) {
        console.error("Fetch errors:", loungeRes.error, eventRes.error, bookingRes.error);
        setError(true);
      }
      if (loungeRes.data) setLounges(loungeRes.data as any);
      if (eventRes.data) setEvents(eventRes.data as unknown as Event[]);
      if (bookingRes.data) setBookings(bookingRes.data as any);
    } catch (err) {
      console.error("LoungesPage fetchAll error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const loungeAreaIds = [...new Set(lounges.map((l) => l.area_id))];
  const loungeEvents = events.filter((e) => {
    const areas = parseAreas(e.areas);
    return loungeAreaIds.some((aId) => areas.includes(aId));
  });

  const currentEvent = loungeEvents.find((e) => e.id === selectedEvent);
  const availableLounges = selectedEvent && currentEvent
    ? lounges.filter((l) => parseAreas(currentEvent.areas).includes(l.area_id))
    : [];

  const getStatus = (loungeId: string) => {
    const booking = bookings.find((b) => b.lounge_id === loungeId && b.event_id === selectedEvent);
    if (!booking) return "free";
    if (booking.booking_type === "guaranteed" && (booking.status === "confirmed" || booking.status === "pending")) return "guaranteed";
    return "available";
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
        ) : error && lounges.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">Lounges konnten nicht geladen werden.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors"
            >
              ERNEUT VERSUCHEN
            </button>
          </div>
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
                  onChange={(e) => { setSelectedEvent(e.target.value); setSelectedLounge(null); }}
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
                  const status = getStatus(lounge.id);
                  const isGuaranteed = status === "guaranteed";
                  return (
                    <ScrollReveal key={lounge.id} delay={i * 0.1}>
                      <div className={`glass-card overflow-hidden hover-lift group ${isGuaranteed ? "opacity-60" : ""}`}>
                        {/* Image */}
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={lounge.image_url || "/images/gallery-1.jpg"}
                            alt={lounge.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                          {isGuaranteed && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                              <span className="bg-destructive text-primary-foreground px-4 py-2 rounded-full font-display tracking-wider text-sm">
                                RESERVIERT
                              </span>
                            </div>
                          )}
                          <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                            {lounge.area_id === "mausefalle" ? "MAUSEFALLE" : lounge.area_id === "agostea" ? "AGOSTEA" : "LA VIE"}
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
                            onClick={() => !isGuaranteed && setSelectedLounge(lounge)}
                            disabled={isGuaranteed}
                            className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGuaranteed ? "RESERVIERT" : "JETZT RESERVIEREN"}
                          </button>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            )}

            {/* Wizard modal */}
            {selectedLounge && currentEvent && (
              <LoungeReservationWizard
                lounge={selectedLounge}
                event={currentEvent}
                onClose={() => setSelectedLounge(null)}
                onSuccess={() => {
                  setSelectedLounge(null);
                  fetchData();
                }}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default LoungesPage;
