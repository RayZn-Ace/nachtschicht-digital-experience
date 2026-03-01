import { MapPin, Phone, Mail } from "lucide-react";

const ContactPage = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
          <span className="text-gradient">KONTAKT</span>
        </h1>
        <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: <MapPin className="text-primary" size={28} />, title: "ADRESSE", text: "Zollamtstraße 28\n67663 Kaiserslautern" },
          { icon: <Phone className="text-primary" size={28} />, title: "TELEFON", text: "+49 631 3105759" },
          { icon: <Mail className="text-primary" size={28} />, title: "E-MAIL", text: "info@nachtschicht-kaiserslautern.de" },
        ].map((item) => (
          <div key={item.title} className="glass-card p-6 text-center hover-lift">
            <div className="flex justify-center mb-3">{item.icon}</div>
            <h2 className="font-display text-xl tracking-wider text-foreground mb-2">{item.title}</h2>
            <p className="text-muted-foreground text-sm whitespace-pre-line">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border border-border/50 aspect-video">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2587.5!2d7.768!3d49.444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4796320c3b0c9c5f%3A0x0!2sZollamtstra%C3%9Fe+28%2C+67663+Kaiserslautern!5e0!3m2!1sde!2sde!4v1"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          title="Standort Nachtschicht"
        />
      </div>
    </div>
  </section>
);

export default ContactPage;
