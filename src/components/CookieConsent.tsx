import { useState, useEffect } from "react";
import { grantConsent } from "@/hooks/useTracking";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
    else if (consent === "all") grantConsent();
  }, []);

  const accept = (type: string) => {
    localStorage.setItem("cookie-consent", type);
    if (type === "all") grantConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-secondary/95 backdrop-blur-xl border-t border-border/50 p-4 md:p-6 animate-fade-in">
      <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium mb-1">🍪 Cookie-Einstellungen</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Wir verwenden Cookies, um dir das beste Erlebnis auf unserer Website zu bieten. Einige sind notwendig, andere helfen uns, die Website zu verbessern.{" "}
            <a href="/datenschutz" className="underline hover:text-primary transition-colors">Mehr erfahren</a>
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => accept("essential")}
            className="px-4 py-2 text-sm border border-border rounded-md text-foreground hover:bg-muted transition-colors"
          >
            Nur notwendige
          </button>
          <button
            onClick={() => accept("all")}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
