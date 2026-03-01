import { useRef } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const U18Page = () => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-2xl">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              U18 <span className="text-gradient">FORMULAR</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Erziehungsbeauftragung gemäß § 1 Abs. 1 Nr. 4 Jugendschutzgesetz – bitte ausdrucken, ausfüllen und unterschrieben mitbringen.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="print:hidden mb-6 text-center">
            <Button onClick={handlePrint} size="lg" className="font-display tracking-wider gap-2">
              <Printer size={20} />
              FORMULAR DRUCKEN
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div
            ref={printRef}
            className="bg-white text-black p-8 md:p-12 rounded-lg print:rounded-none print:p-0 print:shadow-none space-y-6 text-sm leading-relaxed"
          >
            <div className="text-center border-b-2 border-black pb-4 mb-6">
              <h2 className="text-2xl font-bold tracking-wide">ERZIEHUNGSBEAUFTRAGUNG</h2>
              <p className="text-xs mt-1 text-gray-600">gemäß § 1 Abs. 1 Nr. 4 Jugendschutzgesetz (JuSchG)</p>
              <p className="text-xs mt-1 font-semibold">Nachtschicht Kaiserslautern – Zollamtstraße 28, 67663 Kaiserslautern</p>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-base mb-3">1. Angaben zum Minderjährigen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Vorname, Nachname</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Geburtsdatum</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1 md:col-span-2">
                    <span className="text-xs text-gray-500">Anschrift</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Telefonnummer</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Ausweisnummer</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-base mb-3">2. Angaben zur erziehungsberechtigten Person</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Vorname, Nachname</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Geburtsdatum</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1 md:col-span-2">
                    <span className="text-xs text-gray-500">Anschrift</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Telefonnummer (für Rückfragen)</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Verhältnis zum Kind (Mutter/Vater/Vormund)</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-base mb-3">3. Angaben zur beauftragten Person (über 18 Jahre)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Vorname, Nachname</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Geburtsdatum</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1 md:col-span-2">
                    <span className="text-xs text-gray-500">Anschrift</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Telefonnummer</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Ausweisnummer</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-base mb-3">4. Veranstaltung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Datum der Veranstaltung</span>
                  </div>
                  <div className="border-b border-gray-400 pb-1">
                    <span className="text-xs text-gray-500">Name der Veranstaltung</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded border border-gray-200 text-xs leading-relaxed">
                <h3 className="font-bold text-sm mb-2">Erklärung der erziehungsberechtigten Person:</h3>
                <p>
                  Hiermit beauftrage ich die oben genannte volljährige Person, für die Dauer der oben genannten Veranstaltung
                  die Erziehungsaufsicht über mein Kind / meinen Schützling zu übernehmen. Die beauftragte Person übernimmt 
                  die Verantwortung gemäß § 1 Abs. 1 Nr. 4 JuSchG. Mir ist bekannt, dass Alkoholausschank an Minderjährige 
                  unter 16 Jahren verboten ist. Jugendliche ab 16 Jahren dürfen Bier, Wein und Sekt konsumieren. 
                  Branntweinhaltige Getränke (Spirituosen, Mixgetränke) sind erst ab 18 Jahren gestattet.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                <div>
                  <div className="border-b-2 border-black pb-1 mb-1">
                    <span className="text-xs text-gray-500">Ort, Datum</span>
                  </div>
                </div>
                <div>
                  <div className="border-b-2 border-black pb-1 mb-1">
                    <span className="text-xs text-gray-500">Unterschrift erziehungsberechtigte Person</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                <div>
                  <div className="border-b-2 border-black pb-1 mb-1">
                    <span className="text-xs text-gray-500">Unterschrift beauftragte Person</span>
                  </div>
                </div>
                <div>
                  <div className="border-b-2 border-black pb-1 mb-1">
                    <span className="text-xs text-gray-500">Unterschrift Minderjährige/r</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 pt-4 mt-6 text-xs text-gray-500 text-center">
              <p>Dieses Formular muss vollständig ausgefüllt, von allen Parteien unterschrieben und zusammen mit gültigen Ausweisen am Einlass vorgelegt werden.</p>
              <p className="mt-1 font-semibold text-gray-700">Nachtschicht Kaiserslautern · Zollamtstraße 28 · 67663 Kaiserslautern</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="print:hidden mt-6 text-center">
            <Button onClick={handlePrint} size="lg" className="font-display tracking-wider gap-2">
              <Printer size={20} />
              FORMULAR DRUCKEN
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default U18Page;
