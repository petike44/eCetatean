import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowRight, Building2, Sparkles, ShieldCheck } from "lucide-react";
import { PrimaryButton } from "@/components/ui-bits";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Bun venit — eCetățean" }] }),
  component: Onboarding,
});

const slides = [
  {
    icon: Building2,
    title: "Bun venit la eCetățean",
    sub: "Ghidul tău digital pentru relația cu instituțiile statului din România.",
  },
  {
    icon: Sparkles,
    title: "ClaudIA te ajută",
    sub: "Întreabă despre acte, formulare sau proceduri — răspunsuri pe baza surselor oficiale.",
  },
  {
    icon: ShieldCheck,
    title: "Datele tale, în siguranță",
    sub: "Informațiile sunt stocate securizat și folosite doar pentru serviciile tale civice.",
  },
];

function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const startX = useRef<number | null>(null);
  const Icon = slides[i].icon;

  const next = () => (i < 2 ? setI(i + 1) : nav({ to: "/auth" }));
  const skip = () => nav({ to: "/auth" });

  return (
    <div
      className="min-h-dvh bg-bg flex flex-col"
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (dx < -50 && i < 2) setI(i + 1);
        if (dx > 50 && i > 0) setI(i - 1);
        startX.current = null;
      }}
    >
      <div className="flex justify-end px-5 pt-5 h-12">
        {i < 2 && (
          <button onClick={skip} className="press text-sm font-medium text-text-secondary px-3 py-2 min-h-11 rounded-xl">
            Sari peste
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div key={i} className="anim-fade-up">
          <div className="w-24 h-24 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-8">
            <Icon size={44} strokeWidth={1.5} />
          </div>
          <h1 className="font-display font-bold text-[28px] text-text-primary mb-3">{slides[i].title}</h1>
          <p className="text-[15px] text-text-secondary leading-relaxed max-w-xs mx-auto">{slides[i].sub}</p>
        </div>
      </div>
      <div className="px-8 pb-10">
        <div className="flex justify-center gap-2 mb-8" role="tablist">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Pasul ${idx + 1}`}
              className={`min-h-11 min-w-11 flex items-center justify-center press`}
            >
              <span
                className={`block h-2 rounded-full transition-all ${idx === i ? "w-8 bg-accent" : "w-2 bg-border"}`}
              />
            </button>
          ))}
        </div>
        <PrimaryButton onClick={next}>
          {i === 2 ? "Începe" : (<>Continuă <ArrowRight size={18} className="inline ml-1" /></>)}
        </PrimaryButton>
      </div>
    </div>
  );
}
