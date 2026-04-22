import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { lovable } from "@/integrations/lovable/index";
import { isNativeApp } from "@/lib/native";
import { startNativeOAuth } from "@/lib/nativeOAuth";

const LoginPage = () => {
  const { user, isAdmin, signIn, loading } = useAuth();
  const { lang } = useI18n();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nativeApp = isNativeApp();

  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (oauthError) setError(oauthError);
  }, [searchParams]);

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

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setError("");

    if (nativeApp) {
      try {
        await startNativeOAuth(provider);
      } catch (oauthError) {
        setError(oauthError instanceof Error ? oauthError.message : "OAuth failed");
      }
      return;
    }

    const { error: oauthError } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });

    if (oauthError) setError(oauthError.message);
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

            {/* Social Login */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void handleOAuthLogin("google")}
                className="w-full py-3 bg-muted border border-border text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-center gap-3 text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {lang === "de" ? "Mit Google anmelden" : "Sign in with Google"}
              </button>

              <button
                type="button"
                onClick={() => void handleOAuthLogin("apple")}
                className="w-full py-3 bg-muted border border-border text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-center gap-3 text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {lang === "de" ? "Mit Apple anmelden" : "Sign in with Apple"}
              </button>
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
