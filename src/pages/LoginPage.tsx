import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const LoginPage = () => {
  const { user, isAdmin, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (user && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setSubmitting(false);
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-wider text-foreground">
            ADMIN <span className="text-gradient">LOGIN</span>
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {error && <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{error}</p>}
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
            <label className="text-sm text-foreground mb-1 block">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "ANMELDEN..." : "ANMELDEN"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default LoginPage;
