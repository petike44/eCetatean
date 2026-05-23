import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { History, Settings, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Card, PrimaryButton, GhostButton, Field } from "@/components/ui-bits";
import { useToast } from "@/components/Toast";
import { Protected } from "@/lib/auth-guard";
import { useProfile, useUpsertProfile } from "@/lib/api-hooks";
import { useUser } from "@/lib/clerk-stub";
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
  const [tab, setTab] = useState<(typeof TABS)[number]>("Personal");
  const { show } = useToast();
  const { data: profile, isLoading } = useProfile();
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

  return (
    <AppShell
      topBar={
        <TopBar
          title="Profilul meu"
          right={
            <Link to="/audit" aria-label="Istoric civic" className="press p-2 -mr-2 rounded-xl">
              <History size={20} className="text-text-secondary" />
            </Link>
          }
        />
      }
    >
      <div className="lg:max-w-3xl lg:mx-auto">
        <div className="px-5 pt-5 lg:px-8 lg:pt-6">
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
            <button aria-label="Setări" className="press p-2 rounded-xl text-text-tertiary">
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="px-5 mt-5 lg:px-8">
          <Card accent="amber">
            <div className="flex justify-between items-baseline mb-2">
              <p className="font-display font-semibold text-[14px] text-text-primary">
                Profil {pct}% completat
              </p>
              <span className="text-[12px] text-text-tertiary">{filled} din {total} câmpuri</span>
            </div>
            <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </Card>
        </div>

        <div className="sticky top-14 lg:top-0 z-20 bg-bg pt-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide px-5 lg:px-8 border-b border-border bg-bg">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`press shrink-0 px-4 py-3 text-[14px] font-semibold border-b-2 transition-colors ${
                  tab === t ? "border-accent text-text-primary" : "border-transparent text-text-tertiary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-5 lg:px-8 lg:pb-8">
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
                  className="mt-1 w-full rounded-xl border border-border bg-surface-secondary px-4 py-3.5 text-[15px]"
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

          {tab === "Vehicule" && (
            <div className="space-y-3">
              <Card>
                <p className="text-[14px] text-text-secondary">
                  Nu ai vehicule înregistrate. Adaugă unul din chat cu ClaudIA când funcția va fi disponibilă.
                </p>
              </Card>
              <GhostButton onClick={() => show("success", "Folosește ClaudIA pentru înmatriculare sau ITP")}>
                Deschide ClaudIA
              </GhostButton>
            </div>
          )}

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
            <div className="space-y-4">
              <Field label="Medic de familie" placeholder="—" />
              <Field label="Casa de asigurări" placeholder="ex. CAS Cluj" />
              <Field label="Grupă sanguină" placeholder="—" />
              <PrimaryButton onClick={() => show("success", "Salvat local — sincronizare în curând")}>
                Salvează
              </PrimaryButton>
            </div>
          )}

          {tab === "Educație" && (
            <div className="space-y-4">
              <Field label="Nivel studii" placeholder="—" />
              <Field label="Instituție absolvită" placeholder="—" />
              <Field label="Anul absolvirii" placeholder="—" />
              <PrimaryButton onClick={() => show("success", "Salvat local — sincronizare în curând")}>
                Salvează
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
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
        className="mt-1 w-full rounded-xl border border-border bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary focus:bg-surface focus:border-primary outline-none"
        {...rest}
      />
    </label>
  );
}
