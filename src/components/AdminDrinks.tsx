import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

interface DrinkCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface Drink {
  id: string;
  category_id: string;
  name: string;
  size: string | null;
  price: number;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const ICON_OPTIONS = ["Martini", "Beer", "Wine", "GlassWater", "Coffee", "Grape", "CupSoda"];

const AdminDrinks = () => {
  const [categories, setCategories] = useState<DrinkCategory[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [drinksPageActive, setDrinksPageActive] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Category form
  const [catForm, setCatForm] = useState({ name: "", icon: "Wine" });
  const [editingCat, setEditingCat] = useState<string | null>(null);

  // Drink form
  const [drinkForm, setDrinkForm] = useState({ name: "", size: "", price: 0, description: "", category_id: "" });
  const [editingDrink, setEditingDrink] = useState<string | null>(null);
  const [showDrinkForm, setShowDrinkForm] = useState<string | null>(null); // category_id

  const fetchAll = async () => {
    const [{ data: cats }, { data: drs }] = await Promise.all([
      supabase.from("drink_categories" as any).select("*").order("sort_order"),
      supabase.from("drinks" as any).select("*").order("sort_order"),
    ]);
    if (cats) setCategories(cats as any);
    if (drs) setDrinks(drs as any);
  };

  const fetchDrinksPageActive = async () => {
    const { data } = await supabase.from("site_settings" as any).select("value").eq("key", "drinks_page_active").maybeSingle();
    if (data) setDrinksPageActive((data as any).value === true);
  };

  const toggleDrinksPage = async () => {
    const newVal = !drinksPageActive;
    await supabase.from("site_settings" as any).update({ value: newVal, updated_at: new Date().toISOString() } as any).eq("key", "drinks_page_active");
    setDrinksPageActive(newVal);
    toast.success(newVal ? "Getränkekarte aktiviert" : "Getränkekarte deaktiviert");
  };

  useEffect(() => { fetchAll(); fetchDrinksPageActive(); }, []);

  // Category CRUD
  const saveCat = async () => {
    if (!catForm.name.trim()) return;
    if (editingCat) {
      const { error } = await supabase.from("drink_categories" as any).update({ name: catForm.name, icon: catForm.icon } as any).eq("id", editingCat);
      if (error) { toast.error(error.message); return; }
      toast.success("Kategorie aktualisiert!");
    } else {
      const maxSort = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0;
      const { error } = await supabase.from("drink_categories" as any).insert({ name: catForm.name, icon: catForm.icon, sort_order: maxSort } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Kategorie erstellt!");
    }
    setCatForm({ name: "", icon: "Wine" });
    setEditingCat(null);
    fetchAll();
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Kategorie und alle Getränke darin löschen?")) return;
    await supabase.from("drink_categories" as any).delete().eq("id", id);
    toast.success("Gelöscht");
    fetchAll();
  };

  const moveCat = async (id: string, dir: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const a = categories[idx], b = categories[swapIdx];
    await Promise.all([
      supabase.from("drink_categories" as any).update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("drink_categories" as any).update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
    fetchAll();
  };

  // Drink CRUD
  const saveDrink = async (catId: string) => {
    if (!drinkForm.name.trim()) return;
    const payload = {
      name: drinkForm.name,
      size: drinkForm.size || null,
      price: Number(drinkForm.price),
      description: drinkForm.description || null,
      category_id: catId,
    };
    if (editingDrink) {
      const { error } = await supabase.from("drinks" as any).update(payload as any).eq("id", editingDrink);
      if (error) { toast.error(error.message); return; }
      toast.success("Getränk aktualisiert!");
    } else {
      const catDrinks = drinks.filter((d) => d.category_id === catId);
      const maxSort = catDrinks.length > 0 ? Math.max(...catDrinks.map((d) => d.sort_order)) + 1 : 0;
      const { error } = await supabase.from("drinks" as any).insert({ ...payload, sort_order: maxSort } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Getränk hinzugefügt!");
    }
    resetDrinkForm();
    fetchAll();
  };

  const deleteDrink = async (id: string) => {
    if (!confirm("Getränk löschen?")) return;
    await supabase.from("drinks" as any).delete().eq("id", id);
    toast.success("Gelöscht");
    fetchAll();
  };

  const resetDrinkForm = () => {
    setDrinkForm({ name: "", size: "", price: 0, description: "", category_id: "" });
    setEditingDrink(null);
    setShowDrinkForm(null);
  };

  const startEditDrink = (drink: Drink) => {
    setDrinkForm({ name: drink.name, size: drink.size || "", price: drink.price, description: drink.description || "", category_id: drink.category_id });
    setEditingDrink(drink.id);
    setShowDrinkForm(drink.category_id);
    setExpandedCat(drink.category_id);
  };

  return (
    <div className="space-y-6">
      {/* Drinks page toggle */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-wider text-foreground">GETRÄNKEKARTE</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {drinksPageActive ? "Die Getränkekarte ist auf der Website sichtbar." : "Die Getränkekarte ist auf der Website ausgeblendet."}
          </p>
        </div>
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={toggleDrinksPage}
          role="switch"
          aria-checked={drinksPageActive}
        >
          <div className={`relative w-11 h-6 rounded-full transition-colors ${drinksPageActive ? "bg-primary" : "bg-muted"}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-foreground rounded-full transition-transform ${drinksPageActive ? "translate-x-5" : ""}`} />
          </div>
          <span className="text-sm text-foreground font-medium">{drinksPageActive ? "Aktiv" : "Inaktiv"}</span>
        </div>
      </div>

      {/* New Category */}
      <div className="glass-card p-6">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">
          {editingCat ? "KATEGORIE BEARBEITEN" : "NEUE KATEGORIE"}
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-foreground mb-1 block">Name</label>
            <input
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="z.B. Cocktails"
              className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && saveCat()}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Icon</label>
            <select
              value={catForm.icon}
              onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
              className="px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {ICON_OPTIONS.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
          </div>
          <button onClick={saveCat} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors">
            <Plus size={18} /> {editingCat ? "SPEICHERN" : "ERSTELLEN"}
          </button>
          {editingCat && (
            <button onClick={() => { setEditingCat(null); setCatForm({ name: "", icon: "Wine" }); }} className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors">
              ABBRECHEN
            </button>
          )}
        </div>
      </div>

      {/* Categories with drinks */}
      {categories.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Noch keine Kategorien erstellt.</p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const catDrinks = drinks.filter((d) => d.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order);
            const isExpanded = expandedCat === cat.id;
            return (
              <div key={cat.id} className="glass-card overflow-hidden">
                {/* Category header */}
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                >
                  <div className="flex flex-col gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); moveCat(cat.id, "up"); }} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveCat(cat.id, "down"); }} disabled={idx === categories.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg tracking-wider text-foreground">{cat.name}</h3>
                    <span className="text-xs text-muted-foreground">{catDrinks.length} Getränke · Icon: {cat.icon}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat.id); setCatForm({ name: cat.name, icon: cat.icon }); }} className="p-2 hover:bg-muted rounded-md text-foreground"><Pencil size={16} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCat(cat.id); }} className="p-2 hover:bg-destructive/20 rounded-md text-destructive"><Trash2 size={16} /></button>
                  {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </div>

                {/* Expanded: drinks list */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4">
                    {catDrinks.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">Noch keine Getränke in dieser Kategorie.</p>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {catDrinks.map((drink) => (
                          <div key={drink.id} className="flex items-center justify-between py-3">
                            <div>
                              <span className="text-foreground font-medium">{drink.name}</span>
                              {drink.size && <span className="text-muted-foreground text-sm ml-2">{drink.size}</span>}
                              {drink.description && <p className="text-muted-foreground text-xs">{drink.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <span className="text-primary font-bold">{drink.price.toFixed(2).replace(".", ",")} €</span>
                              <button onClick={() => startEditDrink(drink)} className="p-1.5 hover:bg-muted rounded-md text-foreground"><Pencil size={14} /></button>
                              <button onClick={() => deleteDrink(drink.id)} className="p-1.5 hover:bg-destructive/20 rounded-md text-destructive"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add/Edit drink form */}
                    {showDrinkForm === cat.id ? (
                      <div className="mt-4 p-4 bg-muted/50 rounded-md space-y-3">
                        <h4 className="font-display text-sm tracking-wider text-foreground">{editingDrink ? "GETRÄNK BEARBEITEN" : "NEUES GETRÄNK"}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <input value={drinkForm.name} onChange={(e) => setDrinkForm({ ...drinkForm, name: e.target.value })} placeholder="Name *" className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                          <input value={drinkForm.size} onChange={(e) => setDrinkForm({ ...drinkForm, size: e.target.value })} placeholder="Größe (z.B. 0,3l)" className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                          <input type="number" step="0.01" value={drinkForm.price || ""} onChange={(e) => setDrinkForm({ ...drinkForm, price: Number(e.target.value) })} placeholder="Preis €" className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                          <input value={drinkForm.description} onChange={(e) => setDrinkForm({ ...drinkForm, description: e.target.value })} placeholder="Beschreibung (optional)" className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveDrink(cat.id)} className="px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 text-sm">
                            {editingDrink ? "SPEICHERN" : "HINZUFÜGEN"}
                          </button>
                          <button onClick={resetDrinkForm} className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted text-sm">ABBRECHEN</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { resetDrinkForm(); setShowDrinkForm(cat.id); }}
                        className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus size={16} /> Getränk hinzufügen
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDrinks;
