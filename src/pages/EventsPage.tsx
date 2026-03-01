import { useState, useEffect } from "react";
import { Calendar, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import type { Event } from "@/types/database";
import ScrollReveal from "@/components/ScrollReveal";
import { CLUB_AREAS, parseAreas } from "@/lib/areas";

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("date", { ascending: true });
      if (data) setEvents(data as unknown as Event[]);
      setLoading(false);
    };
    fetchEvents();
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
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">{t("events.loading")}</div>
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
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={event.image_url || "/images/gallery-1.jpg"}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                      {event.genre && (
                        <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                          {event.genre}
                        </span>
                      )}
                      {soldOut && (
                        <span className="absolute top-3 left-3 bg-destructive text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                          {t("events.soldOut")}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h2 className="font-display text-2xl tracking-wider text-foreground mb-2">{event.title}</h2>
                      <div className="flex items-center gap-4 text-muted-foreground text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(event.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })} – {event.time}
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
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{event.description}</p>
                      )}

                      {/* Social proof */}
                      <div className="flex items-center gap-3 mb-3">
                        {event.tickets_sold > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users size={12} /> {event.tickets_sold} {lang === "de" ? "Gäste" : "guests"}
                          </span>
                        )}
                        {!soldOut && remaining <= Math.ceil(event.ticket_quantity * 0.2) && remaining > 0 && (
                          <span className="text-xs text-destructive font-semibold animate-pulse">
                            🔥 {lang === "de" ? `Noch ${remaining} Tickets` : `${remaining} tickets left`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-primary font-bold text-xl">{lang === "de" ? "ab" : "from"} {event.ticket_price}€</span>
                        <span className="px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md text-sm">
                          {soldOut ? (lang === "de" ? "AUSVERKAUFT" : "SOLD OUT") : (lang === "de" ? "TICKETS" : "TICKETS")}
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
