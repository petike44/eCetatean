import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  DatabaseZap,
  FileCode2,
  KeyRound,
  Landmark,
  LockKeyhole,
  Network,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { FadeIn, StaggerItem, StaggerList } from "@/components/motion-primitives";
import { Badge } from "@/components/ui-bits";

export const Route = createFileRoute("/our-goal")({
  head: () => ({
    meta: [
      { title: "Our goal — eCetățean" },
      {
        name: "description",
        content:
          "Viziunea eCetățean pentru digitalizarea serviciilor publice prin API-uri guvernamentale sigure, documentate și interoperabile.",
      },
      { property: "og:title", content: "Our goal — eCetățean" },
      {
        property: "og:description",
        content:
          "Cum putem transforma portalurile statului în servicii digitale conectate, cu acordul cetățeanului.",
      },
    ],
  }),
  component: OurGoalPage,
});

const goalPillars = [
  {
    icon: FileCode2,
    title: "API-uri publice documentate",
    text: "Fiecare instituție ar trebui să ofere endpoint-uri stabile, specificații OpenAPI, exemple clare și medii de test pentru dezvoltatori.",
  },
  {
    icon: ShieldCheck,
    title: "Acces cu consimțământ",
    text: "Automatizarea trebuie făcută prin ROeID, OAuth2 sau eIDAS, astfel încât cetățeanul să poată aproba, limita și revoca accesul.",
  },
  {
    icon: Network,
    title: "Interoperabilitate reală",
    text: "Instituțiile trebuie să poată verifica date între ele, ca oamenii să nu mai ducă aceleași copii, adeverințe și declarații de la un ghișeu la altul.",
  },
];

const roadmap = [
  "Generăm formulare și dosare digitale corecte pe baza profilului cetățeanului.",
  "Modelăm procedurile statului ca pași clari, verificabili și reutilizabili.",
  "Pregătim conectori pentru viitoare API-uri oficiale, fără scraping fragil sau automatizări neautorizate.",
  "Promovăm standarde deschise pentru instituții, dezvoltatori și servicii civice.",
];

const apiStandards = [
  { icon: KeyRound, label: "Autentificare", value: "OAuth2, ROeID, eIDAS, certificate instituționale" },
  { icon: LockKeyhole, label: "Control", value: "consimțământ granular, audit log, revocare acces" },
  { icon: DatabaseZap, label: "Date", value: "scheme comune pentru identitate, adrese, taxe, vehicule și firme" },
  { icon: Bot, label: "Automatizare", value: "prefill, validare, depunere și status prin API-uri oficiale" },
];

function OurGoalPage() {
  return (
    <AppShell
      topBar={<TopBar title="Our goal" subtitle="Digitalizarea României" />}
      contentClassName="lg:max-w-4xl lg:mx-auto"
      className="lg:!px-5"
    >
      <div className="px-5 pt-4 pb-10 lg:px-0 lg:pt-2">
        <FadeIn>
          <header className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-card">
            <div className="relative bg-gradient-to-br from-primary via-primary to-accent px-5 py-7 text-white lg:px-8 lg:py-10">
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,white,transparent_34%),radial-gradient(circle_at_80%_10%,white,transparent_28%)]" />
              <div className="relative">
                <Badge tone="metro">Inițiativă civică</Badge>
                <h1 className="font-display mt-4 text-[30px] font-bold leading-tight tracking-tight lg:text-[42px]">
                  Our goal: servicii publice conectate, nu formulare repetate.
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80 lg:text-[17px]">
                  eCetățean vrea să ajute România să treacă de la portaluri izolate la infrastructură digitală:
                  API-uri oficiale, sigure și documentate, prin care aplicațiile pot precompleta, valida și trimite
                  cereri cu acordul explicit al cetățeanului.
                </p>
              </div>
            </div>

            <div className="grid gap-3 p-4 lg:grid-cols-3 lg:p-5">
              <HeroMetric label="Mai puține drumuri" value="online first" />
              <HeroMetric label="Mai puține copii" value="once-only" />
              <HeroMetric label="Mai mult control" value="consimțământ" />
            </div>
          </header>
        </FadeIn>

        <StaggerList className="mt-6 grid gap-4 lg:grid-cols-3">
          {goalPillars.map(({ icon: Icon, title, text }) => (
            <StaggerItem key={title}>
              <article className="h-full rounded-2xl border border-border bg-surface p-5 shadow-card transition-all duration-200 lg:hover:-translate-y-0.5 lg:hover:shadow-elevated">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-light text-accent-dark">
                  <Icon size={20} strokeWidth={1.9} />
                </div>
                <h2 className="font-display text-[17px] font-semibold text-text-primary">{title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{text}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerList>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <FadeIn delay={0.05}>
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                  <Building2 size={20} strokeWidth={1.9} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                    Problema actuală
                  </p>
                  <h2 className="font-display mt-1 text-[20px] font-semibold text-text-primary">
                    Site-urile statului sunt făcute pentru oameni, nu pentru integrare software.
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
                Multe portaluri publice nu oferă API-uri stabile, documentație pentru dezvoltatori, sandbox-uri sau
                reguli clare pentru aplicații terțe. Asta blochează automatizarea legitimă: precompletare de câmpuri,
                verificare de documente, depunere de cereri și urmărirea statusului.
              </p>
              <div className="mt-4 rounded-2xl bg-surface-secondary p-4">
                <p className="text-[13px] font-semibold text-text-primary">Principiul nostru</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                  Nu construim automatizări fragile peste formulare web. Construim un produs pregătit să se conecteze
                  corect la API-uri oficiale atunci când instituțiile le vor pune la dispoziție.
                </p>
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={0.1}>
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-light text-success">
                  <Landmark size={20} strokeWidth={1.9} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                    Ce poate face statul
                  </p>
                  <h2 className="font-display text-[20px] font-semibold text-text-primary">Un portal național de API-uri</h2>
                </div>
              </div>
              <div className="space-y-3">
                {apiStandards.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3 rounded-2xl bg-surface-secondary p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-text-primary">{label}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </FadeIn>
        </div>

        <FadeIn delay={0.12}>
          <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                  Rolul eCetățean
                </p>
                <h2 className="font-display mt-1 text-[20px] font-semibold text-text-primary">
                  Pregătim terenul pentru automatizare civică sigură.
                </h2>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {roadmap.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={18} strokeWidth={2.1} />
                  <p className="text-[14px] leading-relaxed text-text-secondary">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.15}>
          <section className="mt-6 rounded-2xl border border-primary/10 bg-primary-light p-5 lg:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
              Viziune pe termen lung
            </p>
            <h2 className="font-display mt-2 text-[22px] font-semibold text-primary">
              România poate avea servicii publice care lucrează pentru cetățean.
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
              Când API-urile oficiale vor exista, eCetățean poate transforma profilul utilizatorului într-un flux
              complet: câmpuri completate automat, validări înainte de depunere, trimitere securizată și notificări de
              status. Scopul nu este să înlocuim statul, ci să facem interacțiunea cu statul mai simplă, transparentă
              și verificabilă.
            </p>
            <Link
              to="/chat"
              className="press mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 py-3 text-[14px] font-semibold text-white transition-colors duration-200 hover:bg-accent-dark"
            >
              Încearcă asistentul civic
              <ArrowRight size={16} />
            </Link>
          </section>
        </FadeIn>
      </div>
    </AppShell>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-secondary px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
      <p className="font-display mt-1 text-[16px] font-semibold text-text-primary">{value}</p>
    </div>
  );
}
