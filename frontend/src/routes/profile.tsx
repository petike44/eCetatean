import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Car, History, ChevronRight, Settings } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Card, PrimaryButton, GhostButton, Field, Badge } from "@/components/ui-bits";
import { citizen, vehicle } from "@/lib/mock-data";
import { useToast } from "@/components/Toast";
import { Protected } from "@/lib/auth-guard";

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
      {/* Header */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-[22px]">
            {citizen.initials}
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-[18px] text-text-primary">{citizen.name}</h2>
            <p className="text-[13px] text-text-tertiary">{citizen.phone}</p>
          </div>
          <button aria-label="Setări" className="press p-2 rounded-xl text-text-tertiary"><Settings size={20} /></button>
        </div>
      </div>

      <div className="px-5 mt-5">
        <Card accent="amber">
          <div className="flex justify-between items-baseline mb-2">
            <p className="font-display font-semibold text-[14px] text-text-primary">Profil 68% completat</p>
            <span className="text-[12px] text-text-tertiary">11 din 16 câmpuri</span>
          </div>
          <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: "68%" }} />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-20 bg-bg pt-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide px-5 border-b border-border bg-bg">
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

      <div className="px-5 pt-5">
        {tab === "Personal" && (
          <div className="space-y-5">
            <SectionTitle>Identitate</SectionTitle>
            <Field label="Nume complet" defaultValue={citizen.name} />
            <Field label="CNP" defaultValue={citizen.cnp} validator={(v) => v.length !== 13 ? "CNP-ul trebuie să aibă 13 cifre" : null} />
            <Field label="Data nașterii" defaultValue={citizen.birth} />
            <SectionTitle>Buletin</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Serie" defaultValue={citizen.idSerie} />
              <Field label="Număr" defaultValue={citizen.idNumber} />
            </div>
            <Field label="Data expirării" defaultValue={citizen.idExpiry} />
            <SectionTitle>Adresă</SectionTitle>
            <Field label="Adresă" defaultValue={citizen.address} />
            <Field label="Oraș" defaultValue={citizen.city} />
            <SectionTitle>Contact</SectionTitle>
            <Field label="Telefon" defaultValue="+40 712 345 673" />
            <Field label="Email" defaultValue={citizen.email} validator={(v) => /.+@.+\..+/.test(v) ? null : "Email invalid"} />
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Limbă preferată</label>
              <select className="w-full bg-surface-secondary border border-transparent focus:bg-surface focus:border-primary text-[15px] py-3.5 px-4 rounded-xl outline-none">
                <option>Română</option>
                <option>Maghiară</option>
              </select>
            </div>
            <div className="pt-2"><PrimaryButton onClick={() => show("success", "Modificările au fost salvate")}>Salvează</PrimaryButton></div>
          </div>
        )}

        {tab === "Vehicule" && (
          <div className="space-y-3">
            <Card>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center"><Car size={20} /></div>
                <div className="flex-1">
                  <p className="font-display font-bold text-[16px] text-text-primary">{vehicle.plate}</p>
                  <p className="text-[12.5px] text-text-tertiary">{vehicle.model} • {vehicle.engine}</p>
                </div>
                <ChevronRight size={18} className="text-text-tertiary" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-border">
                <div><p className="text-[10px] text-text-tertiary uppercase tracking-wide">ITP</p><Badge tone="red">EXPIRAT</Badge></div>
                <div><p className="text-[10px] text-text-tertiary uppercase tracking-wide">RCA</p><Badge tone="amber">5 ZILE</Badge></div>
                <div><p className="text-[10px] text-text-tertiary uppercase tracking-wide">Impozit</p><Badge tone="green">PLĂTIT</Badge></div>
              </div>
            </Card>
            <GhostButton onClick={() => show("success", "Folosește formularul de adăugare vehicul")}>+ Adaugă vehicul</GhostButton>
          </div>
        )}

        {tab === "Locuință" && (
          <div className="space-y-4">
            <Field label="Adresă locuință" defaultValue={citizen.address} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Suprafață (m²)" placeholder="—" />
              <Field label="Nr. camere" placeholder="—" />
            </div>
            <Field label="Furnizor energie" placeholder="—" />
            <Field label="Furnizor gaz" placeholder="—" />
            <PrimaryButton onClick={() => show("success", "Salvat")}>Salvează</PrimaryButton>
          </div>
        )}

        {tab === "Sănătate" && (
          <div className="space-y-4">
            <Field label="Medic de familie" placeholder="—" />
            <Field label="Casa de asigurări" defaultValue="CAS Cluj" />
            <Field label="Grupă sanguină" placeholder="—" />
            <Field label="Alergii cunoscute" placeholder="—" />
            <PrimaryButton onClick={() => show("success", "Salvat")}>Salvează</PrimaryButton>
          </div>
        )}

        {tab === "Educație" && (
          <div className="space-y-4">
            <Field label="Nivel studii" defaultValue="Studii superioare" />
            <Field label="Instituție absolvită" placeholder="—" />
            <Field label="Anul absolvirii" placeholder="—" />
            <PrimaryButton onClick={() => show("success", "Salvat")}>Salvează</PrimaryButton>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-display font-semibold text-[12px] text-text-tertiary uppercase tracking-wider">{children}</p>;
}
