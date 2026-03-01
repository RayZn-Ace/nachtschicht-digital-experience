import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";

const LoginPage = () => {
  const { user, isAdmin, signIn, signUp, loading } = useAuth();
  const { lang } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/meine-tickets" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(
          lang === "de"
            ? "Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse."
            : "Registration successful! Please confirm your email address."
        );
      }
    }
    setSubmitting(false);
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-wider text-foreground">
            {mode === "login"
              ? <>{lang === "de" ? "AN" : "LOG"}<span className="text-gradient">{lang === "de" ? "MELDEN" : "IN"}</span></>
              : <>{lang === "de" ? "REGIS" : "SIGN"}<span className="text-gradient">{lang === "de" ? "TRIEREN" : " UP"}</span></>
            }
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {error && <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{error}</p>}
          {success && <p className="text-green-400 text-sm bg-green-500/10 p-3 rounded-md">{success}</p>}
          <div>
            <label className="text-sm text-foreground mb-1 block">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">
              {lang === "de" ? "Passwort" : "Password"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting
              ? "..."
              : mode === "login"
              ? (lang === "de" ? "ANMELDEN" : "LOG IN")
              : (lang === "de" ? "REGISTRIEREN" : "SIGN UP")
            }
          </button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {lang === "de" ? "Noch kein Konto?" : "No account yet?"}{" "}
                <button type="button" onClick={() => { setMode("register"); setError(""); setSuccess(""); }} className="text-primary hover:underline">
                  {lang === "de" ? "Registrieren" : "Sign up"}
                </button>
              </>
            ) : (
              <>
                {lang === "de" ? "Bereits ein Konto?" : "Already have an account?"}{" "}
                <button type="button" onClick={() => { setMode("login"); setError(""); setSuccess(""); }} className="text-primary hover:underline">
                  {lang === "de" ? "Anmelden" : "Log in"}
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </section>
  );
};

export default LoginPage;
