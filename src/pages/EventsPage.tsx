import { useState, useEffect } from "react";
import { Calendar, Users, ShieldCheck, DoorOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { useTranslate } from "@/hooks/useTranslate";
import { usePageSEO } from "@/hooks/usePageSEO";
import type { Event } from "@/types/database";
import ScrollReveal from "@/components/ScrollReveal";
import { EventSkeletonCard } from "@/components/SkeletonCard";
import { CLUB_AREAS, parseAreas } from "@/lib/areas";
import RichTextContent from "@/components/RichTextContent";

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const tr = useTranslate(lang);

  usePageSEO({
    title: "Events & Partys – Nachtschicht Kaiserslautern | Tickets online kaufen",
    description: "Alle kommenden Events, Partys & Konzerte in der Nachtschicht Kaiserslautern. Tickets online kaufen, Abendkasse, VIP-Lounges. Charts, Hip-Hop, House, 90er/2000er jeden Freitag & Samstag.",
    canonical: "/events",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Events in der Nachtschicht Kaiserslautern",
      "description": "Aktuelle Events, Partys und Konzerte in der Nachtschicht Kaiserslautern",
      "url": "https://nachtschicht-kaiserslautern.de/events",
      "numberOfItems": events.length,
      "itemListElement": events.slice(0, 10).map((event, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "Event",
          "name": event.title,
          "startDate": `${event.date}T${event.time || "22:00"}`,
          "description": event.description || `${event.title} in der Nachtschicht Kaiserslautern`,
          "image": event.image_url || "https://nachtschicht-kaiserslautern.de/images/gallery-8.jpg",
          "url": `https://nachtschicht-kaiserslautern.de/tickets/${event.id}`,
          "location": {
            "@type": "Place",
            "name": "Nachtschicht Kaiserslautern",
            "address": { "@type": "PostalAddress", "streetAddress": "Zollamtstraße 28", "addressLocality": "Kaiserslautern", "postalCode": "67663", "addressCountry": "DE" }
          },
          "offers": {
            "@type": "Offer",
            "price": event.ticket_price || 0,
            "priceCurrency": "EUR",
            "availability": event.tickets_sold >= event.ticket_quantity ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
            "url": `https://nachtschicht-kaiserslautern.de/tickets/${event.id}`
          },
          "organizer": { "@type": "Organization", "name": "Nachtschicht Kaiserslautern", "url": "https://nachtschicht-kaiserslautern.de" },
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
        }
      }))
    },
  });

  useEffect(() => {
    let cancelled = false;

    // Safety timeout – never stay on "loading" forever
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("EventsPage: fetch timeout after 10s");
        setLoading(false);
        setError(true);
      }
    }, 10_000);

    const fetchEvents = async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from("events")
          .select("*")
          .eq("is_published", true)
          .order("date", { ascending: true });
        if (fetchErr) {
          console.error("Events fetch error:", fetchErr);
          if (!cancelled) setError(true);
        }
        if (data && !cancelled) {
          const now = new Date();
          const upcoming = (data as unknown as Event[]).filter((e: any) => {
            let effectiveEndDate: string;
            if (e.end_date) {
              effectiveEndDate = e.end_date;
            } else {
              const startDate = (e.date || '').split(/[T ]/)[0];
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
            return endDateTime >= now;
          });
          setEvents(upcoming);
        }
      } catch (err) {
        console.error("EventsPage fetch error:", err);
        if (!cancelled) setError(true);
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    };
    fetchEvents();

    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              {t("events.title")} <span className="text-gradient">{t("events.titleHighlight")}</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              {lang === "de"
                ? "Entdecke alle kommenden Partys, Konzerte und Events in der Nachtschicht Kaiserslautern. Sichere dir jetzt deine Tickets online!"
                : "Discover all upcoming parties, concerts and events at Nachtschicht Kaiserslautern. Get your tickets online now!"}
            </p>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventSkeletonCard key={i} />
            ))}
          </div>
        ) : error && events.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">{lang === "de" ? "Events konnten nicht geladen werden." : "Could not load events."}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors"
            >
              {lang === "de" ? "ERNEUT VERSUCHEN" : "RETRY"}
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">{t("events.empty")}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, i) => {
              const soldOut = event.tickets_sold >= event.ticket_quantity;
              const remaining = event.ticket_quantity - event.tickets_sold;
              const eventAreas = parseAreas(event.areas);
              return (
                <ScrollReveal key={event.id} delay={i * 0.1}>
                  <article
                    className="glass-card overflow-hidden hover-lift group cursor-pointer"
                    onClick={() => navigate(`/tickets/${event.id}`)}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={event.image_url || "/images/gallery-1.jpg"}
                        alt={`${event.title} – Party Event Nachtschicht Kaiserslautern`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/15 to-transparent" />
                      {event.genre && (
                        <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                          {tr(event.genre)}
                        </span>
                      )}
                      {soldOut && (
                        <span className="absolute top-3 left-3 bg-destructive text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                          {t("events.soldOut")}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h2 className="font-display text-2xl tracking-wider text-foreground mb-1">{tr(event.title)}</h2>
                      {(event as any).subtitle && (
                        <p className="text-muted-foreground text-sm italic mb-2">{tr((event as any).subtitle)}</p>
                      )}
                      <div className="flex items-center gap-4 text-muted-foreground text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          <time dateTime={event.date}>
                            {new Date(event.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { day: "2-digit", month: "long", year: "numeric" })}
                          </time> – {event.time}{(event as any).end_time ? ` ${lang === "de" ? "bis" : "to"} ${(event as any).end_time}` : ""}
                        </span>
                      </div>

                      {eventAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 my-2">
                          {eventAreas.map((aId) => {
                            const area = CLUB_AREAS.find((a) => a.id === aId);
                            return area ? (
                              <span key={aId} className={`text-xs px-2 py-0.5 rounded-full font-medium ${area.color}`}>
                                {area.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}

                      {event.description && (
                        <RichTextContent html={tr(event.description)} className="mb-3 line-clamp-3 text-sm text-muted-foreground [&_p]:inline [&_h1]:inline [&_h2]:inline [&_ul]:inline [&_ol]:inline" />
                      )}

                      {/* Info badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {event.has_muttizettel && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-accent-foreground font-medium">
                            <ShieldCheck size={10} /> {lang === "de" ? "Muttizettel erlaubt" : "Parental Consent"}
                          </span>
                        )}
                        {event.has_abendkasse && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-accent-foreground font-medium">
                            <DoorOpen size={10} /> {lang === "de" ? "Abendkasse" : "Door Sales"}
                          </span>
                        )}
                        {!soldOut && remaining <= Math.ceil(event.ticket_quantity * 0.2) && remaining > 0 && (
                          <span className="text-xs text-destructive font-semibold animate-pulse">
                            🔥 {lang === "de" ? `Noch ${remaining} Tickets` : `${remaining} tickets left`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="px-4 py-2.5 bg-primary text-primary-foreground font-display tracking-wider rounded-md text-sm min-h-[44px] inline-flex items-center"
                          onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${event.id}`); }}
                        >
                          {soldOut ? (lang === "de" ? "AUSVERKAUFT" : "SOLD OUT") : "TICKETS"}
                        </span>
                        <span
                          className="px-4 py-2.5 bg-muted text-foreground font-display tracking-wider rounded-md text-sm hover:bg-muted/80 transition-colors min-h-[44px] inline-flex items-center"
                          onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${event.id}#lounges`); }}
                        >
                          LOUNGES
                        </span>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default EventsPage;
