import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { Mail, ArrowLeft, Check } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const ForgotPasswordPage = () => {
  const { lang } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  return (
    <section className="section-padding min-h-[80vh] flex items-center">
      <div className="container mx-auto max-w-md">
        <ScrollReveal>
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl tracking-wider text-foreground">
              PASSWORT <span className="text-gradient">VERGESSEN</span>
            </h1>
          </div>

          <div className="glass-card p-6 md:p-8">
            {sent ? (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check size={28} className="text-green-400" />
                </div>
                <h2 className="font-display text-xl tracking-wider text-foreground">
                  {lang === "de" ? "E-MAIL GESENDET" : "EMAIL SENT"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lang === "de"
                    ? "Falls ein Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen deines Passworts."
                    : "If an account with this email exists, you'll receive a password reset link."}
                </p>
                <Link to="/login" className="inline-flex items-center gap-2 text-primary text-sm hover:underline">
                  <ArrowLeft size={14} /> {lang === "de" ? "Zurück zum Login" : "Back to login"}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-sm text-muted-foreground text-center">
                  {lang === "de"
                    ? "Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts."
                    : "Enter your email and we'll send you a password reset link."}
                </p>

                {error && (
                  <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email" className="text-sm font-medium text-foreground mb-1.5 block">E-Mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="deine@email.de"
                      className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting
                    ? (lang === "de" ? "WIRD GESENDET..." : "SENDING...")
                    : (lang === "de" ? "LINK SENDEN" : "SEND LINK")}
                </button>

                <Link to="/login" className="flex items-center gap-2 justify-center text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={14} /> {lang === "de" ? "Zurück zum Login" : "Back to login"}
                </Link>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;
