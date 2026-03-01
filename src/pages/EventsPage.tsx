import { useState, useEffect } from "react";
import { Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import type { Event } from "@/types/database";
import { toast } from "sonner";
import ScrollReveal from "@/components/ScrollReveal";
import { CLUB_AREAS, parseAreas } from "@/lib/areas";
import { trackViewEvent, trackAddToCart, trackPurchase } from "@/lib/tracking";

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("date", { ascending: true });
      if (data) setEvents(data as unknown as Event[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleBuyTicket = async (event: Event) => {
    if (!user) {
      toast.error(t("events.loginRequired"));
      return;
    }
    if (event.tickets_sold >= event.ticket_quantity) {
      toast.error(t("events.soldOut"));
      return;
    }
    setBuyingId(event.id);

    // Track AddToCart + InitiateCheckout
    trackAddToCart({ id: event.id, title: event.title, price: event.ticket_price, quantity: 1 });

    const { error, data: ticketData } = await supabase.from("tickets").insert({
      event_id: event.id,
      user_id: user.id,
      quantity: 1,
      total_price: event.ticket_price,
      buyer_email: user.email!,
      buyer_name: user.user_metadata?.full_name || null,
    }).select("id").single();
    if (error) {
      toast.error("Fehler beim Ticketkauf: " + error.message);
    } else {
      await supabase.from("events").update({ tickets_sold: event.tickets_sold + 1 }).eq("id", event.id);
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, tickets_sold: e.tickets_sold + 1 } : e));

      // Track Purchase
      trackPurchase({
        orderId: ticketData?.id || event.id,
        eventId: event.id,
        eventTitle: event.title,
        price: event.ticket_price,
        quantity: 1,
        email: user.email!,
      });

      toast.success("Ticket erfolgreich gebucht! 🎉");
    }
    setBuyingId(null);
  };

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
              const eventAreas = parseAreas(event.areas);
              return (
                <ScrollReveal key={event.id} delay={i * 0.1}>
                  <article className="glass-card overflow-hidden hover-lift group"
                    onClick={() => trackViewEvent({ id: event.id, title: event.title, date: event.date, category: event.genre || undefined, price: event.ticket_price })}
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

                      {/* Areas badges */}
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
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-display text-xl text-foreground">
                          {event.ticket_price > 0 ? `${event.ticket_price.toFixed(2)}€` : t("events.free")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.ticket_quantity - event.tickets_sold} {t("events.available")}
                        </span>
                      </div>
                      <button
                        onClick={() => handleBuyTicket(event)}
                        disabled={soldOut || buyingId === event.id}
                        className="mt-3 w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {buyingId === event.id ? t("events.buying") : soldOut ? t("events.soldOut") : t("events.buyTicket")}
                      </button>
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
