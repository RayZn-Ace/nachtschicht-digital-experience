import { useState, useEffect } from "react";
import { Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Event } from "@/types/database";
import { toast } from "sonner";
import ScrollReveal from "@/components/ScrollReveal";

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const { user } = useAuth();

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
      toast.error("Bitte melde dich an, um Tickets zu kaufen.");
      return;
    }
    if (event.tickets_sold >= event.ticket_quantity) {
      toast.error("Dieses Event ist leider ausverkauft.");
      return;
    }
    setBuyingId(event.id);
    const { error } = await supabase.from("tickets").insert({
      event_id: event.id,
      user_id: user.id,
      quantity: 1,
      total_price: event.ticket_price,
      buyer_email: user.email!,
      buyer_name: user.user_metadata?.full_name || null,
    });
    if (error) {
      toast.error("Fehler beim Ticketkauf: " + error.message);
    } else {
      await supabase.from("events").update({ tickets_sold: event.tickets_sold + 1 }).eq("id", event.id);
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, tickets_sold: e.tickets_sold + 1 } : e));
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
              EVENTS & <span className="text-gradient">TICKETS</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Events werden geladen...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">Aktuell keine Events verfügbar. Schau bald wieder vorbei!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, i) => {
              const soldOut = event.tickets_sold >= event.ticket_quantity;
              return (
                <ScrollReveal key={event.id} delay={i * 0.1}>
                  <article className="glass-card overflow-hidden hover-lift group">
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
                          AUSVERKAUFT
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
                      {event.areas && (
                        <p className="text-muted-foreground text-sm flex items-center gap-1 mb-2">
                          <MapPin size={14} /> {event.areas}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-display text-xl text-foreground">
                          {event.ticket_price > 0 ? `${event.ticket_price.toFixed(2)}€` : "KOSTENLOS"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.ticket_quantity - event.tickets_sold} verfügbar
                        </span>
                      </div>
                      <button
                        onClick={() => handleBuyTicket(event)}
                        disabled={soldOut || buyingId === event.id}
                        className="mt-3 w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {buyingId === event.id ? "WIRD GEBUCHT..." : soldOut ? "AUSVERKAUFT" : "TICKET SICHERN"}
                      </button>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        <ScrollReveal>
          <div className="max-w-3xl mx-auto mt-16 text-muted-foreground text-sm leading-relaxed">
            <p>Die Events in der Nachtschicht Kaiserslautern sind vielfältig, modern und perfekt auf das Publikum abgestimmt. Jede Woche erwarten die Gäste neue Highlights, von großen Mottopartys über bekannte DJ-Acts bis hin zu exklusiven Eventreihen.</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default EventsPage;
