import { useState } from "react";
import { MapPin, Phone, Mail, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { usePageSEO } from "@/hooks/usePageSEO";

const ContactPage = () => {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  usePageSEO({
    title: "Kontakt – Nachtschicht Kaiserslautern | Anfahrt & Adresse",
    description: "Kontaktiere die Nachtschicht Kaiserslautern: Zollamtstraße 28, 67663 Kaiserslautern. Tel. +49 631 3105759. Schreib uns eine Nachricht oder komm vorbei!",
    canonical: "/kontakt",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Kontakt Nachtschicht Kaiserslautern",
      "url": "https://nachtschicht-kaiserslautern.de/kontakt",
      "mainEntity": {
        "@type": "NightClub",
        "name": "Nachtschicht Kaiserslautern",
        "telephone": "+49 631 3105759",
        "email": "info@nachtschicht-kaiserslautern.de",
        "address": { "@type": "PostalAddress", "streetAddress": "Zollamtstraße 28", "addressLocality": "Kaiserslautern", "postalCode": "67663", "addressCountry": "DE" }
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t("contact.fillAll"));
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: { name, email, subject, message },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t("contact.success"));
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err: any) {
      console.error("Contact email error:", err);
      toast.error(t("contact.error"));
    }
    setSending(false);
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-4xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              <span className="text-gradient">{t("contact.title")}</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: <MapPin className="text-primary" size={28} />, title: t("contact.address"), text: "Zollamtstraße 28\n67663 Kaiserslautern" },
            { icon: <Phone className="text-primary" size={28} />, title: t("contact.phone"), text: "+49 631 3105759" },
            { icon: <Mail className="text-primary" size={28} />, title: t("contact.email"), text: "info@nachtschicht-kaiserslautern.de" },
          ].map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.12}>
              <address className="glass-card p-6 text-center hover-lift not-italic">
                <div className="flex justify-center mb-3">{item.icon}</div>
                <h2 className="font-display text-xl tracking-wider text-foreground mb-2">{item.title}</h2>
                <p className="text-muted-foreground text-sm whitespace-pre-line">{item.text}</p>
              </address>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.15}>
          <div className="glass-card p-6 md:p-8 mb-12">
            <h2 className="font-display text-2xl tracking-wider text-foreground mb-6">{t("contact.writeUs")}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("contact.name")} *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" placeholder={t("contact.namePlaceholder")} />
                </div>
                <div>
                  <Label>{t("contact.email")} *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" placeholder="deine@email.de" />
                </div>
              </div>
              <div>
                <Label>{t("contact.subject")}</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-secondary border-border" placeholder={t("contact.subjectPlaceholder")} />
              </div>
              <div>
                <Label>{t("contact.message")} *</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="bg-secondary border-border min-h-[120px]" placeholder={t("contact.messagePlaceholder")} />
              </div>
              <Button type="submit" disabled={sending} className="font-display tracking-wider gap-2">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t("contact.send")}
              </Button>
            </form>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="rounded-xl overflow-hidden border border-border/50 aspect-video">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2587.5!2d7.768!3d49.444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4796320c3b0c9c5f%3A0x0!2sZollamtstra%C3%9Fe+28%2C+67663+Kaiserslautern!5e0!3m2!1sde!2sde!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Standort Nachtschicht Kaiserslautern – Zollamtstraße 28, Kaiserslautern"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ContactPage;
