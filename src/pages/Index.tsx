import { Link, useNavigate } from "react-router-dom";
import { Instagram, Facebook, ChevronRight, MapPin, Calendar } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/types/database";
import ScrollReveal from "@/components/ScrollReveal";
import { useI18n } from "@/hooks/useI18n";
import { useTranslate } from "@/hooks/useTranslate";
import { CLUB_AREAS, parseAreas } from "@/lib/areas";
import { usePageSEO } from "@/hooks/usePageSEO";

const galleryImages = [
  "/images/gallery-1.jpg", "/images/gallery-2.jpg", "/images/gallery-3.jpg",
  "/images/gallery-4.jpg", "/images/gallery-5.jpg", "/images/gallery-6.jpg",
];

const Index = () => {
  const { t, lang } = useI18n();
  const tr = useTranslate(lang);
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);

  const jsonLd = useMemo(() => [
    {
      "@context": "https://schema.org",
      "@type": "NightClub",
      "name": "Nachtschicht Kaiserslautern",
      "description": "Der angesagteste Club in Kaiserslautern für Events, Partys, VIP-Lounges und unvergessliche Nächte. Charts, Hip-Hop, House, 90er & 2000er.",
      "url": "https://nachtschicht-kaiserslautern.de",
      "telephone": "+49 631 3105759",
      "email": "info@nachtschicht-kaiserslautern.de",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Zollamtstraße 28",
        "addressLocality": "Kaiserslautern",
        "postalCode": "67663",
        "addressRegion": "Rheinland-Pfalz",
        "addressCountry": "DE"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 49.444,
        "longitude": 7.768
      },
      "openingHoursSpecification": [
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Friday", "opens": "22:00", "closes": "05:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "22:00", "closes": "05:00" }
      ],
      "sameAs": [
        "https://www.instagram.com/nachtschichtkl",
        "https://www.facebook.com/nachtschichtkaiserslautern/",
        "https://www.tiktok.com/@nachtschicht.kl"
      ],
      "image": "https://nachtschicht-kaiserslautern.de/images/gallery-8.jpg",
      "priceRange": "€€"
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Nachtschicht Kaiserslautern",
      "url": "https://nachtschicht-kaiserslautern.de",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://nachtschicht-kaiserslautern.de/events?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ], []);

  usePageSEO({
    title: "Nachtschicht Kaiserslautern – Der Club für unvergessliche Nächte",
    description: "Nachtschicht Kaiserslautern: DER Club für Partys, Events, VIP-Lounges & Tickets in Kaiserslautern. Charts, Hip-Hop, House, 90er/2000er – jedes Wochenende live. Jetzt Tickets sichern!",
    canonical: "/",
    jsonLd,
  });

  useEffect(() => {
    const fetchAll = async () => {
      const [eventsRes, featuredRes] = await Promise.all([
        supabase.from("events").select("*").eq("is_published", true).order("date", { ascending: true }).limit(20),
        supabase.from("events").select("*").eq("is_published", true).filter("is_featured", "eq", true).order("date", { ascending: true }).limit(20),
      ]);
      const now = new Date();
      const filterUpcoming = (data: any[]) => data.filter((e: any) => {
        let effectiveEndDate: string;
        if (e.end_date) {
          effectiveEndDate = e.end_date;
        } else {
          const startDate = (e.date || '').split("T")[0];
          const endTime = e.end_time || e.time || "23:59";
          const startTime = e.time || "22:00";
          if (endTime < startTime) {
            const nextDay = new Date(startDate);
            nextDay.setDate(nextDay.getDate() + 1);
            effectiveEndDate = nextDay.toISOString().split("T")[0];
          } else {
            effectiveEndDate = startDate;
          }
        }
        const endTime = e.end_time || "23:59";
        const endDateTime = new Date(`${effectiveEndDate}T${endTime}:00`);
        return endDateTime >= now;
      });
      if (eventsRes.data) setEvents(filterUpcoming(eventsRes.data as any).slice(0, 3));
      if (featuredRes.data) setFeaturedEvents(filterUpcoming(featuredRes.data as any).slice(0, 3));
    };
    fetchAll();
  }, []);

  const featuredGridCols =
    featuredEvents.length === 3 ? "md:grid-cols-3" :
    featuredEvents.length === 2 ? "md:grid-cols-2" : "";

  const featuredAspect =
    featuredEvents.length === 1 ? "aspect-[16/9] md:aspect-[21/9]" :
    featuredEvents.length === 2 ? "aspect-[4/3] md:aspect-video" : "aspect-[4/3] md:aspect-video";

  return (
    <>
      {/* Hero */}
      <section className="relative h-dvh min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover">
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
          <div className="absolute inset-0 bg-primary/10" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-9xl tracking-wider text-foreground mb-4 animate-fade-in">
            NACHT<span className="text-gradient">SCHICHT</span>
          </h1>
          <p className="text-lg md:text-2xl text-foreground/80 font-light mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in px-4" style={{ animationDelay: "0.4s" }}>
            <Link to="/events" className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-primary-foreground font-display text-lg sm:text-xl tracking-wider rounded-md hover:bg-primary/90 transition-all glow-red min-h-[48px]">
              {t("hero.tickets")} <ChevronRight size={20} />
            </Link>
            <Link to="/club" className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 border border-foreground/30 text-foreground font-display text-lg sm:text-xl tracking-wider rounded-md hover:bg-foreground/10 transition-all min-h-[48px]">
              {t("hero.discover")}
            </Link>
          </div>
          <div className="flex justify-center gap-6 mt-10 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <a href="https://www.instagram.com/nachtschichtkl" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors" aria-label="Nachtschicht Kaiserslautern auf Instagram"><Instagram size={28} /></a>
            <a href="https://www.facebook.com/nachtschichtkaiserslautern/" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors" aria-label="Nachtschicht Kaiserslautern auf Facebook"><Facebook size={28} /></a>
            <a href="https://www.tiktok.com/@nachtschicht.kl" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors" aria-label="Nachtschicht Kaiserslautern auf TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.22 8.22 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" /></svg>
            </a>
          </div>
        </div>
      </section>

      {/* Featured / Highlight Events */}
      {featuredEvents.length > 0 && (
        <section className="py-8 md:py-12">
          <div className="container mx-auto">
            <ScrollReveal>
              <div className={`grid grid-cols-1 ${featuredGridCols} gap-4`}>
                {featuredEvents.map((event, i) => (
                  <Link
                    key={event.id}
                    to={`/tickets/${event.id}`}
                    className="block relative rounded-2xl overflow-hidden group hover-lift"
                  >
                    <img
                      src={event.image_url || "/images/gallery-1.jpg"}
                      alt={`${event.title} – Highlight Event in der Nachtschicht Kaiserslautern`}
                      className={`w-full ${featuredAspect} object-cover group-hover:scale-105 transition-transform duration-700`}
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
                      <span className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded font-display text-xs tracking-wider mb-2">HIGHLIGHT</span>
                      <h2 className={`font-display tracking-wider text-foreground ${featuredEvents.length === 1 ? "text-2xl md:text-4xl" : "text-lg md:text-2xl"}`}>
                        {tr(event.title)}
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {new Date(event.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { day: "2-digit", month: "long", year: "numeric" })}
                        {event.time ? ` · ${event.time} ${lang === "de" ? "Uhr" : ""}` : ""}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-2 text-primary text-sm font-display tracking-wider">
                        {t("hero.tickets")} <ChevronRight size={16} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Next Events */}
      <section className="section-padding" aria-label="Kommende Events">
        <div className="container mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl md:text-6xl tracking-wider text-foreground">{t("index.nextEvents")} <span className="text-gradient">{t("index.nextEventsHighlight")}</span></h2>
              <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            </div>
          </ScrollReveal>
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((event, i) => (
                <ScrollReveal key={event.id} delay={i * 0.15}>
                <article className="glass-card overflow-hidden hover-lift group cursor-pointer" onClick={() => navigate(`/tickets/${event.id}`)}>
                  <div className="relative h-56 overflow-hidden">
                    <img src={event.image_url || "/images/gallery-1.jpg"} alt={`${event.title} – Event Party Nachtschicht Kaiserslautern`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 text-foreground/80 text-sm">
                      <Calendar size={14} />
                      <time dateTime={event.date}>{new Date(event.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { day: "2-digit", month: "long", year: "numeric" })}</time>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-2xl tracking-wider text-foreground mb-1">{tr(event.title)}</h3>
                    <p className="text-muted-foreground text-sm">{tr(event.genre)}</p>
                    {parseAreas(event.areas).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseAreas(event.areas).map((aId) => {
                          const area = CLUB_AREAS.find((a) => a.id === aId);
                          return area ? (
                            <span key={aId} className={`text-xs px-2 py-0.5 rounded-full ${area.color}`}>{area.name}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-3">
                      <span className="inline-flex items-center gap-1 text-primary text-sm font-medium">
                        Tickets <ChevronRight size={16} />
                      </span>
                    </div>
                  </div>
                </article>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t("index.stayTuned")}</p>
          )}
          <div className="text-center mt-10">
            <Link to="/events" className="inline-flex items-center gap-2 px-8 py-3 border border-primary text-primary font-display text-lg tracking-wider rounded-md hover:bg-primary hover:text-primary-foreground transition-all">
              {t("index.allEvents")}
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="section-padding bg-secondary/50" aria-label="Fotogalerie">
        <div className="container mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl md:text-6xl tracking-wider text-foreground">{t("index.gallery")} <span className="text-gradient">{t("index.galleryHighlight")}</span></h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {galleryImages.map((img, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="relative aspect-square overflow-hidden rounded-lg group">
                  <img src={img} alt={`Partyfotos Nachtschicht Kaiserslautern – Impressionen ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-300" />
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/fotos" className="inline-flex items-center gap-2 px-8 py-3 border border-primary text-primary font-display text-lg tracking-wider rounded-md hover:bg-primary hover:text-primary-foreground transition-all">{t("index.allPhotos")}</Link>
          </div>
        </div>
      </section>

      {/* About / SEO */}
      <section className="section-padding" aria-label="Über die Nachtschicht">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-5xl tracking-wider text-foreground text-center mb-8">{t("index.welcome")} <span className="text-gradient">NACHTSCHICHT</span></h2>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="space-y-4 text-muted-foreground leading-relaxed text-sm md:text-base">
              <p>Die <strong>Nachtschicht Kaiserslautern</strong> gehört zu den bekanntesten <strong>Clubs in Kaiserslautern</strong> und der gesamten Region Rheinland-Pfalz. Als zentraler Treffpunkt für Nachtschwärmer, Partygäste und Musikliebhaber bietet die Location ein abwechslungsreiches <strong>Nachtleben in Kaiserslautern</strong> für jeden Geschmack. Ob Charts, Black Music, Hip-Hop, House, EDM oder 90er- und 2000er-Partys – in der Nachtschicht wird jedes Wochenende gefeiert.</p>
              <p>Mit über 5 verschiedenen Areas, darunter die <strong>Agostea Mainhall</strong>, <strong>La Vie</strong>, <strong>Mausefalle</strong>, ein <strong>Open-Air-Floor</strong> und ein <strong>Bistro</strong>, bietet der Club eine einzigartige Vielfalt. Angesagte DJs, moderne Clubtechnik mit hochwertigem Sound- und Lichtsystem sowie aufwendige Dekorationen sorgen für eine unvergleichliche Atmosphäre. Neben klassischen Clubnächten finden regelmäßig Mottopartys, Special Events, Live-Acts und <strong>Konzerte in Kaiserslautern</strong> statt.</p>
              <p>Besucher aus Kaiserslautern, dem gesamten Rheinland-Pfalz, dem Saarland und der Pfalz reisen gezielt an, um unvergessliche Nächte zu erleben. <strong>VIP-Lounges</strong> können für besondere Anlässe wie Geburtstage oder Firmenevents reserviert werden. Die Nachtschicht Kaiserslautern ist bekannt für ihre große Community, professionelle Organisation, ein sicheres Umfeld und die besten <strong>Partys in Kaiserslautern</strong>.</p>
              <p>Du suchst den besten <strong>Club in der Nähe</strong>, spannende <strong>Events heute Abend</strong> oder möchtest direkt <strong>Tickets kaufen</strong>? Dann bist du bei der Nachtschicht genau richtig. Entdecke unser Programm, sichere dir deine Tickets online und erlebe das beste Nachtleben der Region!</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Map */}
      <section className="section-padding bg-secondary/50" aria-label="Anfahrt">
        <div className="container mx-auto">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl md:text-5xl tracking-wider text-foreground"><MapPin className="inline-block mr-2 text-primary" size={32} />{t("index.directions")}</h2>
              <p className="text-muted-foreground mt-2">Zollamtstraße 28, 67663 Kaiserslautern</p>
            </div>
          </ScrollReveal>
          <div className="rounded-xl overflow-hidden border border-border/50 aspect-video max-w-4xl mx-auto">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2587.5!2d7.768!3d49.444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4796320c3b0c9c5f%3A0x0!2sZollamtstra%C3%9Fe+28%2C+67663+Kaiserslautern!5e0!3m2!1sde!2sde!4v1" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Standort Nachtschicht Kaiserslautern – Zollamtstraße 28" />
          </div>
          <div className="text-center mt-6">
            <a href="https://www.google.com/maps/dir/?api=1&destination=Zollamtstraße+28,+67663+Kaiserslautern" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors">{t("index.planRoute")}</a>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
