import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Lock, Download, Eye } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { GhostButton } from "@/components/ui-bits";

export const Route = createFileRoute("/action-plan")({
  head: () => ({ meta: [{ title: "Plan de acțiune — eCetățean" }] }),
  component: ActionPlan,
});

function ActionPlan() {
  const nav = useNavigate();
  const [step2Done, setStep2Done] = useState(false);
  const [dl, setDl] = useState<"idle" | "loading" | "done">("idle");

  const startDl = () => {
    if (dl !== "idle") return;
    setDl("loading");
    setTimeout(() => { setDl("done"); setStep2Done(true); }, 1500);
  };

  const completed = step2Done ? 2 : 1;

  return (
    <AppShell topBar={<TopBar showBack title="Plan de acțiune" subtitle="Pașaport — 4 pași" />}>
      <div className="px-5 pt-5">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-[12px] text-text-secondary mb-2">
            <span>{completed} din 4 pași</span>
            <span className="font-display font-semibold">{Math.round((completed / 4) * 100)}%</span>
          </div>
          <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${(completed / 4) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          <StepCard
            n={1} done amber={false} title="Verifică documentele"
            delay={0}
            body={
              <div className="flex flex-wrap gap-1.5 text-[12.5px] text-text-secondary">
                <span>Buletin valabil ✓</span><span>•</span>
                <span>Foto 3×4 ✓</span><span>•</span>
                <span>Taxă pregătită ✓</span>
              </div>
            }
          />
          <StepCard
            n={2}
            done={step2Done}
            amber={!step2Done}
            title="Completează cererea"
            delay={60}
            body={
              <>
                <p className="text-[13.5px] text-text-secondary mb-3">Cererea este pre-completată cu datele tale.</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={startDl}
                    disabled={dl !== "idle"}
                    className="press relative overflow-hidden bg-accent text-white font-semibold text-[13.5px] py-2.5 px-4 rounded-xl"
                  >
                    {dl === "loading" && (
                      <span className="absolute inset-y-0 left-0 bg-accent-dark/40 animate-[grow_1.5s_ease-out_forwards]" style={{ animationName: "grow" }} />
                    )}
                    <span className="relative">
                      {dl === "idle" && "Descarcă cererea"}
                      {dl === "loading" && "Se descarcă..."}
                      {dl === "done" && "Descărcat ✓"}
                    </span>
                  </button>
                  <button onClick={() => nav({ to: "/document-preview" })} className="press border border-border bg-white text-text-primary font-semibold text-[13.5px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2">
                    <Eye size={15} /> Previzualizează
                  </button>
                </div>
              </>
            }
          />
          <StepCard
            n={3} locked title="Programare online" delay={120}
            body={<p className="text-[13px] text-text-tertiary">Disponibil după completarea pasului 2.</p>}
          />
          <StepCard
            n={4} locked title="Ridicare document" delay={180}
            body={<p className="text-[13px] text-text-tertiary">Disponibil după programare.</p>}
          />
        </div>

        <div className="mt-6">
          <GhostButton onClick={() => nav({ to: "/chat" })}>Continuă în chat</GhostButton>
        </div>
      </div>

      <style>{`
        @keyframes grow { from { width: 0% } to { width: 100% } }
      `}</style>
    </AppShell>
  );
}

function StepCard({
  n, title, body, done, amber, locked, delay,
}: { n: number; title: string; body: React.ReactNode; done?: boolean; amber?: boolean; locked?: boolean; delay: number }) {
  const borderClass = done ? "border-l-success" : locked ? "border-l-border" : "border-l-accent";
  const circleClass = done ? "bg-success text-white" : locked ? "bg-surface-secondary text-text-tertiary" : "bg-accent text-white";
  return (
    <article
      className={`bg-surface border border-border border-l-4 ${borderClass} rounded-2xl p-5 shadow-card anim-fade-up ${done ? "scale-[0.995] transition-transform" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[14px] shrink-0 ${circleClass} transition-colors`}>
          {done ? <Check size={16} strokeWidth={3} /> : locked ? <Lock size={14} /> : n}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[15px] text-text-primary mb-2">{title}</h3>
          {body}
        </div>
      </div>
    </article>
  );
}

void Download;
