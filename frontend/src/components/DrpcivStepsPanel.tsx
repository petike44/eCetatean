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
<<<<<<< HEAD
  CreditCard,
  Building2,
<<<<<<< Updated upstream
  ExternalLink,
  Calendar,
=======
>>>>>>> Stashed changes
=======
>>>>>>> parent of 5bd61d5 (pushpuleg)
} from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  useLifeEvent,
  useUpdateLifeEventStep,
  useAutofillDrpciv,
  useProfile,
  useVehicles,
  type StepStatus,
} from "@/lib/api-hooks";

// ─── Types ───────────────────────────────────────────────────────────────────

type VehicleFields = {
  make: string;
  model: string;
  vin: string;
  current_plate: string;
};

type PersonalFields = {
  email: string;
  phone: string;
  county: string;
  bloc: string;
  scara: string;
  etaj: string;
  ap: string;
};

type StepCategory = "docs" | "financial" | "onsite";

const CATEGORY_META: Record<StepCategory, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  docs: {
    label: "Documente de pregătit",
    icon: <FileText size={13} />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  financial: {
    label: "Plăți necesare",
    icon: <CreditCard size={13} />,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  onsite: {
    label: "Prezentare la ghișeu",
    icon: <Building2 size={13} />,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
};

// ─── Main panel ──────────────────────────────────────────────────────────────

export function DrpcivStepsPanel({ eventId }: { eventId: string }) {
  const { show } = useToast();
  const { data: event, isLoading } = useLifeEvent(eventId);
  const { data: profile } = useProfile();
  const { data: vehicles } = useVehicles();
  const updateStep = useUpdateLifeEventStep();
  const autofillDrpciv = useAutofillDrpciv();

<<<<<<< HEAD
<<<<<<< Updated upstream
  const [vehicleFields, setVehicleFields] = useState<VehicleFields>({ make: "", model: "", vin: "", current_plate: "" });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [personalFields, setPersonalFields] = useState<PersonalFields>({ email: "", phone: "", county: "Cluj", bloc: "", scara: "", etaj: "", ap: "" });
=======
  const firstVehicle = vehicles?.[0];

  const [vehicleFields, setVehicleFields] = useState<VehicleFields>({
    make: "",
    model: "",
    vin: "",
    current_plate: "",
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [personalFields, setPersonalFields] = useState<PersonalFields>({
    email: "",
    phone: "",
=======
  const firstVehicle = vehicles?.[0];

  const [vehicleFields, setVehicleFields] = useState<VehicleFields>({
    make: firstVehicle?.make ?? "",
    model: firstVehicle?.model ?? "",
    vin: firstVehicle?.vin ?? "",
    current_plate: firstVehicle?.plate_number ?? "",
  });
  const [personalFields, setPersonalFields] = useState<PersonalFields>({
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
>>>>>>> parent of 5bd61d5 (pushpuleg)
    county: "Cluj",
    bloc: "",
    scara: "",
    etaj: "",
    ap: "",
  });
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> parent of 5bd61d5 (pushpuleg)
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPersonalFields((p) => ({
      ...p,
      email: p.email || profile.email || "",
      phone: p.phone || profile.phone || "",
    }));
  }, [profile]);

  // Auto-select first vehicle on load
  useEffect(() => {
<<<<<<< HEAD
<<<<<<< Updated upstream
    const first = vehicles?.[0];
    if (!first || selectedVehicleId) return;
    applyVehicle(first);
  }, [vehicles]);

  const applyVehicle = (v: Vehicle) => {
    setVehicleFields({ make: v.make ?? "", model: v.model ?? "", vin: v.vin ?? "", current_plate: v.plate_number ?? "" });
    setSelectedVehicleId(v.id);
    setEditingVehicle(false);
  };
=======
    if (!firstVehicle || selectedVehicleId) return;
    applyVehicle(firstVehicle);
    setSelectedVehicleId(firstVehicle.id);
  }, [firstVehicle]);
>>>>>>> Stashed changes

  const applyVehicle = (v: Vehicle) => {
    setVehicleFields({
      make: v.make ?? "",
      model: v.model ?? "",
      vin: v.vin ?? "",
      current_plate: v.plate_number ?? "",
    });
    setSelectedVehicleId(v.id);
    setEditingVehicle(false);
  };
=======
    if (!firstVehicle) return;
    setVehicleFields((v) => ({
      make: v.make || firstVehicle.make || "",
      model: v.model || firstVehicle.model || "",
      vin: v.vin || firstVehicle.vin || "",
      current_plate: v.current_plate || firstVehicle.plate_number || "",
    }));
  }, [firstVehicle]);
>>>>>>> parent of 5bd61d5 (pushpuleg)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface border border-border text-[13px] text-text-secondary">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Se încarcă pașii...
      </div>
    );
  }

  if (!event) return null;

  const step1Status: StepStatus = event.steps_status["step_1"] ?? "pending";
  const step1Done = step1Status === "completed";
  const completedCount = Object.values(event.steps_status).filter((s) => s === "completed").length;
  const progressPct = event.total_steps > 0 ? (completedCount / event.total_steps) * 100 : 0;
  const missingPersonal = !profile?.full_name || !profile?.cnp || !profile?.address;
  const missingVehicle = !vehicleFields.make || !vehicleFields.vin;

<<<<<<< HEAD
<<<<<<< Updated upstream
  const step1Detail = event.step_details[0];
  const subsequentSteps = event.step_details.slice(1);

  // category comes from knowledge-base; cast to any to read it safely
  const grouped: Record<StepCategory, typeof subsequentSteps> = { docs: [], financial: [], onsite: [] };
  for (const step of subsequentSteps) {
    const cat: StepCategory = ((step as Record<string, unknown>).category as StepCategory) ?? "onsite";
=======
  // Group subsequent steps by category
  const subsequentSteps = event.step_details.slice(1);
  const grouped: Record<StepCategory, typeof subsequentSteps> = { docs: [], financial: [], onsite: [] };
  for (const step of subsequentSteps) {
    const cat: StepCategory = (step as { category?: StepCategory }).category ?? "onsite";
>>>>>>> Stashed changes
    grouped[cat].push(step);
  }
  const categoryOrder: StepCategory[] = ["docs", "financial", "onsite"];

=======
>>>>>>> parent of 5bd61d5 (pushpuleg)
  const handleDownload = async () => {
    try {
      await autofillDrpciv.mutateAsync({
        make: vehicleFields.make,
        model: vehicleFields.model,
        vin: vehicleFields.vin,
        current_plate: vehicleFields.current_plate,
        county: personalFields.county,
        bloc: personalFields.bloc,
        scara: personalFields.scara,
        etaj: personalFields.etaj,
        ap: personalFields.ap,
        email: personalFields.email,
        phone: personalFields.phone,
      });
      setDownloaded(true);
      show("success", "Cererea a fost descărcată. Tipărește-o și semnează-o.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Eroare necunoscută";
      show("error", `Eroare PDF: ${msg}`);
    }
  };

  const handleConfirmStep1 = async () => {
    try {
      await updateStep.mutateAsync({ id: eventId, stepNumber: 1, status: "completed" });
      show("success", "Pasul 1 finalizat! Continuă cu pasul 2.");
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
            <p className="font-display font-bold text-[15px] text-foreground">
              Înmatriculare vehicul cumpărat
            </p>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {completedCount} din {event.total_steps} pași completați
            </p>
          </div>
          <span className="text-[12px] font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-full">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="mx-4 mb-4 h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

<<<<<<< HEAD
<<<<<<< Updated upstream
      {/* ── 📄 Documente de pregătit ── */}
      <CategorySection meta={CATEGORY_META.docs} stepsDone={step1Done ? 1 : 0} stepsTotal={1}>
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3 bg-surface-secondary border-b border-border">
            <StepCircle order={1} done={step1Done} unlocked />
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-[13px] text-foreground leading-tight">{step1Detail?.title ?? "Cererea solicitantului"}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">{step1Detail?.office ?? "DRPCIV"} · {step1Detail?.fee ?? "Gratuit"}</p>
            </div>
            {step1Done && <DoneChip />}
=======
      {/* Category roadmap overview */}
      {categoryOrder.some((cat) => grouped[cat].length > 0) && (
        <div className="rounded-2xl bg-surface border border-border shadow-card p-4">
          <p className="font-display font-semibold text-[12px] text-text-secondary uppercase tracking-wide mb-3">
            Ce urmează
          </p>
          <div className="flex flex-col gap-2">
            {/* Step 1 always shown as docs */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-50 text-blue-700 shrink-0">
                <FileText size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-semibold text-blue-700">Documente de pregătit</span>
                <span className="text-[11px] text-text-tertiary ml-2">Pasul 1 · Gratuit</span>
              </div>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 text-[10px] font-bold ${step1Done ? "bg-green-500 border-green-500 text-white" : "border-border text-text-tertiary"}`}>
                {step1Done ? "✓" : "1"}
              </span>
            </div>
            {categoryOrder.map((cat) => {
              const steps = grouped[cat];
              if (steps.length === 0) return null;
              const meta = CATEGORY_META[cat];
              const allDone = steps.every((s) => (event.steps_status[`step_${s.order}`] ?? "pending") === "completed");
              const feeSummary = steps.map((s) => s.fee).filter((f) => f && f !== "Gratuit" && !f.startsWith("Inclus")).join(" + ") || "Gratuit";
              return (
                <div key={cat} className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${meta.bg} ${meta.color} shrink-0`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[12px] font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-[11px] text-text-tertiary ml-2">{steps.length} {steps.length === 1 ? "pas" : "pași"} · {feeSummary}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${allDone ? "bg-green-100 text-green-700" : step1Done ? "bg-surface text-text-secondary border border-border" : "bg-surface text-text-tertiary border border-border opacity-60"}`}>
                    {allDone ? "✓ Gata" : step1Done ? "Urmează" : "Blocat"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

=======
>>>>>>> parent of 5bd61d5 (pushpuleg)
      {/* Step 1 — active card */}
      <div className="rounded-2xl border-2 border-primary bg-white shadow-md overflow-hidden">
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              step1Done ? "bg-green-500" : "bg-white/20 border-2 border-white/60"
            }`}
          >
            {step1Done ? (
              <Check size={14} className="text-white" />
<<<<<<< HEAD
            ) : (
              <span className="text-white font-bold text-[13px]">1</span>
            )}
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
            <button onClick={handleDownload} disabled={autofillDrpciv.isPending}
              className="press w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl disabled:opacity-60">
              {autofillDrpciv.isPending
                ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Se generează...</>
                : <><Download size={14} />Descarcă cererea completată (PDF)</>}
=======
          {/* Vehicle data */}
          <DataSection
            icon={<Car size={13} />}
            title="Date vehicul"
            missing={missingVehicle}
            editMode={editingVehicle}
            onEdit={() => setEditingVehicle((v) => !v)}
          >
            {/* Vehicle selector */}
            {vehicles && vehicles.length > 0 && (
              <div className="mt-3 mb-2">
                <p className="text-[11px] font-semibold text-text-secondary mb-1.5">Selectează vehiculul din profilul tău:</p>
                <div className="flex flex-wrap gap-2">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => applyVehicle(v)}
                      className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                        selectedVehicleId === v.id
                          ? "bg-primary text-white border-primary"
                          : "bg-surface-secondary text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      <Car size={11} />
                      {v.make ?? "?"} {v.model ?? ""} {v.plate_number ? `· ${v.plate_number}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(!vehicles || vehicles.length === 0) && !editingVehicle && (
              <FieldNote text="Nu ai vehicule salvate. Completează datele manual sau adaugă un vehicul din Profil." />
            )}

            {editingVehicle ? (
              <div className="space-y-2 mt-2">
                <InputRow label="Marcă" value={vehicleFields.make} onChange={(v) => setVehicleFields((f) => ({ ...f, make: v }))} placeholder="ex. Volkswagen" />
                <InputRow label="Tip / Model" value={vehicleFields.model} onChange={(v) => setVehicleFields((f) => ({ ...f, model: v }))} placeholder="ex. Golf 7" />
                <InputRow label="Serie șasiu (VIN)" value={vehicleFields.vin} onChange={(v) => setVehicleFields((f) => ({ ...f, vin: v }))} placeholder="17 caractere" />
                <InputRow label="Nr. înmatriculare curent" value={vehicleFields.current_plate} onChange={(v) => setVehicleFields((f) => ({ ...f, current_plate: v }))} placeholder="ex. CJ-01-ABC" />
                <button onClick={() => setEditingVehicle(false)} className="press w-full py-2 rounded-xl bg-primary text-white text-[13px] font-semibold">Salvează</button>
              </div>
            ) : (
              <div className="mt-2 space-y-1.5">
                <FieldRow label="Marcă" value={vehicleFields.make} required />
                <FieldRow label="Tip / Model" value={vehicleFields.model} />
                <FieldRow label="Serie șasiu (VIN)" value={vehicleFields.vin} required />
                <FieldRow label="Nr. înmatriculare curent" value={vehicleFields.current_plate} />
              </div>
            )}
          </DataSection>

          {/* Operation type */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
            <FileText size={13} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-blue-700">Tipul operației</p>
              <p className="text-[12px] text-blue-800 mt-0.5">
                Transcriere a transmiterii dreptului de proprietate (cumpărare vehicul)
              </p>
            </div>
          </div>

          {/* Missing data warning */}
          {(missingPersonal || missingVehicle) && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} className="text-orange-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-orange-800">
                {missingPersonal
                  ? "Profilul tău este incomplet. Completează Numele, CNP-ul și Adresa din Profil."
                  : "Completează datele vehiculului (Marcă și VIN)."}
              </p>
            </div>
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={autofillDrpciv.isPending}
            className="press w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-[13px] py-3 px-4 rounded-xl disabled:opacity-60"
          >
            {autofillDrpciv.isPending ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Se generează...
              </>
            ) : (
              <>
                <Download size={15} />
                Descarcă cererea completată (PDF)
              </>
            )}
          </button>

          {/* Confirm step */}
          {!step1Done && (
            <button
              onClick={handleConfirmStep1}
              disabled={!downloaded || updateStep.isPending}
              className="press w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-700 font-semibold text-[13px] py-2.5 px-4 rounded-xl disabled:opacity-40 bg-green-50"
              title={!downloaded ? "Descarcă cererea mai întâi" : ""}
            >
              <CheckCircle2 size={15} />
              Am tipărit și semnat → Pasul 1 finalizat
>>>>>>> Stashed changes
            </button>
            {!step1Done ? (
              <button onClick={() => handleMarkStep(1)} disabled={!downloaded || updateStep.isPending}
                title={!downloaded ? "Descarcă cererea mai întâi" : ""}
                className="press w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-700 font-semibold text-[13px] py-2 px-4 rounded-xl disabled:opacity-40 bg-green-50">
                <CheckCircle2 size={14} />Am tipărit și semnat → Pasul 1 finalizat
              </button>
=======
>>>>>>> parent of 5bd61d5 (pushpuleg)
            ) : (
              <span className="text-white font-bold text-[13px]">1</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-white text-[14px]">
              Cererea solicitantului
            </p>
            <p className="text-[11px] text-blue-200 mt-0.5">
              Primul pas obligatoriu la DRPCIV · Gratuit
            </p>
          </div>
          {step1Done && (
            <span className="text-[11px] font-semibold text-green-200 bg-green-900/30 px-2 py-0.5 rounded-full shrink-0">
              Finalizat
            </span>
          )}
        </div>

        <div className="px-4 py-4 space-y-4">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Completează și descarcă <strong>Cererea solicitantului</strong> — formularul oficial
            DRPCIV pre-completat cu datele tale. Tipărește-l, semnează-l și adu-l la ghișeu.
          </p>

<<<<<<< HEAD
<<<<<<< Updated upstream
        return (
          <CategorySection key={cat} meta={meta} stepsDone={doneInCat} stepsTotal={steps.length}>
            <div className="space-y-2">
              {steps.map((step) => {
                const status: StepStatus = event.steps_status[`step_${step.order}`] ?? "pending";
                const unlocked = step1Done || status === "completed";
                const action = step.online_action as { label: string; type: string; url?: string } | undefined;
=======
          {/* Personal data */}
          <DataSection
            icon={<User size={13} />}
            title="Date personale"
            missing={missingPersonal}
            editMode={editingPersonal}
            onEdit={() => setEditingPersonal((v) => !v)}
          >
            {editingPersonal ? (
              <div className="space-y-2 mt-3">
                <FieldNote text="Datele principale (Nume, CNP, Adresă) se editează din secțiunea Profil." />
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
                <FieldRow
                  label="Adresă"
                  value={profile?.address ? `${profile.address}${personalFields.bloc ? `, bl. ${personalFields.bloc}` : ""}${personalFields.ap ? `, ap. ${personalFields.ap}` : ""}` : undefined}
                  required
                />
                <FieldRow label="Localitate" value={profile?.city ?? "Cluj-Napoca"} />
                <FieldRow label="Județ" value={personalFields.county} />
                <FieldRow label="Email" value={personalFields.email || profile?.email} />
                <FieldRow label="Telefon" value={personalFields.phone || profile?.phone} />
              </div>
            )}
          </DataSection>
>>>>>>> parent of 5bd61d5 (pushpuleg)

          {/* Vehicle data */}
          <DataSection
            icon={<Car size={13} />}
            title="Date vehicul"
            missing={missingVehicle}
            editMode={editingVehicle}
            onEdit={() => setEditingVehicle((v) => !v)}
          >
            {editingVehicle ? (
              <div className="space-y-2 mt-3">
                <InputRow label="Marcă" value={vehicleFields.make} onChange={(v) => setVehicleFields((f) => ({ ...f, make: v }))} placeholder="ex. Volkswagen" />
                <InputRow label="Tip / Model" value={vehicleFields.model} onChange={(v) => setVehicleFields((f) => ({ ...f, model: v }))} placeholder="ex. Golf 7" />
                <InputRow label="Serie șasiu (VIN)" value={vehicleFields.vin} onChange={(v) => setVehicleFields((f) => ({ ...f, vin: v }))} placeholder="17 caractere" />
                <InputRow label="Nr. înmatriculare curent" value={vehicleFields.current_plate} onChange={(v) => setVehicleFields((f) => ({ ...f, current_plate: v }))} placeholder="ex. CJ-01-ABC" />
                <button onClick={() => setEditingVehicle(false)} className="press w-full py-2 rounded-xl bg-primary text-white text-[13px] font-semibold">Salvează</button>
              </div>
            ) : (
              <div className="mt-2 space-y-1.5">
                <FieldRow label="Marcă" value={vehicleFields.make} required />
                <FieldRow label="Tip / Model" value={vehicleFields.model} />
                <FieldRow label="Serie șasiu (VIN)" value={vehicleFields.vin} required />
                <FieldRow label="Nr. înmatriculare curent" value={vehicleFields.current_plate} />
              </div>
            )}
          </DataSection>

          {/* Operation type */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
            <FileText size={13} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-blue-700">Tipul operației</p>
              <p className="text-[12px] text-blue-800 mt-0.5">
                Transcriere a transmiterii dreptului de proprietate (cumpărare vehicul)
              </p>
            </div>
<<<<<<< HEAD
          </CategorySection>
=======
      {/* Grouped subsequent steps */}
      {categoryOrder.map((cat) => {
        const steps = grouped[cat];
        if (steps.length === 0) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat}>
            {/* Category header */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${meta.bg} ${meta.border} border mb-2`}>
              <span className={meta.color}>{meta.icon}</span>
              <span className={`font-display font-semibold text-[12px] ${meta.color}`}>{meta.label}</span>
            </div>
            <div className="space-y-2">
              {steps.map((step) => {
                const key = `step_${step.order}`;
                const status: StepStatus = event.steps_status[key] ?? "pending";
                const isUnlocked = step1Done || status === "completed";
                return (
                  <LockedStep
                    key={step.order}
                    order={step.order}
                    title={step.title}
                    office={step.office}
                    fee={step.fee}
                    status={status}
                    unlocked={isUnlocked}
                  />
                );
              })}
            </div>
          </div>
>>>>>>> Stashed changes
=======
          </div>

          {/* Missing data warning */}
          {(missingPersonal || missingVehicle) && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} className="text-orange-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-orange-800">
                {missingPersonal
                  ? "Profilul tău este incomplet. Completează Numele, CNP-ul și Adresa din Profil."
                  : "Completează datele vehiculului (Marcă și VIN)."}
              </p>
            </div>
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={autofillDrpciv.isPending}
            className="press w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-[13px] py-3 px-4 rounded-xl disabled:opacity-60"
          >
            {autofillDrpciv.isPending ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Se generează...
              </>
            ) : (
              <>
                <Download size={15} />
                Descarcă cererea completată (PDF)
              </>
            )}
          </button>

          {/* Confirm step */}
          {!step1Done && (
            <button
              onClick={handleConfirmStep1}
              disabled={!downloaded || updateStep.isPending}
              className="press w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-700 font-semibold text-[13px] py-2.5 px-4 rounded-xl disabled:opacity-40 bg-green-50"
              title={!downloaded ? "Descarcă cererea mai întâi" : ""}
            >
              <CheckCircle2 size={15} />
              Am tipărit și semnat → Pasul 1 finalizat
            </button>
          )}
          {step1Done && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={15} className="text-green-500" />
              <p className="text-[13px] font-semibold text-green-700">
                Cererea este pregătită — continuă cu pasul 2
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Subsequent steps */}
      {event.step_details.slice(1).map((step) => {
        const key = `step_${step.order}`;
        const status: StepStatus = event.steps_status[key] ?? "pending";
        const isUnlocked = step1Done || status === "completed";
        return (
          <LockedStep
            key={step.order}
            order={step.order}
            title={step.title}
            office={step.office}
            fee={step.fee}
            status={status}
            unlocked={isUnlocked}
          />
>>>>>>> parent of 5bd61d5 (pushpuleg)
        );
      })}

      {!step1Done && (
        <p className="text-center text-[11px] text-text-tertiary pb-1">
          Finalizează pasul 1 pentru a debloca pașii următori.
        </p>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataSection({
  icon, title, missing, editMode, onEdit, children,
}: {
  icon: React.ReactNode;
  title: string;
  missing: boolean;
  editMode: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onEdit}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-secondary hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="font-display font-semibold text-[12px] text-foreground">{title}</span>
          {missing && (
            <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
              Lipsă
            </span>
          )}
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
      <input
        className="w-full h-8 px-3 rounded-lg border border-border text-[12px] text-foreground outline-none focus:border-primary bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldNote({ text }: { text: string }) {
  return (
    <p className="text-[11px] text-text-tertiary bg-surface-secondary border border-border rounded-lg px-3 py-2 mb-1">
      {text}
    </p>
  );
}

function LockedStep({ order, title, office, fee, status, unlocked }: {
  order: number; title: string; office: string; fee: string; status: StepStatus; unlocked: boolean;
}) {
  const done = status === "completed";
  return (
    <div className={`rounded-2xl border px-4 py-3.5 flex items-start gap-3 transition-all ${
      done ? "border-green-300 bg-green-50" : unlocked ? "border-border bg-white" : "border-border bg-surface-secondary opacity-60"
    }`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 ${
        done ? "bg-green-500 border-green-500" : unlocked ? "border-primary" : "border-border bg-surface"
      }`}>
        {done ? <Check size={13} className="text-white" /> :
         unlocked ? <span className="text-primary font-bold text-[11px]">{order}</span> :
         <Lock size={11} className="text-text-tertiary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-[13px] text-foreground">{title}</p>
        <p className="text-[11px] text-text-secondary mt-0.5">{office}</p>
        <p className="text-[11px] text-text-tertiary mt-0.5">{fee}</p>
      </div>
      {!unlocked && (
        <span className="text-[10px] text-text-tertiary font-medium bg-surface px-2 py-1 rounded-lg shrink-0 border border-border">
          Blocat
        </span>
      )}
    </div>
  );
}
