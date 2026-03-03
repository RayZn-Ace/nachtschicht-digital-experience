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
  "nav.meinBereich": { de: "MEIN BEREICH", en: "MY AREA" },
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

  // Navbar sub-items
  "nav.sub.eventsTickets": { de: "Events & Tickets", en: "Events & Tickets" },
  "nav.sub.muttizettel": { de: "Muttizettel", en: "Parental Consent" },
  "nav.sub.drinks": { de: "Getränkekarte", en: "Drinks Menu" },
  "nav.sub.club": { de: "Club", en: "Club" },
  "nav.sub.lounges": { de: "Lounges", en: "Lounges" },
  "nav.sub.photos": { de: "Fotos & Videos", en: "Photos & Videos" },
  "nav.sub.faq": { de: "FAQ", en: "FAQ" },
  "nav.sub.jobs": { de: "Jobs", en: "Jobs" },
  "nav.sub.contact": { de: "Kontakt", en: "Contact" },
  "nav.sub.lostfound": { de: "Fundgrube", en: "Lost & Found" },

  // Lounges page
  "lounges.title": { de: "VIP", en: "VIP" },
  "lounges.titleHighlight": { de: "LOUNGES", en: "LOUNGES" },
  "lounges.subtitle": { de: "Sichere dir eine unserer exklusiven VIP Lounges. Wähle zuerst dein Event – verfügbare Lounges werden je nach offener Area angezeigt.", en: "Secure one of our exclusive VIP lounges. Choose your event first – available lounges are shown based on the open area." },
  "lounges.loading": { de: "Laden...", en: "Loading..." },
  "lounges.error": { de: "Lounges konnten nicht geladen werden.", en: "Lounges could not be loaded." },
  "lounges.retry": { de: "ERNEUT VERSUCHEN", en: "TRY AGAIN" },
  "lounges.noEvents": { de: "Aktuell keine Events mit Lounge-Bereichen verfügbar. Schau bald wieder vorbei!", en: "No events with lounge areas available right now. Check back soon!" },
  "lounges.selectEvent": { de: "EVENT WÄHLEN", en: "SELECT EVENT" },
  "lounges.selectPlaceholder": { de: "— Bitte Event wählen —", en: "— Please select event —" },
  "lounges.maxPersons": { de: "Personen", en: "persons" },
  "lounges.minSpend": { de: "Mindestverzehr", en: "min. spend" },
  "lounges.perPerson": { de: "/ Person", en: "/ person" },
  "lounges.reserved": { de: "RESERVIERT", en: "RESERVED" },
  "lounges.bookNow": { de: "JETZT RESERVIEREN", en: "BOOK NOW" },

  // FAQ page
  "faq.title": { de: "HÄUFIGE", en: "FREQUENTLY ASKED" },
  "faq.titleHighlight": { de: "FRAGEN", en: "QUESTIONS" },
  "faq.u18Link": { de: "U18 Formular öffnen", en: "Open U18 form" },

  // Jobs page
  "jobs.title": { de: "JOBS &", en: "JOBS &" },
  "jobs.titleHighlight": { de: "KARRIERE", en: "CAREERS" },
  "jobs.subtitle": { de: "Werde Teil des Nachtschicht-Teams! Du musst mindestens 18 Jahre alt sein, um dich zu bewerben.", en: "Join the Nachtschicht team! You must be at least 18 years old to apply." },
  "jobs.firstName": { de: "Vorname", en: "First name" },
  "jobs.lastName": { de: "Nachname", en: "Last name" },
  "jobs.age": { de: "Alter", en: "Age" },
  "jobs.whichJob": { de: "Welcher Job interessiert dich?", en: "Which position interests you?" },
  "jobs.email": { de: "E-Mail", en: "Email" },
  "jobs.phone": { de: "Telefon", en: "Phone" },
  "jobs.photo": { de: "Bewerbungsfoto", en: "Application photo" },
  "jobs.message": { de: "Freitext / Nachricht", en: "Message" },
  "jobs.privacy": { de: "Ich stimme der", en: "I agree to the" },
  "jobs.privacyLink": { de: "Datenschutzerklärung", en: "privacy policy" },
  "jobs.privacyEnd": { de: "zu und willige in die Verarbeitung meiner Daten ein.", en: "and consent to the processing of my data." },
  "jobs.submit": { de: "JETZT BEWERBEN", en: "APPLY NOW" },
  "jobs.submitting": { de: "WIRD GESENDET...", en: "SENDING..." },
  "jobs.selectJob": { de: "Bitte wähle mindestens einen Job aus.", en: "Please select at least one position." },
  "jobs.agreePrivacy": { de: "Bitte stimme der Datenschutzerklärung zu.", en: "Please agree to the privacy policy." },
  "jobs.success": { de: "Bewerbung erfolgreich gesendet! Wir melden uns bei dir. 🎉", en: "Application sent successfully! We'll get back to you. 🎉" },
  "jobs.error": { de: "Bewerbung konnte nicht gesendet werden. Bitte versuche es erneut.", en: "Application could not be sent. Please try again." },

  // Contact page
  "contact.title": { de: "KONTAKT", en: "CONTACT" },
  "contact.address": { de: "ADRESSE", en: "ADDRESS" },
  "contact.phone": { de: "TELEFON", en: "PHONE" },
  "contact.email": { de: "E-MAIL", en: "EMAIL" },
  "contact.writeUs": { de: "SCHREIB UNS", en: "WRITE TO US" },
  "contact.name": { de: "Name", en: "Name" },
  "contact.subject": { de: "Betreff", en: "Subject" },
  "contact.subjectPlaceholder": { de: "z.B. Reservierung, Frage, Feedback", en: "e.g. Reservation, Question, Feedback" },
  "contact.message": { de: "Nachricht", en: "Message" },
  "contact.messagePlaceholder": { de: "Deine Nachricht an uns...", en: "Your message to us..." },
  "contact.namePlaceholder": { de: "Dein Name", en: "Your name" },
  "contact.send": { de: "NACHRICHT SENDEN", en: "SEND MESSAGE" },
  "contact.success": { de: "Nachricht erfolgreich gesendet! ✉️", en: "Message sent successfully! ✉️" },
  "contact.error": { de: "Senden fehlgeschlagen. Bitte versuche es erneut.", en: "Sending failed. Please try again." },
  "contact.fillAll": { de: "Bitte fülle alle Pflichtfelder aus.", en: "Please fill in all required fields." },

  // Club page
  "club.areaAgostea": { de: "Die Hauptarea mit der größten Tanzfläche. Hier erleben Gäste die besten DJ-Sets und eine atemberaubende Licht- und Soundanlage.", en: "The main area with the largest dance floor. Experience the best DJ sets and a stunning light and sound system." },
  "club.areaLaVie": { de: "Exklusives Ambiente mit urbanem Sound. Perfekt für alle, die stilvoll feiern möchten.", en: "Exclusive ambiance with urban sound. Perfect for those who want to party in style." },
  "club.areaMausefalle": { de: "Nostalgie pur! Die Mausefalle ist der Place-to-be für alle Fans von Schlager, Ballermann und den besten Hits der 90er bis 2010er.", en: "Pure nostalgia! The Mausefalle is the place-to-be for all fans of Schlager, Ballermann and the best hits from the 90s to 2010s." },
  "club.areaOpenAir": { de: "Unser riesiger Open Air Floor bietet ein einzigartiges Outdoor-Erlebnis unter freiem Himmel – perfekt für warme Nächte.", en: "Our huge open-air floor offers a unique outdoor experience under the stars – perfect for warm nights." },
  "club.areaBistro": { de: "Entspannt genießen im Bistro-Bereich. Leckere Drinks, ausgewählte Snacks und eine gemütliche Atmosphäre zum Durchatmen.", en: "Relax and enjoy in the bistro area. Delicious drinks, selected snacks and a cozy atmosphere to unwind." },
  "club.outro": { de: "Die Nachtschicht Kaiserslautern bietet auf mehreren Floors ein einzigartiges Cluberlebnis. Modernste Sound- und Lichttechnik, stilvolle Inneneinrichtung und ein professionelles Team sorgen dafür, dass jede Nacht unvergesslich wird.", en: "Nachtschicht Kaiserslautern offers a unique club experience across multiple floors. State-of-the-art sound and lighting, stylish interior design and a professional team ensure every night is unforgettable." },

  // Mobile nav
  "nav.backToSite": { de: "Zurück zur Website", en: "Back to website" },
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
