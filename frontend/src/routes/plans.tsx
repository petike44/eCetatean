import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { useLifeEvents, useDeleteLifeEvent } from "@/lib/api-hooks";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Planurile mele — eCetățean" }] }),
  component: PlansPage,
});

// ── Appointment shape stored in localStorage ──
type SavedAppointment = {
  id: string;
  reference: string;
  office: string;
  slot: string;
  savedAt: string;
};

function loadAppointments(): SavedAppointment[] {
  try {
    return JSON.parse(localStorage.getItem("ec_appointments") ?? "[]");
  } catch {
    return [];
  }
}

function removeAppointment(id: string) {
  const updated = loadAppointments().filter((a) => a.id !== id);
  localStorage.setItem("ec_appointments", JSON.stringify(updated));
}

// ── Tab type ──
type Tab = "active" | "completed" | "appointments";

// ── Confirm delete dialog ──
function DeleteConfirmDialog({
  open,
  title,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <h3 className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Șterge planul?</h3>
        <p className="text-[13px] text-[#475569] mb-5">
          <span className="font-medium">"{title}"</span> va fi șters definitiv.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] font-medium text-[#475569]"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[14px] font-semibold"
          >
            Șterge
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Single plan card ──
function PlanCard({ event, onDelete }: {
  event: {
    id: string;
    event_title: string;
    completion_percentage: number;
    total_steps: number;
    current_step: number;
    estimated_total_cost: string;
    is_completed: boolean;
    event_type: string;
  };
  onDelete: (id: string, title: string) => void;
}) {
  const completedSteps = Math.round((event.completion_percentage / 100) * event.total_steps);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-surface border border-border rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-[15px] text-foreground leading-snug">
            {event.event_title}
          </p>
          <p className="text-[12px] text-text-tertiary mt-0.5">
            {completedSteps} din {event.total_steps} pași completați
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(event.id, event.event_title)}
          className="shrink-0 p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Șterge planul"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${event.is_completed ? "bg-green-500" : "bg-primary"}`}
          initial={{ width: 0 }}
          animate={{ width: `${event.completion_percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-secondary bg-surface-secondary px-2 py-0.5 rounded-full border border-border">
          {event.estimated_total_cost}
        </span>
        <Link
          to="/life-event/$id"
          params={{ id: event.id }}
          className="flex items-center gap-1 text-[12px] font-semibold text-primary"
        >
          Deschide <ChevronRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}

// ── Appointment card ──
function AppointmentCard({
  appt,
  onDelete,
}: {
  appt: SavedAppointment;
  onDelete: (id: string) => void;
}) {
  const date = new Date(appt.savedAt);
  const formatted = date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-surface border border-border rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-[14px] text-foreground leading-snug">
              {appt.office}
            </p>
            <p className="text-[13px] text-text-secondary mt-0.5">{appt.slot}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                Confirmat
              </span>
              <span className="text-[11px] text-text-tertiary font-mono">{appt.reference}</span>
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">Rezervat pe {formatted}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(appt.id)}
          className="shrink-0 p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Șterge programarea"
        >
          <X size={15} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Empty state ──
function EmptyState({ tab }: { tab: Tab }) {
  if (tab === "appointments") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-secondary text-text-tertiary flex items-center justify-center mx-auto mb-4">
          <Calendar size={26} />
        </div>
        <p className="font-display font-semibold text-[16px] text-text-primary">Nicio programare</p>
        <p className="text-[13px] text-text-secondary mt-1">
          Programările tale vor apărea aici după confirmare.
        </p>
      </div>
    );
  }
  if (tab === "completed") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-secondary text-text-tertiary flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={26} />
        </div>
        <p className="font-display font-semibold text-[16px] text-text-primary">Niciun plan finalizat</p>
        <p className="text-[13px] text-text-secondary mt-1">
          Planurile completate vor apărea aici.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-secondary text-text-tertiary flex items-center justify-center mx-auto mb-4">
        <ClipboardList size={26} />
      </div>
      <p className="font-display font-semibold text-[16px] text-text-primary">Niciun plan activ</p>
      <p className="text-[13px] text-text-secondary mt-1">
        Discută cu ClaudIA și creează primul tău plan civic.
      </p>
      <Link
        to="/chat"
        className="inline-flex items-center gap-1.5 mt-4 bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2 rounded-xl"
      >
        Deschide asistentul
      </Link>
    </div>
  );
}

// ── Main page ──
function PlansPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [appts, setAppts] = useState<SavedAppointment[]>(loadAppointments);

  const { data: events = [], isLoading } = useLifeEvents();
  const deleteEvent = useDeleteLifeEvent();

  const activeEvents = events.filter((e) => !e.is_completed);
  const completedEvents = events.filter((e) => e.is_completed);

  const handleDeletePlan = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteEvent.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleDeleteAppt = (id: string) => {
    removeAppointment(id);
    setAppts(loadAppointments());
  };

  const TABS: { key: Tab; label: string; icon: typeof ClipboardList; count: number }[] = [
    { key: "active", label: "Active", icon: Clock, count: activeEvents.length },
    { key: "completed", label: "Finalizate", icon: CheckCircle2, count: completedEvents.length },
    { key: "appointments", label: "Programări", icon: Calendar, count: appts.length },
  ];

  return (
    <AppShell
      topBar={
        <div className="hidden lg:block">
          <TopBar title="Planurile mele" subtitle="Proceduri civice" />
        </div>
      }
      contentClassName="desktop-content-readable"
      className="lg:!px-5"
    >
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Proceduri civice
        </p>
        <h1 className="font-display text-[28px] font-semibold text-foreground leading-tight mt-1">
          Planurile mele
        </h1>
        <p className="text-[14px] text-text-secondary mt-1">
          Urmărește și gestionează procedurile tale.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-0.5 scrollbar-hide">
        {TABS.map(({ key, label, icon: Icon, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium shrink-0 border transition-colors duration-150 ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface border-border text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {count > 0 && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    active ? "bg-white/20 text-white" : "bg-surface-secondary text-text-tertiary"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-tertiary">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-3 pb-6"
          >
            {tab === "active" && (
              activeEvents.length === 0
                ? <EmptyState tab="active" />
                : activeEvents.map((e) => (
                    <PlanCard key={e.id} event={e} onDelete={handleDeletePlan} />
                  ))
            )}

            {tab === "completed" && (
              completedEvents.length === 0
                ? <EmptyState tab="completed" />
                : completedEvents.map((e) => (
                    <PlanCard key={e.id} event={e} onDelete={handleDeletePlan} />
                  ))
            )}

            {tab === "appointments" && (
              appts.length === 0
                ? <EmptyState tab="appointments" />
                : appts.map((a) => (
                    <AppointmentCard key={a.id} appt={a} onDelete={handleDeleteAppt} />
                  ))
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Delete confirm dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmDialog
            open
            title={deleteTarget.title}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
