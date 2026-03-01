import { useState, useEffect, useMemo } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import SignaturePad from "@/components/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventOption {
  id: string;
  title: string;
  date: string;
}

const COUNTRIES = ["Deutschland", "Österreich", "Schweiz"];

const calcAge = (birthday: string, refDate?: Date): number => {
  const birth = new Date(birthday);
  const today = refDate || new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const U18Page = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Step 1
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");

  // Step 2 – Parent
  const [parentName, setParentName] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [parentCountry, setParentCountry] = useState("Deutschland");
  const [parentPhone, setParentPhone] = useState("");
  const [parentBirthday, setParentBirthday] = useState("");

  // Step 3 – Minor
  const [minorName, setMinorName] = useState("");
  const [minorAddress, setMinorAddress] = useState("");
  const [minorCountry, setMinorCountry] = useState("Deutschland");
  const [minorPhone, setMinorPhone] = useState("");
  const [minorBirthday, setMinorBirthday] = useState("");
  const [copyParentAddress, setCopyParentAddress] = useState(false);

  // Step 4 – Supervisor
  const [skipSupervisor, setSkipSupervisor] = useState(false);
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorAddress, setSupervisorAddress] = useState("");
  const [supervisorCountry, setSupervisorCountry] = useState("Deutschland");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");
  const [supervisorBirthday, setSupervisorBirthday] = useState("");
  const [copySupervisorAddress, setCopySupervisorAddress] = useState(false);

  // Step 5 – Signatures
  const [parentSignature, setParentSignature] = useState<string | null>(null);
  const [skipSignature, setSkipSignature] = useState(false);

  // Step 6 – Submit
  const [email, setEmail] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptNewsletter, setAcceptNewsletter] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, date")
        .eq("is_published", true)
        .order("date", { ascending: true });
      if (data) setEvents(data);
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (copyParentAddress) {
      setMinorAddress(parentAddress);
      setMinorCountry(parentCountry);
    }
  }, [copyParentAddress, parentAddress, parentCountry]);

  useEffect(() => {
    if (copySupervisorAddress) {
      setSupervisorAddress(parentAddress);
      setSupervisorCountry(parentCountry);
    }
  }, [copySupervisorAddress, parentAddress, parentCountry]);

  const selectedEventLabel = useMemo(() => {
    const ev = events.find((e) => e.id === selectedEvent);
    return ev ? ev.title : "";
  }, [selectedEvent, events]);

  const validateStep = (): string | null => {
    switch (step) {
      case 1:
        if (!selectedEvent) return "Bitte wähle ein Event aus.";
        return null;
      case 2:
        if (!parentName.trim()) return "Name des Elternteils fehlt.";
        if (!parentAddress.trim()) return "Anschrift des Elternteils fehlt.";
        if (!parentPhone.trim()) return "Telefon des Elternteils fehlt.";
        if (!parentBirthday) return "Geburtsdatum des Elternteils fehlt.";
        if (calcAge(parentBirthday) < 18) return "Die sorgeberechtigte Person muss über 18 Jahre alt sein.";
        return null;
      case 3:
        if (!minorName.trim()) return "Name der minderjährigen Person fehlt.";
        if (!minorAddress.trim()) return "Anschrift fehlt.";
        if (!minorPhone.trim()) return "Telefon fehlt.";
        if (!minorBirthday) return "Geburtsdatum fehlt.";
        {
          const age = calcAge(minorBirthday);
          if (age >= 18) return "Die Person muss unter 18 Jahre alt sein.";
          if (age < 16) return "Die Person muss mindestens 16 Jahre alt sein.";
        }
        return null;
      case 4:
        if (!skipSupervisor) {
          if (!supervisorName.trim()) return "Name der Aufsichtsperson fehlt.";
          if (!supervisorAddress.trim()) return "Anschrift der Aufsichtsperson fehlt.";
          if (!supervisorEmail.trim()) return "E-Mail der Aufsichtsperson fehlt.";
          if (!supervisorPhone.trim()) return "Telefon der Aufsichtsperson fehlt.";
          if (!supervisorBirthday) return "Geburtsdatum der Aufsichtsperson fehlt.";
          if (calcAge(supervisorBirthday) < 18) return "Die Aufsichtsperson muss über 18 Jahre alt sein.";
        }
        return null;
      case 5:
        if (!skipSignature && !parentSignature) return "Bitte unterschreibe oder wähle 'nicht online unterschreiben'.";
        return null;
      case 6:
        if (!email.trim()) return "Bitte gib eine E-Mail-Adresse ein.";
        if (!acceptPrivacy) return "Bitte stimme der Datenschutzerklärung zu.";
        return null;
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    // For now we just show success – could store in DB or send email
    toast.success("Clubzettel wurde erfolgreich erstellt! 🎉 Du erhältst ihn per E-Mail.");
    setSubmitting(false);
  };

  const CountrySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-secondary border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const SecurityBadge = () => (
    <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mt-6 pt-4 border-t border-border">
      <Lock size={12} />
      Sichere Datenübertragung durch SSL SHA-256 Verschlüsselung
    </div>
  );

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-2xl">
        <ScrollReveal>
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              MUTTI<span className="text-gradient">ZETTEL</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Schritt {step} von {totalSteps} – {selectedEventLabel || "Veranstaltung"}</span>
              <span>{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-2" />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="glass-card p-6 md:p-8">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <ShieldCheck className="mx-auto text-primary" size={40} />
                  <h2 className="font-display text-2xl tracking-wider">Jetzt ausfüllen und den Clubzettel erhalten</h2>
                  <p className="text-muted-foreground text-sm">Bitte gib an, um welche Veranstaltung es sich handelt.</p>
                </div>
                <div className="space-y-2">
                  <Label>Event auswählen *</Label>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Event auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.title} – {new Date(ev.date).toLocaleDateString("de-DE")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 2 – Parent */}
            {step === 2 && (
              <div className="space-y-5">
                <p className="text-muted-foreground text-sm">Bitte gib die Daten der sorgeberechtigten Person ein. (z.B. Vater oder Mutter)</p>
                <div className="space-y-3">
                  <div>
                    <Label>👤 Name Elternteil *</Label>
                    <Input value={parentName} onChange={(e) => setParentName(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <Label>🏡 Anschrift Elternteil *</Label>
                    <Input value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <CountrySelect value={parentCountry} onChange={setParentCountry} />
                  <div>
                    <Label>📞 Telefon Elternteil *</Label>
                    <Input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <Label>🎈 Geburtsdatum Elternteil *</Label>
                    <Input type="date" value={parentBirthday} onChange={(e) => setParentBirthday(e.target.value)} className="bg-secondary border-border" />
                    {parentBirthday && calcAge(parentBirthday) < 18 && (
                      <p className="text-destructive text-xs mt-1">Die sorgeberechtigte Person muss über 18 sein.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 – Minor */}
            {step === 3 && (
              <div className="space-y-5">
                <p className="text-muted-foreground text-sm">Bitte gib die Daten der unter 18-jährigen Person ein.</p>
                <div className="space-y-3">
                  <div>
                    <Label>👤 Name unter 18 *</Label>
                    <Input value={minorName} onChange={(e) => setMinorName(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <Label className="flex items-center justify-between">
                      <span>🏡 Anschrift unter 18 *</span>
                      <button
                        type="button"
                        onClick={() => setCopyParentAddress(!copyParentAddress)}
                        className="text-xs text-primary hover:underline"
                      >
                        ADRESSE VOM ELTERNTEIL ÜBERNEHMEN
                      </button>
                    </Label>
                    <Input value={minorAddress} onChange={(e) => { setMinorAddress(e.target.value); setCopyParentAddress(false); }} className="bg-secondary border-border" />
                  </div>
                  <CountrySelect value={minorCountry} onChange={(v) => { setMinorCountry(v); setCopyParentAddress(false); }} />
                  <div>
                    <Label>📞 Telefon unter 18 *</Label>
                    <Input type="tel" value={minorPhone} onChange={(e) => setMinorPhone(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <Label>🎈 Geburtsdatum unter 18 *</Label>
                    <Input type="date" value={minorBirthday} onChange={(e) => setMinorBirthday(e.target.value)} className="bg-secondary border-border" />
                    {minorBirthday && (
                      <>
                        {calcAge(minorBirthday) >= 18 && <p className="text-destructive text-xs mt-1">Die Person muss unter 18 Jahre alt sein.</p>}
                        {calcAge(minorBirthday) < 16 && <p className="text-destructive text-xs mt-1">Die Person muss mindestens 16 Jahre alt sein.</p>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 – Supervisor */}
            {step === 4 && (
              <div className="space-y-5">
                <p className="text-muted-foreground text-sm">Bitte gib die Daten der Aufsichtsperson an (über 18 Jahre alt).</p>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <Checkbox
                    checked={skipSupervisor}
                    onCheckedChange={(v) => setSkipSupervisor(!!v)}
                    id="skip-supervisor"
                  />
                  <div>
                    <label htmlFor="skip-supervisor" className="text-sm font-medium cursor-pointer">
                      Aufsichtsperson später eintragen
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ja, ich möchte die Aufsichtsperson nach dem Ausdruck eintragen. Bitte beachte, dass du den Muttizettel dann ausdrucken musst.
                    </p>
                  </div>
                </div>

                {!skipSupervisor && (
                  <div className="space-y-3">
                    <div>
                      <Label>👤 Name Aufsichtsperson (18+) *</Label>
                      <Input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div>
                      <Label className="flex items-center justify-between">
                        <span>🏡 Anschrift Aufsichtsperson (18+) *</span>
                        <button
                          type="button"
                          onClick={() => setCopySupervisorAddress(!copySupervisorAddress)}
                          className="text-xs text-primary hover:underline"
                        >
                          ADRESSE VOM ELTERNTEIL ÜBERNEHMEN
                        </button>
                      </Label>
                      <Input value={supervisorAddress} onChange={(e) => { setSupervisorAddress(e.target.value); setCopySupervisorAddress(false); }} className="bg-secondary border-border" />
                    </div>
                    <CountrySelect value={supervisorCountry} onChange={(v) => { setSupervisorCountry(v); setCopySupervisorAddress(false); }} />
                    <div>
                      <Label>✉️ E-Mail Aufsichtsperson (18+) *</Label>
                      <Input type="email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div>
                      <Label>📞 Telefon Aufsichtsperson (18+) *</Label>
                      <Input type="tel" value={supervisorPhone} onChange={(e) => setSupervisorPhone(e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div>
                      <Label>🎈 Geburtsdatum (18+) *</Label>
                      <Input type="date" value={supervisorBirthday} onChange={(e) => setSupervisorBirthday(e.target.value)} className="bg-secondary border-border" />
                      {supervisorBirthday && calcAge(supervisorBirthday) < 18 && (
                        <p className="text-destructive text-xs mt-1">Die Aufsichtsperson muss über 18 Jahre alt sein.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5 – Signatures */}
            {step === 5 && (
              <div className="space-y-6">
                <p className="text-muted-foreground text-sm">Unterschrift des Elternteils bzw. der sorgeberechtigten Person</p>

                {!skipSignature && (
                  <>
                    <SignaturePad
                      label="Unterschrift der sorgeberechtigten Person"
                      onSignatureChange={setParentSignature}
                      value={parentSignature}
                    />
                    <p className="text-xs text-muted-foreground">
                      Hiermit erkläre ich mich als sorgeberechtigte Person einverstanden, dass ich die Aufsicht an die angegebene Person übertrage.
                    </p>
                  </>
                )}

                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <Checkbox
                    checked={skipSignature}
                    onCheckedChange={(v) => setSkipSignature(!!v)}
                    id="skip-sig"
                  />
                  <label htmlFor="skip-sig" className="text-sm cursor-pointer">
                    Der Clubzettel soll nicht online unterschrieben werden
                  </label>
                </div>
              </div>
            )}

            {/* STEP 6 – Submit */}
            {step === 6 && (
              <div className="space-y-6">
                <p className="text-muted-foreground text-sm">Wohin soll der Clubzettel geschickt werden?</p>
                <div>
                  <Label>✉️ E-Mail-Adresse *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" placeholder="deine@email.de" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={acceptPrivacy}
                      onCheckedChange={(v) => setAcceptPrivacy(!!v)}
                      id="privacy"
                    />
                    <div>
                      <label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                        Ich stimme der Datenschutzerklärung zu. *
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bei unseren U18-Formular werden Deine Daten in unserer Datenbank zur Verarbeitung und Generierung des Clubzettels sowie zum Zweck der Analyse und Überprüfung der Informationen gespeichert. Du kannst der künftigen Verarbeitung der Dir betreffenden Daten nach Maßgabe des Art. 21 DSGVO jederzeit widersprechen.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={acceptNewsletter}
                      onCheckedChange={(v) => setAcceptNewsletter(!!v)}
                      id="newsletter"
                    />
                    <div>
                      <label htmlFor="newsletter" className="text-sm cursor-pointer">
                        Ich stimme zu bspw. über neue Partys in meiner Stadt informiert zu werden.
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bei unseren Newslettern werden Deine Daten in unserer Datenbank zum Zweck der Analyse und zum Versand gespeichert. Du kannst der künftigen Verarbeitung der Dir betreffenden Daten nach Maßgabe des Art. 21 DSGVO jederzeit widersprechen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              {step > 1 ? (
                <Button variant="outline" onClick={prev} className="font-display tracking-wider gap-1">
                  <ChevronLeft size={16} />
                  ZURÜCK
                </Button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <Button onClick={next} className="font-display tracking-wider gap-1">
                  WEITER
                  <ChevronRight size={16} />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="font-display tracking-wider">
                  {submitting ? "WIRD GESENDET..." : "CLUBZETTEL ERHALTEN"}
                </Button>
              )}
            </div>

            <SecurityBadge />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default U18Page;
