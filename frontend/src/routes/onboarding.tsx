import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { PrimaryButton } from "@/components/ui-bits";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Bun venit — eCetățean" }] }),
  component: Onboarding,
});

const slides = [
  { emoji: "🏛️", title: "Bun venit la eCetățean", sub: "Ghidul tău digital pentru orice relație cu statul." },
  { emoji: "🤖", title: "ClaudIA te ajută", sub: "Întreabă orice despre acte, formulare sau proceduri. ClaudIA știe răspunsul." },
  { emoji: "🔐", title: "Datele tale, în siguranță", sub: "Informațiile tale sunt criptate și nu sunt partajate cu terțe părți." },
];

function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const startX = useRef<number | null>(null);

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
          <button onClick={skip} className="press text-sm font-medium text-text-secondary px-3 py-1">
            Sari peste
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div key={i} className="anim-fade-up">
          <div className="text-[120px] leading-none mb-8 select-none">{slides[i].emoji}</div>
          <h1 className="font-display font-bold text-[28px] text-text-primary mb-3">{slides[i].title}</h1>
          <p className="text-[16px] text-text-secondary leading-relaxed max-w-xs mx-auto">{slides[i].sub}</p>
        </div>
      </div>
      <div className="px-8 pb-10">
        <div className="flex justify-center gap-2 mb-8" role="tablist">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Pasul ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-accent" : "w-2 bg-border"}`}
            />
          ))}
        </div>
        <PrimaryButton onClick={next}>
          {i === 2 ? "Începe" : (<>Continuă <ArrowRight size={18} className="inline ml-1" /></>)}
        </PrimaryButton>
      </div>
    </div>
  );
}
