import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

// ─────────────────────────────────────────────────────────────
// Supabase Auth — drop-in replacement for the old Clerk stub.
// Exports the same interface so auth-guard.tsx, __root.tsx,
// api-hooks.ts, and auth.tsx need no import changes.
// ─────────────────────────────────────────────────────────────

interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  session: Session | null;
  user: User | null;
}

const AuthContext = createContext<AuthState>({
  isLoaded: false,
  isSignedIn: false,
  session: null,
  user: null,
});

export function ClerkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoaded: false,
    isSignedIn: false,
    session: null,
    user: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ isLoaded: true, isSignedIn: false, session: null, user: null });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ isLoaded: true, isSignedIn: !!session, session, user: session?.user ?? null });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ isLoaded: true, isSignedIn: !!session, session, user: session?.user ?? null });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const { isLoaded, isSignedIn, session, user } = useContext(AuthContext);
  return {
    isLoaded,
    isSignedIn,
    userId: user?.id ?? null,
    sessionId: session?.access_token?.slice(0, 8) ?? null,
    orgId: null,
    getToken: async (_options?: unknown) => session?.access_token ?? null,
    signOut: async () => {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    },
  };
}

export function useUser() {
  const { isLoaded, isSignedIn, user } = useContext(AuthContext);
  return {
    isLoaded,
    isSignedIn,
    user: user
      ? {
          id: user.id,
          fullName: user.user_metadata?.full_name ?? null,
          primaryEmailAddress: user.email ? { emailAddress: user.email } : null,
          primaryPhoneNumber: user.phone ? { phoneNumber: user.phone } : null,
        }
      : null,
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useContext(AuthContext);
  return isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn } = useContext(AuthContext);
  return isSignedIn ? null : <>{children}</>;
}

// Actual sign-in form lives in src/routes/auth.tsx.
export function SignIn(_props: Record<string, unknown>) {
  return null;
}

export function UserButton(_props: Record<string, unknown>) {
  return null;
}
