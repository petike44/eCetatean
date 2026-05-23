import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Protected } from "@/lib/auth-guard";
import { useUpsertProfile } from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";
import { useUser } from "@/lib/clerk-stub";

export const Route = createFileRoute("/profile-setup")({
  head: () => ({ meta: [{ title: "Completează profilul — eCetățean" }] }),
  component: () => (
    <Protected>
      <ProfileSetup />
    </Protected>
  ),
});

function ProfileSetup() {
  const nav = useNavigate();
  const { show } = useToast();
  const upsert = useUpsertProfile();
  const { user } = useUser();
  const authEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [cnp, setCnp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Cluj-Napoca");
  const [idSerie, setIdSerie] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idExpiry, setIdExpiry] = useState("");

  useEffect(() => {
    if (authEmail) setEmail(authEmail);
    const metaName = user?.fullName;
    if (metaName && !fullName) setFullName(metaName);
  }, [authEmail, user?.fullName, fullName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 1) {
      if (!fullName.trim()) {
        show("error", "Numele complet este obligatoriu");
        return;
      }
      setStep(1);
      return;
    }
    if (!fullName.trim()) {
      show("error", "Numele complet este obligatoriu");
      return;
    }
    if (cnp.trim() && cnp.trim().length !== 13) {
      show("error", "CNP-ul trebuie să aibă 13 cifre");
      return;
    }
    try {
      await upsert.mutateAsync({
        full_name: fullName.trim(),
        cnp: cnp.trim() || null,
        address: address.trim() || null,
        city: city.trim() || "Cluj-Napoca",
        phone: phone.trim() || null,
        email: email.trim() || authEmail || null,
        buletin_series: idSerie.trim() || null,
        buletin_number: idNumber.trim() || null,
        buletin_expiry: idExpiry || null,
      });
      show("success", "Profil salvat");
      nav({ to: "/chat" });
    } catch {
      show("error", "Eroare la salvarea profilului");
    }
  };

  return (
    <AppShell className="flex flex-col">
      <div className="flex-1 px-5 py-8 max-w-md mx-auto w-full">
        <div className="flex gap-2 mb-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>

        <h1 className="font-display font-bold text-[22px] text-text-primary mb-2">
          {step === 0 ? "Date de contact" : "Acte și adresă"}
        </h1>
        <p className="text-[14px] text-text-secondary mb-6">
          {step === 0
            ? "Cum te putem contacta și cum te adresăm în formulare."
            : "Opțional acum — le poți completa și din profil."}
        </p>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {step === 0 ? (
            <>
              <SetupField label="Nume complet *" value={fullName} onChange={setFullName} placeholder="Maria Popescu" required />
              <SetupField label="Email" value={email} onChange={setEmail} type="email" placeholder={authEmail || "nume@exemplu.ro"} />
              <SetupField label="Telefon" value={phone} onChange={setPhone} type="tel" placeholder="+407..." />
              <SetupField label="Oraș" value={city} onChange={setCity} placeholder="Cluj-Napoca" />
            </>
          ) : (
            <>
              <SetupField label="CNP (opțional)" value={cnp} onChange={setCnp} maxLength={13} placeholder="1XXXXXXXXXX" />
              <SetupField label="Adresă" value={address} onChange={setAddress} placeholder="Str. Memorandumului 1" />
              <div className="grid grid-cols-2 gap-3">
                <SetupField label="Serie buletin" value={idSerie} onChange={setIdSerie} placeholder="KX" />
                <SetupField label="Număr" value={idNumber} onChange={setIdNumber} placeholder="456789" />
              </div>
              <label className="block">
                <span className="text-[13px] font-medium text-text-secondary">Expirare buletin</span>
                <input
                  type="date"
                  value={idExpiry}
                  onChange={(e) => setIdExpiry(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-[15px]"
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={upsert.isPending}
            className="press w-full bg-accent text-white font-semibold text-[15px] py-3.5 rounded-xl disabled:opacity-60 mt-2"
          >
            {upsert.isPending ? "Se salvează..." : step === 0 ? "Continuă" : "Continuă la ClaudIA"}
          </button>

          {step === 1 && (
            <button
              type="button"
              onClick={() => nav({ to: "/chat" })}
              className="press w-full text-[14px] text-text-secondary py-2"
            >
              Sari peste pentru moment
            </button>
          )}
        </form>
      </div>
    </AppShell>
  );
}

function SetupField({
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
        className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-[15px]"
        {...rest}
      />
    </label>
  );
}
