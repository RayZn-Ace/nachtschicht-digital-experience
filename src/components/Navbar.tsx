import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "Startseite", path: "/" },
  { label: "Events & Tickets", path: "/events" },
  { label: "Club", path: "/club" },
  { label: "Fotos & Videos", path: "/fotos" },
  { label: "Lounges", path: "/lounges" },
  { label: "FAQ", path: "/faq" },
  { label: "Jobs", path: "/jobs" },
  { label: "Kontakt", path: "/kontakt" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 md:h-20 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-light.png" alt="Nachtschicht Kaiserslautern" className="h-8 md:h-10" />
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
        </div>

        <Link
          to="/events"
          className="hidden lg:inline-flex items-center px-5 py-2 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors animate-pulse-glow"
        >
          TICKETS
        </Link>

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
            <Link
              to="/events"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-display text-xl tracking-wider rounded-md"
            >
              TICKETS SICHERN
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
