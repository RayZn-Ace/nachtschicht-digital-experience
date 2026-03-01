import { Calendar, MapPin } from "lucide-react";

const events = [
  { id: 1, title: "FRIDAY NIGHT FEVER", date: "07. März 2026", time: "22:00", genre: "Hip-Hop & Partyhits", image: "/images/gallery-1.jpg", areas: "Agostea & Mausefalle" },
  { id: 2, title: "HOUSE NATION", date: "08. März 2026", time: "22:00", genre: "House & Electronic", image: "/images/gallery-3.jpg", areas: "Agostea, La Vie & Mausefalle" },
  { id: 3, title: "90er & 2000er PARTY", date: "14. März 2026", time: "22:00", genre: "Best of 90s & 2000s", image: "/images/gallery-8.jpg", areas: "Alle Areas" },
  { id: 4, title: "LADIES NIGHT", date: "15. März 2026", time: "22:00", genre: "Mixed", image: "/images/gallery-2.jpg", areas: "Alle Areas" },
  { id: 5, title: "NEON GLOW PARTY", date: "21. März 2026", time: "22:00", genre: "EDM & Charts", image: "/images/gallery-5.jpg", areas: "Alle Areas" },
  { id: 6, title: "BLACK FRIDAY", date: "22. März 2026", time: "22:00", genre: "Hip-Hop & R&B", image: "/images/gallery-6.jpg", areas: "Agostea & La Vie" },
];

const EventsPage = () => (
  <>
    <section className="section-padding">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
            EVENTS & <span className="text-gradient">TICKETS</span>
          </h1>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <article key={event.id} className="glass-card overflow-hidden hover-lift group">
              <div className="relative h-52 overflow-hidden">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  {event.genre}
                </span>
              </div>
              <div className="p-5">
                <h2 className="font-display text-2xl tracking-wider text-foreground mb-2">{event.title}</h2>
                <div className="flex items-center gap-4 text-muted-foreground text-sm mb-1">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {event.date} – {event.time}</span>
                </div>
                <p className="text-muted-foreground text-sm flex items-center gap-1"><MapPin size={14} /> {event.areas}</p>
                <button className="mt-4 w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors">
                  TICKET SICHERN
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-16 text-muted-foreground text-sm leading-relaxed">
          <p>Die Events in der Nachtschicht Kaiserslautern sind vielfältig, modern und perfekt auf das Publikum abgestimmt. Jede Woche erwarten die Gäste neue Highlights, von großen Mottopartys über bekannte DJ-Acts bis hin zu exklusiven Eventreihen.</p>
        </div>
      </div>
    </section>
  </>
);

export default EventsPage;
