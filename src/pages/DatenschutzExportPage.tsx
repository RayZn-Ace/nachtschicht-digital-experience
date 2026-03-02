import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { Navigate, Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import { Download, ArrowLeft, Shield, Check, FileText } from "lucide-react";

const DatenschutzExportPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useI18n();
  const de = lang === "de";
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  if (authLoading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleExport = async () => {
    setExporting(true);

    // Fetch all user data
    const [profileRes, ticketsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("tickets").select("id, quantity, total_price, status, created_at, buyer_name, buyer_email, event_id").eq("user_id", user.id),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      profile: profileRes.data || null,
      tickets: ticketsRes.data || [],
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datenexport-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExported(true);
    setExporting(false);
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-lg">
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground">
              DATEN <span className="text-gradient">{de ? "EXPORT" : "EXPORT"}</span>
            </h1>
          </div>
          <div className="w-20 h-1 bg-primary mt-2 mb-8 rounded-full" />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="glass-card p-6 md:p-8 space-y-5">
            <div className="flex items-start gap-3 bg-muted/50 p-4 rounded-lg">
              <Shield size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground font-medium text-sm">
                  {de ? "Dein Recht auf Datenauskunft (Art. 15 DSGVO)" : "Your right to data access (Art. 15 GDPR)"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {de
                    ? "Du kannst jederzeit eine Kopie deiner bei uns gespeicherten Daten herunterladen. Der Export enthält deine Profildaten, Bestellungen und Tickets."
                    : "You can download a copy of your stored data at any time. The export contains your profile data, orders and tickets."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">{de ? "Enthaltene Daten:" : "Included data:"}</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2"><FileText size={12} className="text-primary" /> {de ? "Profildaten (Name, E-Mail, Geburtsdatum)" : "Profile data (name, email, date of birth)"}</li>
                <li className="flex items-center gap-2"><FileText size={12} className="text-primary" /> {de ? "Bestellungen und Tickets" : "Orders and tickets"}</li>
                <li className="flex items-center gap-2"><FileText size={12} className="text-primary" /> {de ? "Einwilligungen und Zeitstempel" : "Consents and timestamps"}</li>
              </ul>
            </div>

            {exported && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 animate-fade-in">
                <Check size={16} /> {de ? "Export erfolgreich heruntergeladen!" : "Export downloaded successfully!"}
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <span className="animate-pulse">{de ? "WIRD EXPORTIERT..." : "EXPORTING..."}</span>
              ) : (
                <>
                  <Download size={18} /> {de ? "DATEN EXPORTIEREN" : "EXPORT DATA"}
                </>
              )}
            </button>

            <p className="text-[10px] text-muted-foreground text-center">
              {de
                ? "Der Export wird als JSON-Datei heruntergeladen und enthält keine Passwörter oder Zahlungsdaten."
                : "The export is downloaded as a JSON file and does not contain passwords or payment data."}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DatenschutzExportPage;
