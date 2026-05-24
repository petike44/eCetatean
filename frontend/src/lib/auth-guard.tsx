import { useAuth, useUser } from "@/lib/clerk-stub";
import { isAdminUser } from "@/lib/admin";
import { Navigate } from "@tanstack/react-router";
import { useState, useRef, type ReactNode } from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

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

const STAFF_PIN = (import.meta.env.VITE_STAFF_PIN as string | undefined) ?? "1234";
const SESSION_KEY = "staff_session_ok";

function PinGate({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (pin === STAFF_PIN) {
      onSuccess();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => {
        setError(false);
        inputRef.current?.focus();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-metro/95 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-sm mx-4 p-7 flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-metro/10 flex items-center justify-center">
          <ShieldCheck size={24} className="text-metro" />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-[17px] text-text-primary">Portal Funcționari</h2>
          <p className="text-[13px] text-text-secondary mt-1">Introduceți PIN-ul de sesiune</p>
        </div>
        <div className="w-full relative">
          <input
            ref={inputRef}
            type={show ? "text" : "password"}
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
            placeholder="••••"
            className={`w-full h-12 rounded-xl border text-center text-[20px] tracking-[0.5em] font-mono outline-none pr-10 transition-colors ${
              error
                ? "border-error bg-error/5 text-error"
                : "border-border bg-surface-secondary focus:border-metro"
            }`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && (
          <p className="text-[12px] text-error font-medium -mt-2">PIN incorect. Încercați din nou.</p>
        )}
        <button
          onClick={submit}
          className="press w-full h-11 rounded-xl bg-metro text-white font-semibold text-[14px] transition-opacity disabled:opacity-50"
          disabled={pin.length === 0}
        >
          Confirmă accesul
        </button>
      </div>
    </div>
  );
}

export function StaffProtected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [pinVerified, setPinVerified] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1",
  );

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

  if (!isSignedIn) return <Navigate to="/auth" replace />;

  if (!pinVerified) {
    return (
      <PinGate
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setPinVerified(true);
        }}
      />
    );
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
