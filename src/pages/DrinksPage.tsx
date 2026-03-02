import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import ScrollReveal from "@/components/ScrollReveal";
import { Wine, Beer, Coffee, Martini, GlassWater, Grape, CupSoda, Search, X } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // @ts-ignore - tables not yet in generated types
        const catsRes = await supabase.from("drink_categories").select("*").order("sort_order");
        // @ts-ignore
        const drsRes = await supabase.from("drinks").select("*").order("sort_order");
        if (catsRes.data) setCategories(catsRes.data as any);
        if (drsRes.data) setDrinks(drsRes.data as any);
      } catch (e) {
        console.error("Error fetching drinks:", e);
      } finally {
        setLoading(false);
      }
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

        {/* Search & Category Filter */}
        {!loading && categories.length > 0 && (
          <ScrollReveal delay={0.1}>
            <div className="space-y-4 mb-8">
              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={lang === "de" ? "Getränk suchen..." : "Search drinks..."}
                  className="w-full pl-9 pr-9 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "de" ? "Alle" : "All"}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="scale-75">{ICON_MAP[cat.icon] || <Wine size={16} />}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Laden...</p>
        ) : (
          <div className="space-y-8">
            {categories
              .filter((cat) => !activeCategory || cat.id === activeCategory)
              .map((cat, i) => {
                const searchLower = search.toLowerCase();
                const catDrinks = drinks.filter(
                  (d) =>
                    d.category_id === cat.id &&
                    (!search ||
                      d.name.toLowerCase().includes(searchLower) ||
                      d.description?.toLowerCase().includes(searchLower))
                );
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

            {/* No results */}
            {search && drinks.filter((d) =>
              d.name.toLowerCase().includes(search.toLowerCase()) ||
              d.description?.toLowerCase().includes(search.toLowerCase())
            ).length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                {lang === "de" ? "Keine Getränke gefunden." : "No drinks found."}
              </p>
            )}
          </div>
        )}

        <ScrollReveal delay={0.5}>
          <div className="glass-card p-6 mt-8">
            <h3 className="font-display text-lg tracking-wider text-foreground mb-3">
              {lang === "de" ? "ZUSATZSTOFFE & ALLERGENE" : "ADDITIVES & ALLERGENS"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
              <span>1 = {lang === "de" ? "koffeinhaltig" : "contains caffeine"}</span>
              <span>2 = {lang === "de" ? "mit Süßungsmitteln" : "with sweeteners"}</span>
              <span>3 = {lang === "de" ? "mit Taurin" : "with taurine"}</span>
              <span>4 = {lang === "de" ? "chininhaltig" : "contains quinine"}</span>
              <span>G = {lang === "de" ? "glutenhaltig" : "contains gluten"}</span>
              <span>M = {lang === "de" ? "Milch / Laktose" : "milk / lactose"}</span>
              <span>N = {lang === "de" ? "Schalenfrüchte" : "tree nuts"}</span>
              <span>S = {lang === "de" ? "Sulfite" : "sulfites"}</span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.6}>
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
