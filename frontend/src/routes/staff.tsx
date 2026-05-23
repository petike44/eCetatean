import { createFileRoute } from "@tanstack/react-router";
import { Search, Lock, Building2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Card, Badge } from "@/components/ui-bits";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Portal Funcționari — eCetățean" }] }),
  component: Staff,
});

function Staff() {
  return (
    <AppShell
      hideNav
      topBar={
        <TopBar
          variant="funct"
          showBack
          title="Portal Funcționari"
          right={
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-full text-[11px] font-semibold">
              <Building2 size={12} /> DGEP Cluj
            </span>
          }
        />
      }
    >
      <div className="px-5 pt-5 pb-12">
        <div className="bg-accent-light border border-accent rounded-xl px-3 py-2 mb-5 inline-flex items-center gap-2">
          <span className="font-display font-bold text-[11px] text-accent-dark">ACCES FUNCȚIONAR PUBLIC</span>
        </div>

        <div className="relative mb-5">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            placeholder="Caută după CNP sau nume"
            className="w-full bg-surface border border-border focus:border-primary text-[15px] py-3.5 pl-11 pr-4 rounded-xl outline-none"
          />
        </div>

        <p className="text-[12px] text-text-tertiary uppercase tracking-wider font-medium mb-2">Rezultat căutare</p>

        <Card className="mb-5">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold">IP</div>
            <div>
              <p className="font-display font-semibold text-text-primary">Ion P***</p>
              <p className="text-[12px] text-text-tertiary font-mono">CNP: 199****3456</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium mb-1">Buletin de identitate</p>
            <div className="flex items-center justify-between">
              <p className="text-[14px] text-text-primary">Valabil până la 15 Ian 2030</p>
              <Badge tone="green">VALID</Badge>
            </div>
          </div>

          <div className="mb-4 bg-accent-light/50 rounded-xl p-3 border border-accent-light">
            <p className="text-[11px] uppercase tracking-wider text-accent-dark font-bold mb-1">Cerere pașaport</p>
            <p className="text-[14px] text-text-primary mb-3">În curs de procesare — depusă 12 Mai 2026</p>
            <div className="grid grid-cols-3 gap-2">
              <button className="press bg-success text-white font-semibold text-[12.5px] py-2.5 rounded-xl">Aprobă</button>
              <button className="press bg-error text-white font-semibold text-[12.5px] py-2.5 rounded-xl">Respinge</button>
              <button className="press border border-border bg-white text-text-primary font-semibold text-[11.5px] py-2.5 rounded-xl">Sol. doc.</button>
            </div>
          </div>

          <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium mb-2">Acces restricționat</p>
          <div className="space-y-2">
            {[
              "Date medicale",
              "Date financiare",
              "Vehicule",
            ].map((s) => (
              <div key={s} className="bg-surface-secondary rounded-xl px-4 py-3 flex items-center gap-3 opacity-70">
                <Lock size={16} className="text-text-tertiary" />
                <p className="text-[13.5px] text-text-secondary">{s} — Acces restricționat</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="bg-surface-secondary rounded-2xl p-4 text-[12px] text-text-secondary">
          <p className="font-display font-semibold text-text-primary mb-1">Jurnal activitate</p>
          <p>Ați accesat dosarul [199****3456] la 14:35.</p>
          <p className="mt-1 text-text-tertiary">Toate accesările sunt înregistrate în registrul imutabil al cetățeanului.</p>
        </div>
      </div>
    </AppShell>
  );
}
