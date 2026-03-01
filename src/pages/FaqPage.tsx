import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ScrollReveal from "@/components/ScrollReveal";

const faqs = [
  { q: "Ich habe kein Ticket erhalten – was tun?", a: "Bitte prüfe zunächst deinen Spam-Ordner. Stelle sicher, dass die Zahlung erfolgreich war und die richtige E-Mail-Adresse angegeben wurde. Falls du weiterhin Probleme hast, kontaktiere unseren Support: Telefon +49 631 3105759 oder E-Mail info@nachtschicht-kaiserslautern.de" },
  { q: "Was sind die Öffnungszeiten?", a: "Die Nachtschicht hat freitags, samstags und an Vorfeiertagen ab 22:00 Uhr geöffnet. Sonderveranstaltungen können abweichende Zeiten haben – schau dir unsere Event-Seite für aktuelle Infos an." },
  { q: "Kann ich einen Tisch oder eine Lounge reservieren?", a: "Ja! Reservierungen für VIP-Lounges und Tische sind per E-Mail an info@nachtschicht-kaiserslautern.de oder telefonisch unter +49 631 3105759 möglich." },
  { q: "Welche Musik wird gespielt?", a: "Freitags: Hip-Hop (Agostea), 90er/2000er & Partyhits (Mausefalle). Samstags: House (Agostea), Hip-Hop (La Vie), 90er/2000er & Partyhits (Mausefalle)." },
  { q: "Darf ich unter 18 in den Club?", a: "Ab 16 Jahren ist der Eintritt mit einem ausgefüllten Muttizettel und Begleitperson möglich. Den Muttizettel kannst du hier herunterladen:", link: "/u18" },
  { q: "Gibt es einen Mindestverzehr in den Lounges?", a: "Ja, je nach Lounge-Kategorie gibt es einen Mindestverzehr. Details erhältst du bei der Reservierung." },
  { q: "Kann ich Gutscheine kaufen?", a: "Ja, Gutscheine sind an der Abendkasse oder per E-Mail erhältlich. Kontaktiere uns für weitere Informationen." },
];

const FaqPage = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-3xl">
      <ScrollReveal>
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
            HÄUFIGE <span className="text-gradient">FRAGEN</span>
          </h1>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
        </div>
      </ScrollReveal>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <ScrollReveal key={i} delay={i * 0.08}>
            <AccordionItem value={`faq-${i}`} className="glass-card px-5 border-none">
              <AccordionTrigger className="text-foreground text-left font-medium py-5 hover:no-underline hover:text-primary">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                {faq.a}
                {faq.link && (
                  <a href={faq.link} className="block mt-2 text-primary underline hover:text-primary/80">
                    U18 Formular öffnen
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

export default FaqPage;
