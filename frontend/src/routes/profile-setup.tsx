import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Protected } from "@/lib/auth-guard";
import { useUpsertProfile } from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";

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
  const [fullName, setFullName] = useState("");
  const [cnp, setCnp] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      show("error", "Numele complet este obligatoriu");
      return;
    }
    try {
      await upsert.mutateAsync({
        full_name: fullName.trim(),
        cnp: cnp.trim() || null,
        address: address.trim() || null,
        city: "Cluj-Napoca",
        phone: phone.trim() || null,
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
        <h1 className="font-display font-bold text-[22px] text-text-primary mb-2">
          Datele tale civice
        </h1>
        <p className="text-[14px] text-text-secondary mb-6">
          Le folosim pentru a pre-completa formularele oficiale (PDF).
        </p>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <label className="block">
            <span className="text-[13px] font-medium text-text-secondary">Nume complet *</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-[15px]"
              placeholder="Ion Popescu"
              required
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-text-secondary">CNP</span>
            <input
              value={cnp}
              onChange={(e) => setCnp(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-[15px]"
              placeholder="1XXXXXXXXXX"
              maxLength={13}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-text-secondary">Adresă în Cluj</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-[15px]"
              placeholder="Str. Memorandumului 1"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-text-secondary">Telefon</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-[15px]"
              placeholder="+407..."
            />
          </label>
          <button
            type="submit"
            disabled={upsert.isPending}
            className="press w-full bg-accent text-white font-semibold text-[15px] py-3.5 rounded-xl disabled:opacity-60"
          >
            {upsert.isPending ? "Se salvează..." : "Continuă la ClaudIA"}
          </button>
          <button
            type="button"
            onClick={() => nav({ to: "/chat" })}
            className="press w-full text-[14px] text-text-secondary py-2"
          >
            Sari peste pentru moment
          </button>
        </form>
      </div>
    </AppShell>
  );
}
