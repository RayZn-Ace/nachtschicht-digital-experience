import { useState } from "react";
import { toast } from "sonner";

const JobsPage = () => {
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Bitte stimme der Datenschutzerklärung zu.");
      return;
    }
    toast.success("Bewerbung erfolgreich gesendet! Wir melden uns bei dir.");
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
            JOBS & <span className="text-gradient">KARRIERE</span>
          </h1>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          <p className="text-muted-foreground mt-4">
            Werde Teil des Nachtschicht-Teams! Du musst mindestens 18 Jahre alt sein, um dich zu bewerben.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm text-foreground mb-1 block">Vorname *</label>
              <input type="text" required className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Nachname *</label>
              <input type="text" required className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm text-foreground mb-1 block">Alter *</label>
              <input type="number" min={18} required className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Bereich *</label>
              <select required className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="">Bitte wählen</option>
                <option value="service">Servicekraft (Runner)</option>
                <option value="bar">Barkraft</option>
                <option value="security">Security</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">E-Mail *</label>
            <input type="email" required className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Telefon *</label>
            <input type="tel" required className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Bewerbungsfoto</label>
            <input type="file" accept="image/*" className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm file:mr-3 file:bg-primary file:text-primary-foreground file:border-0 file:rounded file:px-3 file:py-1 file:text-sm file:cursor-pointer" />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Freitext / Nachricht</label>
            <textarea rows={4} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
            <span className="text-xs text-muted-foreground">
              Ich stimme der <a href="/datenschutz" className="text-primary underline">Datenschutzerklärung</a> zu und willige in die Verarbeitung meiner Daten ein. *
            </span>
          </label>
          <button
            type="submit"
            className="w-full py-4 bg-primary text-primary-foreground font-display text-xl tracking-wider rounded-md hover:bg-primary/90 transition-colors glow-red"
          >
            JETZT BEWERBEN
          </button>
        </form>
      </div>
    </section>
  );
};

export default JobsPage;
