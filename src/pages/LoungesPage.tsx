import { Link } from "react-router-dom";

const LoungesPage = () => (
  <section className="section-padding">
    <div className="container mx-auto">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
          VIP <span className="text-gradient">LOUNGES</span>
        </h1>
        <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Feiere deinen besonderen Anlass in einer unserer exklusiven VIP Lounges. Perfekt für Geburtstage, JGA oder einfach eine Nacht mit Freunden auf höchstem Niveau.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {[
          { name: "VIP LOUNGE CLASSIC", guests: "Bis zu 10 Personen", desc: "Gemütliche Lounge mit eigenem Tisch, Bottle Service und direktem Zugang zur Tanzfläche." },
          { name: "VIP LOUNGE PREMIUM", guests: "Bis zu 20 Personen", desc: "Großzügige Premium-Lounge mit exklusivem Service, privatem Bereich und bestem Blick auf die Bühne." },
        ].map((lounge) => (
          <div key={lounge.name} className="glass-card p-6 hover-lift">
            <h2 className="font-display text-2xl tracking-wider text-foreground mb-2">{lounge.name}</h2>
            <p className="text-primary text-sm font-medium mb-3">{lounge.guests}</p>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{lounge.desc}</p>
            <Link
              to="/reservierung"
              className="inline-flex items-center justify-center w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors"
            >
              JETZT RESERVIEREN
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default LoungesPage;
