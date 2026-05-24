import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2, DatabaseZap, Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { FadeIn } from "@/components/motion-primitives";
import { useAuth } from "@/lib/clerk-stub";
import { apiGet, apiPostJson } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/seed")({
  head: () => ({ meta: [{ title: "Seed — eCetățean" }] }),
  component: Seed,
});

const MOCK_SQL = `-- ════════════════════════════════════════════════════════════════
--  eCetățean — Mock data seed (paste in Supabase SQL Editor)
-- ════════════════════════════════════════════════════════════════

-- ─── Profiles (3 utilizatori de test) ────────────────────────────
INSERT INTO public.profiles (user_id, full_name, cnp, city, language, phone, email, address, buletin_series, buletin_number, buletin_expiry)
VALUES
  ('mock-user-andrei', 'Andrei Popescu',    '1850501124567', 'Cluj-Napoca', 'ro', '+40721111111', 'andrei.popescu@example.ro',  'Str. Avram Iancu 15, Cluj-Napoca',    'CJ', '234567', '2028-03-15'),
  ('mock-user-maria',  'Maria Ionescu',     '2900312124890', 'Cluj-Napoca', 'ro', '+40722222222', 'maria.ionescu@example.ro',   'Str. Memorandumului 22, Cluj-Napoca', 'CJ', '345678', '2027-11-20'),
  ('mock-user-alex',   'Alexandru Mureșan', '1780908126543', 'Cluj-Napoca', 'ro', '+40733333333', 'alex.muresan@example.ro',    'Bd. Eroilor 30, Cluj-Napoca',         'CJ', '456789', '2026-06-01')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = excluded.full_name, email = excluded.email, updated_at = now();

-- ─── Vehicule ────────────────────────────────────────────────────
DELETE FROM public.vehicles WHERE plate_number IN ('CJ-01-ABC','CJ-99-XYZ','CJ-50-BMW');
INSERT INTO public.vehicles (user_id, plate_number, make, model, year, vin, fuel_type, color, itp_expiry, rca_expiry)
VALUES
  ('stub-user-citizen', 'CJ-01-ABC', 'Dacia',      'Logan', 2020, 'VF1KMD20061234567', 'benzina', 'Alb',  '2026-08-15', '2026-04-30'),
  ('stub-user-citizen', 'CJ-99-XYZ', 'Volkswagen', 'Golf',  2018, 'WVWZZZ1JZYW123456', 'diesel',  'Gri',  '2025-12-01', '2026-01-15'),
  ('mock-user-andrei',  'CJ-50-BMW', 'BMW',         '320d',  2019, 'WBA8E5C55JA234567', 'diesel',  'Negru','2026-03-10', '2026-08-20');

-- ─── Life events (proceduri la diverse stadii) ────────────────────
INSERT INTO public.life_event_progress (id, user_id, event_type, event_title, steps_status, current_step, total_steps, is_completed)
VALUES
  ('11111111-0000-4000-8000-000000000001','stub-user-citizen','car_from_germany','Înmatriculare mașină din Germania/UE',
   '{"step_1":"completed","step_2":"completed","step_3":"pending","step_4":"pending","step_5":"pending","step_6":"pending","step_7":"pending"}',3,7,false),
  ('11111111-0000-4000-8000-000000000002','stub-user-citizen','id_renewal','Îți reînnoiești buletinul',
   '{"step_1":"completed"}',2,1,true),
  ('11111111-0000-4000-8000-000000000003','mock-user-andrei','start_business','Vrei să deschizi o firmă sau PFA',
   '{"step_1":"completed","step_2":"pending"}',2,2,false),
  ('11111111-0000-4000-8000-000000000004','mock-user-maria','bought_car','Înmatriculare vehicul cumpărat',
   '{"step_1":"pending","step_2":"pending","step_3":"pending","step_4":"pending","step_5":"pending"}',1,5,false),
  ('11111111-0000-4000-8000-000000000005','mock-user-alex','moving_to_cluj','Te muți la Cluj pentru facultate',
   '{"step_1":"completed","step_2":"pending","step_3":"pending","step_4":"pending"}',2,4,false)
ON CONFLICT (id) DO NOTHING;

-- ─── Sesizări civice ─────────────────────────────────────────────
INSERT INTO public.civic_reports (user_id, category, description, address, reference_number, status)
VALUES
  ('stub-user-citizen','gunoi_ilegal',      'Grămadă de deșeuri menajere aruncate ilegal în spatele blocului.','Str. Fabricii 45, Cluj-Napoca',         'CLJ-2026-1003-MOCK','rezolvata'),
  ('stub-user-citizen','masina_abandonata', 'Mașină fără numere parcată de peste 2 luni, pare abandonată.',   'Str. Aurel Vlaicu 8, Cluj-Napoca',      'CLJ-2026-1004-MOCK','inregistrata'),
  ('mock-user-andrei', 'trotuar_deteriorat','Trotuar crăpat și ridicat de rădăcinile copacilor.',             'Bd. 21 Decembrie 1989, Cluj-Napoca',    'CLJ-2026-1005-MOCK','in_lucru'),
  ('mock-user-maria',  'groapa_asfalt',     'Groapă adâncă de ~20cm pe carosabil.',                           'Str. Piezișă 3, Cluj-Napoca',           'CLJ-2026-1006-MOCK','inregistrata'),
  ('mock-user-alex',   'iluminat_defect',   'Trei stâlpi consecutivi cu becul ars, zona neilluminată noaptea.','Str. George Barițiu 12, Cluj-Napoca',  'CLJ-2026-1007-MOCK','in_lucru')
ON CONFLICT (reference_number) DO NOTHING;

-- ─── Știri civice ─────────────────────────────────────────────────
INSERT INTO public.news (id, title, summary, published_at)
VALUES
  ('a1000000-0000-4000-8000-000000000003','Ghișee online DRPCIV — extindere servicii',
   'Din iunie, transcrierea vehiculelor second-hand se poate face integral online prin portalul DRPCIV.',
   now() - interval '1 day'),
  ('a1000000-0000-4000-8000-000000000004','Impozite locale 2026 — termen 31 martie',
   'Primăria Cluj-Napoca reamintește că impozitul trebuie achitat până pe 31 martie pentru bonificația de 10%.',
   now() - interval '4 days'),
  ('a1000000-0000-4000-8000-000000000005','Certificat fiscal — eliberare în 24h prin SPV',
   'ANAF anunță că certificatele fiscale solicitate prin SPV vor fi emise în maximum 24 de ore lucrătoare.',
   now() - interval '7 days'),
  ('a1000000-0000-4000-8000-000000000006','Buletine electronice — program special mai–iunie',
   'DGEP Cluj extinde programul cu publicul în weekendul 7–8 iunie pentru cărțile de identitate electronice.',
   now() - interval '10 days')
ON CONFLICT (id) DO NOTHING;`;

type Stats = Record<string, number>;

const TABLE_LABELS: Record<string, string> = {
  profiles: "Profiluri",
  life_event_progress: "Proceduri active",
  civic_reports: "Sesizări",
  news: "Știri",
  vehicles: "Vehicule",
};

function useGetToken() {
  const { getToken } = useAuth();
  return () => getToken();
}

function useSeedStats() {
  const getToken = useGetToken();
  return useQuery<Stats>({
    queryKey: ["seed-stats"],
    queryFn: () => apiGet<Stats>("/api/seed/stats", getToken),
    retry: false,
  });
}

function useSeedInsert() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPostJson("/api/seed/insert", {}, getToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seed-stats"] }),
  });
}

function useSeedReset() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPostJson("/api/seed/reset", {}, getToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seed-stats"] }),
  });
}

function Seed() {
  const { data: stats, isLoading, refetch } = useSeedStats();
  const insert = useSeedInsert();
  const reset = useSeedReset();
  const [copied, setCopied] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [insertMsg, setInsertMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(MOCK_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = async () => {
    setInsertMsg(null);
    try {
      await insert.mutateAsync();
      setInsertMsg("Date mock inserate cu succes.");
    } catch {
      setInsertMsg("Eroare la inserare. Verifică Supabase.");
    }
  };

  const handleReset = async () => {
    setResetMsg(null);
    try {
      await reset.mutateAsync();
      setResetMsg("Date mock șterse cu succes.");
    } catch {
      setResetMsg("Eroare la ștergere. Verifică Supabase.");
    }
  };

  return (
    <AppShell
      topBar={<TopBar title="Seed & Reset" subtitle="Dev tools" />}
    >
      <div className="lg:max-w-2xl lg:mx-auto">
        <FadeIn className="px-5 pt-4 lg:px-0 lg:pt-2 space-y-6">

          {/* Stats */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Stare bază de date</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="press flex items-center gap-1.5 text-[12px] text-primary font-semibold min-h-8"
              >
                <RefreshCw size={13} />
                Reîncarcă
              </button>
            </div>
            <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
              {isLoading ? (
                <div className="px-4 py-3 text-[13px] text-text-secondary">Se încarcă...</div>
              ) : stats ? (
                Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[14px] text-text-primary">{label}</span>
                    <span className="text-[13px] font-semibold text-text-secondary tabular-nums">
                      {stats[key] ?? "—"} rânduri
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-[13px] text-error">
                  Supabase nu este configurat sau nu este accesibil.
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <section>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Acțiuni</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleInsert()}
                disabled={insert.isPending}
                className="press w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-[14px] py-3 px-4 rounded-xl disabled:opacity-50 transition-colors"
              >
                <DatabaseZap size={16} />
                {insert.isPending ? "Se inserează..." : "Inserează date mock"}
              </button>
              {insertMsg && (
                <p className={cn("text-[12px] text-center", insertMsg.includes("succes") ? "text-success" : "text-error")}>
                  {insertMsg}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={reset.isPending}
                className="press w-full flex items-center justify-center gap-2 border border-error/30 bg-error/5 text-error font-semibold text-[14px] py-3 px-4 rounded-xl disabled:opacity-50 hover:bg-error/10 transition-colors"
              >
                <Trash2 size={16} />
                {reset.isPending ? "Se șterge..." : "Șterge date mock"}
              </button>
              {resetMsg && (
                <p className={cn("text-[12px] text-center", resetMsg.includes("succes") ? "text-success" : "text-error")}>
                  {resetMsg}
                </p>
              )}
            </div>
          </section>

          {/* SQL viewer */}
          <section>
            <button
              type="button"
              onClick={() => setSqlOpen((v) => !v)}
              className="press w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border bg-surface text-left"
            >
              <span className="text-[14px] font-medium text-text-primary">SQL manual (pentru Supabase dashboard)</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-tertiary">Copiază & rulează</span>
                {sqlOpen ? <ChevronUp size={16} className="text-text-tertiary" /> : <ChevronDown size={16} className="text-text-tertiary" />}
              </div>
            </button>

            {sqlOpen && (
              <div className="mt-2 rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-surface-secondary border-b border-border">
                  <span className="text-[12px] font-mono text-text-secondary">seed.sql</span>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="press flex items-center gap-1.5 text-[12px] font-semibold text-primary min-h-8"
                  >
                    {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    {copied ? "Copiat!" : "Copiază"}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-text-secondary p-4 overflow-x-auto max-h-80 bg-surface leading-relaxed whitespace-pre">
                  {MOCK_SQL}
                </pre>
              </div>
            )}
          </section>

          {/* Mock users reference */}
          <section className="pb-8">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Utilizatori mock</p>
            <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
              {[
                { id: "stub-user-citizen", name: "Cetățean Demo", note: "Utilizatorul principal al aplicației" },
                { id: "mock-user-andrei", name: "Andrei Popescu", note: "PFA în desfășurare, BMW CJ-50-BMW" },
                { id: "mock-user-maria", name: "Maria Ionescu", note: "Înmatriculare mașină nouă" },
                { id: "mock-user-alex", name: "Alexandru Mureșan", note: "Mutare la Cluj, pas 2/4" },
              ].map((u) => (
                <div key={u.id} className="px-4 py-3">
                  <p className="text-[13px] font-semibold text-text-primary">{u.name}</p>
                  <p className="text-[11px] font-mono text-text-tertiary mt-0.5">{u.id}</p>
                  <p className="text-[12px] text-text-secondary mt-0.5">{u.note}</p>
                </div>
              ))}
            </div>
          </section>

        </FadeIn>
      </div>
    </AppShell>
  );
}
