import { useState, useEffect, useCallback } from "react";
import { grantConsent } from "@/hooks/useTracking";
import { useI18n } from "@/hooks/useI18n";
import { Settings, Shield } from "lucide-react";
import { isIosNativeApp } from "@/lib/native";
import { getNativeTrackingStatus, requestNativeTrackingPermission } from "@/lib/appTrackingTransparency";

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = "cookie-consent-v2";

const getStoredConsent = (): ConsentState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const CookieConsent = () => {
  const { lang } = useI18n();
  const de = lang === "de";
  const nativeIos = isIosNativeApp();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    essential: true,
    analytics: false,
    marketing: false,
    timestamp: "",
  });

  useEffect(() => {
    const initConsent = async () => {
      const stored = getStoredConsent();
      if (!stored) {
        setVisible(true);
        return;
      }

      setConsent(stored);

      if (stored.analytics || stored.marketing) {
        if (nativeIos) {
          const status = await getNativeTrackingStatus();
          if (status === "authorized") grantConsent();
          else setVisible(true);
        } else {
          grantConsent();
        }
      }
    };

    void initConsent();
  }, []);

  const save = useCallback((state: ConsentState) => {
    const withTime = { ...state, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTime));
    setConsent(withTime);
    const finalize = async () => {
      if (state.analytics || state.marketing) {
        if (nativeIos) {
          const status = await requestNativeTrackingPermission();
          if (status === "authorized") {
            grantConsent();
            setVisible(false);
            return;
          }
          const fallbackState = { ...withTime, analytics: false, marketing: false };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackState));
          setConsent(fallbackState);
          setVisible(false);
          return;
        }

        grantConsent();
      }

      setVisible(false);
    };

    void finalize();
  }, [nativeIos]);

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true, timestamp: "" });
  const acceptEssential = () => save({ essential: true, analytics: false, marketing: false, timestamp: "" });
  const saveCustom = () => save(consent);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] bg-card/95 backdrop-blur-xl border-t border-border p-4 md:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={de ? "Cookie-Einstellungen" : "Cookie settings"}
    >
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-start gap-3 mb-4">
          <Shield size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="text-foreground font-medium text-sm">
              {de ? "Datenschutz & Cookie-Einstellungen" : "Privacy & Cookie Settings"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {de
                ? "Wir respektieren deine Privatsphäre. Wähle, welche Cookies du zulassen möchtest. Nur notwendige Cookies sind vorausgewählt."
                : "We respect your privacy. Choose which cookies you'd like to allow. Only essential cookies are pre-selected."}
              {" "}
              <a href="/datenschutz" className="underline hover:text-primary transition-colors">
                {de ? "Datenschutzerklärung" : "Privacy Policy"}
              </a>
            </p>
          </div>
        </div>

        {/* Granular options */}
        {showDetails && (
          <div className="space-y-3 mb-4 p-4 bg-muted/50 rounded-lg" role="group" aria-label={de ? "Cookie-Kategorien" : "Cookie categories"}>
            {/* Essential - always on */}
            <label className="flex items-center gap-3 cursor-not-allowed opacity-70">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="accent-primary w-4 h-4"
                aria-label={de ? "Notwendige Cookies (immer aktiv)" : "Essential cookies (always active)"}
              />
              <div>
                <p className="text-sm text-foreground font-medium">
                  {de ? "Notwendige Cookies" : "Essential Cookies"}
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase">{de ? "(immer aktiv)" : "(always active)"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {de ? "Erforderlich für Grundfunktionen wie Login, Warenkorb und Sicherheit." : "Required for basic functionality like login, cart and security."}
                </p>
              </div>
            </label>

            {/* Analytics */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent.analytics}
                onChange={(e) => setConsent((c) => ({ ...c, analytics: e.target.checked }))}
                className="accent-primary w-4 h-4"
                aria-label={de ? "Analyse-Cookies" : "Analytics cookies"}
              />
              <div>
                <p className="text-sm text-foreground font-medium">{de ? "Analyse & Statistiken" : "Analytics & Statistics"}</p>
                <p className="text-xs text-muted-foreground">
                  {de ? "Helfen uns zu verstehen, wie Besucher unsere Website nutzen (z.B. Google Analytics)." : "Help us understand how visitors use our site (e.g. Google Analytics)."}
                </p>
              </div>
            </label>

            {/* Marketing */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent.marketing}
                onChange={(e) => setConsent((c) => ({ ...c, marketing: e.target.checked }))}
                className="accent-primary w-4 h-4"
                aria-label={de ? "Marketing-Cookies" : "Marketing cookies"}
              />
              <div>
                <p className="text-sm text-foreground font-medium">{de ? "Marketing & Werbung" : "Marketing & Advertising"}</p>
                <p className="text-xs text-muted-foreground">
                  {de ? "Ermöglichen personalisierte Werbung und Retargeting (z.B. Meta Pixel, TikTok)." : "Enable personalized ads and retargeting (e.g. Meta Pixel, TikTok)."}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-expanded={showDetails}
          >
            <Settings size={14} />
            {showDetails
              ? (de ? "Weniger anzeigen" : "Show less")
              : (de ? "Einstellungen anpassen" : "Customize settings")}
          </button>

          {showDetails && (
            <button
              onClick={saveCustom}
              className="px-4 py-2.5 text-xs border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors font-medium"
            >
              {de ? "Auswahl speichern" : "Save selection"}
            </button>
          )}

          <div className="sm:ml-auto flex gap-2">
            <button
              onClick={acceptEssential}
              className="px-4 py-2.5 text-xs border border-border rounded-md text-foreground hover:bg-muted transition-colors"
            >
              {de ? "Nur notwendige" : "Essential only"}
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              {de ? "Alle akzeptieren" : "Accept all"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
