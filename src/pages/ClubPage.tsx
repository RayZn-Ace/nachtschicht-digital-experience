import { Disc3, Trees, UtensilsCrossed } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useI18n } from "@/hooks/useI18n";

const ClubPage = () => {
  const { t } = useI18n();

  const areas = [
    { name: "AGOSTEA", subtitle: "Mainhall", description: "Charts & EDM", fullDescKey: "club.areaAgostea", icon: Disc3 },
    { name: "LA VIE", subtitle: "", description: "Black, RnB & Dancehall", fullDescKey: "club.areaLaVie", icon: Disc3 },
    { name: "MAUSEFALLE", subtitle: "", description: "Schlager, Ballermann & 90er-2010er", fullDescKey: "club.areaMausefalle", icon: Disc3 },
    { name: "OPEN AIR", subtitle: "Outdoor Floor", description: t("area.openair.desc"), fullDescKey: "club.areaOpenAir", icon: Trees },
    { name: "BISTRO", subtitle: "", description: "Drinks & Snacks", fullDescKey: "club.areaBistro", icon: UtensilsCrossed },
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {areas.slice(0, 3).map((area, i) => (
            <ScrollReveal key={area.name} delay={i * 0.15}>
              <div className="glass-card p-6 hover-lift h-full">
                <area.icon className="text-primary mb-4" size={32} />
                <h2 className="font-display text-3xl tracking-wider text-foreground mb-1">{area.name}</h2>
                <p className="text-primary text-sm font-medium mb-3">{area.description}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(area.fullDescKey)}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {areas.slice(3).map((area, i) => (
            <ScrollReveal key={area.name} delay={(i + 3) * 0.15}>
              <div className="glass-card p-6 hover-lift h-full">
                <area.icon className="text-primary mb-4" size={32} />
                <h2 className="font-display text-3xl tracking-wider text-foreground mb-1">{area.name}</h2>
                <p className="text-primary text-sm font-medium mb-3">{area.description}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(area.fullDescKey)}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="max-w-3xl mx-auto text-muted-foreground text-sm leading-relaxed space-y-4">
          <p>{t("club.outro")}</p>
        </div>
      </div>
    </section>
  );
};

export default ClubPage;