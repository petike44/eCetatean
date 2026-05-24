import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { History, Loader2, Car, HeartPulse, GraduationCap, LogOut, ShieldCheck, ShieldAlert, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { FadeIn } from "@/components/motion-primitives";
import { Card, PrimaryButton, GhostButton, Field } from "@/components/ui-bits";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { Protected } from "@/lib/auth-guard";
import {
  type EidKitVerificationStatus,
  type Vehicle,
  useDemoEidKitVerification,
  useEidKitStatus,
  useProfile,
  useStartEidKitVerification,
  useUnlinkEidKitVerification,
  useUpsertProfile,
  useVehicles,
  useAddVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from "@/lib/api-hooks";
import { useAuth, useUser } from "@/lib/clerk-stub";
import { profileCompletion, profileDisplayName, profileInitials, formatRoDate } from "@/lib/profile-utils";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profilul meu — eCetățean" }] }),
  component: () => (
    <Protected>
      <Profile />
    </Protected>
  ),
});

const TABS = ["Personal", "Vehicule", "Locuință", "Sănătate", "Educație"] as const;

function Profile() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Personal");
  const [loggingOut, setLoggingOut] = useState(false);
  const { show } = useToast();
  const { data: profile, isLoading } = useProfile();
  const eidKitStatus = useEidKitStatus();
  const startEidKit = useStartEidKitVerification();
  const demoEidKit = useDemoEidKitVerification();
  const unlinkEidKit = useUnlinkEidKitVerification();
  const { user } = useUser();
  const upsert = useUpsertProfile();
  const authEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const displayName = profileDisplayName(profile, authEmail);
  const initials = profileInitials(profile?.full_name, authEmail);
  const { pct, filled, total } = profileCompletion(profile);

  const [fullName, setFullName] = useState("");
  const [cnp, setCnp] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Cluj-Napoca");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idSerie, setIdSerie] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idExpiry, setIdExpiry] = useState("");

  useEffect(() => {
    if (!profile && !authEmail) return;
    setFullName(profile?.full_name ?? "");
    setCnp(profile?.cnp ?? "");
    setAddress(profile?.address ?? "");
    setCity(profile?.city ?? "Cluj-Napoca");
    setPhone(profile?.phone ?? "");
    setEmail(profile?.email ?? authEmail ?? "");
    setIdSerie(profile?.buletin_series ?? "");
    setIdNumber(profile?.buletin_number ?? "");
    setIdExpiry(profile?.buletin_expiry?.slice(0, 10) ?? "");
  }, [profile, authEmail]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eidkit = params.get("eidkit");
    if (eidkit === "verified") {
      show("success", "Identitatea a fost verificată prin buletin electronic");
      queryClient.invalidateQueries({ queryKey: ["eidkit-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (eidkit === "failed") {
      show("error", "Verificarea EidKit a eșuat sau a fost anulată");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient, show]);

  const savePersonal = async () => {
    if (!fullName.trim()) {
      show("error", "Numele complet este obligatoriu");
      return;
    }
    try {
      await upsert.mutateAsync({
        full_name: fullName.trim(),
        cnp: cnp.trim() || null,
        address: address.trim() || null,
        city: city.trim() || "Cluj-Napoca",
        phone: phone.trim() || null,
        email: email.trim() || authEmail,
        buletin_series: idSerie.trim() || null,
        buletin_number: idNumber.trim() || null,
        buletin_expiry: idExpiry || null,
      });
      show("success", "Modificările au fost salvate");
    } catch {
      show("error", "Eroare la salvarea profilului");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      queryClient.clear();
      nav({ to: "/auth", replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AppShell
      topBar={
        <div className="hidden lg:block">
          <TopBar
            title="Profilul meu"
            right={
              <Link
                to="/audit"
                aria-label="Istoric civic"
                className="press w-9 h-9 rounded-full flex items-center justify-center bg-black/[0.04] hover:bg-black/[0.08] active:bg-black/[0.12] transition-colors duration-150"
              >
                <History size={17} strokeWidth={2} className="text-text-secondary" />
              </Link>
            }
          />
        </div>
      }
    >
      <div className="lg:max-w-5xl lg:mx-auto">
        <FadeIn className="px-5 pt-5 lg:px-0 lg:pt-2">
          <h1 className="font-display font-bold text-[22px] text-text-primary mb-4 lg:hidden">Profilul meu</h1>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-[22px]">
              {isLoading ? <Loader2 size={22} className="animate-spin" /> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-[18px] text-text-primary truncate">
                {isLoading ? "Se încarcă..." : displayName}
              </h2>
              <p className="text-[13px] text-text-tertiary truncate">
                {phone || authEmail || "Completează datele de contact"}
              </p>
            </div>
            {profile?.city && (
              <span className="text-[12px] text-text-tertiary shrink-0 px-2 py-1 rounded-full bg-surface-secondary border border-border">
                {profile.city}
              </span>
            )}
          </div>
        </FadeIn>

        <div className="px-5 mt-5 lg:px-0">
          <Card accent="amber">
            <div className="flex justify-between items-baseline mb-2">
              <p className="font-display font-semibold text-[14px] text-text-primary">
                Profil {pct}% completat
              </p>
              <span className="text-[12px] text-text-tertiary">{filled} din {total} câmpuri</span>
            </div>
            <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </Card>
        </div>

        <div className="px-5 mt-4 lg:px-8">
          <EidKitCard
            status={eidKitStatus.data}
            loading={eidKitStatus.isLoading}
            startPending={startEidKit.isPending}
            demoPending={demoEidKit.isPending}
            unlinkPending={unlinkEidKit.isPending}
            startError={startEidKit.error instanceof Error ? startEidKit.error.message : null}
            onStart={() => startEidKit.mutate()}
            onDemo={async () => {
              try {
                await demoEidKit.mutateAsync();
                show("success", "Verificarea demo EidKit a fost aplicată");
              } catch (err) {
                show("error", err instanceof Error ? err.message : "Verificarea demo EidKit a eșuat");
              }
            }}
            onUnlink={async () => {
              try {
                await unlinkEidKit.mutateAsync();
                show("success", "Verificarea EidKit a fost eliminată");
              } catch {
                show("error", "Nu am putut elimina verificarea EidKit");
              }
            }}
          />
        </div>

        <div className="sticky top-14 lg:top-0 z-20 bg-bg/90 backdrop-blur-md pt-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide px-5 lg:px-0 border-b border-border relative">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "press relative shrink-0 px-4 py-3 min-h-11 text-[14px] font-semibold transition-colors z-[1]",
                  tab === t ? "text-accent" : "text-text-tertiary",
                )}
              >
                {tab === t && (
                  <motion.span
                    layoutId="profile-tab"
                    className="absolute inset-x-1 bottom-0 h-0.5 bg-accent rounded-full"
                    transition={navIndicator.transition}
                  />
                )}
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-5 lg:px-0 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
          {tab === "Personal" && (
            <div className="space-y-5">
              <SectionTitle>Identitate</SectionTitle>
              <ProfileInput label="Nume complet" value={fullName} onChange={setFullName} required />
              <ProfileInput label="CNP" value={cnp} onChange={setCnp} maxLength={13} placeholder="13 cifre" />
              <SectionTitle>Buletin</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <ProfileInput label="Serie" value={idSerie} onChange={setIdSerie} />
                <ProfileInput label="Număr" value={idNumber} onChange={setIdNumber} />
              </div>
              <label className="block">
                <span className="text-[13px] font-medium text-text-secondary">Data expirării</span>
                <input
                  type="date"
                  value={idExpiry}
                  onChange={(e) => setIdExpiry(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3.5 min-h-11 text-[15px]"
                />
              </label>
              {profile?.buletin_expiry && (
                <p className="text-[12px] text-text-tertiary">
                  Expiră: {formatRoDate(profile.buletin_expiry)}
                </p>
              )}
              <SectionTitle>Adresă</SectionTitle>
              <ProfileInput label="Adresă" value={address} onChange={setAddress} />
              <ProfileInput label="Oraș" value={city} onChange={setCity} />
              <SectionTitle>Contact</SectionTitle>
              <ProfileInput label="Telefon" value={phone} onChange={setPhone} type="tel" />
              <ProfileInput label="Email" value={email} onChange={setEmail} type="email" />
              <div className="pt-2">
                <PrimaryButton disabled={upsert.isPending} onClick={() => void savePersonal()}>
                  {upsert.isPending ? "Se salvează..." : "Salvează"}
                </PrimaryButton>
              </div>
            </div>
          )}

          {tab === "Vehicule" && <VehiclesTab />}

          {tab === "Locuință" && (
            <div className="space-y-4">
              <ProfileInput label="Adresă locuință" value={address} onChange={setAddress} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Suprafață (m²)" placeholder="—" />
                <Field label="Nr. camere" placeholder="—" />
              </div>
              <PrimaryButton disabled={upsert.isPending} onClick={() => void savePersonal()}>
                Salvează
              </PrimaryButton>
            </div>
          )}

          {tab === "Sănătate" && (
            <TabEmpty
              icon={HeartPulse}
              title="Date medicale"
              description="Secțiunea pentru medic de familie și asigurări va fi disponibilă în curând."
            />
          )}

          {tab === "Educație" && (
            <TabEmpty
              icon={GraduationCap}
              title="Date educaționale"
              description="Poți salva studiile și diplomele aici — funcția vine în curând."
            />
          )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-5 pt-2 pb-8 lg:px-0 lg:pb-10 mt-4 border-t border-border">
          <p className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-3 pt-4">
            Sesiune
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            aria-label="Deconectare"
            className="press w-full flex items-center justify-center gap-2 min-h-11 rounded-xl border border-error/30 bg-error/5 text-error font-semibold text-[15px] px-6 py-3 hover:bg-error/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loggingOut ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogOut size={18} strokeWidth={2} />
            )}
            {loggingOut ? "Se deconectează..." : "Deconectare"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

const EMPTY_VEHICLE = {
  plate_number: "",
  make: "",
  model: "",
  year: "",
  vin: "",
  fuel_type: "",
  engine_cc: "",
  color: "",
  itp_expiry: "",
  rca_expiry: "",
};

function VehiclesTab() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const addVehicle = useAddVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const { show } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_VEHICLE });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(v: Vehicle) {
    setEditingId(v.id);
    setForm({
      plate_number: v.plate_number ?? "",
      make: v.make ?? "",
      model: v.model ?? "",
      year: v.year != null ? String(v.year) : "",
      vin: v.vin ?? "",
      fuel_type: v.fuel_type ?? "",
      engine_cc: v.engine_cc != null ? String(v.engine_cc) : "",
      color: v.color ?? "",
      itp_expiry: v.itp_expiry?.slice(0, 10) ?? "",
      rca_expiry: v.rca_expiry?.slice(0, 10) ?? "",
    });
    setShowForm(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY_VEHICLE });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plate_number.trim()) {
      show("error", "Numărul de înmatriculare este obligatoriu");
      return;
    }
    try {
      await addVehicle.mutateAsync({
        plate_number: form.plate_number.trim(),
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        year: form.year ? Number(form.year) : null,
        vin: form.vin.trim() || null,
        fuel_type: form.fuel_type.trim() || null,
        engine_cc: form.engine_cc ? Number(form.engine_cc) : null,
        color: form.color.trim() || null,
        itp_expiry: form.itp_expiry || null,
        rca_expiry: form.rca_expiry || null,
      });
      show("success", "Vehicul adăugat");
      setShowForm(false);
      setForm({ ...EMPTY_VEHICLE });
    } catch {
      show("error", "Eroare la adăugarea vehiculului");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !form.plate_number.trim()) {
      show("error", "Numărul de înmatriculare este obligatoriu");
      return;
    }
    try {
      await updateVehicle.mutateAsync({
        id: editingId,
        plate_number: form.plate_number.trim(),
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        year: form.year ? Number(form.year) : null,
        vin: form.vin.trim() || null,
        fuel_type: form.fuel_type.trim() || null,
        engine_cc: form.engine_cc ? Number(form.engine_cc) : null,
        color: form.color.trim() || null,
        itp_expiry: form.itp_expiry || null,
        rca_expiry: form.rca_expiry || null,
      });
      show("success", "Vehicul actualizat");
      cancelEdit();
    } catch {
      show("error", "Eroare la actualizarea vehiculului");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVehicle.mutateAsync(id);
      show("success", "Vehicul șters");
      if (editingId === id) cancelEdit();
    } catch {
      show("error", "Eroare la ștergerea vehiculului");
    }
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin text-text-tertiary" />
        </div>
      ) : vehicles.length === 0 && !showForm ? (
        <Card>
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-4">
              <Car size={26} strokeWidth={1.8} />
            </div>
            <p className="font-display font-semibold text-[16px] text-text-primary">Niciun vehicul</p>
            <p className="text-[14px] text-text-secondary mt-2 max-w-xs">
              Adaugă vehiculele înregistrate pe numele tău.
            </p>
          </div>
        </Card>
      ) : (
        vehicles.map((v) =>
          editingId === v.id ? (
            <Card key={v.id}>
              <p className="font-display font-semibold text-[14px] text-text-primary mb-4">
                Editează vehicul
              </p>
              <VehicleForm
                form={form}
                setField={setField}
                onSubmit={handleUpdate}
                onCancel={cancelEdit}
                loading={updateVehicle.isPending}
                submitLabel="Salvează modificările"
              />
            </Card>
          ) : (
            <Card key={v.id}>
              <button
                type="button"
                className="w-full flex items-center justify-between"
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              >
                <div className="text-left">
                  <p className="font-display font-semibold text-[15px] text-text-primary">
                    {v.plate_number}
                  </p>
                  <p className="text-[13px] text-text-secondary mt-0.5">
                    {[v.make, v.model, v.year].filter(Boolean).join(" ")}
                  </p>
                </div>
                {expandedId === v.id ? (
                  <ChevronUp size={16} className="text-text-tertiary shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-text-tertiary shrink-0" />
                )}
              </button>

              {expandedId === v.id && (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  {[
                    ["VIN", v.vin],
                    ["Combustibil", v.fuel_type],
                    ["Capacitate cilindrică (cc)", v.engine_cc],
                    ["Culoare", v.color],
                    ["Expirare ITP", v.itp_expiry?.slice(0, 10)],
                    ["Expirare RCA", v.rca_expiry?.slice(0, 10)],
                  ]
                    .filter(([, val]) => val)
                    .map(([label, val]) => (
                      <div key={label as string} className="flex justify-between text-[13px]">
                        <span className="text-text-secondary">{label}</span>
                        <span className="font-medium text-text-primary">{String(val)}</span>
                      </div>
                    ))}

                  <div className="flex gap-2 pt-2">
                    <GhostButton className="flex-1 py-2.5 text-[13px]" onClick={() => startEdit(v)}>
                      Editează
                    </GhostButton>
                    <button
                      type="button"
                      onClick={() => void handleDelete(v.id)}
                      disabled={deleteVehicle.isPending}
                      className="press flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-error/30 bg-error/5 text-error text-[13px] font-semibold disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Șterge
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )
        )
      )}

      {showForm && (
        <Card>
          <p className="font-display font-semibold text-[14px] text-text-primary mb-4">
            Vehicul nou
          </p>
          <VehicleForm
            form={form}
            setField={setField}
            onSubmit={handleAdd}
            onCancel={() => { setShowForm(false); setForm({ ...EMPTY_VEHICLE }); }}
            loading={addVehicle.isPending}
            submitLabel="Adaugă vehicul"
          />
        </Card>
      )}

      {!showForm && editingId === null && (
        <button
          type="button"
          onClick={() => { setShowForm(true); setForm({ ...EMPTY_VEHICLE }); }}
          className="press w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3.5 text-[14px] font-semibold text-text-secondary hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus size={16} />
          Adaugă vehicul
        </button>
      )}
    </div>
  );
}

function VehicleForm({
  form,
  setField,
  onSubmit,
  onCancel,
  loading,
  submitLabel,
}: {
  form: Record<string, string>;
  setField: (key: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <VField label="Nr. înmatriculare *" value={form.plate_number} onChange={(v) => setField("plate_number", v)} placeholder="CJ-01-ABC" required />
        <VField label="Culoare" value={form.color} onChange={(v) => setField("color", v)} placeholder="Alb" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <VField label="Marcă" value={form.make} onChange={(v) => setField("make", v)} placeholder="Dacia" />
        <VField label="Model" value={form.model} onChange={(v) => setField("model", v)} placeholder="Logan" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <VField label="An fabricație" value={form.year} onChange={(v) => setField("year", v)} placeholder="2020" type="number" min="1900" max="2100" />
        <VField label="Combustibil" value={form.fuel_type} onChange={(v) => setField("fuel_type", v)} placeholder="benzina / diesel" />
      </div>
      <VField label="VIN" value={form.vin} onChange={(v) => setField("vin", v)} placeholder="17 caractere" maxLength={17} />
      <VField label="Capacitate cilindrică (cc)" value={form.engine_cc} onChange={(v) => setField("engine_cc", v)} placeholder="1600" type="number" />
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Expirare ITP</span>
          <input
            type="date"
            value={form.itp_expiry}
            onChange={(e) => setField("itp_expiry", e.target.value)}
            className="mt-1 w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3 min-h-11 text-[14px] focus:bg-surface focus:border-primary outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Expirare RCA</span>
          <input
            type="date"
            value={form.rca_expiry}
            onChange={(e) => setField("rca_expiry", e.target.value)}
            className="mt-1 w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3 min-h-11 text-[14px] focus:bg-surface focus:border-primary outline-none"
          />
        </label>
      </div>
      <div className="flex gap-3 pt-1">
        <GhostButton type="button" onClick={onCancel} className="flex-1 py-3">
          Anulează
        </GhostButton>
        <PrimaryButton type="submit" disabled={loading} className="flex-1 py-3">
          {loading ? <Loader2 size={16} className="animate-spin" /> : submitLabel}
        </PrimaryButton>
      </div>
    </form>
  );
}

function VField({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3 min-h-11 text-[14px] text-text-primary focus:bg-surface focus:border-primary outline-none"
        {...rest}
      />
    </label>
  );
}

function TabEmpty({
  icon: Icon,
  title,
  description,
  cta,
  onCta,
}: {
  icon: typeof Car;
  title: string;
  description: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-4">
          <Icon size={26} strokeWidth={1.8} />
        </div>
        <p className="font-display font-semibold text-[16px] text-text-primary">{title}</p>
        <p className="text-[14px] text-text-secondary mt-2 max-w-xs">{description}</p>
        {cta && onCta && (
          <GhostButton className="mt-4" onClick={onCta}>
            {cta}
          </GhostButton>
        )}
      </div>
    </Card>
  );
}

function EidKitCard({
  status,
  loading,
  startPending,
  demoPending,
  unlinkPending,
  startError,
  onStart,
  onDemo,
  onUnlink,
}: {
  status: EidKitVerificationStatus | undefined;
  loading: boolean;
  startPending: boolean;
  demoPending: boolean;
  unlinkPending: boolean;
  startError: string | null;
  onStart: () => void;
  onDemo: () => void;
  onUnlink: () => void;
}) {
  const verified = Boolean(status?.verified);
  const configured = Boolean(status?.configured);
  const canDemo = Boolean(status?.demo_enabled);

  return (
    <Card accent={verified ? "green" : configured ? "navy" : "amber"}>
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            verified ? "bg-success-light text-success" : "bg-accent-light text-accent-dark"
          }`}
        >
          {verified ? <ShieldCheck size={21} /> : <ShieldAlert size={21} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-[15px] text-text-primary">
                {verified ? "Identitate verificată prin CEI" : "Verificare cu buletin electronic"}
              </h3>
              <p className="text-[13px] text-text-secondary mt-1">
                {verified
                  ? `Verificat ${formatRoDate(status?.verified_at) ?? "recent"} prin EidKit.`
                  : "Leagă profilul de cartea electronică de identitate prin EidKit SSO."}
              </p>
            </div>
            {loading && <Loader2 size={18} className="animate-spin text-text-tertiary shrink-0" />}
          </div>

          {verified && (
            <div className="mt-3 rounded-xl bg-surface-secondary border border-border p-3 text-[12.5px] text-text-secondary space-y-1">
              <p>
                Nivel: <span className="font-semibold text-text-primary">{status?.verification_level ?? "eidkit_sso"}</span>
              </p>
              {status?.scopes?.length ? <p>Scopes: {status.scopes.join(", ")}</p> : null}
              {status?.profile_fields?.cnp ? <p>CNP verificat: {maskCnp(status.profile_fields.cnp)}</p> : null}
            </div>
          )}

          {startError && (
            <p className="mt-3 rounded-xl bg-error-light/50 border border-error/20 px-3 py-2 text-[12.5px] text-error">
              {startError}
            </p>
          )}

          {!configured && !verified && (
            <p className="mt-3 rounded-xl bg-accent-light/60 border border-accent-light px-3 py-2 text-[12.5px] text-accent-dark">
              EidKit nu are încă `client_id` și `client_secret`. Poți folosi verificarea demo locală până obții acces CEI.
            </p>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {!verified ? (
              <>
                <PrimaryButton className="py-3" onClick={onStart} disabled={!configured || startPending}>
                  {startPending ? "Se pornește..." : "Verifică prin EidKit"}
                </PrimaryButton>
                {canDemo && (
                  <GhostButton className="py-3" onClick={onDemo} disabled={demoPending}>
                    {demoPending ? "Se aplică demo..." : "Simulează verificare"}
                  </GhostButton>
                )}
              </>
            ) : (
              <GhostButton className="py-3 sm:col-span-2" onClick={onUnlink} disabled={unlinkPending}>
                {unlinkPending ? "Se elimină..." : "Elimină verificarea EidKit"}
              </GhostButton>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function maskCnp(cnp: string) {
  if (cnp.length < 7) return cnp;
  return `${cnp.slice(0, 3)}******${cnp.slice(-4)}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-display font-semibold text-[12px] text-text-tertiary uppercase tracking-wider">{children}</p>;
}

function ProfileInput({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-border bg-surface-secondary px-4 py-3.5 min-h-11 text-[15px] text-text-primary focus:bg-surface focus:border-primary outline-none"
        {...rest}
      />
    </label>
  );
}
