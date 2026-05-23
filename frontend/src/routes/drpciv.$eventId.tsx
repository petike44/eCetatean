import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
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
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Protected } from "@/lib/auth-guard";
import {
  useLifeEvent,
  useUpdateLifeEventStep,
  useGeneratePdf,
  useProfile,
  useVehicles,
  type StepStatus,
} from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/drpciv/$eventId")({
  head: () => ({ meta: [{ title: "Înmatriculare vehicul — DRPCIV — eCetățean" }] }),
  component: () => (
    <Protected>
      <DrpcivFlow />
    </Protected>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Main component ────────────────────────────────────────────────────────────

function DrpcivFlow() {
  const { eventId } = Route.useParams();
  const nav = useNavigate();
  const { show } = useToast();

  const { data: event, isLoading, error } = useLifeEvent(eventId);
  const { data: profile } = useProfile();
  const { data: vehicles } = useVehicles();
  const updateStep = useUpdateLifeEventStep();
  const generatePdf = useGeneratePdf();

  // Step 1 — editable fields for anything not in the profile
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
    county: "Cluj",
    bloc: "",
    scara: "",
    etaj: "",
    ap: "",
  });
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Sync from profile/vehicles once they load
  useState(() => {
    if (profile) {
      setPersonalFields((p) => ({
        ...p,
        email: p.email || profile.email || "",
        phone: p.phone || profile.phone || "",
      }));
    }
    if (firstVehicle) {
      setVehicleFields((v) => ({
        make: v.make || firstVehicle.make || "",
        model: v.model || firstVehicle.model || "",
        vin: v.vin || firstVehicle.vin || "",
        current_plate: v.current_plate || firstVehicle.plate_number || "",
      }));
    }
  });

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
            <p className="font-display font-semibold text-[18px] text-[#0F172A]">
              Eveniment negăsit
            </p>
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

  const step1Status: StepStatus = event.steps_status["step_1"] ?? "pending";
  const step1Done = step1Status === "completed";

  const completedCount = Object.values(event.steps_status).filter(
    (s) => s === "completed"
  ).length;
  const progressPct =
    event.total_steps > 0 ? (completedCount / event.total_steps) * 100 : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    try {
      await generatePdf.mutateAsync({
        formType: "cerere_drpciv",
        additionalData: {
          make: vehicleFields.make,
          model: vehicleFields.model,
          vin: vehicleFields.vin,
          current_plate: vehicleFields.current_plate,
          email: personalFields.email,
          phone: personalFields.phone,
          county: personalFields.county,
          bloc: personalFields.bloc,
          scara: personalFields.scara,
          etaj: personalFields.etaj,
          ap: personalFields.ap,
        },
      });
      setDownloaded(true);
      show("success", "Cererea a fost descărcată. Tipărește-o și semnează-o.");
    } catch {
      show("error", "Eroare la generarea PDF-ului. Verifică că template-ul este instalat.");
    }
  };

  const handleConfirmStep1 = async () => {
    try {
      await updateStep.mutateAsync({
        id: eventId,
        stepNumber: 1,
        status: "completed",
      });
      show("success", "Pasul 1 marcat ca finalizat! Urmează pasul 2.");
    } catch {
      show("error", "Eroare la actualizarea pasului");
    }
  };

  // ── Missing field detection ────────────────────────────────────────────────

  const missingPersonal = !profile?.full_name || !profile?.cnp || !profile?.address;
  const missingVehicle = !vehicleFields.make || !vehicleFields.vin;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell className="flex flex-col">
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
        <div className="lg:max-w-2xl lg:mx-auto">
          {/* ── Top bar ─────────────────────────────────────────────── */}
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
                  Înmatriculare vehicul cumpărat
                </h1>
                <p className="text-[12px] text-[#475569] mt-0.5">
                  {completedCount} din {event.total_steps} pași completați
                </p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="px-4 py-5 space-y-4">
            {/* ── Step 1 card (active) ─────────────────────────────── */}
            <div className="rounded-2xl border-2 border-[#1F4E79] bg-white shadow-md overflow-hidden">
              {/* Header */}
              <div className="bg-[#1F4E79] px-5 py-4 flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    step1Done
                      ? "bg-[#22C55E]"
                      : "bg-white/20 border-2 border-white/60"
                  }`}
                >
                  {step1Done ? (
                    <Check size={15} className="text-white" />
                  ) : (
                    <span className="text-white font-bold text-[13px]">1</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-white text-[15px]">
                    Cererea solicitantului
                  </p>
                  <p className="text-[12px] text-[#93C5FD] mt-0.5">
                    Primul pas obligatoriu la DRPCIV · Gratuit
                  </p>
                </div>
                {step1Done && (
                  <span className="text-[11px] font-semibold text-[#BBF7D0] bg-[#166534]/40 px-2.5 py-1 rounded-full">
                    Finalizat
                  </span>
                )}
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Description */}
                <p className="text-[13.5px] text-[#475569] leading-relaxed">
                  Completează și descarcă <strong>Cererea solicitantului</strong> — formularul
                  oficial DRPCIV pre-completat cu datele tale. Tipărește-l, semnează-l și
                  aduce-l la ghișeu împreună cu celelalte documente.
                </p>

                {/* ── Personal data preview ──────────────────────────── */}
                <DataSection
                  icon={<User size={14} />}
                  title="Date personale"
                  missing={missingPersonal}
                  editMode={editingPersonal}
                  onEdit={() => setEditingPersonal((v) => !v)}
                >
                  {editingPersonal ? (
                    <div className="space-y-2 mt-3">
                      <FieldNote text="Completează câmpurile lipsă. Datele principale (Nume, CNP, Adresă) se editează din Profil." />
                      <InputRow
                        label="Email"
                        value={personalFields.email}
                        onChange={(v) =>
                          setPersonalFields((p) => ({ ...p, email: v }))
                        }
                        placeholder="email@exemplu.ro"
                      />
                      <InputRow
                        label="Telefon"
                        value={personalFields.phone}
                        onChange={(v) =>
                          setPersonalFields((p) => ({ ...p, phone: v }))
                        }
                        placeholder="07xx xxx xxx"
                      />
                      <InputRow
                        label="Județ"
                        value={personalFields.county}
                        onChange={(v) =>
                          setPersonalFields((p) => ({ ...p, county: v }))
                        }
                        placeholder="Cluj"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <InputRow
                          label="Bloc"
                          value={personalFields.bloc}
                          onChange={(v) =>
                            setPersonalFields((p) => ({ ...p, bloc: v }))
                          }
                          placeholder="B1"
                        />
                        <InputRow
                          label="Scara"
                          value={personalFields.scara}
                          onChange={(v) =>
                            setPersonalFields((p) => ({ ...p, scara: v }))
                          }
                          placeholder="1"
                        />
                        <InputRow
                          label="Etaj"
                          value={personalFields.etaj}
                          onChange={(v) =>
                            setPersonalFields((p) => ({ ...p, etaj: v }))
                          }
                          placeholder="2"
                        />
                      </div>
                      <InputRow
                        label="Apartament"
                        value={personalFields.ap}
                        onChange={(v) =>
                          setPersonalFields((p) => ({ ...p, ap: v }))
                        }
                        placeholder="12"
                      />
                      <button
                        onClick={() => setEditingPersonal(false)}
                        className="press w-full mt-1 py-2 rounded-xl bg-[#1F4E79] text-white text-[13px] font-semibold"
                      >
                        Salvează
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      <FieldRow label="Nume" value={profile?.full_name} required />
                      <FieldRow label="CNP" value={profile?.cnp} required />
                      <FieldRow
                        label="Adresă"
                        value={
                          profile?.address
                            ? `${profile.address}${personalFields.bloc ? `, bl. ${personalFields.bloc}` : ""}${personalFields.ap ? `, ap. ${personalFields.ap}` : ""}`
                            : undefined
                        }
                        required
                      />
                      <FieldRow label="Localitate" value={profile?.city ?? "Cluj-Napoca"} />
                      <FieldRow label="Județ" value={personalFields.county} />
                      <FieldRow label="Email" value={personalFields.email || profile?.email} />
                      <FieldRow label="Telefon" value={personalFields.phone || profile?.phone} />
                    </div>
                  )}
                </DataSection>

                {/* ── Vehicle data ──────────────────────────────────── */}
                <DataSection
                  icon={<Car size={14} />}
                  title="Date vehicul"
                  missing={missingVehicle}
                  editMode={editingVehicle}
                  onEdit={() => setEditingVehicle((v) => !v)}
                >
                  {editingVehicle ? (
                    <div className="space-y-2 mt-3">
                      <InputRow
                        label="Marcă"
                        value={vehicleFields.make}
                        onChange={(v) =>
                          setVehicleFields((f) => ({ ...f, make: v }))
                        }
                        placeholder="ex. Volkswagen"
                      />
                      <InputRow
                        label="Tip / Model"
                        value={vehicleFields.model}
                        onChange={(v) =>
                          setVehicleFields((f) => ({ ...f, model: v }))
                        }
                        placeholder="ex. Golf 7"
                      />
                      <InputRow
                        label="Serie șasiu (VIN)"
                        value={vehicleFields.vin}
                        onChange={(v) =>
                          setVehicleFields((f) => ({ ...f, vin: v }))
                        }
                        placeholder="17 caractere"
                      />
                      <InputRow
                        label="Nr. înmatriculare curent"
                        value={vehicleFields.current_plate}
                        onChange={(v) =>
                          setVehicleFields((f) => ({ ...f, current_plate: v }))
                        }
                        placeholder="ex. CJ-01-ABC sau număr german"
                      />
                      <button
                        onClick={() => setEditingVehicle(false)}
                        className="press w-full mt-1 py-2 rounded-xl bg-[#1F4E79] text-white text-[13px] font-semibold"
                      >
                        Salvează
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      <FieldRow
                        label="Marcă"
                        value={vehicleFields.make}
                        required
                      />
                      <FieldRow
                        label="Tip / Model"
                        value={vehicleFields.model}
                      />
                      <FieldRow
                        label="Serie șasiu (VIN)"
                        value={vehicleFields.vin}
                        required
                      />
                      <FieldRow
                        label="Nr. înmatriculare curent"
                        value={vehicleFields.current_plate}
                      />
                    </div>
                  )}
                </DataSection>

                {/* ── Operation type note ───────────────────────────── */}
                <div className="flex items-start gap-2 bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl px-4 py-3">
                  <FileText size={14} className="text-[#0369A1] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[12px] font-semibold text-[#0369A1]">
                      Tipul operației
                    </p>
                    <p className="text-[12px] text-[#0C4A6E] mt-0.5">
                      Transcriere a transmiterii dreptului de proprietate
                      (cumpărare vehicul)
                    </p>
                  </div>
                </div>

                {/* Missing data warning */}
                {(missingPersonal || missingVehicle) && (
                  <div className="flex items-start gap-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-4 py-3">
                    <AlertCircle size={14} className="text-[#C2410C] mt-0.5 shrink-0" />
                    <p className="text-[12px] text-[#7C2D12]">
                      {missingPersonal
                        ? "Profilul tău este incomplet. Completează Numele, CNP-ul și Adresa din secțiunea Profil pentru a genera cererea corect."
                        : "Completează datele vehiculului (Marcă și VIN) pentru a genera cererea corect."}
                    </p>
                  </div>
                )}

                {/* ── Download button ───────────────────────────────── */}
                <button
                  onClick={handleDownload}
                  disabled={generatePdf.isPending}
                  className="press w-full flex items-center justify-center gap-2.5 bg-[#1F4E79] text-white font-semibold text-[14px] py-3.5 px-4 rounded-xl disabled:opacity-60 transition-opacity"
                >
                  {generatePdf.isPending ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Se generează...
                    </>
                  ) : (
                    <>
                      <Download size={17} />
                      Descarcă cererea completată (PDF)
                    </>
                  )}
                </button>

                {/* ── Confirm completion ────────────────────────────── */}
                {!step1Done && (
                  <button
                    onClick={handleConfirmStep1}
                    disabled={!downloaded || updateStep.isPending}
                    className="press w-full flex items-center justify-center gap-2 border-2 border-[#22C55E] text-[#15803D] font-semibold text-[14px] py-3 px-4 rounded-xl disabled:opacity-40 bg-[#F0FDF4] transition-all"
                    title={!downloaded ? "Descarcă cererea mai întâi" : ""}
                  >
                    <CheckCircle2 size={17} />
                    Am tipărit și semnat cererea → Pasul 1 finalizat
                  </button>
                )}
                {step1Done && (
                  <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl px-4 py-3">
                    <CheckCircle2 size={16} className="text-[#22C55E]" />
                    <p className="text-[13px] font-semibold text-[#15803D]">
                      Cererea este pregătită — continuă cu pasul 2
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Subsequent steps (locked until step 1 done) ─────── */}
            {event.step_details.slice(1).map((step) => {
              const key = `step_${step.order}`;
              const status: StepStatus =
                event.steps_status[key] ?? "pending";
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

            {/* ── "Urmează" tip ─────────────────────────────────────── */}
            {!step1Done && (
              <p className="text-center text-[12px] text-[#94A3B8] pb-2">
                Finalizează pasul 1 pentru a debloca pașii următori.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataSection({
  icon,
  title,
  missing,
  editMode,
  onEdit,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  missing: boolean;
  editMode: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onEdit}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#1F4E79]">{icon}</span>
          <span className="font-display font-semibold text-[13px] text-[#0F172A]">
            {title}
          </span>
          {missing && (
            <span className="text-[10px] font-semibold text-[#C2410C] bg-[#FFF7ED] border border-[#FED7AA] px-2 py-0.5 rounded-full">
              Date lipsă
            </span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <Pencil size={12} />
          {editMode ? "Gata" : "Editează"}
          {editMode ? (
            <ChevronUp size={14} className="text-[#94A3B8]" />
          ) : (
            <ChevronDown size={14} className="text-[#94A3B8]" />
          )}
        </span>
      </button>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  required,
}: {
  label: string;
  value?: string | null;
  required?: boolean;
}) {
  const empty = !value || value.trim() === "";
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] font-medium text-[#94A3B8] w-28 shrink-0">
        {label}
      </span>
      <span
        className={`text-[13px] font-medium ${
          empty
            ? required
              ? "text-[#EF4444] italic"
              : "text-[#CBD5E1] italic"
            : "text-[#0F172A]"
        }`}
      >
        {empty ? (required ? "Lipsă — adaugă din Profil" : "—") : value}
      </span>
    </div>
  );
}

function InputRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-[#475569]">{label}</label>
      <input
        className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] text-[13px] text-[#0F172A] outline-none focus:border-[#1F4E79] bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldNote({ text }: { text: string }) {
  return (
    <p className="text-[11.5px] text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 mb-1">
      {text}
    </p>
  );
}

function LockedStep({
  order,
  title,
  office,
  fee,
  status,
  unlocked,
}: {
  order: number;
  title: string;
  office: string;
  fee: string;
  status: StepStatus;
  unlocked: boolean;
}) {
  const done = status === "completed";

  return (
    <div
      className={`rounded-2xl border px-5 py-4 flex items-start gap-3 transition-all ${
        done
          ? "border-[#86EFAC] bg-[#F0FDF4]"
          : unlocked
          ? "border-[#E2E8F0] bg-white"
          : "border-[#E2E8F0] bg-[#F8FAFC] opacity-60"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 ${
          done
            ? "bg-[#22C55E] border-[#22C55E]"
            : unlocked
            ? "border-[#1F4E79]"
            : "border-[#CBD5E1] bg-[#F1F5F9]"
        }`}
      >
        {done ? (
          <Check size={14} className="text-white" />
        ) : unlocked ? (
          <span className="text-[#1F4E79] font-bold text-[12px]">{order}</span>
        ) : (
          <Lock size={12} className="text-[#94A3B8]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-[14px] text-[#0F172A]">
          {title}
        </p>
        <p className="text-[12px] text-[#475569] mt-0.5">{office}</p>
        <p className="text-[11px] text-[#94A3B8] mt-1">{fee}</p>
      </div>
      {!unlocked && (
        <span className="text-[11px] text-[#94A3B8] font-medium bg-[#F1F5F9] px-2 py-1 rounded-lg shrink-0">
          Blocat
        </span>
      )}
    </div>
  );
}
