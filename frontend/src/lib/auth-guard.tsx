import { useAuth } from "@clerk/tanstack-react-start";
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
