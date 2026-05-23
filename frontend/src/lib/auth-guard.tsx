import { useAuth, useUser } from "@/lib/clerk-stub";
import { isAdminUser } from "@/lib/admin";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="anim-typing flex gap-1.5 items-center">
          <span className="w-2 h-2 rounded-full inline-block bg-text-tertiary" />
          <span className="w-2 h-2 rounded-full inline-block bg-text-tertiary" />
          <span className="w-2 h-2 rounded-full inline-block bg-text-tertiary" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export function AdminProtected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="text-sm text-text-secondary">Se încarcă...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}
