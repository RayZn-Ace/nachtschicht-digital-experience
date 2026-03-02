import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const JOB_OPTIONS = [
  { id: "theke", label: "🪩 Theke / Barkeeper / Cocktailkeeper" },
  { id: "lager", label: "📦 Lagermitarbeiter" },
  { id: "kasse", label: "💼 Kasse / Infobüro" },
  { id: "garderobe", label: "🧦 Garderobe" },
  { id: "lightjockey", label: "💡 Lightjockey" },
  { id: "runner", label: "💰 Runner" },
  { id: "fotograf", label: "💬 Fotograf / Videograf" },
];

const JobsPage = () => {
  const [agreed, setAgreed] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedJobs.length === 0) {
      toast.error("Bitte wähle mindestens einen Job aus.");
      return;
    }
    if (!agreed) {
      toast.error("Bitte stimme der Datenschutzerklärung zu.");
      return;
    }

    setSubmitting(true);

    let photoUrl: string | null = null;

    // Upload photo if provided
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `applicants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true });
      if (uploadErr) {
        console.error("Photo upload error:", uploadErr);
      } else {
        photoUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
      }
    }

    const { error } = await supabase.from("job_applications").insert({
      first_name: firstName,
      last_name: lastName,
      age: Number(age),
      email,
      phone,
      positions: selectedJobs,
      photo_url: photoUrl,
      message: message || null,
    } as any);

    if (error) {
      console.error("Application error:", error);
      toast.error("Bewerbung konnte nicht gesendet werden. Bitte versuche es erneut.");
    } else {
      toast.success("Bewerbung erfolgreich gesendet! Wir melden uns bei dir. 🎉");
      // Reset
      setFirstName("");
      setLastName("");
      setAge("");
      setEmail("");
      setPhone("");
      setMessage("");
      setPhotoFile(null);
      setSelectedJobs([]);
      setAgreed(false);
    }
    setSubmitting(false);
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-2xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              JOBS & <span className="text-gradient">KARRIERE</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            <p className="text-muted-foreground mt-4">
              Werde Teil des Nachtschicht-Teams! Du musst mindestens 18 Jahre alt sein, um dich zu bewerben.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm text-foreground mb-1 block">Vorname *</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">Nachname *</label>
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm text-foreground mb-1 block">Alter *</label>
                <input type="number" min={18} required value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-2 block">Welcher Job interessiert dich? *</label>
                <div className="space-y-2">
                  {JOB_OPTIONS.map((job) => (
                    <label key={job.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox
                        checked={selectedJobs.includes(job.id)}
                        onCheckedChange={(checked) => {
                          setSelectedJobs((prev) =>
                            checked ? [...prev, job.id] : prev.filter((j) => j !== job.id)
                          );
                        }}
                      />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{job.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">E-Mail *</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Telefon *</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Bewerbungsfoto</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm file:mr-3 file:bg-primary file:text-primary-foreground file:border-0 file:rounded file:px-3 file:py-1 file:text-sm file:cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Freitext / Nachricht</label>
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
              <span className="text-xs text-muted-foreground">
                Ich stimme der <a href="/datenschutz" className="text-primary underline">Datenschutzerklärung</a> zu und willige in die Verarbeitung meiner Daten ein. *
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-primary-foreground font-display text-xl tracking-wider rounded-md hover:bg-primary/90 transition-colors glow-red disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={20} className="animate-spin" />}
              {submitting ? "WIRD GESENDET..." : "JETZT BEWERBEN"}
            </button>
          </form>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default JobsPage;
