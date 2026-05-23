import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

// ─────────────────────────────────────────────────────────────
// LOCAL AUTH STUB — drop-in replacement for
// "@clerk/tanstack-react-start" so the app runs locally WITHOUT
// a Clerk account. The whole app behaves as if one citizen is
// always signed in.
//
// TO RESTORE REAL CLERK LATER:
//   In these files, change the import back to
//   "@clerk/tanstack-react-start":
//     - src/routes/__root.tsx   (and re-add the publishable-key gate)
//     - src/routes/auth.tsx
//     - src/lib/auth-guard.tsx
//     - src/lib/api-hooks.ts
//   Then set VITE_CLERK_PUBLISHABLE_KEY in frontend/.env.local
//   and remove AUTH_STUB from backend/.env.local.
// ─────────────────────────────────────────────────────────────

// Must match AUTH_STUB_USER_ID in backend/.env.local. The backend
// ignores the token value when AUTH_STUB=true, so any non-empty
// string is fine here.
const STUB_USER_ID = "stub-user-citizen";
const STUB_TOKEN = "stub-token";

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: STUB_USER_ID,
    sessionId: "stub-session",
    orgId: null,
    getToken: async (_options?: unknown) => STUB_TOKEN,
    signOut: async (_options?: unknown) => {},
  };
}

export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: STUB_USER_ID,
      fullName: "Cetățean Demo",
      primaryEmailAddress: { emailAddress: "demo@ecetatean.ro" },
      primaryPhoneNumber: { phoneNumber: "+40700000000" },
    },
  };
}

export function ClerkProvider({
  children,
}: {
  children: ReactNode;
  publishableKey?: string;
}) {
  return <>{children}</>;
}

export function SignedIn({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SignedOut(_props: { children: ReactNode }) {
  return null;
}

// Never actually rendered in stub mode: useAuth() reports signed-in,
// so /auth immediately redirects. Kept so the import resolves.
export function SignIn(_props: Record<string, unknown>) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 text-center">
      <p className="text-sm text-text-secondary">
        Mod local — autentificarea Clerk este dezactivată.
      </p>
      <Link
        to="/chat"
        className="mt-3 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white"
      >
        Continuă
      </Link>
    </div>
  );
}

export function UserButton(_props: Record<string, unknown>) {
  return null;
}
