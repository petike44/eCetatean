import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, IdCard, Plane, Briefcase, Baby, CarFront, Car, AlertCircle, ChevronRight, FileUp, Loader2, Sparkles, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HomeTopBar, TopBarButton } from "@/components/TopBar";
import { FadeIn } from "@/components/motion-primitives";
import { Card, GhostButton, Badge } from "@/components/ui-bits";
import { Protected } from "@/lib/auth-guard";
import { useProfile, useLifeEvents } from "@/lib/api-hooks";
import { profileCompletion, formatRoDate } from "@/lib/profile-utils";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documente — eCetățean" }] }),
  component: () => (
    <Protected>
      <Documents />
    </Protected>
  ),
});

const TABS = ["Acasă", "Acte", "Proceduri", "PDF"] as const;
type Tab = (typeof TABS)[number];

const iconFor: Record<string, typeof IdCard> = {
  "id-card": IdCard, plane: Plane, briefcase: Briefcase, baby: Baby, "car-front": CarFront, car: Car,
};

const procedureGroups = [
  {
    title: "Identitate",
    items: [
      { icon: "id-card", label: "Buletin de identitate", query: "Reînnoire buletin" },
      { icon: "plane", label: "Pașaport", query: "Pașaport simplu electronic" },
    ],
  },
  {
    title: "Vehicule",
    items: [
      { icon: "car-front", label: "Permis de conducere", query: "Permis de conducere" },
      { icon: "car", label: "Înmatriculare vehicul", query: "Înmatriculare vehicul" },
    ],
  },
  {
    title: "Afaceri & familie",
    items: [
      { icon: "briefcase", label: "Înregistrare PFA", query: "Înregistrare PFA" },
      { icon: "baby", label: "Certificat de naștere", query: "Certificat de naștere copil" },
    ],
  },
];

function Documents() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("Acasă");
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: lifeEvents = [] } = useLifeEvents();
  const { pct, filled, total } = profileCompletion(profile);
  const activeEvents = lifeEvents.filter((e) => !e.is_completed);

  const hasId = profile?.buletin_series?.trim() && profile?.buletin_number?.trim();

  const startProcedure = () => nav({ to: "/chat" });

  return (
    <AppShell
      className="lg:!px-0 lg:!py-0"
      topBar={
        <div className="hidden lg:block">
          <HomeTopBar
            right={
              <TopBarButton aria-label="Notificări">
                <Bell size={20} className="text-text-primary" />
              </TopBarButton>
            }
          />
        </div>
      }
    >
      <div className="lg:max-w-4xl lg:mx-auto">

        {/* Page title */}
        <FadeIn className="px-5 pt-4 lg:px-0 lg:pt-6">
          <h1 className="font-display font-bold text-[22px] lg:text-[26px] text-text-primary">Documentele mele</h1>
        </FadeIn>

        {/* Profile completion bar — always visible */}
        <div className="px-5 mt-4 lg:px-0">
          {profileLoading ? (
            <div className="flex items-center gap-2 text-text-secondary text-[14px]">
              <Loader2 size={16} className="animate-spin shrink-0" /> Se încarcă profilul...
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[13px] font-medium text-text-secondary">
                    {pct >= 100 ? "Profil complet" : `Profil ${pct}% completat`}
                  </p>
                  <span className="text-[12px] text-text-tertiary">{filled}/{total}</span>
                </div>
                <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", pct >= 100 ? "bg-success" : "bg-accent")}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
              <Link
                to="/profile"
                className="press shrink-0 text-[13px] font-semibold text-primary min-h-11 flex items-center gap-0.5"
              >
                {pct < 100 ? "Mergi la profil" : "Profil"}
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Actele mele — always visible */}
        <div className="px-5 mt-5 lg:px-0">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Actele mele</p>
          {!hasId ? (
            <button
              type="button"
              onClick={() => nav({ to: "/profile" })}
              className="press w-full flex items-center gap-3 py-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-surface-secondary flex items-center justify-center shrink-0">
                <FileUp size={16} className="text-text-tertiary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-primary">Niciun act înregistrat</p>
                <p className="text-[12px] text-text-tertiary">Adaugă buletin în profil</p>
              </div>
              <ChevronRight size={16} className="text-text-tertiary shrink-0" />
            </button>
          ) : (
            <div className="divide-y divide-border">
              <DocListRow
                icon={IdCard}
                title="Carte de identitate"
                meta={`Seria ${profile!.buletin_series} ${profile!.buletin_number}`}
                badge={<Badge tone="green">ÎNREGISTRAT</Badge>}
                sub={profile?.buletin_expiry ? `Expiră ${formatRoDate(profile.buletin_expiry)}` : "Adaugă data expirării"}
              />
              <DocListRow
                icon={Plane}
                title="Pașaport"
                meta="Nu este înregistrat"
                badge={<Badge tone="neutral">LIPSĂ</Badge>}
                sub="Întreabă ClaudIA pentru pașaport"
                onClick={startProcedure}
              />
            </div>
          )}
        </div>

        {/* Horizontal tab dial */}
        <div className="sticky top-14 lg:top-0 z-20 bg-bg/90 backdrop-blur-md mt-5">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide px-5 lg:px-0 border-b border-border relative">
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
                    layoutId="docs-tab"
                    className="absolute inset-x-1 bottom-0 h-0.5 bg-accent rounded-full"
                    transition={navIndicator.transition}
                  />
                )}
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="px-5 pt-5 pb-8 lg:px-0 lg:pb-10"
          >
            {tab === "Acasă" && <TabHome activeEvents={activeEvents} onOpenChat={() => nav({ to: "/chat" })} onReport={() => nav({ to: "/report" })} />}
            {tab === "Acte" && <TabActe hasId={!!hasId} profile={profile} onStartProcedure={startProcedure} />}
            {tab === "Proceduri" && <TabProceduri onStartProcedure={startProcedure} />}
            {tab === "PDF" && <TabPdf onOpen={() => nav({ to: "/document-preview" })} />}
          </motion.div>
        </AnimatePresence>

        <section className="px-5 mb-6 lg:px-0">
          <Link
            to="/staff"
            className="press block text-center text-[13px] text-primary font-medium min-h-11 flex items-center justify-center underline-offset-4 hover:underline"
          >
            Ești funcționar public?
          </Link>
        </section>

      </div>
    </AppShell>
  );
}

function TabHome({
  activeEvents,
  onOpenChat,
  onReport,
}: {
  activeEvents: { id: string; event_title: string; current_step: number; total_steps: number }[];
  onOpenChat: () => void;
  onReport: () => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
          Proceduri active{activeEvents.length > 0 && ` · ${activeEvents.length}`}
        </p>
        {activeEvents.length === 0 ? (
          <div className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-surface-secondary flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-text-tertiary" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-text-secondary">Nicio procedură activă</p>
              <button
                type="button"
                onClick={onOpenChat}
                className="press text-[13px] font-semibold text-primary flex items-center gap-0.5 min-h-11"
              >
                Deschide ClaudIA <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={onOpenChat}
                className="press w-full flex items-center gap-3 py-3.5 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-accent-light flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-accent-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text-primary truncate">{ev.event_title}</p>
                  <p className="text-[12px] text-text-tertiary">Pasul {ev.current_step} din {ev.total_steps}</p>
                </div>
                <ChevronRight size={16} className="text-text-tertiary shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Altele</p>
        <button
          type="button"
          onClick={onReport}
          className="press w-full flex items-center gap-3 py-3 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-surface-secondary flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-text-primary">Sesizare rapidă</p>
            <p className="text-[12px] text-text-tertiary">Raportează o problemă în oraș</p>
          </div>
          <ChevronRight size={16} className="text-text-tertiary shrink-0" />
        </button>
      </div>
    </div>
  );
}

function TabActe({
  hasId,
  profile,
  onStartProcedure,
}: {
  hasId: boolean;
  profile: { buletin_series?: string | null; buletin_number?: string | null; buletin_expiry?: string | null } | undefined;
  onStartProcedure: () => void;
}) {
  if (!hasId) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
            <FileUp size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-[15px] text-text-primary">Niciun act înregistrat</p>
            <p className="text-[14px] text-text-secondary mt-1">
              Adaugă seria și numărul buletinului în profil pentru a le vedea aici.
            </p>
            <Link
              to="/profile"
              className="press inline-flex items-center gap-1 text-[13px] font-semibold text-primary mt-3 min-h-11"
            >
              Completează buletinul <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="divide-y divide-border">
      <DocListRow
        icon={IdCard}
        title="Carte de identitate"
        meta={`Seria ${profile!.buletin_series} ${profile!.buletin_number}`}
        badge={<Badge tone="green">ÎNREGISTRAT</Badge>}
        sub={profile?.buletin_expiry ? `Expiră ${formatRoDate(profile.buletin_expiry)}` : "Adaugă data expirării"}
      />
      <DocListRow
        icon={Plane}
        title="Pașaport"
        meta="Nu este înregistrat"
        badge={<Badge tone="neutral">LIPSĂ</Badge>}
        sub="Întreabă ClaudIA pentru pașaport"
        onClick={onStartProcedure}
      />
    </div>
  );
}

function TabProceduri({ onStartProcedure }: { onStartProcedure: () => void }) {
  return (
    <div className="space-y-7">
      {procedureGroups.map((group) => (
        <div key={group.title}>
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
            {group.title}
          </p>
          <div className="divide-y divide-border">
            {group.items.map((a) => {
              const I = iconFor[a.icon];
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={onStartProcedure}
                  className="press w-full flex items-center gap-3 py-3.5 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-secondary flex items-center justify-center shrink-0">
                    <I size={17} className="text-text-secondary" />
                  </div>
                  <p className="flex-1 text-[14px] font-medium text-text-primary">{a.label}</p>
                  <ChevronRight size={16} className="text-text-tertiary shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabPdf({ onOpen }: { onOpen: () => void }) {
  return (
    <Card accent="green">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-success-light text-success flex items-center justify-center shrink-0">
          <Wand2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[15px] text-text-primary">Autocompletare PDF</h3>
          <p className="text-[14px] text-text-secondary mt-1 mb-3">
            Caută formulare oficiale și completează-le cu datele din profil.
          </p>
          <GhostButton onClick={onOpen}>Caută formular</GhostButton>
        </div>
      </div>
    </Card>
  );
}

function DocListRow({
  icon: Icon,
  title,
  meta,
  badge,
  sub,
  onClick,
}: {
  icon: typeof IdCard;
  title: string;
  meta: string;
  badge: React.ReactNode;
  sub: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-3 py-3.5">
      <div className="w-10 h-10 rounded-xl bg-surface-secondary flex items-center justify-center shrink-0">
        <Icon size={18} className="text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text-primary truncate">{title}</p>
        <p className="text-[12px] text-text-secondary truncate">{meta}</p>
        <p className="text-[11.5px] text-text-tertiary truncate">{sub}</p>
      </div>
      {badge}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="press w-full text-left">
        {inner}
      </button>
    );
  }
  return inner;
}
