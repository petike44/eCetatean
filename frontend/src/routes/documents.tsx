import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Calendar, IdCard, Plane, Briefcase, Baby, CarFront, Car, AlertCircle, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HomeTopBar } from "@/components/TopBar";
import { Card, PrimaryButton, GhostButton, Badge } from "@/components/ui-bits";
import { citizen, vehicle } from "@/lib/mock-data";
import { Protected } from "@/lib/auth-guard";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documente — eCetățean" }] }),
  component: () => (
    <Protected>
      <Documents />
    </Protected>
  ),
});

const iconFor: Record<string, typeof IdCard> = {
  "id-card": IdCard, "plane": Plane, "briefcase": Briefcase, "baby": Baby, "car-front": CarFront, "car": Car,
};

const actions = [
  { icon: "id-card", label: "Buletin de identitate" },
  { icon: "plane", label: "Pașaport" },
  { icon: "briefcase", label: "Înregistrare PFA" },
  { icon: "baby", label: "Certificat de naștere" },
  { icon: "car-front", label: "Permis de conducere" },
  { icon: "car", label: "Înmatriculare vehicul" },
];

function Documents() {
  const nav = useNavigate();
  const [pct, setPct] = useState(0);
  useEffect(() => { const t = setTimeout(() => setPct(68), 100); return () => clearTimeout(t); }, []);

  return (
    <AppShell
      topBar={
        <HomeTopBar
          right={
            <button aria-label="Notificări" className="press relative p-2 -mr-2 rounded-xl">
              <Bell size={22} className="text-text-primary" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full anim-pulse-dot" />
            </button>
          }
        />
      }
    >
      <div className="lg:max-w-6xl lg:mx-auto">
        {/* Page header */}
        <div className="px-5 pt-4 lg:px-8 lg:pt-6">
          <h1 className="font-display font-bold text-[22px] lg:text-[28px] text-text-primary">Documentele mele</h1>
          <p className="text-text-secondary text-sm mt-0.5">Acte, alerte și proceduri în desfășurare.</p>
        </div>

        {/* Desktop two-column grid */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:px-8 lg:mt-6">
          {/* Left column: completion + alerts */}
          <div>
            {/* Profile completion */}
            <div className="px-5 mt-5 lg:px-0 lg:mt-0">
              <Card accent="amber">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display font-semibold text-[15px] text-text-primary">
                    Profil completat <span className="text-accent-dark">{pct}%</span>
                  </h3>
                </div>
                <div className="h-2 bg-surface-secondary rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-accent rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                </div>
                <Link to="/profile" className="press text-[13px] font-medium text-primary inline-flex items-center gap-1">
                  Adaugă CNP pentru a activa autocompletarea <ChevronRight size={14} />
                </Link>
              </Card>
            </div>

            {/* Alerts */}
            <section className="px-5 mt-6 lg:px-0">
              <h2 className="font-display font-semibold text-[18px] text-text-primary mb-3">Alerte importante</h2>
              <div className="space-y-3">
                <Card accent="red">
                  <div className="flex items-center gap-2 mb-2"><Badge tone="red">EXPIRAT</Badge><AlertTriangle size={14} className="text-error" /></div>
                  <p className="font-display font-semibold text-[15px] text-text-primary mb-1">ITP {vehicle.plate}</p>
                  <p className="text-[13.5px] text-text-secondary mb-3">ITP-ul vehiculului a expirat pe {vehicle.itp.date}.</p>
                  <PrimaryButton className="py-3" onClick={() => nav({ to: "/chat" })}>Programează ITP</PrimaryButton>
                </Card>
                <Card accent="amber">
                  <div className="flex items-center gap-2 mb-2"><Badge tone="amber">5 ZILE</Badge><Calendar size={14} className="text-accent-dark" /></div>
                  <p className="font-display font-semibold text-[15px] text-text-primary mb-1">RCA {vehicle.plate}</p>
                  <p className="text-[13.5px] text-text-secondary mb-3">RCA-ul expiră pe {vehicle.rca.date}.</p>
                  <PrimaryButton className="py-3" onClick={() => nav({ to: "/chat" })}>Reînnoiește RCA</PrimaryButton>
                </Card>
              </div>
            </section>
          </div>

          {/* Right column: documents + procedures */}
          <div>
            {/* Documentele mele */}
            <section className="px-5 mt-6 lg:px-0 lg:mt-0">
              <h2 className="font-display font-semibold text-[18px] text-text-primary mb-3">Actele mele</h2>
              <div className="space-y-2">
                <DocRow icon={IdCard} title="Carte de identitate" meta={`Seria ${citizen.idSerie} ${citizen.idNumber}`} badge={<Badge tone="green">VALABIL</Badge>} sub={`Expiră ${citizen.idExpiry}`} />
                <DocRow icon={Plane} title="Pașaport simplu electronic" meta="Nu este înregistrat" badge={<Badge tone="neutral">LIPSĂ</Badge>} sub="Adaugă-l din profil" />
                <DocRow icon={CarFront} title="Permis de conducere" meta="Categoria B" badge={<Badge tone="green">VALABIL</Badge>} sub="Expiră 22.06.2029" />
                <DocRow icon={Car} title={`Talon ${vehicle.plate}`} meta={vehicle.model} badge={<Badge tone="amber">ATENȚIE</Badge>} sub="ITP expirat" />
              </div>
            </section>

            {/* Quick actions */}
            <section className="px-5 mt-6 lg:px-0">
              <h2 className="font-display font-semibold text-[18px] text-text-primary mb-3">Începe o procedură</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {actions.map((a) => {
                  const I = iconFor[a.icon];
                  return (
                    <button
                      key={a.label}
                      onClick={() => nav({ to: "/chat" })}
                      className="press bg-surface border border-border rounded-2xl p-4 shadow-card text-left"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center mb-3">
                        <I size={20} />
                      </div>
                      <p className="font-display font-semibold text-[13.5px] text-text-primary leading-snug">{a.label}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Sesizare rapidă */}
            <section className="px-5 mt-6 lg:px-0">
              <Card>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-accent-light text-accent-dark flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[15px] text-text-primary">Sesizare rapidă</h3>
                    <p className="text-[13px] text-text-secondary mt-0.5">Raportează o problemă în orașul tău — groapă, iluminat defect, etc.</p>
                  </div>
                </div>
                <GhostButton onClick={() => nav({ to: "/report" })}>Sesizează acum</GhostButton>
              </Card>
            </section>
          </div>
        </div>

        <section className="px-5 mt-6 mb-4 lg:px-8">
          <Link to="/staff" className="press block text-center text-[13px] text-primary font-medium underline-offset-4 hover:underline">
            Ești funcționar public?
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

function DocRow({ icon: Icon, title, meta, badge, sub }: { icon: typeof IdCard; title: string; meta: string; badge: React.ReactNode; sub: string }) {
  return (
    <article className="bg-surface border border-border rounded-2xl p-4 shadow-card flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-[14.5px] text-text-primary truncate">{title}</p>
        <p className="text-[12.5px] text-text-tertiary truncate">{meta} • {sub}</p>
      </div>
      {badge}
    </article>
  );
}
