import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Sun, Moon, Globe, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const navItems = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.events"), path: "/events" },
    { label: t("nav.club"), path: "/club" },
    { label: t("nav.photos"), path: "/fotos" },
    { label: t("nav.lounges"), path: "/lounges" },
    { label: t("nav.drinks"), path: "/getraenkekarte" },
    { label: t("nav.hours"), path: "/oeffnungszeiten" },
    { label: t("nav.faq"), path: "/faq" },
    { label: t("nav.jobs"), path: "/jobs" },
    { label: t("nav.contact"), path: "/kontakt" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 md:h-20 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-light.png" alt="Nachtschicht Kaiserslautern" className="h-8 md:h-10 dark:brightness-100 brightness-0" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium tracking-wide transition-colors hover:text-primary ${
                location.pathname === item.path ? "text-primary" : "text-foreground/80"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/dashboard"
              className={`flex items-center gap-1 text-sm font-medium tracking-wide transition-colors hover:text-primary ${
                location.pathname === "/dashboard" ? "text-primary" : "text-foreground/80"
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "de" ? "en" : "de")}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors text-xs font-medium"
            aria-label="Sprache wechseln"
          >
            <Globe size={16} />
            {lang === "de" ? "EN" : "DE"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Theme wechseln"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            to="/events"
            className="inline-flex items-center px-5 py-2 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors animate-pulse-glow"
          >
            {t("nav.tickets")}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-foreground p-2"
          aria-label="Menü öffnen"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 animate-fade-in">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`text-lg font-display tracking-wider transition-colors ${
                  location.pathname === item.path ? "text-primary" : "text-foreground/80"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user && (
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

            <Link
              to="/events"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-display text-xl tracking-wider rounded-md"
            >
              {t("nav.getTickets")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
