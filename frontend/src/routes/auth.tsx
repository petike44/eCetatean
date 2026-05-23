import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/clerk-stub";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Shield } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Autentificare — eCetățean" }] }),
  component: Auth,
});

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
    return <Navigate to="/chat" replace />;
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email sau parolă incorectă."
          : error.message
      );
    } else {
      navigate({ to: "/chat" });
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Există deja un cont cu acest email."
          : error.message
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

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-surface border border-border p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => { setTab("signin"); setError(null); setSignUpDone(false); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === "signin" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
            }`}
          >
            Intră în cont
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(null); setSignUpDone(false); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === "signup" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
            }`}
          >
            Cont nou
          </button>
        </div>

        {signUpDone ? (
          <div className="rounded-xl border border-border bg-surface p-5 text-center">
            <p className="text-sm font-semibold text-text-primary mb-1">Verifică emailul</p>
            <p className="text-sm text-text-secondary">
              Am trimis un link de confirmare la <strong>{email}</strong>. Deschide-l pentru a activa contul.
            </p>
          </div>
        ) : (
          <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@exemplu.ro"
                className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minim 6 caractere"
                className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
            >
              {loading
                ? "Se procesează..."
                : tab === "signin"
                ? "Intră în cont"
                : "Creează cont"}
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
