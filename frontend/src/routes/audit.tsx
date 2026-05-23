import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, CreditCard, AlertCircle, ShieldCheck, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { auditLog } from "@/lib/mock-data";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Istoric civic — eCetățean" }] }),
  component: Audit,
});

const iconFor = (t: string) => {
  if (t === "form") return { I: FileText, c: "bg-primary-light text-primary" };
  if (t === "payment") return { I: CreditCard, c: "bg-success-light text-success" };
  if (t === "report") return { I: AlertCircle, c: "bg-accent-light text-accent-dark" };
  return { I: ShieldCheck, c: "bg-surface-secondary text-text-secondary" };
};

function Audit() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <AppShell topBar={<TopBar showBack title="Istoric civic" subtitle="Registru imutabil de acțiuni" />}>
      <div className="px-5 pt-5">
        <div className="bg-primary text-white rounded-2xl p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">Registru verificabil</p>
          <p className="font-display font-semibold text-[15px] mt-1 leading-snug">
            Toate acțiunile sunt înregistrate cu hashuri criptografice și nu pot fi modificate.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {auditLog.map((e, i) => {
            const { I, c } = iconFor(e.type);
            const isOpen = open === e.id;
            return (
              <article
                key={e.id}
                className="bg-surface border border-border rounded-2xl shadow-card overflow-hidden anim-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : e.id)}
                  className="press w-full text-left p-4 flex items-start gap-3"
                  aria-expanded={isOpen}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c}`}>
                    <I size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium text-text-primary leading-snug">{e.action}</p>
                    <p className="text-[11.5px] text-text-tertiary mt-0.5">{e.time}</p>
                    <p className="text-[11px] text-text-tertiary mt-1 font-mono truncate">hash: {e.hash.slice(0, 16)}…</p>
                  </div>
                  <ChevronDown size={16} className={`text-text-tertiary transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-border bg-surface-secondary anim-fade-up">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-2">Hash actual</p>
                    <p className="font-mono text-[11.5px] text-text-primary break-all">{e.hash}</p>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-2">Hash precedent</p>
                    <p className="font-mono text-[11.5px] text-text-secondary break-all">
                      {auditLog[i + 1]?.hash ?? "—"}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-6 bg-surface-secondary rounded-2xl p-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Înregistrările acestui registru nu pot fi șterse. Fiecare intrare conține hash-ul intrării precedente.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
