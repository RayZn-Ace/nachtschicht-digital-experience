import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { withDeadline, READ_FAILURE_EVENT } from "@/lib/readDeadline";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const applySession = async (currentSession: Session | null) => {
      if (!mounted) return;
      const id = ++requestId;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsAdmin(false);
      setLoading(true);
      try {
        if (currentSession?.user) {
          const { data, error } = await withDeadline(supabase.from("user_roles").select("role").eq("user_id", currentSession.user.id).eq("role", "admin").maybeSingle());
          if (error) throw error;
          if (mounted && id === requestId) setIsAdmin(!!data);
        }
      } catch {
        if (mounted && id === requestId) {
          setIsAdmin(false);
          window.dispatchEvent(new Event(READ_FAILURE_EVENT));
        }
      } finally {
        if (mounted && id === requestId) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        // Avoid async work directly inside callback to prevent auth lock contention
        setTimeout(() => applySession(currentSession), 0);
      }
    );

    const initialRequest = requestId;
    withDeadline(supabase.auth.getSession()).then(({ data: { session: currentSession }, error }) => {
      if (!mounted || requestId !== initialRequest) return;
      if (error) throw error;
      void applySession(currentSession);
    }).catch(() => {
      if (!mounted || requestId !== initialRequest) return;
      setIsAdmin(false);
      setLoading(false);
      window.dispatchEvent(new Event(READ_FAILURE_EVENT));
    });

    return () => {
      mounted = false;
      requestId++;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
