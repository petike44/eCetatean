import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@/lib/clerk-stub";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { resolveLoginCredentials, isAdminUser, ADMIN_EMAIL } from "@/lib/admin";
import { Shield, Loader2 } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/lib/api-hooks";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Autentificare — eCetățean" }] }),
  component: Auth,
});

async function ensureAdminAccount(email: string, password: string) {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError) return { error: null };

  if (email !== ADMIN_EMAIL || password !== "admin") {
    return { error: signInError };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: "Administrator", role: "admin" },
    },
  });
  if (signUpError && !signUpError.message.includes("already registered")) {
    return { error: signUpError };
  }

  return supabase.auth.signInWithPassword({ email, password });
}

function AuthRedirect() {
  const { data: profile, isLoading } = useProfile();
  const { user } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="text-sm text-text-secondary">Se încarcă...</p>
      </div>
    );
  }

  if (isAdminUser(user)) {
    return <Navigate to="/admin/news" replace />;
  }

  if (!profile?.full_name?.trim()) {
    return <Navigate to="/profile-setup" replace />;
  }
  return <Navigate to="/chat" replace />;
}

function Auth() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  if (isLoaded && isSignedIn) {
    return <AuthRedirect />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-5 text-center">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center mb-4">
          <Shield size={18} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-[20px] text-text-primary mb-2">Supabase neconfigurat</h1>
        <p className="text-text-secondary text-sm max-w-sm">
          Adaugă <code className="bg-surface px-1 rounded text-xs">VITE_SUPABASE_URL</code> și{" "}
          <code className="bg-surface px-1 rounded text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> în{" "}
          <code className="bg-surface px-1 rounded text-xs">frontend/.env.local</code>, apoi repornește serverul.
        </p>
      </div>
    );
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { email: loginEmail, password: loginPassword } = resolveLoginCredentials(email, password);
    const { error: authError } = await ensureAdminAccount(loginEmail, loginPassword);
    setLoading(false);
    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email sau parolă incorectă."
          : authError.message,
      );
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { email: loginEmail, password: loginPassword } = resolveLoginCredentials(email, password);
    const { error: signUpError } = await supabase.auth.signUp({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "Există deja un cont cu acest email."
          : signUpError.message,
      );
    } else {
      setSignUpDone(true);
      navigate({ to: "/profile-setup" });
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col px-5 pt-12 pb-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <span className="font-display font-bold text-primary">eCetățean</span>
      </div>

      <div className="anim-fade-up">
        <h1 className="font-display font-bold text-[24px] text-text-primary mb-2">
          {tab === "signin" ? "Intră în cont" : "Creează cont"}
        </h1>
        <p className="text-text-secondary text-[15px] mb-6">
          {tab === "signin"
            ? "Accesează serviciile civice digitale."
            : "Înregistrare gratuită cu email și parolă."}
        </p>

        <div className="flex rounded-2xl bg-surface border border-border p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
              setSignUpDone(false);
            }}
            className={`flex-1 rounded-xl min-h-11 text-sm font-semibold transition-colors ${
              tab === "signin" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
            }`}
          >
            Intră în cont
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
              setSignUpDone(false);
            }}
            className={`flex-1 rounded-xl min-h-11 text-sm font-semibold transition-colors ${
              tab === "signup" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
            }`}
          >
            Cont nou
          </button>
        </div>

        {signUpDone ? (
          <div className="rounded-2xl border border-border bg-surface p-5 text-center">
            <p className="text-sm font-semibold text-text-primary mb-1">Verifică emailul</p>
            <p className="text-sm text-text-secondary">
              Am trimis un link de confirmare la <strong>{email}</strong>. Deschide-l pentru a activa contul,
              apoi completează profilul.
            </p>
          </div>
        ) : (
          <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor="email">
                Email sau utilizator
              </label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin sau nume@exemplu.ro"
                className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-11"
              />
              <p className="text-[11px] text-text-tertiary">
                Administrator: <strong>admin</strong> / <strong>admin</strong>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor="password">
                Parolă
              </label>
              <input
                id="password"
                type="password"
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                required
                minLength={tab === "signin" && email.trim().toLowerCase() === "admin" ? 1 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minim 6 caractere"
                className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-error rounded-xl bg-error-light border border-error/20 px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-2xl bg-accent px-5 py-3.5 min-h-11 text-[15px] font-semibold text-white disabled:opacity-60 transition-opacity inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Se procesează..." : tab === "signin" ? "Intră în cont" : "Creează cont"}
            </button>
          </form>
        )}

        <p className="text-xs text-text-tertiary text-center mt-6">
          Continuând, accepți Termenii și Politica de confidențialitate.
        </p>
      </div>
    </div>
  );
}
