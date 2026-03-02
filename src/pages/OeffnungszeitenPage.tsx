import { useState, useEffect } from "react";
import { Clock, PartyPopper, CalendarDays, Info, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useI18n } from "@/hooks/useI18n";
import { usePageSEO } from "@/hooks/usePageSEO";
import { supabase } from "@/integrations/supabase/client";

interface HolidaySpecial {
  id: string;
  title: string;
  date_label: string;
  hours: string;
  note_de: string | null;
  note_en: string | null;
  sort_order: number;
}

const regularHours = [
  { day: "Montag – Donnerstag", hours: "Geschlossen", closed: true },
  { day: "Freitag", hours: "22:00 – 05:00 Uhr", closed: false },
  { day: "Samstag", hours: "22:00 – 05:00 Uhr", closed: false },
  { day: "Sonntag", hours: "Geschlossen", closed: true },
];

const regularHoursEN = [
  { day: "Monday – Thursday", hours: "Closed", closed: true },
  { day: "Friday", hours: "10:00 PM – 5:00 AM", closed: false },
  { day: "Saturday", hours: "10:00 PM – 5:00 AM", closed: false },
  { day: "Sunday", hours: "Closed", closed: true },
];

const specialNotes = [
  {
    icon: CalendarDays,
    titleDE: "Vorfeiertage",
    titleEN: "Pre-holiday evenings",
    descDE: "An Vorfeiertagen öffnen wir ebenfalls ab 22:00 Uhr – prüfe unsere Events-Seite für aktuelle Termine.",
    descEN: "We also open on pre-holiday evenings from 10 PM – check our Events page for current dates.",
  },
  {
    icon: PartyPopper,
    titleDE: "Sonderveranstaltungen",
    titleEN: "Special Events",
    descDE: "Bei Konzerten, Specials und Privatevents können abweichende Öffnungszeiten gelten. Infos unter Events.",
    descEN: "Concerts, specials and private events may have different hours. See Events for details.",
  },
  {
    icon: Info,
    titleDE: "Einlass",
    titleEN: "Admission",
    descDE: "Einlass ab 18 Jahren. Ab 16 Jahren mit ausgefülltem Muttizettel und Begleitperson. Letzter Einlass: 03:00 Uhr.",
    descEN: "Admission from 18+. From 16+ with parental consent form. Last entry: 3:00 AM.",
  },
];

const OeffnungszeitenPage = () => {
  const { lang } = useI18n();
  const de = lang === "de";
  const hours = de ? regularHours : regularHoursEN;
  const [holidays, setHolidays] = useState<HolidaySpecial[]>([]);

  usePageSEO({
    title: "Öffnungszeiten – Nachtschicht Kaiserslautern | Freitag & Samstag ab 22 Uhr",
    description: "Öffnungszeiten der Nachtschicht Kaiserslautern: Freitag & Samstag 22:00–05:00 Uhr, Vorfeiertage ab 22:00 Uhr. Einlass ab 18 (ab 16 mit Muttizettel). Letzter Einlass 03:00 Uhr.",
    canonical: "/oeffnungszeiten",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "NightClub",
      "name": "Nachtschicht Kaiserslautern",
      "url": "https://nachtschicht-kaiserslautern.de/oeffnungszeiten",
      "openingHoursSpecification": [
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Friday", "opens": "22:00", "closes": "05:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "22:00", "closes": "05:00" }
      ],
      "address": { "@type": "PostalAddress", "streetAddress": "Zollamtstraße 28", "addressLocality": "Kaiserslautern", "postalCode": "67663", "addressCountry": "DE" }
    },
  });

  useEffect(() => {
    supabase.from("holiday_specials").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setHolidays(data as unknown as HolidaySpecial[]);
    });
  }, []);

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              {de ? "ÖFFNUNGS" : "OPENING"}{" "}
              <span className="text-gradient">{de ? "ZEITEN" : "HOURS"}</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              {de
                ? "Alle regulären Öffnungszeiten, Feiertags-Specials und wichtige Hinweise auf einen Blick."
                : "All regular hours, holiday specials and important info at a glance."}
            </p>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>

        {/* Regular Hours */}
        <ScrollReveal delay={0.1}>
          <div className="glass-card p-6 md:p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-primary" />
              </div>
              <h2 className="font-display text-2xl tracking-wider text-foreground">
                {de ? "REGULÄRE ZEITEN" : "REGULAR HOURS"}
              </h2>
            </div>

            <div className="space-y-0 divide-y divide-border">
              {hours.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-4 ${
                    item.closed ? "opacity-50" : ""
                  }`}
                >
                  <span className="text-foreground font-medium">{item.day}</span>
                  <span
                    className={`text-sm font-display tracking-wider ${
                      item.closed ? "text-muted-foreground" : "text-primary"
                    }`}
                  >
                    {item.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Holiday Specials */}
        <ScrollReveal delay={0.2}>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-primary" />
              </div>
              <h2 className="font-display text-2xl tracking-wider text-foreground">
                {de ? "FEIERTAGS-SPECIALS" : "HOLIDAY SPECIALS"}
              </h2>
            </div>

            {holidays.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {holidays.map((h, i) => (
                  <ScrollReveal key={h.id} delay={0.25 + i * 0.08}>
                    <div className="glass-card p-5 h-full flex flex-col">
                      <h3 className="font-display text-lg tracking-wider text-foreground mb-1">
                        {h.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">{h.date_label}</p>
                      <p className="text-primary font-display tracking-wider text-sm mb-3">
                        {h.hours}
                      </p>
                      <p className="text-sm text-muted-foreground mt-auto">
                        {de ? h.note_de : h.note_en}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {de ? "Aktuell keine Feiertags-Specials geplant." : "No holiday specials planned at the moment."}
              </p>
            )}
          </div>
        </ScrollReveal>

        {/* Special Notes */}
        <ScrollReveal delay={0.35}>
          <div className="space-y-4">
            {specialNotes.map((note, i) => {
              const Icon = note.icon;
              return (
                <ScrollReveal key={i} delay={0.4 + i * 0.08}>
                  <div className="glass-card p-5 flex items-start gap-4">
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg tracking-wider text-foreground mb-1">
                        {de ? note.titleDE : note.titleEN}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {de ? note.descDE : note.descEN}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default OeffnungszeitenPage;
