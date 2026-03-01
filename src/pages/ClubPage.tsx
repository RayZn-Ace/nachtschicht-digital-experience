import { Music, Disc3, Trees, UtensilsCrossed } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useI18n } from "@/hooks/useI18n";

const ClubPage = () => {
  const { t } = useI18n();

  const areas = [
    {
      name: "AGOSTEA",
      subtitle: "Mainhall",
      description: "Charts & EDM",
      fullDesc: "Die Hauptarea mit der größten Tanzfläche. Hier erleben Gäste die besten DJ-Sets und eine atemberaubende Licht- und Soundanlage.",
      icon: Disc3,
    },
    {
      name: "LA VIE",
      subtitle: "",
      description: "Black, RnB & Dancehall",
      fullDesc: "Exklusives Ambiente mit urbanem Sound. Perfekt für alle, die stilvoll feiern möchten.",
      icon: Disc3,
    },
    {
      name: "MAUSEFALLE",
      subtitle: "",
      description: "Schlager, Ballermann & 90er-2010er",
      fullDesc: "Nostalgie pur! Die Mausefalle ist der Place-to-be für alle Fans von Schlager, Ballermann und den besten Hits der 90er bis 2010er.",
      icon: Disc3,
    },
    {
      name: "OPEN AIR",
      subtitle: "Outdoor Floor",
      description: "Riesiger Open Air Bereich",
      fullDesc: "Unser riesiger Open Air Floor bietet ein einzigartiges Outdoor-Erlebnis unter freiem Himmel – perfekt für warme Nächte.",
      icon: Trees,
    },
    {
      name: "BISTRO",
      subtitle: "",
      description: "Drinks & Snacks",
      fullDesc: "Entspannt genießen im Bistro-Bereich. Leckere Drinks, ausgewählte Snacks und eine gemütliche Atmosphäre zum Durchatmen.",
      icon: UtensilsCrossed,
    },
  ];

  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
            {t("club.title")} <span className="text-gradient">{t("club.titleHighlight")}</span>
          </h1>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            {t("club.subtitle")}
          </p>
        </div>

        {/* Main 3 music areas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {areas.slice(0, 3).map((area, i) => (
            <ScrollReveal key={area.name} delay={i * 0.15}>
              <div className="glass-card p-6 hover-lift h-full">
                <area.icon className="text-primary mb-4" size={32} />
                <h2 className="font-display text-3xl tracking-wider text-foreground mb-1">{area.name}</h2>
                <p className="text-primary text-sm font-medium mb-3">{area.description}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{area.fullDesc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Open Air + Bistro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {areas.slice(3).map((area, i) => (
            <ScrollReveal key={area.name} delay={(i + 3) * 0.15}>
              <div className="glass-card p-6 hover-lift h-full">
                <area.icon className="text-primary mb-4" size={32} />
                <h2 className="font-display text-3xl tracking-wider text-foreground mb-1">{area.name}</h2>
                <p className="text-primary text-sm font-medium mb-3">{area.description}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{area.fullDesc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="max-w-3xl mx-auto text-muted-foreground text-sm leading-relaxed space-y-4">
          <p>Die Nachtschicht Kaiserslautern bietet auf mehreren Floors ein einzigartiges Cluberlebnis. Modernste Sound- und Lichttechnik, stilvolle Inneneinrichtung und ein professionelles Team sorgen dafür, dass jede Nacht unvergesslich wird.</p>
        </div>
      </div>
    </section>
  );
};

export default ClubPage;
