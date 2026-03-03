import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { X, Users, Clock, Shield, ShieldCheck, ChevronRight, ChevronLeft, Check, AlertTriangle, Wine } from "lucide-react";
import type { Event } from "@/types/database";

interface Lounge {
  id: string;
  name: string;
  area_id: string;
  capacity: number;
  min_spend: number;
  price_per_person: number;
  image_url: string | null;
  description: string | null;
}

interface Props {
  lounge: Lounge;
  event: Event;
  onClose: () => void;
  onSuccess: () => void;
}

const DEPOSIT_AMOUNT = 50;
const SERVICE_FEE_PERCENT = 0.0425;

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let h = 22; h <= 25; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h >= 24 ? h - 24 : h;
      const label = `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push(label);
      if (h === 25 && m === 30) break;
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const STEPS = [
  { label: "Gäste", icon: Users },
  { label: "Ankunft", icon: Clock },
  { label: "Übersicht", icon: Wine },
  { label: "Kontakt", icon: Shield },
  { label: "Hinweise", icon: ShieldCheck },
  { label: "Abschluss", icon: Check },
];

const LoungeReservationWizard = ({ lounge, event, onClose, onSuccess }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Guests
  const [guests, setGuests] = useState(2);

  // Step 2: Arrival
  const [arrivalTime, setArrivalTime] = useState("");

  // Step 3: Booking type
  const [bookingType, setBookingType] = useState<"guaranteed" | "non_binding">("guaranteed");

  // Step 4: Contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");

  // Step 5: Notes
  const [notes, setNotes] = useState("");

  // Step 6: Legal
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  // Pricing
  const minSpend = lounge.min_spend;
  const serviceFee = bookingType === "guaranteed" ? +(DEPOSIT_AMOUNT * SERVICE_FEE_PERCENT).toFixed(2) : 0;
  const totalDeposit = bookingType === "guaranteed" ? DEPOSIT_AMOUNT + serviceFee : 0;

  const canNext = () => {
    switch (step) {
      case 0: return guests >= 1 && guests <= lounge.capacity;
      case 1: return arrivalTime !== "";
      case 2: return true;
      case 3: return name.trim() && email.trim();
      case 4: return true;
      case 5: return agreedTerms;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!agreedTerms) return;
    setSubmitting(true);

    const { error } = await supabase.from("lounge_bookings").insert({
      lounge_id: lounge.id,
      event_id: event.id,
      user_name: name.trim(),
      user_email: email.trim(),
      user_phone: phone.trim() || null,
      guest_count: guests,
      message: notes.trim() || null,
      arrival_time: arrivalTime,
      booking_type: bookingType,
      deposit_amount: bookingType === "guaranteed" ? DEPOSIT_AMOUNT : 0,
      deposit_paid: false,
      notes: notes.trim() || null,
      user_id: user?.id || null,
      agreed_terms: true,
      status: "pending",
    } as any);

    if (error) {
      if (error.code === "23505") {
        toast.error("Diese Lounge ist für dieses Event bereits reserviert.");
      } else {
        toast.error("Fehler: " + error.message);
      }
    } else {
      toast.success(
        bookingType === "guaranteed"
          ? "Garantierte Reservierung gesendet! 🎉 Bitte bezahle die Anzahlung."
          : "Unverbindliche Reservierung gesendet! 🎉 Wir melden uns bei dir."
      );
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card w-full sm:max-w-lg max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl tracking-wider text-foreground">{lounge.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {event.title} — {new Date(event.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1" aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                  i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check size={12} /> : <s.icon size={12} />}
                </div>
                <span className={`text-[9px] ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 min-h-[260px]">
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-display text-lg tracking-wider text-foreground">Okay, los geht's…</h3>
              <p className="text-sm text-muted-foreground">Wie viele Personen seid ihr?</p>
              <div className="flex items-center gap-4 justify-center py-4">
                <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted text-lg">−</button>
                <span className="font-display text-4xl text-foreground w-16 text-center">{guests}</span>
                <button onClick={() => setGuests(Math.min(lounge.capacity, guests + 1))} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg">+</button>
              </div>
              <p className="text-xs text-muted-foreground text-center">max. {lounge.capacity} Personen</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-display text-lg tracking-wider text-foreground">Wann plant ihr ca. zu kommen?</h3>
              <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setArrivalTime(t)}
                    className={`px-2 py-2.5 text-sm rounded-md border transition-colors ${
                      arrivalTime === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-display text-lg tracking-wider text-foreground">Deine Bestellung</h3>

              {/* Order summary card */}
              <div className="border border-border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-foreground">
                  <span>{lounge.name} – {guests} Personen</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Ankunft gegen</span>
                  <span>{arrivalTime}</span>
                </div>
                <div className="flex justify-between text-foreground font-medium">
                  <span>Mindestverzehr</span>
                  <span>{minSpend.toFixed(2)} €</span>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Dieser Voucher beinhaltet {minSpend.toFixed(0)} € Freiverzehr
                </p>
              </div>

              {/* Booking type selector */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Reservierungsart:</p>
                <button
                  onClick={() => setBookingType("guaranteed")}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    bookingType === "guaranteed" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className={bookingType === "guaranteed" ? "text-primary" : "text-muted-foreground"} />
                    <span className="text-sm font-medium text-foreground">Garantierte Reservierung</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {DEPOSIT_AMOUNT} € Anzahlung · Lounge wird für dich blockiert · Betrag wird vor Ort auf Mindestverzehr angerechnet
                  </p>
                </button>

                <button
                  onClick={() => setBookingType("non_binding")}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    bookingType === "non_binding" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield size={16} className={bookingType === "non_binding" ? "text-primary" : "text-muted-foreground"} />
                    <span className="text-sm font-medium text-foreground">Unverbindliche Reservierung</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Keine Anzahlung · Nicht garantiert · Kann durch garantierte Buchung ersetzt werden
                  </p>
                </button>
              </div>

              {/* Price summary */}
              {bookingType === "guaranteed" && (
                <div className="border-t border-border pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Anzahlung</span>
                    <span>{DEPOSIT_AMOUNT.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Servicegebühr</span>
                    <span>{serviceFee.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground text-base">
                    <span>Gesamt inkl. MwSt.</span>
                    <span>{totalDeposit.toFixed(2)} €</span>
                  </div>
                </div>
              )}

              {/* Discount code */}
              <div className="flex gap-2">
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Rabattcode eingeben"
                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                />
                <button className="px-3 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-sm">
                  EINLÖSEN
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-display text-lg tracking-wider text-foreground">Kontaktdaten</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein vollständiger Name"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">E-Mail *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deine@email.de"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Telefon (optional)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 ..."
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              {user && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check size={12} className="text-primary" /> Eingeloggt als {user.email}
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-display text-lg tracking-wider text-foreground">Hinweise für uns</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Geburtstag, JGA, Dekoration, besondere Wünsche..."
                rows={5}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-display text-lg tracking-wider text-foreground">Zusammenfassung & Abschluss</h3>

              {/* Final summary */}
              <div className="border border-border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Lounge</span><span className="text-foreground">{lounge.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gäste</span><span className="text-foreground">{guests}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ankunft</span><span className="text-foreground">{arrivalTime}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Typ</span><span className="text-foreground">{bookingType === "guaranteed" ? "Garantiert (Anzahlung)" : "Unverbindlich"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mindestverzehr</span><span className="text-foreground">{minSpend.toFixed(2)} €</span></div>
                {bookingType === "guaranteed" && (
                  <div className="flex justify-between font-bold text-primary">
                    <span>Jetzt zu zahlen</span><span>{totalDeposit.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="text-foreground">{name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">E-Mail</span><span className="text-foreground">{email}</span></div>
              </div>

              {/* Legal notices */}
              <div className="space-y-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-primary shrink-0 mt-0.5" />
                  Eine Lounge-Stornierung ist bis 48 h vor Eventbeginn möglich, die Systemgebühr ist nicht erstattungsfähig.
                </p>
                <p>🚀 Die Reservierung beinhaltet automatisch den Einlass über die <strong>Fast Lane</strong>.</p>
                <p>🎫 Der Eintrittspreis ist <strong>nicht enthalten</strong>.</p>
                <p>⚠️ Einlass unter Vorbehalt. Eine Reservierung berechtigt nicht automatisch zum Einlass.</p>
              </div>

              {/* Terms checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="accent-primary w-4 h-4 mt-0.5"
                />
                <span className="text-xs text-foreground leading-relaxed">
                  Ich akzeptiere die{" "}
                  <a href="/agb" target="_blank" className="text-primary underline">AGB</a>,{" "}
                  <a href="/datenschutz" target="_blank" className="text-primary underline">Datenschutzerklärung</a>{" "}
                  und die Stornierungsbedingungen. *
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-5 border-t border-border flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-4 py-2.5 border border-border text-foreground rounded-md hover:bg-muted transition-colors text-sm"
            >
              <ChevronLeft size={16} /> Zurück
            </button>
          )}
          <div className="flex-1" />
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1 px-6 py-2.5 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              Weiter <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !agreedTerms}
              className="flex items-center gap-1 px-6 py-2.5 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? "WIRD GESENDET..." : bookingType === "guaranteed" ? `JETZT BUCHEN (${totalDeposit.toFixed(2)} €)` : "UNVERBINDLICH RESERVIEREN"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoungeReservationWizard;
