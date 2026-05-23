import { createFileRoute, Navigate } from "@tanstack/react-router";
import { SignIn, useAuth } from "@/lib/clerk-stub";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Autentificare — eCetățean" }] }),
  component: Auth,
});

function Auth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Navigate to="/chat" replace />;
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
        <h1 className="font-display font-bold text-[24px] text-text-primary mb-2">Intră în cont</h1>
        <p className="text-text-secondary text-[15px] mb-8">
          Autentificare sigură prin Clerk. Folosim numărul de telefon și un cod prin SMS.
        </p>

        <div className="flex justify-center">
          <SignIn
            routing="hash"
            signUpUrl="/auth"
            fallbackRedirectUrl="/chat"
            signUpFallbackRedirectUrl="/chat"
          />
        </div>

        <p className="text-xs text-text-tertiary text-center mt-6">
          Continuând, accepți Termenii și Politica de confidențialitate.
        </p>
      </div>
    </div>
  );
}
