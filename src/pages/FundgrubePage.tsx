import { useState } from "react";
import { Search, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { value: "ausweis", label: "Ausweis" },
  { value: "schmuck", label: "Schmuck" },
  { value: "handy", label: "Handy" },
  { value: "sonstiges", label: "Sonstiges" },
];

const FundgrubePage = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  usePageSEO({
    title: "Fundgrube – Nachtschicht Kaiserslautern | Verlorene Gegenstände",
    description: "Du hast etwas in der Nachtschicht verloren? Melde deinen verlorenen Gegenstand über unser Formular und wir helfen dir bei der Suche.",
    canonical: "/fundgrube",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || !eventDate || !category) {
      toast.error("Bitte fülle alle Pflichtfelder aus.");
      return;
    }

    setSending(true);
    const { error } = await supabase.from("lost_and_found").insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      event_date: eventDate,
      category,
      description: description.trim() || null,
    });

    setSending(false);

    if (error) {
      toast.error("Fehler beim Absenden. Bitte versuche es erneut.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <section className="section-padding min-h-screen">
      <div className="container mx-auto max-w-xl">
        <ScrollReveal>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Search className="text-primary" size={28} />
              <h1 className="font-display text-3xl md:text-5xl tracking-wider text-foreground">
                FUND<span className="text-gradient">GRUBE</span>
              </h1>
            </div>
            <p className="text-muted-foreground mt-2">
              👉 Du hast etwas auf einem Event verloren?
            </p>
            <p className="text-muted-foreground text-sm">
              Fülle das folgende Formular aus und wir melden uns bei dir!
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          {submitted ? (
            <div className="glass-card p-8 rounded-xl text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="font-display text-2xl tracking-wider text-foreground">ANFRAGE GESENDET</h2>
              <p className="text-muted-foreground">
                Vielen Dank! Wir haben deine Anfrage erhalten und melden uns schnellstmöglich bei dir.
              </p>
              <Button variant="outline" onClick={() => setSubmitted(false)} className="mt-4">
                Weitere Anfrage stellen
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4 glass-card p-6 rounded-xl">
            {/* Date */}
            <div>
              <Label htmlFor="eventDate" className="text-sm text-foreground">Datum des Events *</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 bg-muted border-border w-[180px]"
                required
              />
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm text-foreground mb-2 block">Kategorie auswählen *</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      category === cat.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm text-foreground">Beschreibung (optional)</Label>
              <Input
                id="description"
                placeholder="z.B. Schwarze Lederjacke, linke Innentasche hat Riss..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 bg-muted border-border"
              />
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-sm text-foreground">Vorname *</Label>
                <Input
                  id="firstName"
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 bg-muted border-border"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm text-foreground">Nachname *</Label>
                <Input
                  id="lastName"
                  placeholder="Mustermann"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 bg-muted border-border"
                  required
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <Label htmlFor="phone" className="text-sm text-foreground">Deine Handynummer *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+49 123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 bg-muted border-border"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm text-foreground">Deine E-Mail-Adresse *</Label>
              <Input
                id="email"
                type="email"
                placeholder="max@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-muted border-border"
                required
              />
            </div>

            <Button type="submit" disabled={sending} className="w-full">
              {sending ? <Loader2 className="animate-spin mr-2" size={18} /> : <Send size={18} className="mr-2" />}
              ABSENDEN
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Mit dem Absenden bestätigst du, dass du bezüglich dieser Anfrage kontaktiert werden darfst. Es gelten unsere{" "}
              <Link to="/datenschutz" className="underline hover:text-primary">Datenschutzbestimmungen</Link>.
            </p>
          </form>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FundgrubePage;
