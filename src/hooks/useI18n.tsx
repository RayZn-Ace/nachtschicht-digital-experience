import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "de" | "en";

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Navbar
  "nav.home": { de: "Startseite", en: "Home" },
  "nav.events": { de: "Events & Tickets", en: "Events & Tickets" },
  "nav.club": { de: "Club", en: "Club" },
  "nav.photos": { de: "Fotos & Videos", en: "Photos & Videos" },
  "nav.lounges": { de: "Lounges", en: "Lounges" },
  "nav.faq": { de: "FAQ", en: "FAQ" },
  "nav.jobs": { de: "Jobs", en: "Jobs" },
  "nav.contact": { de: "Kontakt", en: "Contact" },
  "nav.drinks": { de: "Getränkekarte", en: "Drinks Menu" },
  "nav.muttizettel": { de: "Muttizettel", en: "Parental Consent" },
  "nav.hours": { de: "Öffnungszeiten", en: "Opening Hours" },
  "nav.tickets": { de: "TICKETS", en: "TICKETS" },
  "nav.getTickets": { de: "TICKETS SICHERN", en: "GET TICKETS" },
  "nav.category.events": { de: "Events", en: "Events" },
  "nav.category.club": { de: "Club", en: "Club" },
  "nav.category.info": { de: "Infos & Jobs", en: "Info & Jobs" },

  // Hero
  "hero.subtitle": { de: "Kaiserslauterns #1 Club Experience", en: "Kaiserslautern's #1 Club Experience" },
  "hero.tickets": { de: "TICKETS SICHERN", en: "GET TICKETS" },
  "hero.discover": { de: "CLUB ENTDECKEN", en: "DISCOVER CLUB" },

  // Events
  "events.title": { de: "EVENTS &", en: "EVENTS &" },
  "events.titleHighlight": { de: "TICKETS", en: "TICKETS" },
  "events.loading": { de: "Events werden geladen...", en: "Loading events..." },
  "events.empty": { de: "Aktuell keine Events verfügbar. Schau bald wieder vorbei!", en: "No events available. Check back soon!" },
  "events.soldOut": { de: "AUSVERKAUFT", en: "SOLD OUT" },
  "events.available": { de: "verfügbar", en: "available" },
  "events.free": { de: "KOSTENLOS", en: "FREE" },
  "events.buyTicket": { de: "TICKET SICHERN", en: "GET TICKET" },
  "events.buying": { de: "WIRD GEBUCHT...", en: "BOOKING..." },
  "events.loginRequired": { de: "Bitte melde dich an, um Tickets zu kaufen.", en: "Please log in to buy tickets." },

  // Index
  "index.nextEvents": { de: "NEXT", en: "NEXT" },
  "index.nextEventsHighlight": { de: "EVENTS", en: "EVENTS" },
  "index.allEvents": { de: "ALLE EVENTS ANSEHEN", en: "VIEW ALL EVENTS" },
  "index.gallery": { de: "FOTO", en: "PHOTO" },
  "index.galleryHighlight": { de: "GALERIE", en: "GALLERY" },
  "index.allPhotos": { de: "ALLE FOTOS ANSEHEN", en: "VIEW ALL PHOTOS" },
  "index.welcome": { de: "WILLKOMMEN IN DER", en: "WELCOME TO" },
  "index.directions": { de: "ANFAHRT", en: "DIRECTIONS" },
  "index.planRoute": { de: "ROUTE PLANEN", en: "PLAN ROUTE" },
  "index.stayTuned": { de: "Bald kommen neue Events – stay tuned!", en: "New events coming soon – stay tuned!" },

  // Club
  "club.title": { de: "DER", en: "THE" },
  "club.titleHighlight": { de: "CLUB", en: "CLUB" },
  "club.subtitle": { de: "Drei einzigartige Areas, ein unvergessliches Erlebnis. Entdecke die verschiedenen Welten der Nachtschicht Kaiserslautern.", en: "Three unique areas, one unforgettable experience. Discover the different worlds of Nachtschicht Kaiserslautern." },
  "club.friday": { de: "Freitag", en: "Friday" },
  "club.saturday": { de: "Samstag", en: "Saturday" },

  // Photos
  "photos.title": { de: "FOTOS &", en: "PHOTOS &" },
  "photos.titleHighlight": { de: "VIDEOS", en: "VIDEOS" },

  // Areas
  "area.agostea": { de: "AGOSTEA", en: "AGOSTEA" },
  "area.agostea.desc": { de: "Mainhall – Charts & EDM", en: "Main Hall – Charts & EDM" },
  "area.lavie": { de: "LA VIE", en: "LA VIE" },
  "area.lavie.desc": { de: "Black, RnB & Dancehall", en: "Black, RnB & Dancehall" },
  "area.mausefalle": { de: "MAUSEFALLE", en: "MAUSEFALLE" },
  "area.mausefalle.desc": { de: "Schlager, Ballermann & 90er-2010er", en: "Schlager, Ballermann & 90s-2010s" },
  "area.openair": { de: "OPEN AIR", en: "OPEN AIR" },
  "area.openair.desc": { de: "Open Air Floor", en: "Open Air Floor" },
  "area.bistro": { de: "BISTRO", en: "BISTRO" },
  "area.bistro.desc": { de: "Bistro & Lounge", en: "Bistro & Lounge" },

  // Footer
  "footer.navigation": { de: "NAVIGATION", en: "NAVIGATION" },
  "footer.legal": { de: "RECHTLICHES", en: "LEGAL" },
  "footer.newsletter": { de: "NEWSLETTER", en: "NEWSLETTER" },
  "footer.newsletterDesc": { de: "Erhalte exklusive Event-Infos & Angebote direkt in dein Postfach.", en: "Get exclusive event info & offers directly in your inbox." },
  "footer.rights": { de: "Alle Rechte vorbehalten.", en: "All rights reserved." },
  "footer.agb": { de: "AGB", en: "Terms" },
  "footer.privacy": { de: "Datenschutz", en: "Privacy" },
  "footer.imprint": { de: "Impressum", en: "Imprint" },

  // Admin
  "admin.areas": { de: "Areas (Räume)", en: "Areas (Rooms)" },
};

const I18nContext = createContext<I18nContextType>({
  lang: "de",
  setLang: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang");
    return stored === "en" ? "en" : "de";
  });

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};
