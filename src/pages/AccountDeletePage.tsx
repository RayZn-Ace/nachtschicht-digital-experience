import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import {
  AlertTriangle, ArrowLeft, Trash2, Shield, Lock, Check,
} from "lucide-react";

const AccountDeletePage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const de = lang === "de";

  const [step, setStep] = useState<"info" | "confirm">("info");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (authLoading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleDelete = async () => {
    setError("");
    setSubmitting(true);

    // Re-authenticate with password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });
    if (authErr) {
      setError(de ? "Falsches Passwort. Bitte versuche es erneut." : "Wrong password. Please try again.");
      setSubmitting(false);
      return;
    }

    // Call edge function
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("delete-account", {
      body: { reason: reason || null },
    });

    if (res.error) {
      setError(de ? "Account-Löschung fehlgeschlagen. Bitte kontaktiere den Support." : "Account deletion failed. Please contact support.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);

    // Sign out after short delay
    setTimeout(async () => {
      await signOut();
      navigate("/");
    }, 3000);
  };

  if (done) {
    return (
      <section className="section-padding min-h-[80vh] flex items-center">
        <div className="container mx-auto max-w-md">
          <ScrollReveal>
            <div className="glass-card p-8 text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-400" />
              </div>
              <h1 className="font-display text-3xl tracking-wider text-foreground mb-3">
                {de ? "ACCOUNT GELÖSCHT" : "ACCOUNT DELETED"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {de
                  ? "Dein Account wurde gelöscht. Du wirst zur Startseite weitergeleitet..."
                  : "Your account has been deleted. Redirecting to homepage..."}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-lg">
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground">
              ACCOUNT <span className="text-gradient">{de ? "LÖSCHEN" : "DELETE"}</span>
            </h1>
          </div>
          <div className="w-20 h-1 bg-destructive mt-2 mb-8 rounded-full" />
        </ScrollReveal>

        {step === "info" && (
          <ScrollReveal delay={0.1}>
            <div className="glass-card p-6 md:p-8 space-y-5">
              {/* Warning */}
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <AlertTriangle size={20} className="text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-medium text-sm">
                    {de ? "Achtung: Diese Aktion kann nicht rückgängig gemacht werden!" : "Warning: This action cannot be undone!"}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {de
                      ? "Wenn du deinen Account löschst, kannst du dich nicht mehr einloggen und verlierst den Zugriff auf dein Profil."
                      : "If you delete your account, you will no longer be able to log in or access your profile."}
                  </p>
                </div>
              </div>

              {/* What stays */}
              <div className="flex items-start gap-3 bg-muted/50 p-4 rounded-lg">
                <Shield size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-medium text-sm">
                    {de ? "Was passiert mit deinen Daten?" : "What happens with your data?"}
                  </p>
                  <ul className="text-muted-foreground text-xs mt-2 space-y-1">
                    <li>✓ {de ? "Persönliche Daten werden DSGVO-konform anonymisiert" : "Personal data is anonymized (GDPR compliant)"}</li>
                    <li>✓ {de ? "Bestellungen und Tickets bleiben für steuerliche Zwecke erhalten" : "Orders and tickets are retained for tax purposes"}</li>
                    <li>✓ {de ? "Rechnungen bleiben unverändert archiviert" : "Invoices remain archived unchanged"}</li>
                    <li>{"✓ "}{de ? 'Dein Name wird durch "Gelöschter Nutzer" ersetzt' : "Your name will be replaced with 'Deleted User'"}</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setStep("confirm")}
                className="w-full py-3 bg-destructive text-destructive-foreground font-display text-lg tracking-wider rounded-lg hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} /> {de ? "ACCOUNT LÖSCHEN" : "DELETE ACCOUNT"}
              </button>

              <Link
                to="/dashboard"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {de ? "Abbrechen und zurück zum Dashboard" : "Cancel and return to dashboard"}
              </Link>
            </div>
          </ScrollReveal>
        )}

        {step === "confirm" && (
          <ScrollReveal delay={0.1}>
            <div className="glass-card p-6 md:p-8 space-y-5">
              <h2 className="font-display text-xl tracking-wider text-foreground text-center">
                {de ? "SICHERHEITSABFRAGE" : "SECURITY CHECK"}
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                {de
                  ? "Bitte gib dein Passwort ein, um die Löschung zu bestätigen."
                  : "Please enter your password to confirm deletion."}
              </p>

              {error && (
                <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg" role="alert">
                  {error}
                </div>
              )}

              {/* Password */}
              <div>
                <label htmlFor="del-pw" className="text-sm font-medium text-foreground mb-1.5 block">
                  {de ? "Passwort *" : "Password *"}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="del-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-destructive focus:outline-none"
                  />
                </div>
              </div>

              {/* Optional reason */}
              <div>
                <label htmlFor="del-reason" className="text-sm font-medium text-foreground mb-1.5 block">
                  {de ? "Löschgrund (optional)" : "Reason for leaving (optional)"}
                </label>
                <textarea
                  id="del-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-destructive focus:outline-none resize-none"
                  placeholder={de ? "Warum möchtest du deinen Account löschen?" : "Why do you want to delete your account?"}
                />
              </div>

              <button
                onClick={handleDelete}
                disabled={!password || submitting}
                className="w-full py-3 bg-destructive text-destructive-foreground font-display text-lg tracking-wider rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="animate-pulse">{de ? "WIRD GELÖSCHT..." : "DELETING..."}</span>
                ) : (
                  <>
                    <Trash2 size={18} /> {de ? "ENDGÜLTIG LÖSCHEN" : "DELETE PERMANENTLY"}
                  </>
                )}
              </button>

              <button
                onClick={() => setStep("info")}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {de ? "Zurück" : "Back"}
              </button>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
};

export default AccountDeletePage;
