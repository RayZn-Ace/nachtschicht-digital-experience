import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const LoginPage = () => {
  const { user, isAdmin, signIn, loading } = useAuth();
  const { lang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: err } = await signIn(email, password);
    if (err) {
      if (err.message.includes("Invalid login")) {
        setError(lang === "de" ? "E-Mail oder Passwort falsch." : "Invalid email or password.");
      } else if (err.message.includes("Email not confirmed")) {
        setError(lang === "de" ? "Bitte bestätige zuerst deine E-Mail-Adresse." : "Please confirm your email first.");
      } else {
        setError(err.message);
      }
    }
    setSubmitting(false);
  };

  return (
    <section className="section-padding min-h-[80vh] flex items-center">
      <div className="container mx-auto max-w-md">
        <ScrollReveal>
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground">
              JETZT <span className="text-gradient">ANMELDEN</span>
            </h1>
            <p className="text-muted-foreground mt-3">
              {lang === "de"
                ? "Melde dich an und erhalte Zugriff auf weitere Funktionen!"
                : "Log in to access more features!"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-5">
            {error && (
              <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg animate-fade-in" role="alert">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="text-sm font-medium text-foreground mb-1.5 block">
                E-Mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="deine@email.de"
                  className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                  {lang === "de" ? "Passwort" : "Password"}
                </label>
                <Link to="/passwort-vergessen" className="text-xs text-primary hover:underline">
                  {lang === "de" ? "Passwort vergessen?" : "Forgot password?"}
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="animate-pulse">{lang === "de" ? "WIRD ANGEMELDET..." : "LOGGING IN..."}</span>
              ) : (
                <>
                  {lang === "de" ? "ANMELDEN" : "LOG IN"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">{lang === "de" ? "oder" : "or"}</span>
              </div>
            </div>

            {/* Register link */}
            <p className="text-center text-sm text-muted-foreground">
              {lang === "de" ? "Du hast noch keinen Account?" : "Don't have an account yet?"}{" "}
              <Link to="/registrieren" className="text-primary font-medium hover:underline">
                {lang === "de" ? "Jetzt registrieren" : "Sign up now"}
              </Link>
            </p>
          </form>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default LoginPage;
