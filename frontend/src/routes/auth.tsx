import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Check, Shield } from "lucide-react";
import { PrimaryButton, Field } from "@/components/ui-bits";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Autentificare — eCetățean" }] }),
  component: Auth,
});

function Auth() {
  const [step, setStep] = useState<"phone" | "otp" | "ok">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    if (step === "ok") {
      const t = setTimeout(() => nav({ to: "/chat" }), 1400);
      return () => clearTimeout(t);
    }
  }, [step, nav]);

  if (step === "ok") {
    return (
      <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-success-light flex items-center justify-center mb-6 anim-fade-up">
          <Check size={56} className="text-success" strokeWidth={3} />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary anim-fade-up">Autentificat cu succes!</h1>
        <p className="text-text-secondary mt-2 anim-fade-up">Bine ai venit, Ion.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col px-5 pt-12 pb-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <span className="font-display font-bold text-primary">eCetățean</span>
      </div>

      {step === "phone" ? (
        <div className="anim-fade-up">
          <h1 className="font-display font-bold text-[24px] text-text-primary mb-2">Intră în cont</h1>
          <p className="text-text-secondary text-[15px] mb-8">Îți trimitem un cod de verificare prin SMS.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Număr de telefon</label>
              <div className="flex items-stretch gap-2">
                <div className="bg-surface-secondary rounded-xl px-4 flex items-center font-display font-semibold text-text-primary">+40</div>
                <input
                  inputMode="tel"
                  placeholder="7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  className="flex-1 bg-surface-secondary border border-transparent focus:bg-surface focus:border-primary text-[15px] py-3.5 px-4 rounded-xl outline-none"
                />
              </div>
            </div>
          </div>
          <div className="mt-8">
            <PrimaryButton disabled={phone.length < 9} onClick={() => setStep("otp")}>
              Trimite cod
            </PrimaryButton>
            <p className="text-xs text-text-tertiary text-center mt-4">
              Continuând, accepți Termenii și Politica de confidențialitate.
            </p>
          </div>
        </div>
      ) : (
        <div className="anim-fade-up">
          <h1 className="font-display font-bold text-[24px] text-text-primary mb-2">Introdu codul</h1>
          <p className="text-text-secondary text-[15px] mb-8">
            Codul a fost trimis la <span className="font-medium text-text-primary">+40 {phone}</span>.
          </p>
          <div className="flex gap-2 justify-between mb-6" role="group" aria-label="Cod de verificare">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                inputMode="numeric"
                maxLength={1}
                aria-label={`Cifra ${i + 1}`}
                value={d}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(-1);
                  const next = [...otp]; next[i] = v; setOtp(next);
                  if (v && i < 5) inputs.current[i + 1]?.focus();
                }}
                onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus(); }}
                className="w-12 h-14 text-center font-display font-bold text-[22px] bg-surface-secondary border border-transparent focus:bg-surface focus:border-primary rounded-xl outline-none"
              />
            ))}
          </div>
          <button onClick={() => setStep("phone")} className="press text-sm text-primary font-medium mb-8">
            ‹ Schimbă numărul
          </button>
          <PrimaryButton disabled={otp.join("").length < 6} onClick={() => setStep("ok")}>
            Verifică
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
