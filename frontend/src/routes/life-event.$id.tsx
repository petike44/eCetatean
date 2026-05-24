import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Protected } from "@/lib/auth-guard";
import { WeTranslateHandoffModal } from "@/components/WeTranslateHandoffModal";
import {
  useLifeEvent,
  useUpdateLifeEventStep,
  useGeneratePdf,
  type LifeEventStep,
  type StepStatus,
} from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";
import { PaymentModal, AppointmentModal } from "@/components/SimulatedActionModals";

export const Route = createFileRoute("/life-event/$id")({
  head: () => ({ meta: [{ title: "Progres eveniment civic — eCetățean" }] }),
  component: () => (
    <Protected>
      <LifeEventDashboard />
    </Protected>
  ),
});

const STATUS_LABELS: Record<StepStatus, string> = {
  pending: "De făcut",
  in_progress: "În curs",
  completed: "Completat",
  skipped: "Omis",
};

const STATUS_COLORS: Record<StepStatus, string> = {
  pending: "bg-[#F1F5F9] text-[#475569]",
  in_progress: "bg-[#FEF3C7] text-[#B45309]",
  completed: "bg-[#D1FAE5] text-[#065F46]",
  skipped: "bg-[#F1F5F9] text-[#94A3B8]",
};

function LifeEventDashboard() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { show } = useToast();
  const { data: event, isLoading, error } = useLifeEvent(id);
  const updateStep = useUpdateLifeEventStep();
  const generatePdf = useGeneratePdf();
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [paymentModal, setPaymentModal] = useState<{
    amount: number;
    description: string;
  } | null>(null);
  const [appointmentModal, setAppointmentModal] = useState<{
    office: string;
    slotHint?: string;
  } | null>(null);
  const [translationAction, setTranslationAction] =
    useState<NonNullable<LifeEventStep["online_action"]> | null>(null);

  if (isLoading) {
    return (
      <AppShell className="flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-[14px] text-[#475569]">Se încarcă...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !event) {
    return (
      <AppShell className="flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <AlertCircle size={40} className="text-[#EF4444] mx-auto" />
            <p className="font-display font-semibold text-[18px] text-[#0F172A]">Eveniment negăsit</p>
            <p className="text-[14px] text-[#475569]">Nu am putut încărca detaliile evenimentului.</p>
            <button
              onClick={() => nav({ to: "/chat" })}
              className="press bg-[#1F4E79] text-white font-semibold text-[14px] py-3 px-6 rounded-xl"
            >
              Înapoi la ClaudIA
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const completedSteps = Object.values(event.steps_status).filter(
    (s) => s === "completed"
  ).length;

  const progressPct = event.total_steps > 0
    ? (completedSteps / event.total_steps) * 100
    : 0;

  const nextPendingStep = event.step_details.find(
    (s) => (event.steps_status[`step_${s.order}`] ?? "pending") === "pending"
  );

  const handleMarkComplete = async (stepOrder: number) => {
    try {
      await updateStep.mutateAsync({ id, stepNumber: stepOrder, status: "completed" });
      show("success", "Pas marcat ca finalizat");
    } catch {
      show("error", "Eroare la actualizarea pasului");
    }
  };

  const handleDownloadForm = async (formType: string) => {
    try {
      await generatePdf.mutateAsync({ formType });
      show("success", "PDF descărcat");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Eroare necunoscută";
      show("error", `Eroare PDF: ${msg}`);
    }
  };

  const handleAction = (step: LifeEventStep) => {
    const action = step.online_action;
    if (action?.type === "pdf" && action.form_type) {
      void handleDownloadForm(action.form_type);
      return;
    }
    if (action?.type === "payment") {
      setPaymentModal({
        amount: action.amount_ron ?? 49,
        description: action.description ?? step.title,
      });
      return;
    }
    if (action?.type === "appointment") {
      setAppointmentModal({
        office: action.office ?? step.office,
        slotHint: action.slot_hint,
      });
      return;
    }
    if (action?.type === "translation_quote") {
      setTranslationAction(action);
      return;
    }
    if (action?.type === "url" && action.url) {
      window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (step.form_type) {
      void handleDownloadForm(step.form_type);
    }
  };

  const downloadable = event.step_details.filter((s) => s.form_type !== null);

  return (
    <AppShell className="flex flex-col">
      <PaymentModal
        open={paymentModal !== null}
        amountRon={paymentModal?.amount ?? 0}
        description={paymentModal?.description ?? ""}
        onClose={() => setPaymentModal(null)}
        onSuccess={() => show("success", "Plată reușită — chitanța a fost salvată")}
      />
      <AppointmentModal
        open={appointmentModal !== null}
        office={appointmentModal?.office ?? ""}
        slotHint={appointmentModal?.slotHint}
        onClose={() => setAppointmentModal(null)}
        onSuccess={(slot, ref) =>
          show("success", `Programare confirmată — ${slot} (ref. ${ref})`)
        }
      />
      <WeTranslateHandoffModal
        open={translationAction !== null}
        action={translationAction}
        onClose={() => setTranslationAction(null)}
      />
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
        <div className="lg:max-w-3xl lg:mx-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => nav({ to: "/chat" })}
              aria-label="Înapoi"
              className="press p-2 rounded-xl border border-[#E2E8F0] bg-white"
            >
              <ChevronLeft size={18} className="text-[#475569]" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-[17px] text-[#0F172A] truncate">
                {event.event_title}
              </h1>
              <p className="text-[12px] text-[#475569] mt-0.5">
                {completedSteps} din {event.total_steps} pași completați
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Cost summary card */}
          <div className="rounded-2xl bg-[#1F4E79] text-white p-4">
            <p className="font-display font-semibold text-[13px] text-[#93C5FD] uppercase tracking-wide mb-1">
              Cost total estimat
            </p>
            <p className="font-display font-bold text-[24px]">
              {event.estimated_total_cost}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {event.step_details
                .filter((s) => s.fee && s.fee !== "Gratuit" && !s.fee.startsWith("Taxele"))
                .slice(0, 4)
                .map((s) => (
                  <span
                    key={s.order}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/15 text-white"
                  >
                    {s.office.split(" ")[0].replace("—", "").trim()} · {s.fee.split("|")[0].trim()}
                  </span>
                ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
              Pașii tăi
            </p>
            <div className="space-y-2">
              {event.step_details.map((step) => {
                const stepKey = `step_${step.order}`;
                const status: StepStatus = event.steps_status[stepKey] ?? "pending";
                const isExpanded = expandedStep === step.order;

                return (
                  <StepCard
                    key={step.order}
                    step={step}
                    status={status}
                    isExpanded={isExpanded}
                    isUpdating={updateStep.isPending && updateStep.variables?.stepNumber === step.order}
                    onToggle={() => setExpandedStep(isExpanded ? null : step.order)}
                    onMarkComplete={() => handleMarkComplete(step.order)}
                    onDownloadForm={
                      step.form_type ? () => handleDownloadForm(step.form_type!) : undefined
                    }
                    onAction={() => handleAction(step)}
                  />
                );
              })}
            </div>
          </div>

          {/* Document wallet */}
          {downloadable.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
                Documentele tale
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {downloadable.map((step) => (
                  <DocumentCard
                    key={step.order}
                    step={step}
                    downloading={generatePdf.isPending}
                    onDownload={() => step.form_type && handleDownloadForm(step.form_type)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-[#E2E8F0] px-4 py-3 flex items-center justify-between gap-3 max-w-[440px] mx-auto lg:sticky lg:bottom-0 lg:max-w-none lg:left-auto lg:right-auto">
        <button
          onClick={() => nav({ to: "/chat" })}
          className="press flex items-center gap-1.5 text-[13px] font-medium text-[#475569]"
        >
          <Sparkles size={14} className="text-[#F59E0B]" />
          Întrebări? Întreabă ClaudIA
        </button>
        <button
          onClick={() => {
            if (!nextPendingStep) return;
            setExpandedStep(nextPendingStep.order);
            const el = document.getElementById(`step-${nextPendingStep.order}`);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          disabled={!nextPendingStep}
          className="press bg-[#F59E0B] text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continuă →
        </button>
      </div>
    </AppShell>
  );
}

/* ─── Step Card ─── */

function StepCard({
  step,
  status,
  isExpanded,
  isUpdating,
  onToggle,
  onMarkComplete,
  onDownloadForm,
  onAction,
}: {
  step: LifeEventStep;
  status: StepStatus;
  isExpanded: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onMarkComplete: () => void;
  onDownloadForm?: () => void;
  onAction: () => void;
}) {
  const [docsExpanded, setDocsExpanded] = useState(false);

  return (
    <article
      id={`step-${step.order}`}
      className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm"
    >
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        {/* Step circle */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            status === "completed"
              ? "bg-[#10B981] text-white"
              : "bg-[#1F4E79] text-white"
          }`}
        >
          {status === "completed" ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <span className="font-display font-bold text-[13px]">{step.order}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-[14.5px] text-[#0F172A] leading-tight">
            {step.title}
          </p>
          <p className="text-[12px] text-[#94A3B8] mt-0.5 truncate">{step.office}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
            {status === "completed" ? "✓ " : ""}{STATUS_LABELS[status]}
          </span>
          {isExpanded ? (
            <ChevronUp size={15} className="text-[#94A3B8]" />
          ) : (
            <ChevronDown size={15} className="text-[#94A3B8]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#E2E8F0] pt-3">
          {/* Tip */}
          {step.tip && (
            <p className="text-[13.5px] leading-relaxed text-[#475569] italic">
              {step.tip}
            </p>
          )}

          {/* Cost + deadline chips */}
          <div className="flex gap-2 flex-wrap">
            {step.fee && (
              <span className="text-[12px] font-semibold bg-[#FEF3C7] text-[#B45309] px-3 py-1 rounded-full">
                {step.fee}
              </span>
            )}
            {step.deadline && (
              <span className="text-[12px] font-medium bg-[#F1F5F9] text-[#475569] px-3 py-1 rounded-full">
                {step.deadline}
              </span>
            )}
          </div>

          {/* Documents collapsible */}
          {step.documents.length > 0 && (
            <div>
              <button
                className="press flex items-center gap-1.5 text-[13px] font-semibold text-[#1F4E79] mb-2"
                onClick={() => setDocsExpanded((p) => !p)}
              >
                {docsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                Documente necesare ({step.documents.length})
              </button>
              {docsExpanded && (
                <ul className="space-y-1.5 pl-1">
                  {step.documents.map((doc) => (
                    <li key={doc} className="flex items-start gap-2 text-[13px] text-[#475569]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] shrink-0 mt-1.5" />
                      {doc}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step.online_action && (
            <button
              onClick={onAction}
              className="press w-full flex items-center justify-center gap-2 bg-[#F59E0B] text-white font-semibold text-[13.5px] py-3 rounded-xl"
            >
              {step.online_action.type === "pdf" ? (
                <FileText size={15} />
              ) : step.online_action.type === "payment" ? (
                <FileText size={15} />
              ) : step.online_action.type === "appointment" ? (
                <FileText size={15} />
              ) : (
                <ExternalLink size={15} />
              )}
              {step.online_action.label}
            </button>
          )}
          {onDownloadForm &&
            step.form_type &&
            step.online_action?.type !== "pdf" && (
              <button
                onClick={onDownloadForm}
                className="press w-full flex items-center justify-center gap-2 border border-[#1F4E79] text-[#1F4E79] font-semibold text-[13px] py-2.5 rounded-xl"
              >
                <FileText size={15} />
                Descarcă formular completat
              </button>
            )}
          {step.online_action?.url &&
            (step.online_action.type === "payment" ||
              step.online_action.type === "appointment") && (
              <button
                type="button"
                onClick={() =>
                  window.open(step.online_action!.url, "_blank", "noopener,noreferrer")
                }
                className="press w-full text-center text-[12px] text-[#1F4E79] font-medium py-1"
              >
                Deschide site-ul oficial ↗
              </button>
            )}

          {/* Mark complete link */}
          {status !== "completed" && (
            <button
              onClick={onMarkComplete}
              disabled={isUpdating}
              className="press w-full text-center text-[13px] text-[#475569] py-2 disabled:opacity-50"
            >
              {isUpdating ? "Se actualizează..." : "Marchează pasul ca finalizat"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Document Card ─── */

function DocumentCard({
  step,
  downloading,
  onDownload,
}: {
  step: LifeEventStep;
  downloading: boolean;
  onDownload: () => void;
}) {
  const formName = step.form_type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Document";
  return (
    <div className="shrink-0 w-36 rounded-2xl border border-[#E2E8F0] bg-white p-3 space-y-2">
      <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
        <FileText size={18} className="text-[#1F4E79]" />
      </div>
      <p className="font-display font-semibold text-[12px] text-[#0F172A] leading-tight line-clamp-2">
        {formName}
      </p>
      <button
        onClick={onDownload}
        disabled={downloading}
        className="press w-full bg-[#F59E0B] text-white font-semibold text-[11px] py-1.5 rounded-lg disabled:opacity-50"
      >
        {downloading ? "..." : "Descarcă"}
      </button>
    </div>
  );
}
