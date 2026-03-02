import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { Lock, Eye, EyeOff, Check } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const ResetPasswordPage = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check for recovery session in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValidSession(true);
    }
    // Also check current session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError(lang === "de" ? "Passwörter stimmen nicht überein." : "Passwords don't match.");
      return;
    }

    if (password.length < 6) {
      setError(lang === "de" ? "Mindestens 6 Zeichen erforderlich." : "Minimum 6 characters required.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    }
    setSubmitting(false);
  };

  if (!validSession) {
    return (
      <section className="section-padding min-h-[80vh] flex items-center">
        <div className="container mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl tracking-wider text-foreground mb-4">
            {lang === "de" ? "UNGÜLTIGER LINK" : "INVALID LINK"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {lang === "de"
              ? "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an."
              : "This link is invalid or expired. Please request a new one."}
          </p>
          <Link to="/passwort-vergessen" className="text-primary hover:underline">
            {lang === "de" ? "Neuen Link anfordern" : "Request new link"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding min-h-[80vh] flex items-center">
      <div className="container mx-auto max-w-md">
        <ScrollReveal>
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl tracking-wider text-foreground">
              NEUES <span className="text-gradient">PASSWORT</span>
            </h1>
          </div>

          <div className="glass-card p-6 md:p-8">
            {success ? (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check size={28} className="text-green-400" />
                </div>
                <h2 className="font-display text-xl tracking-wider text-foreground">
                  {lang === "de" ? "PASSWORT GEÄNDERT" : "PASSWORD CHANGED"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lang === "de"
                    ? "Du wirst gleich zum Login weitergeleitet..."
                    : "Redirecting to login..."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="new-pw" className="text-sm font-medium text-foreground mb-1.5 block">
                    {lang === "de" ? "Neues Passwort" : "New password"}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="new-pw"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-pw2" className="text-sm font-medium text-foreground mb-1.5 block">
                    {lang === "de" ? "Passwort bestätigen" : "Confirm password"}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="new-pw2"
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-4 py-3 bg-muted border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none ${
                        passwordConfirm && password !== passwordConfirm ? "border-destructive" : "border-border"
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting
                    ? (lang === "de" ? "WIRD GESPEICHERT..." : "SAVING...")
                    : (lang === "de" ? "PASSWORT ÄNDERN" : "CHANGE PASSWORD")}
                </button>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ResetPasswordPage;
