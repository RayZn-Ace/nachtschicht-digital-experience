const ImpressumPage = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-3xl">
      <h1 className="font-display text-4xl md:text-6xl tracking-wider text-foreground mb-8">
        <span className="text-gradient">IMPRESSUM</span>
      </h1>
      <div className="prose-sm text-muted-foreground space-y-6 leading-relaxed">
        <h2 className="font-display text-xl text-foreground">Angaben gemäß § 5 TMG</h2>
        <p>
          Nachtschicht Kaiserslautern<br />
          Zollamtstraße 28<br />
          67663 Kaiserslautern
        </p>

        <h2 className="font-display text-xl text-foreground">Kontakt</h2>
        <p>
          Telefon: +49 631 3105759<br />
          E-Mail: info@nachtschicht-kaiserslautern.de
        </p>

        <h2 className="font-display text-xl text-foreground">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Nachtschicht Kaiserslautern<br />
          Zollamtstraße 28<br />
          67663 Kaiserslautern
        </p>

        <h2 className="font-display text-xl text-foreground">Haftungsausschluss</h2>
        <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>

        <h2 className="font-display text-xl text-foreground">Urheberrecht</h2>
        <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung.</p>
      </div>
    </div>
  </section>
);

export default ImpressumPage;
