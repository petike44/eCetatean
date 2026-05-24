import { useState, useEffect } from "react";
import {
  Check,
  Download,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
  Car,
  FileText,
  Pencil,
  CheckCircle2,
  CreditCard,
  Building2,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  useLifeEvent,
  useUpdateLifeEventStep,
  useAutofillDrpciv,
  useProfile,
  useVehicles,
  type LifeEventStep,
  type StepStatus,
  type Vehicle,
} from "@/lib/api-hooks";

// ─── Types ───────────────────────────────────────────────────────────────────

type VehicleFields = { make: string; model: string; vin: string; current_plate: string };
type PersonalFields = { email: string; phone: string; county: string; bloc: string; scara: string; etaj: string; ap: string };
type StepCategory = "docs" | "financial" | "onsite";

type StepMeta = { label: string; icon: React.ReactNode; color: string; bg: string; border: string };
const CATEGORY_META: Record<StepCategory, StepMeta> = {
  docs:      { label: "Documente de pregătit", icon: <FileText size={13} />,   color: "text-blue-700",  bg: "bg-blue-50",  border: "border-blue-200" },
  financial: { label: "Plăți necesare",         icon: <CreditCard size={13} />, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  onsite:    { label: "Prezentare la ghișeu",   icon: <Building2 size={13} />,  color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
};

const CATEGORY_ORDER: StepCategory[] = ["docs", "financial", "onsite"];

// ─── Main panel ──────────────────────────────────────────────────────────────

export function LifeEventStepsPanel({ eventId }: { eventId: string }) {
  const { show } = useToast();
  const { data: event, isLoading } = useLifeEvent(eventId);
  const { data: profile } = useProfile();
  const { data: vehicles } = useVehicles();
  const updateStep = useUpdateLifeEventStep();
  const autofillDrpciv = useAutofillDrpciv();

  const [vehicleFields, setVehicleFields] = useState<VehicleFields>({ make: "", model: "", vin: "", current_plate: "" });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [personalFields, setPersonalFields] = useState<PersonalFields>({ email: "", phone: "", county: "Cluj", bloc: "", scara: "", etaj: "", ap: "" });
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPersonalFields((p) => ({ ...p, email: p.email || profile.email || "", phone: p.phone || profile.phone || "" }));
  }, [profile]);

  useEffect(() => {
    const first = vehicles?.[0];
    if (!first || selectedVehicleId) return;
    applyVehicle(first);
  }, [vehicles]);

  const applyVehicle = (v: Vehicle) => {
    setVehicleFields({ make: v.make ?? "", model: v.model ?? "", vin: v.vin ?? "", current_plate: v.plate_number ?? "" });
    setSelectedVehicleId(v.id);
    setEditingVehicle(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface border border-border text-[13px] text-text-secondary">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Se încarcă pașii...
      </div>
    );
  }
  if (!event) return null;

  const step1Done = (event.steps_status["step_1"] ?? "pending") === "completed";
  const completedCount = Object.values(event.steps_status).filter((s) => s === "completed").length;
  const progressPct = event.total_steps > 0 ? (completedCount / event.total_steps) * 100 : 0;
  const missingPersonal = !profile?.full_name || !profile?.cnp || !profile?.address;
  const missingVehicle = !vehicleFields.make || !vehicleFields.vin;

  // Group ALL steps by category
  const grouped: Record<StepCategory, LifeEventStep[]> = { docs: [], financial: [], onsite: [] };
  for (const step of event.step_details) {
    const cat: StepCategory = step.category ?? "onsite";
    grouped[cat].push(step);
  }

  const isStepUnlocked = (step: LifeEventStep): boolean => {
    const status = event.steps_status[`step_${step.order}`] ?? "pending";
    if (status === "completed") return true;
    if (step.order === 1) return true;
    return step1Done;
  };

  const handleDownload = async () => {
    try {
      await autofillDrpciv.mutateAsync({
        make: vehicleFields.make, model: vehicleFields.model, vin: vehicleFields.vin,
        current_plate: vehicleFields.current_plate, county: personalFields.county,
        bloc: personalFields.bloc, scara: personalFields.scara, etaj: personalFields.etaj,
        ap: personalFields.ap, email: personalFields.email, phone: personalFields.phone,
      });
      setDownloaded(true);
      show("success", "Cererea a fost descărcată. Tipărește-o și semnează-o.");
    } catch (err) {
      show("error", `Eroare PDF: ${err instanceof Error ? err.message : "Eroare necunoscută"}`);
    }
  };

  const handleMarkStep = async (stepNumber: number) => {
    try {
      await updateStep.mutateAsync({ id: eventId, stepNumber, status: "completed" });
      show("success", `Pasul ${stepNumber} finalizat!`);
    } catch {
      show("error", "Eroare la actualizarea pasului");
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* Progress header */}
      <div className="rounded-2xl bg-surface border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <p className="font-display font-bold text-[15px] text-foreground">{event.event_type.replace(/_/g, " ")}</p>
            <p className="text-[12px] text-text-secondary mt-0.5">{completedCount} din {event.total_steps} pași completați</p>
          </div>
          <span className="text-[12px] font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-full">{Math.round(progressPct)}%</span>
        </div>
        <div className="mx-4 mb-4 h-2 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Steps grouped by category */}
      {CATEGORY_ORDER.map((cat) => {
        const steps = grouped[cat];
        if (steps.length === 0) return null;
        const meta = CATEGORY_META[cat];
        const doneInCat = steps.filter((s) => (event.steps_status[`step_${s.order}`] ?? "pending") === "completed").length;

        return (
          <CategorySection key={cat} meta={meta} stepsDone={doneInCat} stepsTotal={steps.length}>
            <div className="divide-y divide-border">
              {steps.map((step) => {
                const status: StepStatus = event.steps_status[`step_${step.order}`] ?? "pending";
                const unlocked = isStepUnlocked(step);
                const action = step.online_action;

                // Special expanded card for the cerere DRPCIV step
                if (step.form_type === "cerere_drpciv" && status !== "completed") {
                  return (
                    <div key={step.order} className="bg-white">
                      <div className="flex items-center gap-3 px-3 py-3 bg-surface-secondary border-b border-border">
                        <StepCircle order={step.order} done={false} unlocked />
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-[13px] text-foreground leading-tight">{step.title}</p>
                          <p className="text-[11px] text-text-secondary mt-0.5">{step.office} · {step.fee}</p>
                        </div>
                      </div>
                      <div className="px-3 py-3 space-y-3">
                        {/* Personal data */}
                        <DataSection icon={<User size={13} />} title="Date personale" missing={missingPersonal} editMode={editingPersonal} onEdit={() => setEditingPersonal((v) => !v)}>
                          {editingPersonal ? (
                            <div className="space-y-2 mt-3">
                              <FieldNote text="Datele principale (Nume, CNP, Adresă) se editează din Profil." />
                              <InputRow label="Email" value={personalFields.email} onChange={(v) => setPersonalFields((p) => ({ ...p, email: v }))} placeholder="email@exemplu.ro" />
                              <InputRow label="Telefon" value={personalFields.phone} onChange={(v) => setPersonalFields((p) => ({ ...p, phone: v }))} placeholder="07xx xxx xxx" />
                              <InputRow label="Județ" value={personalFields.county} onChange={(v) => setPersonalFields((p) => ({ ...p, county: v }))} placeholder="Cluj" />
                              <div className="grid grid-cols-3 gap-2">
                                <InputRow label="Bloc" value={personalFields.bloc} onChange={(v) => setPersonalFields((p) => ({ ...p, bloc: v }))} placeholder="B1" />
                                <InputRow label="Scara" value={personalFields.scara} onChange={(v) => setPersonalFields((p) => ({ ...p, scara: v }))} placeholder="1" />
                                <InputRow label="Etaj" value={personalFields.etaj} onChange={(v) => setPersonalFields((p) => ({ ...p, etaj: v }))} placeholder="2" />
                              </div>
                              <InputRow label="Apartament" value={personalFields.ap} onChange={(v) => setPersonalFields((p) => ({ ...p, ap: v }))} placeholder="12" />
                              <button onClick={() => setEditingPersonal(false)} className="press w-full py-2 rounded-xl bg-primary text-white text-[13px] font-semibold">Salvează</button>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-1.5">
                              <FieldRow label="Nume" value={profile?.full_name} required />
                              <FieldRow label="CNP" value={profile?.cnp} required />
                              <FieldRow label="Adresă" value={profile?.address ? `${profile.address}${personalFields.bloc ? `, bl. ${personalFields.bloc}` : ""}${personalFields.ap ? `, ap. ${personalFields.ap}` : ""}` : undefined} required />
                              <FieldRow label="Localitate" value={profile?.city ?? "Cluj-Napoca"} />
                              <FieldRow label="Județ" value={personalFields.county} />
                              <FieldRow label="Email" value={personalFields.email || profile?.email} />
                              <FieldRow label="Telefon" value={personalFields.phone || profile?.phone} />
                            </div>
                          )}
                        </DataSection>

                        {/* Vehicle data */}
                        <DataSection icon={<Car size={13} />} title="Date vehicul" missing={missingVehicle} editMode={editingVehicle} onEdit={() => setEditingVehicle((v) => !v)}>
                          {vehicles && vehicles.length > 0 && (
                            <div className="mt-3 mb-2">
                              <p className="text-[11px] font-semibold text-text-secondary mb-1.5">Selectează vehiculul:</p>
                              <div className="flex flex-wrap gap-2">
                                {vehicles.map((v) => (
                                  <button key={v.id} type="button" onClick={() => applyVehicle(v)}
                                    className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${selectedVehicleId === v.id ? "bg-primary text-white border-primary" : "bg-surface-secondary text-foreground border-border hover:border-primary/50"}`}>
                                    <Car size={11} />
                                    {v.make ?? "?"} {v.model ?? ""}{v.plate_number ? ` · ${v.plate_number}` : ""}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {(!vehicles || vehicles.length === 0) && !editingVehicle && (
                            <FieldNote text="Nu ai vehicule salvate. Completează manual sau adaugă din Profil." />
                          )}
                          {editingVehicle ? (
                            <div className="space-y-2 mt-2">
                              <InputRow label="Marcă" value={vehicleFields.make} onChange={(v) => setVehicleFields((f) => ({ ...f, make: v }))} placeholder="ex. Volkswagen" />
                              <InputRow label="Tip / Model" value={vehicleFields.model} onChange={(v) => setVehicleFields((f) => ({ ...f, model: v }))} placeholder="ex. Golf 7" />
                              <InputRow label="Serie șasiu (VIN)" value={vehicleFields.vin} onChange={(v) => setVehicleFields((f) => ({ ...f, vin: v }))} placeholder="17 caractere" />
                              <InputRow label="Nr. înmatriculare" value={vehicleFields.current_plate} onChange={(v) => setVehicleFields((f) => ({ ...f, current_plate: v }))} placeholder="ex. CJ-01-ABC" />
                              <button onClick={() => setEditingVehicle(false)} className="press w-full py-2 rounded-xl bg-primary text-white text-[13px] font-semibold">Salvează</button>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-1.5">
                              <FieldRow label="Marcă" value={vehicleFields.make} required />
                              <FieldRow label="Tip / Model" value={vehicleFields.model} />
                              <FieldRow label="Serie șasiu (VIN)" value={vehicleFields.vin} required />
                              <FieldRow label="Nr. înmatriculare" value={vehicleFields.current_plate} />
                            </div>
                          )}
                        </DataSection>

                        {(missingPersonal || missingVehicle) && (
                          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                            <AlertCircle size={13} className="text-orange-600 mt-0.5 shrink-0" />
                            <p className="text-[12px] text-orange-800">
                              {missingPersonal ? "Profilul tău este incomplet. Completează Numele, CNP-ul și Adresa din Profil." : "Completează datele vehiculului (Marcă și VIN)."}
                            </p>
                          </div>
                        )}

                        <button onClick={handleDownload} disabled={autofillDrpciv.isPending || missingVehicle || missingPersonal}
                          className="press w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl disabled:opacity-60">
                          {autofillDrpciv.isPending
                            ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Se generează...</>
                            : <><Download size={14} />Descarcă cererea completată (PDF)</>}
                        </button>

                        <button onClick={() => handleMarkStep(step.order)} disabled={!downloaded || updateStep.isPending}
                          title={!downloaded ? "Descarcă cererea mai întâi" : ""}
                          className="press w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-700 font-semibold text-[13px] py-2 px-4 rounded-xl disabled:opacity-40 bg-green-50">
                          <CheckCircle2 size={14} />Am tipărit și semnat → Pasul {step.order} finalizat
                        </button>
                      </div>
                    </div>
                  );
                }

                // Standard step card
                return (
                  <div key={step.order}
                    className={`transition-all ${status === "completed" ? "bg-green-50/60" : !unlocked ? "bg-surface-secondary/60 opacity-60" : "bg-white"}`}>
                    <div className="flex items-center gap-3 px-3 py-3">
                      <StepCircle order={step.order} done={status === "completed"} unlocked={unlocked} />
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-[13px] text-foreground leading-tight">{step.title}</p>
                        <p className="text-[11px] text-text-secondary mt-0.5 truncate">{step.office}</p>
                        {step.fee && step.fee !== "Gratuit" && !step.fee.startsWith("Inclus") && (
                          <p className={`text-[11px] font-semibold mt-0.5 ${meta.color}`}>{step.fee}</p>
                        )}
                      </div>
                      {status === "completed" ? (
                        <DoneChip />
                      ) : !unlocked ? (
                        <span className="flex items-center gap-1 text-[10px] text-text-tertiary border border-border rounded-lg px-2 py-1 bg-surface shrink-0">
                          <Lock size={9} /> Blocat
                        </span>
                      ) : null}
                    </div>

                    {unlocked && status !== "completed" && (
                      <div className="px-3 pb-3 flex flex-col gap-1.5">
                        {action && <ActionButton action={action} meta={meta} />}
                        <button onClick={() => handleMarkStep(step.order)} disabled={updateStep.isPending}
                          className="press w-full text-[11.5px] font-semibold text-text-secondary py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-secondary transition-colors">
                          Marchează ca finalizat
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CategorySection>
        );
      })}

      {!step1Done && (
        <p className="text-center text-[11px] text-text-tertiary pb-1">
          Finalizează pasul 1 pentru a debloca celelalte categorii.
        </p>
      )}
    </div>
  );
}

// ─── Category section wrapper ─────────────────────────────────────────────────

function CategorySection({ meta, stepsDone, stepsTotal, children }: { meta: StepMeta; stepsDone: number; stepsTotal: number; children: React.ReactNode }) {
  const allDone = stepsDone === stepsTotal;
  return (
    <div className="rounded-2xl border border-border overflow-hidden shadow-card">
      <div className={`flex items-center justify-between px-4 py-2.5 ${meta.bg} ${meta.border} border-b`}>
        <div className="flex items-center gap-2">
          <span className={meta.color}>{meta.icon}</span>
          <span className={`font-display font-semibold text-[13px] ${meta.color}`}>{meta.label}</span>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${allDone ? "bg-green-100 text-green-700" : `${meta.bg} ${meta.color} border ${meta.border}`}`}>
          {allDone ? "✓ Gata" : `${stepsDone}/${stepsTotal}`}
        </span>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionButton({ action, meta }: { action: NonNullable<LifeEventStep["online_action"]>; meta: StepMeta }) {
  const icon =
    action.type === "payment" ? <CreditCard size={13} /> :
    action.type === "pdf" ? <Download size={13} /> :
    action.type === "appointment" ? <Calendar size={13} /> :
    <ExternalLink size={13} />;

  const handleClick = () => {
    if (action.url) window.open(action.url, "_blank", "noopener,noreferrer");
  };

  return (
    <button onClick={handleClick}
      className={`press w-full flex items-center justify-center gap-2 font-semibold text-[12.5px] py-2.5 px-4 rounded-xl ${meta.bg} ${meta.color} border ${meta.border} hover:opacity-80 transition-opacity`}>
      {icon}{action.label}
    </button>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function StepCircle({ order, done, unlocked }: { order: number; done: boolean; unlocked: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${done ? "bg-green-500 border-green-500" : unlocked ? "border-primary bg-white" : "border-border bg-surface"}`}>
      {done ? <Check size={13} className="text-white" strokeWidth={3} /> :
       unlocked ? <span className="text-primary font-bold text-[11px]">{order}</span> :
       <Lock size={10} className="text-text-tertiary" />}
    </div>
  );
}

function DoneChip() {
  return <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">✓ Gata</span>;
}

function DataSection({ icon, title, missing, editMode, onEdit, children }: { icon: React.ReactNode; title: string; missing: boolean; editMode: boolean; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button type="button" onClick={onEdit} className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-secondary hover:bg-surface transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="font-display font-semibold text-[12px] text-foreground">{title}</span>
          {missing && <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">Lipsă</span>}
        </div>
        <span className="flex items-center gap-1 text-[11px] text-text-secondary">
          <Pencil size={11} />
          {editMode ? "Gata" : "Editează"}
          {editMode ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

function FieldRow({ label, value, required }: { label: string; value?: string | null; required?: boolean }) {
  const empty = !value || value.trim() === "";
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] font-medium text-text-tertiary w-24 shrink-0">{label}</span>
      <span className={`text-[12px] font-medium ${empty ? (required ? "text-red-500 italic" : "text-text-tertiary italic") : "text-foreground"}`}>
        {empty ? (required ? "Lipsă — adaugă din Profil" : "—") : value}
      </span>
    </div>
  );
}

function InputRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-text-secondary">{label}</label>
      <input className="w-full h-8 px-3 rounded-lg border border-border text-[12px] text-foreground outline-none focus:border-primary bg-white"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function FieldNote({ text }: { text: string }) {
  return <p className="text-[11px] text-text-tertiary bg-surface-secondary border border-border rounded-lg px-3 py-2 mb-1">{text}</p>;
}
