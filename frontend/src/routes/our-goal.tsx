import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, FileText, Landmark, Network, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { FadeIn, StaggerItem, StaggerList } from "@/components/motion-primitives";
import { Badge } from "@/components/ui-bits";

export const Route = createFileRoute("/our-goal")({
  head: () => ({
    meta: [
      { title: "Scopul nostru | eCetățean" },
      {
        name: "description",
        content:
          "Scopul eCetățean este să folosească AI pentru proceduri civice simple și să pregătească automatizarea interacțiunilor cu statul.",
      },
      { property: "og:title", content: "Scopul nostru | eCetățean" },
      {
        property: "og:description",
        content:
          "Cum folosim AI pentru viața civică de zi cu zi și cum vrem să conectăm aplicația la API uri oficiale ale statului.",
      },
    ],
  }),
  component: OurGoalPage,
});

const goalPillars = [
  {
    icon: Sparkles,
    title: "Ajutor rapid pentru cetățeni",
    text: "eCetățean explică procedurile publice pe înțelesul tuturor. Utilizatorul spune ce problemă are, iar aplicația îl ghidează către pașii corecți.",
  },
  {
    icon: Bot,
    title: "AI pentru evenimente de viață",
    text: "Folosim AI ca să transformăm situații reale în planuri clare. Mutare în alt oraș, acte auto, buletin, pașaport sau PFA devin pași, documente, costuri și termene.",
  },
  {
    icon: Network,
    title: "Automatizare prin API uri publice",
    text: "Pe termen lung vrem ca instituțiile statului să ofere acces controlat la API uri oficiale. Atunci eCetățean ar putea completa, valida și trimite cereri direct din aplicație, cu acordul utilizatorului.",
  },
];

const roadmap = [
  "Identificăm procedura potrivită pentru fiecare nevoie.",
  "Construim un plan de acțiune cu pași simpli și documente necesare.",
  "Pregătim formulare și informații pe baza profilului utilizatorului.",
  "Păstrăm controlul la cetățean pentru orice date personale folosite.",
];

function OurGoalPage() {
  return (
    <AppShell
      topBar={<TopBar title="Scopul nostru" subtitle="Digitalizarea României" />}
      contentClassName="lg:max-w-4xl lg:mx-auto"
      className="lg:!px-5"
    >
      <div className="px-5 pt-4 pb-10 lg:px-0 lg:pt-2">
        <FadeIn>
          <header className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-card">
            <div className="relative bg-gradient-to-br from-primary via-primary to-accent px-5 py-7 text-white lg:px-8 lg:py-10">
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,white,transparent_34%),radial-gradient(circle_at_80%_10%,white,transparent_28%)]" />
              <div className="relative">
                <Badge tone="metro">Scopul proiectului</Badge>
                <h1 className="font-display mt-4 text-[30px] font-bold leading-tight tracking-tight lg:text-[42px]">
                  Vrem ca interacțiunea cu statul să fie simplă, ghidată și digitală.
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80 lg:text-[17px]">
                  eCetățean folosește AI pentru a ajuta oamenii să rezolve evenimente de viață. Aplicația explică
                  proceduri, găsește soluții, pregătește documente și arată ce trebuie făcut mai departe.
                </p>
              </div>
            </div>

            <div className="grid gap-3 p-4 lg:grid-cols-3 lg:p-5">
              <HeroMetric label="Acum" value="ghidare cu AI" />
              <HeroMetric label="Curând" value="formulare pregătite" />
              <HeroMetric label="Pe termen lung" value="automatizare prin API uri" />
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
                  <FileText size={20} strokeWidth={1.9} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                    Cum funcționează astăzi
                  </p>
                  <h2 className="font-display mt-1 text-[20px] font-semibold text-text-primary">
                    Cu AI, o problemă civică devine un plan concret.
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
                Utilizatorul poate întreba ce trebuie să facă pentru o situație reală. ClaudIA citește contextul,
                identifică procedura, explică pașii și ajută la pregătirea documentelor necesare.
              </p>
              <div className="mt-4 rounded-2xl bg-surface-secondary p-4">
                <p className="text-[13px] font-semibold text-text-primary">Rezultatul pentru utilizator</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                  Mai puțină confuzie, mai puțin timp pierdut și o imagine clară asupra actelor, taxelor, instituțiilor
                  și termenelor.
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
                    Viziunea pe termen lung
                  </p>
                  <h2 className="font-display text-[20px] font-semibold text-text-primary">Automatizare completă prin API uri oficiale</h2>
                </div>
              </div>
              <div className="rounded-2xl bg-surface-secondary p-4">
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  Dacă această soluție funcționează la scară largă, următorul pas este colaborarea cu statul pentru
                  acces public controlat la API uri oficiale. Prin aceste API uri, aplicația ar putea precompleta
                  câmpuri, verifica date, trimite cereri și urmări statusul direct în eCetățean.
                </p>
              </div>
              <div className="mt-3 rounded-2xl bg-surface-secondary p-4">
                <p className="text-[13px] font-semibold text-text-primary">Principiul important</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                  Automatizarea trebuie să fie sigură, transparentă și făcută doar cu acordul utilizatorului.
                </p>
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
                  Ce face eCetățean pentru oameni
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
              Scopul final
            </p>
            <h2 className="font-display mt-2 text-[22px] font-semibold text-primary">
              O singură aplicație pentru interacțiunea cu instituțiile statului.
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
              Scopul nostru este ca oamenii să nu mai caute informații în zeci de portaluri. În viitor, cu API uri
              oficiale ale statului, eCetățean poate deveni locul unde cetățeanul înțelege, pregătește și rezolvă
              digital relația cu administrația publică.
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
