import { useI18n } from "@/hooks/useI18n";
import ScrollReveal from "@/components/ScrollReveal";
import { Wine, Beer, Coffee, Martini, GlassWater } from "lucide-react";

interface DrinkCategory {
  titleDe: string;
  titleEn: string;
  icon: React.ReactNode;
  items: { name: string; size?: string; price: string; description?: string }[];
}

const categories: DrinkCategory[] = [
  {
    titleDe: "Longdrinks & Cocktails",
    titleEn: "Longdrinks & Cocktails",
    icon: <Martini size={24} />,
    items: [
      { name: "Gin Tonic", price: "9,00 €" },
      { name: "Vodka Bull", price: "9,00 €" },
      { name: "Cuba Libre", price: "9,00 €" },
      { name: "Whiskey Cola", price: "9,00 €" },
      { name: "Mojito", price: "10,00 €" },
      { name: "Aperol Spritz", price: "8,00 €" },
      { name: "Moscow Mule", price: "10,00 €" },
      { name: "Tequila Sunrise", price: "9,00 €" },
      { name: "Sex on the Beach", price: "9,00 €" },
      { name: "Long Island Iced Tea", price: "11,00 €" },
    ],
  },
  {
    titleDe: "Bier",
    titleEn: "Beer",
    icon: <Beer size={24} />,
    items: [
      { name: "Pils vom Fass", size: "0,3l", price: "4,00 €" },
      { name: "Pils vom Fass", size: "0,5l", price: "5,00 €" },
      { name: "Weizen", size: "0,5l", price: "5,50 €" },
      { name: "Radler", size: "0,3l", price: "4,00 €" },
    ],
  },
  {
    titleDe: "Wein & Sekt",
    titleEn: "Wine & Sparkling",
    icon: <Wine size={24} />,
    items: [
      { name: "Weißwein", size: "0,2l", price: "5,00 €" },
      { name: "Rotwein", size: "0,2l", price: "5,00 €" },
      { name: "Rosé", size: "0,2l", price: "5,00 €" },
      { name: "Prosecco", size: "0,1l", price: "4,50 €" },
      { name: "Sekt (Flasche)", price: "25,00 €" },
    ],
  },
  {
    titleDe: "Shots",
    titleEn: "Shots",
    icon: <GlassWater size={24} />,
    items: [
      { name: "Jägermeister", price: "3,00 €" },
      { name: "Vodka", price: "3,00 €" },
      { name: "Tequila", price: "3,00 €" },
      { name: "Sambuca", price: "3,00 €" },
      { name: "Mexikaner", price: "3,00 €" },
      { name: "Berliner Luft", price: "3,00 €" },
    ],
  },
  {
    titleDe: "Alkoholfrei",
    titleEn: "Non-Alcoholic",
    icon: <Coffee size={24} />,
    items: [
      { name: "Cola / Fanta / Sprite", size: "0,3l", price: "3,50 €" },
      { name: "Red Bull", size: "0,25l", price: "4,00 €" },
      { name: "Wasser", size: "0,3l", price: "3,00 €" },
      { name: "Saft (verschiedene)", size: "0,2l", price: "3,50 €" },
    ],
  },
];

const DrinksPage = () => {
  const { lang } = useI18n();

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-4xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              {lang === "de" ? "GETRÄNKE" : "DRINKS"} <span className="text-gradient">{lang === "de" ? "KARTE" : "MENU"}</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            <p className="text-muted-foreground mt-4 max-w-md mx-auto">
              {lang === "de"
                ? "Alle Preise inkl. MwSt. Änderungen vorbehalten."
                : "All prices incl. VAT. Subject to change."}
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-8">
          {categories.map((cat, i) => (
            <ScrollReveal key={cat.titleDe} delay={i * 0.1}>
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-primary">{cat.icon}</span>
                  <h2 className="font-display text-2xl tracking-wider text-foreground">
                    {lang === "de" ? cat.titleDe : cat.titleEn}
                  </h2>
                </div>
                <div className="divide-y divide-border/50">
                  {cat.items.map((item, j) => (
                    <div key={j} className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-foreground font-medium">{item.name}</span>
                        {item.size && (
                          <span className="text-muted-foreground text-sm ml-2">{item.size}</span>
                        )}
                        {item.description && (
                          <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <span className="text-primary font-bold text-lg shrink-0 ml-4">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.5}>
          <p className="text-center text-muted-foreground text-sm mt-8">
            {lang === "de"
              ? "🍹 Frag unsere Barkeeper nach den aktuellen Specials!"
              : "🍹 Ask our bartenders about current specials!"}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DrinksPage;
