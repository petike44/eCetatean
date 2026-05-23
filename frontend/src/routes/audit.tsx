import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, CreditCard, AlertCircle, ShieldCheck, ChevronDown, ShieldAlert, MessageCircle, LogIn } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Protected } from "@/lib/auth-guard";
import { useAuditLog, type AuditActionType, type AuditEntry } from "@/lib/api-hooks";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Istoric civic — eCetățean" }] }),
  component: () => (
    <Protected>
      <Audit />
    </Protected>
  ),
});

function iconFor(t: AuditActionType) {
  switch (t) {
    case "pdf_generated":
    case "profile_updated":
      return { I: FileText, c: "bg-primary-light text-primary" };
    case "report_submitted":
      return { I: AlertCircle, c: "bg-accent-light text-accent-dark" };
    case "vehicle_added":
    case "vehicle_updated":
      return { I: CreditCard, c: "bg-success-light text-success" };
    case "chat_session":
      return { I: MessageCircle, c: "bg-primary-light text-primary" };
    case "login":
      return { I: LogIn, c: "bg-surface-secondary text-text-secondary" };
    default:
      return { I: ShieldCheck, c: "bg-surface-secondary text-text-secondary" };
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Audit() {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useAuditLog();

  return (
    <AppShell topBar={<TopBar showBack title="Istoric civic" subtitle="Registru imutabil de acțiuni" />}>
      <div className="px-5 pt-5">
        <div className="bg-primary text-white rounded-2xl p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">Registru verificabil</p>
          <p className="font-display font-semibold text-[15px] mt-1 leading-snug">
            Toate acțiunile sunt înregistrate cu hashuri criptografice și nu pot fi modificate.
          </p>
          {data && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-[12px] font-medium">
              {data.chain_valid ? (
                <>
                  <ShieldCheck size={14} /> Lanț integru ({data.total} intrări)
                </>
              ) : (
                <>
                  <ShieldAlert size={14} /> Lanț alterat — verifică datele
                </>
              )}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="mt-6 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface-secondary animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-6 bg-error-light border border-error/30 rounded-2xl p-4">
            <p className="text-[13.5px] text-error font-medium">
              {error instanceof Error ? error.message : "Eroare la încărcarea registrului"}
            </p>
            <button onClick={() => refetch()} className="press mt-3 text-[13px] text-primary font-semibold">
              Încearcă din nou
            </button>
          </div>
        )}

        {data && data.entries.length === 0 && (
          <div className="mt-6 bg-surface-secondary rounded-2xl p-6 text-center">
            <p className="text-[13.5px] text-text-secondary">Nu există încă acțiuni înregistrate.</p>
          </div>
        )}

        {data && data.entries.length > 0 && (
          <div className="mt-5 space-y-2">
            {data.entries.map((e: AuditEntry, i: number) => {
              const { I, c } = iconFor(e.action_type);
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
                      <p className="text-[11.5px] text-text-tertiary mt-0.5">{formatTime(e.created_at)}</p>
                      <p className="text-[11px] text-text-tertiary mt-1 font-mono truncate">
                        hash: {e.record_hash.slice(0, 16)}…
                      </p>
                    </div>
                    <ChevronDown size={16} className={`text-text-tertiary transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-border bg-surface-secondary anim-fade-up">
                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-2">Hash actual</p>
                      <p className="font-mono text-[11.5px] text-text-primary break-all">{e.record_hash}</p>
                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-2">Hash precedent</p>
                      <p className="font-mono text-[11.5px] text-text-secondary break-all">{e.previous_hash || "—"}</p>
                      {e.data && Object.keys(e.data).length > 0 && (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary mt-2">Date</p>
                          <pre className="font-mono text-[11px] text-text-secondary whitespace-pre-wrap break-all">
                            {JSON.stringify(e.data, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-surface-secondary rounded-2xl p-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Înregistrările acestui registru nu pot fi șterse. Fiecare intrare conține hash-ul intrării precedente.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
