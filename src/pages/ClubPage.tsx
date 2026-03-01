import { Music, Disc3 } from "lucide-react";

const areas = [
  {
    name: "AGOSTEA",
    description: "Die Hauptarea mit der größten Tanzfläche. Hier erleben Gäste die besten DJ-Sets und eine atemberaubende Licht- und Soundanlage.",
    friday: "Hip-Hop",
    saturday: "House",
  },
  {
    name: "LA VIE",
    description: "Exklusives Ambiente mit urbanem Sound. Perfekt für alle, die stilvoll feiern möchten.",
    friday: "—",
    saturday: "Hip-Hop",
  },
  {
    name: "MAUSEFALLE",
    description: "Nostalgie pur! Die Mausefalle ist der Place-to-be für alle Fans von 90er, 2000er und Partyhits.",
    friday: "90er, 2000er & Partyhits",
    saturday: "90er, 2000er & Partyhits",
  },
];

const ClubPage = () => (
  <section className="section-padding">
    <div className="container mx-auto">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
          DER <span className="text-gradient">CLUB</span>
        </h1>
        <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Drei einzigartige Areas, ein unvergessliches Erlebnis. Entdecke die verschiedenen Welten der Nachtschicht Kaiserslautern.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {areas.map((area) => (
          <div key={area.name} className="glass-card p-6 hover-lift">
            <Disc3 className="text-primary mb-4" size={32} />
            <h2 className="font-display text-3xl tracking-wider text-foreground mb-3">{area.name}</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{area.description}</p>
            <div className="space-y-3 border-t border-border/50 pt-4">
              <div className="flex items-center gap-2">
                <Music size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Freitag</p>
                  <p className="text-sm text-foreground">{area.friday}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Music size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Samstag</p>
                  <p className="text-sm text-foreground">{area.saturday}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto text-muted-foreground text-sm leading-relaxed space-y-4">
        <p>Die Nachtschicht Kaiserslautern bietet auf mehreren Floors ein einzigartiges Cluberlebnis. Modernste Sound- und Lichttechnik, stilvolle Inneneinrichtung und ein professionelles Team sorgen dafür, dass jede Nacht unvergesslich wird. Die drei Areas Agostea, La Vie und Mausefalle bieten für jeden Musikgeschmack das Richtige – von Hip-Hop über House bis zu den besten Hits der 90er und 2000er.</p>
      </div>
    </div>
  </section>
);

export default ClubPage;
