import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ScrollReveal from "@/components/ScrollReveal";
import { useI18n } from "@/hooks/useI18n";
import { useTranslate } from "@/hooks/useTranslate";
import { usePageSEO } from "@/hooks/usePageSEO";

const faqs = [
  { q: "Ich habe kein Ticket erhalten – was tun?", a: "Bitte prüfe zunächst deinen Spam-Ordner. Stelle sicher, dass die Zahlung erfolgreich war und die richtige E-Mail-Adresse angegeben wurde. Falls du weiterhin Probleme hast, kontaktiere unseren Support: Telefon +49 631 3105759 oder E-Mail info@nachtschicht-kaiserslautern.de" },
  { q: "Was sind die Öffnungszeiten?", a: "Die Nachtschicht hat freitags, samstags und an Vorfeiertagen ab 22:00 Uhr geöffnet. Sonderveranstaltungen können abweichende Zeiten haben – schau dir unsere Event-Seite für aktuelle Infos an." },
  { q: "Kann ich einen Tisch oder eine Lounge reservieren?", a: "Ja! Reservierungen für VIP-Lounges und Tische sind per E-Mail an info@nachtschicht-kaiserslautern.de oder telefonisch unter +49 631 3105759 möglich." },
  { q: "Welche Musik wird gespielt?", a: "Freitags: Hip-Hop (Agostea), 90er/2000er & Partyhits (Mausefalle). Samstags: House (Agostea), Hip-Hop (La Vie), 90er/2000er & Partyhits (Mausefalle)." },
  { q: "Darf ich unter 18 in den Club?", a: "Ab 16 Jahren ist der Eintritt mit einem ausgefüllten Muttizettel und Begleitperson möglich. Den Muttizettel kannst du hier herunterladen:", link: "/u18" },
  { q: "Gibt es einen Mindestverzehr in den Lounges?", a: "Ja, je nach Lounge-Kategorie gibt es einen Mindestverzehr. Details erhältst du bei der Reservierung." },
  { q: "Kann ich Gutscheine kaufen?", a: "Ja, Gutscheine sind an der Abendkasse oder per E-Mail erhältlich. Kontaktiere uns für weitere Informationen." },
  { q: "Wo befindet sich die Nachtschicht?", a: "Die Nachtschicht befindet sich in der Zollamtstraße 28, 67663 Kaiserslautern. Du erreichst uns bequem mit dem Auto oder den öffentlichen Verkehrsmitteln. Parkplätze sind in der Nähe vorhanden." },
  { q: "Gibt es eine Garderobe?", a: "Ja, wir bieten eine bewachte Garderobe an. Die Garderobe kostet einen kleinen Betrag pro Kleidungsstück." },
  { q: "Wie alt muss ich sein, um in die Nachtschicht zu kommen?", a: "Regulärer Einlass ist ab 18 Jahren. Ab 16 Jahren ist der Eintritt mit Muttizettel und einer volljährigen Begleitperson möglich. Letzter Einlass ist um 03:00 Uhr." },
];

const FaqPage = () => {
  const { lang, t } = useI18n();
  const translate = useTranslate(lang);

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  }), []);

  usePageSEO({
    title: "FAQ – Häufige Fragen | Nachtschicht Kaiserslautern",
    description: "Häufig gestellte Fragen zur Nachtschicht Kaiserslautern: Öffnungszeiten, Tickets, Einlass ab 16 mit Muttizettel, VIP-Lounge Reservierung, Garderobe & Anfahrt.",
    canonical: "/faq",
    jsonLd: faqJsonLd,
  });

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-3xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              {t("faq.title")} <span className="text-gradient">{t("faq.titleHighlight")}</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <AccordionItem value={`faq-${i}`} className="glass-card px-5 border-none">
                <AccordionTrigger className="text-foreground text-left font-medium py-5 hover:no-underline hover:text-primary">
                  {translate(faq.q)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                  {translate(faq.a)}
                  {faq.link && (
                    <a href={faq.link} className="block mt-2 text-primary underline hover:text-primary/80">
                      {t("faq.u18Link")}
                    </a>
                  )}
                </AccordionContent>
              </AccordionItem>
            </ScrollReveal>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqPage;
