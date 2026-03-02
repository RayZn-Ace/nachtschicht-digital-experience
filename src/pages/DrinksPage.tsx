import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import ScrollReveal from "@/components/ScrollReveal";
import { Wine, Beer, Coffee, Martini, GlassWater, Grape, CupSoda } from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Martini: <Martini size={24} />,
  Beer: <Beer size={24} />,
  Wine: <Wine size={24} />,
  GlassWater: <GlassWater size={24} />,
  Coffee: <Coffee size={24} />,
  Grape: <Grape size={24} />,
  CupSoda: <CupSoda size={24} />,
};

interface DrinkCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface Drink {
  id: string;
  category_id: string;
  name: string;
  size: string | null;
  price: number;
  description: string | null;
  sort_order: number;
}

const DrinksPage = () => {
  const { lang } = useI18n();
  const [categories, setCategories] = useState<DrinkCategory[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: cats }, { data: drs }] = await Promise.all([
        supabase.from("drink_categories").select("*").order("sort_order"),
        supabase.from("drinks").select("*").order("sort_order"),
      ]);
      if (cats) setCategories(cats as any);
      if (drs) setDrinks(drs as any);
      setLoading(false);
    };
    fetchAll();
  }, []);

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

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Laden...</p>
        ) : (
          <div className="space-y-8">
            {categories.map((cat, i) => {
              const catDrinks = drinks.filter((d) => d.category_id === cat.id);
              if (catDrinks.length === 0) return null;
              return (
                <ScrollReveal key={cat.id} delay={i * 0.1}>
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-primary">{ICON_MAP[cat.icon] || <Wine size={24} />}</span>
                      <h2 className="font-display text-2xl tracking-wider text-foreground">{cat.name}</h2>
                    </div>
                    <div className="divide-y divide-border/50">
                      {catDrinks.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-3">
                          <div>
                            <span className="text-foreground font-medium">{item.name}</span>
                            {item.size && <span className="text-muted-foreground text-sm ml-2">{item.size}</span>}
                            {item.description && <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>}
                          </div>
                          <span className="text-primary font-bold text-lg shrink-0 ml-4">
                            {item.price.toFixed(2).replace(".", ",")} €
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}

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
