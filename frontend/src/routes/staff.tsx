import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Search, Lock, Building2, CheckCircle2, XCircle, FileQuestion, Loader2, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Badge } from "@/components/ui-bits";
import { StaffProtected } from "@/lib/auth-guard";
import {
  useCivilServantLookup,
  useUpdateReportStatus,
  type CivicReportStaff,
} from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";
import { formatRoDate } from "@/lib/profile-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Portal Funcționari — eCetățean" }] }),
  component: () => (
    <StaffProtected>
      <Staff />
    </StaffProtected>
  ),
});

// ——— Helpers ————————————————————————————————————————————————

const CATEGORY_LABELS: Record<string, string> = {
  groapa_asfalt: "Groapă în asfalt",
  iluminat_defect: "Iluminat defect",
  gunoi_ilegal: "Gunoi ilegal",
  masina_abandonata: "Mașină abandonată",
  trotuar_deteriorat: "Trotuar deteriorat",
  alt_problema: "Altă problemă",
};

const STATUS_META: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  inregistrata: { label: "Înregistrată", tone: "neutral" },
  in_lucru: { label: "În lucru", tone: "amber" },
  rezolvata: { label: "Rezolvată", tone: "green" },
  respinsa: { label: "Respinsă", tone: "red" },
};

// ——— Report card ————————————————————————————————————————————

function ReportCard({ report, onAction }: {
  report: CivicReportStaff;
  onAction: (id: string, status: string) => void;
}) {
  const update = useUpdateReportStatus();
  const toast = useToast();
  const isPending = update.isPending;

  const handle = async (status: string, label: string) => {
    try {
      await update.mutateAsync({ id: report.id, status });
      toast.show("success", `Raport marcat: ${label}`);
      onAction(report.id, status);
    } catch {
      toast.show("error", "Nu s-a putut actualiza raportul.");
    }
  };

  const meta = STATUS_META[report.status] ?? { label: report.status, tone: "neutral" as const };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-semibold text-[14px] text-text-primary leading-tight">
            {CATEGORY_LABELS[report.category] ?? report.category}
          </p>
          {report.address && (
            <p className="text-[12px] text-text-secondary mt-0.5 truncate">{report.address}</p>
          )}
          {report.description && (
            <p className="text-[12px] text-text-tertiary mt-1 line-clamp-2">{report.description}</p>
          )}
        </div>
        <span className="shrink-0"><Badge tone={meta.tone}>{meta.label}</Badge></span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
        <Clock size={12} />
        <span>{formatRoDate(report.created_at) ?? report.created_at}</span>
        <span className="ml-auto font-mono text-text-tertiary">#{report.reference_number}</span>
      </div>

      {report.status !== "rezolvata" && report.status !== "respinsa" && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => handle("rezolvata", "Aprobat")}
            disabled={isPending}
            className="press flex items-center justify-center gap-1.5 bg-success text-white font-semibold text-[12px] py-2.5 rounded-xl disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Aprobă
          </button>
          <button
            onClick={() => handle("respinsa", "Respins")}
            disabled={isPending}
            className="press flex items-center justify-center gap-1.5 bg-error text-white font-semibold text-[12px] py-2.5 rounded-xl disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Respinge
          </button>
          <button
            onClick={() => handle("in_lucru", "Sol. doc.")}
            disabled={isPending}
            className="press flex items-center justify-center gap-1.5 border border-border bg-white text-text-primary font-semibold text-[11px] py-2.5 rounded-xl disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <FileQuestion size={13} />}
            Sol. doc.
          </button>
        </div>
      )}
    </div>
  );
}

// ——— Main page ——————————————————————————————————————————————

function Staff() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error } = useCivilServantLookup(query);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.trim().length >= 2) {
      debounceRef.current = setTimeout(() => setQuery(input.trim()), 500);
    } else {
      setQuery("");
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  // Log access when result loads
  useEffect(() => {
    if (data?.citizen.name) {
      const now = new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
      const masked = data.citizen.cnpMasked ?? "CNP necunoscut";
      setLogEntries((prev) => [
        `Ați accesat dosarul [${masked}] la ${now}.`,
        ...prev.slice(0, 4),
      ]);
    }
  }, [data]);

  const handleAction = (id: string, status: string) => {
    const now = new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    setLogEntries((prev) => [
      `Raport #${id.slice(0, 8)} marcat „${STATUS_META[status]?.label ?? status}" la ${now}.`,
      ...prev.slice(0, 4),
    ]);
  };

  const errorMsg = isError
    ? ((error as { message?: string })?.message ?? "Eroare necunoscută")
    : null;

  const is403 = errorMsg?.includes("403") || errorMsg?.includes("restricționat");

  return (
    <AppShell
      hideNav
      topBar={
        <TopBar
          variant="funct"
          showBack
          title="Portal Funcționari"
          right={
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-full text-[11px] font-semibold">
              <Building2 size={12} /> DGEP Cluj
            </span>
          }
        />
      }
    >
      <div className="px-5 pt-5 pb-12 max-w-2xl mx-auto">

        {/* Access badge */}
        <div className="bg-accent-light border border-accent rounded-xl px-3 py-2 mb-5 inline-flex items-center gap-2">
          <span className="font-display font-bold text-[11px] text-accent-dark uppercase tracking-wider">
            Acces Funcționar Public
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          {isLoading && (
            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary animate-spin" />
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Caută după CNP sau nume"
            className="w-full bg-surface border border-border focus:border-primary text-[15px] py-3.5 pl-11 pr-10 rounded-xl outline-none transition-colors"
          />
        </div>

        {/* 403 access denied */}
        {is403 && (
          <div className="rounded-2xl border border-error/30 bg-error/5 p-5 text-center mb-5">
            <p className="font-display font-semibold text-[14px] text-error">Acces interzis</p>
            <p className="text-[12px] text-text-secondary mt-1">
              Contul dvs. nu are rol de funcționar public. Contactați administratorul.
            </p>
          </div>
        )}

        {/* Generic error (not 403) */}
        {isError && !is403 && (
          <div className="rounded-2xl border border-border bg-surface-secondary p-4 mb-5">
            <p className="text-[13px] text-text-secondary">{errorMsg}</p>
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            <p className="text-[12px] text-text-tertiary uppercase tracking-wider font-medium mb-3">
              Rezultat căutare
            </p>

            <div className="rounded-2xl border border-border bg-surface p-4 mb-5 space-y-4">
              {/* Citizen header */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-[15px] shrink-0">
                  {(data.citizen.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <p className="font-display font-semibold text-text-primary">
                    {data.citizen.name ?? "Necunoscut"}
                  </p>
                  <p className="text-[12px] text-text-tertiary font-mono">
                    CNP: {data.citizen.cnpMasked ?? "—"}
                    {data.citizen.city && ` · ${data.citizen.city}`}
                  </p>
                </div>
              </div>

              {/* Reports */}
              {data.reports.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
                    Sesizări civice ({data.reports.length})
                  </p>
                  {data.reports.map((r) => (
                    <ReportCard key={r.id} report={r} onAction={handleAction} />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-text-secondary py-2">
                  Nicio sesizare înregistrată.
                </p>
              )}

              {/* Restricted sections */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium mb-2">
                  Acces restricționat
                </p>
                <div className="space-y-2">
                  {data.restricted_sections.map((s) => (
                    <div
                      key={s.label}
                      className="bg-surface-secondary rounded-xl px-4 py-3 flex items-center gap-3 opacity-70"
                    >
                      <Lock size={15} className="text-text-tertiary shrink-0" />
                      <p className="text-[13px] text-text-secondary">{s.label} — {s.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!data && !isLoading && !isError && query.length === 0 && (
          <div className="text-center py-12 text-text-tertiary">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-[13px]">Introduceți un CNP sau nume pentru a căuta.</p>
          </div>
        )}

        {/* Activity log */}
        {logEntries.length > 0 && (
          <div className="bg-surface-secondary rounded-2xl p-4 text-[12px] text-text-secondary">
            <p className="font-display font-semibold text-text-primary mb-2">Jurnal activitate</p>
            <div className="space-y-1">
              {logEntries.map((entry, i) => (
                <p key={i} className={cn(i > 0 && "text-text-tertiary")}>{entry}</p>
              ))}
            </div>
            <p className="mt-2 text-text-tertiary">
              Toate accesările sunt înregistrate în registrul imutabil al cetățeanului.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
