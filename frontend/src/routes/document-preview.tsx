import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { PrimaryButton, GhostButton } from "@/components/ui-bits";
import { citizen } from "@/lib/mock-data";

export const Route = createFileRoute("/document-preview")({
  head: () => ({ meta: [{ title: "Previzualizare cerere — eCetățean" }] }),
  component: DocPreview,
});

function DocPreview() {
  return (
    <AppShell topBar={<TopBar showBack title="Previzualizare cerere" />}>
      <div className="px-5 pt-5 pb-36">
        <div className="bg-white border border-border rounded-2xl shadow-card p-6 space-y-5">
          <header className="text-center border-b border-border pb-4">
            <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Direcția Generală de Pașapoarte</p>
            <h2 className="font-display font-bold text-[18px] text-text-primary mt-1">Cerere eliberare pașaport simplu electronic</h2>
          </header>

          <Section title="Date personale">
            <Filled label="Nume și prenume" value={citizen.name} />
            <Filled label="CNP" value={citizen.cnp} />
            <Filled label="Data nașterii" value={citizen.birth} />
            <Filled label="Locul nașterii" value="Cluj-Napoca" />
          </Section>

          <Section title="Adresă de domiciliu">
            <Filled label="Adresă completă" value={`${citizen.address}, ${citizen.city}`} />
            <Empty label="Cod poștal" />
          </Section>

          <Section title="Date contact">
            <Filled label="Email" value={citizen.email} />
            <Filled label="Telefon" value="+40 7XX XXX XX3" />
          </Section>

          <Section title="Date suplimentare">
            <Filled label="Serie buletin" value={`${citizen.idSerie} ${citizen.idNumber}`} />
            <Empty label="Loc de muncă" />
            <Empty label="Studii" />
          </Section>

          <Section title="Semnătură">
            <div className="bg-surface-secondary rounded-lg h-20 border border-dashed border-border flex items-center justify-center text-text-tertiary text-[12px]">
              Va fi adăugată la depunere
            </div>
          </Section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border">
        <div className="mx-auto max-w-[440px] md:max-w-[640px] lg:max-w-[480px] px-5 py-4">
          <p className="text-[12.5px] text-text-secondary mb-3 text-center">
            Câmpuri completate: <span className="font-display font-semibold text-text-primary">8/11</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <GhostButton>Completează manual</GhostButton>
            <PrimaryButton>Descarcă PDF</PrimaryButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-display font-semibold text-[12px] text-text-tertiary uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Filled({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-text-tertiary mb-0.5">{label}</p>
      <div className="bg-accent-light/70 border border-accent-light px-3 py-2 rounded-lg text-[13.5px] text-text-primary font-medium">
        {value}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div>
      <p className="text-[11px] text-text-tertiary mb-0.5">{label}</p>
      <div className="border-2 border-dashed border-error/60 bg-error-light/40 px-3 py-2 rounded-lg text-[12px] text-error font-medium flex justify-between items-center">
        <span>—</span><span className="text-[10px] uppercase tracking-wide">Lipsă</span>
      </div>
    </div>
  );
}
