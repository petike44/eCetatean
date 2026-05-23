import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { History, Loader2, Car, HeartPulse, GraduationCap, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { FadeIn } from "@/components/motion-primitives";
import { Card, PrimaryButton, GhostButton, Field } from "@/components/ui-bits";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { Protected } from "@/lib/auth-guard";
import { useProfile, useUpsertProfile } from "@/lib/api-hooks";
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
        <FadeIn className="px-5 pt-5 lg:px-0 lg:pt-2">
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

        <div className="sticky top-14 lg:top-0 z-20 bg-bg pt-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide px-5 lg:px-0 border-b border-border bg-bg relative">
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

          {tab === "Vehicule" && (
            <TabEmpty
              icon={Car}
              title="Niciun vehicul"
              description="Pentru înmatriculare, ITP sau schimbări de proprietar, ClaudIA te ghidează pas cu pas."
              cta="Întreabă despre vehicule"
              onCta={() => nav({ to: "/chat" })}
            />
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
