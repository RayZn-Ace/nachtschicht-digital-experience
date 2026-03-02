import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, Sun, Moon, Globe, LayoutDashboard, Calendar, Ticket, Image, Mail,
  FileText, Tags, ShoppingCart, Sofa, Wine, Sparkles, Receipt, TrendingUp,
  Flag, Users, QrCode, ArrowLeft, Settings, BarChart3, ChevronDown,
  PartyPopper, Star, HelpCircle, Briefcase, MessageSquare, Camera, Building2, GlassWater, Search,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_PATHS = ["/dashboard", "/admin", "/scanner"];

interface NavSubItem {
  label: string;
  path: string;
  icon: any;
}

interface NavCategory {
  labelKey: string;
  icon: any;
  items: NavSubItem[];
}

interface AdminSubItem {
  label: string;
  tab: string;
  icon: any;
}

interface AdminCategory {
  label: string;
  icon: any;
  items: AdminSubItem[];
}

const ADMIN_CATEGORIES: AdminCategory[] = [
  {
    label: "Events & Tickets",
    icon: Calendar,
    items: [
      { label: "Events", tab: "events", icon: Calendar },
      { label: "Ticketcenter", tab: "ticketcenter", icon: ShoppingCart },
      { label: "Rabattcodes", tab: "codes", icon: Ticket },
      { label: "Tags", tab: "tags", icon: Tags },
    ],
  },
  {
    label: "Inhalte",
    icon: Image,
    items: [
      { label: "Fotoalben", tab: "albums", icon: Image },
      { label: "Newsletter", tab: "newsletter", icon: Mail },
      { label: "Muttizettel", tab: "u18", icon: FileText },
      { label: "Meldungen", tab: "reports", icon: Flag },
    ],
  },
  {
    label: "Betrieb",
    icon: Sofa,
    items: [
      { label: "Lounges", tab: "lounges", icon: Sofa },
      { label: "Getränke", tab: "drinks", icon: Wine },
      { label: "Feiertage", tab: "holidays", icon: Sparkles },
      { label: "Bewerber", tab: "applicants", icon: Users },
      { label: "Fundgrube", tab: "lostfound", icon: Search },
    ],
  },
  {
    label: "Controlling & Tracking",
    icon: TrendingUp,
    items: [
      { label: "Controlling", tab: "controlling", icon: BarChart3 },
      { label: "Umsatz", tab: "revenue", icon: TrendingUp },
      { label: "Kundendaten", tab: "customers", icon: Users },
      { label: "Rechnungen", tab: "invoiceconfig", icon: Receipt },
      { label: "Tracking", tab: "tracking", icon: Settings },
    ],
  },
];

const PUBLIC_CATEGORIES: NavCategory[] = [
  {
    labelKey: "nav.category.events",
    icon: Calendar,
    items: [
      { label: "nav.sub.eventsTickets", path: "/events", icon: Calendar },
      { label: "nav.sub.muttizettel", path: "/u18", icon: FileText },
      { label: "nav.sub.drinks", path: "/getraenkekarte", icon: GlassWater },
    ],
  },
  {
    labelKey: "nav.category.club",
    icon: Building2,
    items: [
      { label: "nav.sub.club", path: "/club", icon: Building2 },
      { label: "nav.sub.lounges", path: "/lounges", icon: Sofa },
      { label: "nav.sub.photos", path: "/fotos", icon: Camera },
    ],
  },
  {
    labelKey: "nav.category.info",
    icon: HelpCircle,
    items: [
      { label: "nav.sub.faq", path: "/faq", icon: HelpCircle },
      { label: "nav.sub.jobs", path: "/jobs", icon: Briefcase },
      { label: "nav.sub.contact", path: "/kontakt", icon: MessageSquare },
    ],
  },
];

/* ─── Generic Hover Dropdown ─── */
const HoverDropdown = ({
  label,
  icon: Icon,
  isActive,
  children,
}: {
  label: string;
  icon: any;
  isActive: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const enter = () => { clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 150); };

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        className={`flex items-center gap-1.5 text-sm font-medium tracking-wide transition-colors hover:text-primary ${
          isActive ? "text-primary" : "text-foreground/80"
        }`}
      >
        <Icon size={15} />
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="bg-popover border border-border rounded-lg shadow-lg py-1.5 min-w-[200px] animate-fade-in">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Admin Dropdown ─── */
const AdminDropdown = ({ category }: { category: AdminCategory }) => {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab");
  const isActive = location.pathname === "/admin" && category.items.some((i) => i.tab === currentTab);

  return (
    <HoverDropdown label={category.label} icon={category.icon} isActive={isActive}>
      {category.items.map((item) => {
        const SubIcon = item.icon;
        const active = location.pathname === "/admin" && currentTab === item.tab;
        return (
          <Link
            key={item.tab}
            to={`/admin?tab=${item.tab}`}
            className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-muted ${
              active ? "text-primary bg-muted/50" : "text-foreground/80"
            }`}
          >
            <SubIcon size={15} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </HoverDropdown>
  );
};

/* ─── Public Dropdown ─── */
const PublicDropdown = ({ category }: { category: NavCategory }) => {
  const location = useLocation();
  const { t } = useI18n();
  const isActive = category.items.some((i) => location.pathname === i.path);

  return (
    <HoverDropdown label={t(category.labelKey)} icon={category.icon} isActive={isActive}>
      {category.items.map((item) => {
        const SubIcon = item.icon;
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-muted ${
              active ? "text-primary bg-muted/50" : "text-foreground/80"
            }`}
          >
            <SubIcon size={15} className="shrink-0" />
            {t(item.label)}
          </Link>
        );
      })}
    </HoverDropdown>
  );
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [drinksActive, setDrinksActive] = useState(true);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    supabase.from("site_settings" as any).select("value").eq("key", "drinks_page_active").maybeSingle().then(({ data }) => {
      if (data) setDrinksActive((data as any).value === true);
    });
  }, []);

  const isAdminArea = isAdmin && ADMIN_PATHS.some((p) => location.pathname.startsWith(p));

  const filteredPublicCategories = PUBLIC_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item => drinksActive || item.path !== "/getraenkekarte"),
  }));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50" role="navigation" aria-label="Hauptnavigation">
      <div className="container mx-auto flex items-center justify-between h-16 md:h-20 px-4">
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm">
          <img src="/images/logo-light.png" alt="Nachtschicht Kaiserslautern" className="h-8 md:h-10 dark:brightness-100 brightness-0" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-5">
          {isAdminArea ? (
            <>
              <Link
                to="/"
                className="flex items-center gap-1 text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors mr-1"
              >
                <ArrowLeft size={16} />
                Website
              </Link>

              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 text-sm font-medium tracking-wide transition-colors hover:text-primary ${
                  location.pathname === "/dashboard" ? "text-primary" : "text-foreground/80"
                }`}
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Link>

              {ADMIN_CATEGORIES.map((cat) => (
                <AdminDropdown key={cat.label} category={cat} />
              ))}

              <Link
                to="/scanner"
                className={`flex items-center gap-1.5 text-sm font-medium tracking-wide transition-colors hover:text-primary ${
                  location.pathname === "/scanner" ? "text-primary" : "text-foreground/80"
                }`}
              >
                <QrCode size={15} />
                Scanner
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/"
                className={`text-sm font-medium tracking-wide transition-colors hover:text-primary ${
                  location.pathname === "/" ? "text-primary" : "text-foreground/80"
                }`}
              >
                {t("nav.home")}
              </Link>
              {filteredPublicCategories.map((cat) => (
                <PublicDropdown key={cat.labelKey} category={cat} />
              ))}
            </>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "de" ? "en" : "de")}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Sprache wechseln"
          >
            <Globe size={16} />
            {lang === "de" ? "EN" : "DE"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Theme wechseln"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {!isAdminArea && (
            <>
              {user && isAdmin && (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors text-sm font-medium"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              )}
              <Link
                to="/events"
                className="inline-flex items-center px-5 py-2 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors animate-pulse-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("nav.tickets")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-foreground p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
          aria-label="Menü öffnen"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 animate-fade-in overflow-y-auto" style={{ maxHeight: "calc(100dvh - 4rem)" }}>
          <div className="container mx-auto px-4 py-6 flex flex-col gap-3">
            {isAdminArea ? (
              <>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-lg font-display tracking-wider text-muted-foreground mb-2"
                >
                  <ArrowLeft size={18} />
                  {t("nav.backToSite")}
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 text-base font-medium transition-colors ${
                    location.pathname === "/dashboard" ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>

                {ADMIN_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.label} className="mt-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                        <CatIcon size={13} />
                        {cat.label}
                      </div>
                      <div className="flex flex-col gap-0.5 pl-1">
                        {cat.items.map((item) => {
                          const SubIcon = item.icon;
                          const currentTab = new URLSearchParams(location.search).get("tab");
                          const active = location.pathname === "/admin" && currentTab === item.tab;
                          return (
                            <Link
                              key={item.tab}
                              to={`/admin?tab=${item.tab}`}
                              onClick={() => setOpen(false)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                active ? "text-primary bg-muted/50" : "text-foreground/80 hover:bg-muted"
                              }`}
                            >
                              <SubIcon size={15} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <Link
                  to="/scanner"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 text-base font-medium mt-2 transition-colors ${
                    location.pathname === "/scanner" ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  <QrCode size={18} />
                  Scanner
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className={`text-lg font-display tracking-wider transition-colors ${
                    location.pathname === "/" ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  {t("nav.home")}
                </Link>

                {filteredPublicCategories.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.labelKey} className="mt-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                        <CatIcon size={13} />
                        {t(cat.labelKey)}
                      </div>
                      <div className="flex flex-col gap-0.5 pl-1">
                        {cat.items.map((item) => {
                          const SubIcon = item.icon;
                          const active = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setOpen(false)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                active ? "text-primary bg-muted/50" : "text-foreground/80 hover:bg-muted"
                              }`}
                            >
                              <SubIcon size={15} />
                              {t(item.label)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {user && isAdmin && (
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 text-lg font-display tracking-wider transition-colors ${
                      location.pathname === "/dashboard" ? "text-primary" : "text-foreground/80"
                    }`}
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                )}
              </>
            )}

            <div className="flex items-center gap-3 mt-2 pt-4 border-t border-border/50">
              <button
                onClick={() => setLang(lang === "de" ? "en" : "de")}
                className="flex items-center gap-1 px-3 py-2 rounded-md bg-muted text-foreground text-sm font-medium"
              >
                <Globe size={16} />
                {lang === "de" ? "English" : "Deutsch"}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md bg-muted text-foreground"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            {!isAdminArea && (
              <Link
                to="/events"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-display text-xl tracking-wider rounded-md"
              >
                {t("nav.getTickets")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
