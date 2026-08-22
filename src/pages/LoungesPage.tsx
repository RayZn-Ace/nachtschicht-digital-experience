import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wine, Calendar, X } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import LoungeReservationWizard from "@/components/LoungeReservationWizard";
import { parseAreas } from "@/lib/areas";
import { filterUpcomingEvents } from "@/lib/eventTime";
import { useI18n } from "@/hooks/useI18n";
import { useTranslate } from "@/hooks/useTranslate";
import { usePageSEO } from "@/hooks/usePageSEO";
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
  const { lang, t } = useI18n();
  const translate = useTranslate(lang);
  const [lounges, setLounges] = useState<Lounge[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedLounge, setSelectedLounge] = useState<Lounge | null>(null);

  usePageSEO({
    title: "VIP Lounges reservieren – Nachtschicht Kaiserslautern | Geburtstag & Events",
    description: "VIP-Lounges & Tische in der Nachtschicht Kaiserslautern reservieren. Perfekt für Geburtstage, JGA, Firmenfeiern & besondere Anlässe. Ab 10€/Person mit Getränkeservice.",
    canonical: "/lounges",
  });

  const [eventLoungeMap, setEventLoungeMap] = useState<Record<string, string[]>>({});

  const fetchData = async () => {
    try {
      const [loungeRes, eventRes, bookingRes, assignRes] = await Promise.all([
        supabase.from("lounges").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("events").select("*").eq("is_published", true).gte("date", new Date(Date.now() - 3 * 86400000).toISOString()).order("date", { ascending: true }),
        supabase.rpc("get_lounge_availability"),
        supabase.from("event_lounges").select("event_id, lounge_id"),
      ]);
      if (loungeRes.error || eventRes.error || bookingRes.error) { setError(true); }
      if (loungeRes.data) setLounges(loungeRes.data as any);
      if (eventRes.data) setEvents(filterUpcomingEvents(eventRes.data as unknown as Event[]));
      if (bookingRes.data) setBookings(bookingRes.data as any);
      if (assignRes.data) {
        const map: Record<string, string[]> = {};
        assignRes.data.forEach((a: any) => {
          if (!map[a.event_id]) map[a.event_id] = [];
          map[a.event_id].push(a.lounge_id);
        });
        setEventLoungeMap(map);
      }
    } catch (err) { setError(true); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Events that have at least one lounge assigned
  const loungeEvents = events.filter((e) => {
    const assignedIds = eventLoungeMap[e.id];
    if (assignedIds && assignedIds.length > 0) return true;
    // Fallback: if no assignments exist for any event, show events with matching areas
    const hasAnyAssignments = Object.keys(eventLoungeMap).length > 0;
    if (hasAnyAssignments) return false;
    const areas = parseAreas(e.areas);
    const loungeAreaIds = [...new Set(lounges.map((l) => l.area_id))];
    return loungeAreaIds.some((aId) => areas.includes(aId));
  });

  const currentEvent = loungeEvents.find((e) => e.id === selectedEvent);

  const availableLounges = (() => {
    if (!selectedEvent || !currentEvent) return [];
    const assignedIds = eventLoungeMap[selectedEvent];
    if (assignedIds && assignedIds.length > 0) {
      return lounges.filter((l) => assignedIds.includes(l.id));
    }
    // Fallback: filter by area
    return lounges.filter((l) => parseAreas(currentEvent.areas).includes(l.area_id));
  })();

  const getStatus = (loungeId: string) => { const booking = bookings.find((b) => b.lounge_id === loungeId && b.event_id === selectedEvent); if (!booking) return "free"; if (booking.booking_type === "guaranteed" && (booking.status === "confirmed" || booking.status === "pending")) return "guaranteed"; return "available"; };
  const dateFmt = (d: string) => new Date(d).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              {t("lounges.title")} <span className="text-gradient">{t("lounges.titleHighlight")}</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{t("lounges.subtitle")}</p>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">{t("lounges.loading")}</div>
        ) : error && lounges.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">{t("lounges.error")}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors">{t("lounges.retry")}</button>
          </div>
        ) : loungeEvents.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">{t("lounges.noEvents")}</div>
        ) : (
          <>
            <ScrollReveal delay={0.1}>
              <div className="max-w-2xl mx-auto mb-10">
                <label className="text-sm text-muted-foreground mb-2 block font-medium"><Calendar size={14} className="inline mr-1.5 -mt-0.5" />{t("lounges.selectEvent")}</label>
                <select value={selectedEvent} onChange={(e) => { setSelectedEvent(e.target.value); setSelectedLounge(null); }} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">{t("lounges.selectPlaceholder")}</option>
                  {loungeEvents.map((ev) => (<option key={ev.id} value={ev.id}>{translate(ev.title)} — {dateFmt(ev.date)}</option>))}
                </select>
              </div>
            </ScrollReveal>

            {selectedEvent && availableLounges.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {availableLounges.map((lounge, i) => {
                  const status = getStatus(lounge.id);
                  const isGuaranteed = status === "guaranteed";
                  return (
                    <ScrollReveal key={lounge.id} delay={i * 0.1}>
                      <article className={`glass-card overflow-hidden hover-lift group ${isGuaranteed ? "opacity-60" : ""}`}>
                        <div className="relative h-56 overflow-hidden">
                          <img src={lounge.image_url || "/images/gallery-1.jpg"} alt={`VIP Lounge ${lounge.name} in der Nachtschicht Kaiserslautern`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                          {isGuaranteed && (<div className="absolute inset-0 flex items-center justify-center bg-background/60"><span className="bg-destructive text-primary-foreground px-4 py-2 rounded-full font-display tracking-wider text-sm">{t("lounges.reserved")}</span></div>)}
                          <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">{lounge.area_id === "mausefalle" ? "MAUSEFALLE" : lounge.area_id === "agostea" ? "AGOSTEA" : "LA VIE"}</span>
                        </div>
                        <div className="p-5">
                          <h2 className="font-display text-2xl tracking-wider text-foreground mb-2">{translate(lounge.name)}</h2>
                          {lounge.description && (<p className="text-muted-foreground text-sm mb-3 line-clamp-2">{translate(lounge.description)}</p>)}
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1"><Users size={14} className="text-primary" /> max. {lounge.capacity} {t("lounges.maxPersons")}</span>
                            <span className="flex items-center gap-1"><Wine size={14} className="text-primary" /> {lounge.min_spend}€ {t("lounges.minSpend")}</span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-display text-xl text-foreground">{lounge.price_per_person}€ <span className="text-sm text-muted-foreground font-sans">{t("lounges.perPerson")}</span></span>
                          </div>
                          <button onClick={() => !isGuaranteed && setSelectedLounge(lounge)} disabled={isGuaranteed} className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isGuaranteed ? t("lounges.reserved") : t("lounges.bookNow")}
                          </button>
                        </div>
                      </article>
                    </ScrollReveal>
                  );
                })}
              </div>
            )}

            {selectedLounge && currentEvent && (
              <LoungeReservationWizard lounge={selectedLounge} event={currentEvent} onClose={() => setSelectedLounge(null)} onSuccess={() => { setSelectedLounge(null); fetchData(); }} />
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default LoungesPage;
