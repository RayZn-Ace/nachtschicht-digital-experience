import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";

const Footer = () => (
  <footer className="bg-secondary border-t border-border/50">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div>
          <img src="/images/logo-light.png" alt="Nachtschicht" className="h-8 mb-4" />
          <p className="text-muted-foreground text-sm leading-relaxed">
            Zollamtstraße 28<br />67663 Kaiserslautern
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Tel: +49 631 3105759<br />
            info@nachtschicht-kaiserslautern.de
          </p>
        </div>
        <div>
          <h4 className="font-display text-xl tracking-wider text-foreground mb-4">NAVIGATION</h4>
          <div className="flex flex-col gap-2">
            {[
              { label: "Events & Tickets", path: "/events" },
              { label: "Club", path: "/club" },
              { label: "Fotos", path: "/fotos" },
              { label: "FAQ", path: "/faq" },
              { label: "Jobs", path: "/jobs" },
              { label: "Kontakt", path: "/kontakt" },
            ].map((item) => (
              <Link key={item.path} to={item.path} className="text-muted-foreground text-sm hover:text-primary transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-display text-xl tracking-wider text-foreground mb-4">RECHTLICHES</h4>
          <div className="flex flex-col gap-2">
            <Link to="/agb" className="text-muted-foreground text-sm hover:text-primary transition-colors">AGB</Link>
            <Link to="/datenschutz" className="text-muted-foreground text-sm hover:text-primary transition-colors">Datenschutz</Link>
            <Link to="/impressum" className="text-muted-foreground text-sm hover:text-primary transition-colors">Impressum</Link>
          </div>
        </div>
        <div>
          <h4 className="font-display text-xl tracking-wider text-foreground mb-4">SOCIAL MEDIA</h4>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/nachtschichtkl" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors" aria-label="Instagram">
              <Instagram size={24} />
            </a>
            <a href="https://www.facebook.com/nachtschichtkaiserslautern/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors" aria-label="Facebook">
              <Facebook size={24} />
            </a>
            <a href="https://www.tiktok.com/@nachtschicht.kl" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors" aria-label="TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.22 8.22 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/50 pt-6 text-center">
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Nachtschicht Kaiserslautern. Alle Rechte vorbehalten.
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Entwickelt mit 💚 by{" "}
          <a href="https://smea.de" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline">
            SMEA GmbH
          </a>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
