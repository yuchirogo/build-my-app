import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signOutFn, setSignOutFn] = useState<() => Promise<void>>(
    () => async () => {}
  );

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      setSignOutFn(() => async () => {
        await supabase.auth.signOut();
      });

      const { data } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      });
      unsub = () => data.subscription.unsubscribe();

      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    })();
    return () => unsub?.();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: signOutFn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const ONBOARDING_KEY = "blindguard_onboarding_complete";
export const isOnboardingComplete = () =>
  typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY) === "true";
export const setOnboardingComplete = () => {
  if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "true");
};
