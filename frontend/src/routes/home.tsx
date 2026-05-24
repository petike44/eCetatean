import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  ArrowRight,
  X,
  Sparkles,
  FolderOpen,
  Newspaper,
  ListChecks,
  ChevronRight,
  CreditCard,
  Car,
  BadgeCheck,
  Building2,
  Clock,
  FileText,
  Zap,
  UserPlus,
  MessageSquare,
  ClipboardCheck,
  ShieldCheck,
  Scale,
  HeartHandshake,
  Lightbulb,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HomeTopBar } from "@/components/TopBar";
import { StaggerList, StaggerItem } from "@/components/motion-primitives";
import { Protected } from "@/lib/auth-guard";
import { useProfile, useNews, useLifeEvents } from "@/lib/api-hooks";
import type { CitizenProfile, NewsItem, LifeEventProgressWithDetails } from "@/lib/api-hooks";
import { profileCompletion, profileDisplayName } from "@/lib/profile-utils";
import { slideUpSheet } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Acasă — eCetățean" }] }),
  component: () => (
    <Protected>
      <Home />
    </Protected>
  ),
});

// ——— Greeting helpers ———————————————————————————————————————

const RO_DAYS = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const RO_MONTHS = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bună dimineața";
  if (h < 18) return "Bună ziua";
  return "Bună seara";
}

function getRoDate() {
  const d = new Date();
  return `${RO_DAYS[d.getDay()]}, ${d.getDate()} ${RO_MONTHS[d.getMonth()]}`;
}

// ——— SVG Illustrations ——————————————————————————————————————

function IllustrationChat() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="16" width="52" height="36" rx="11" fill="currentColor" fillOpacity="0.12" />
      <rect x="10" y="16" width="52" height="36" rx="11" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <path d="M20 52 L14 64 L30 55" fill="currentColor" fillOpacity="0.12" />
      <path d="M20 52 L14 64 L30 55" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeOpacity="0.3" />
      <circle cx="27" cy="34" r="3.5" fill="currentColor" fillOpacity="0.65" />
      <circle cx="40" cy="34" r="3.5" fill="currentColor" fillOpacity="0.65" />
      <circle cx="53" cy="34" r="3.5" fill="currentColor" fillOpacity="0.65" />
      <path d="M64 12 L65.4 16.6 L70 18 L65.4 19.4 L64 24 L62.6 19.4 L58 18 L62.6 16.6 Z" fill="currentColor" fillOpacity="0.55" />
      <path d="M16 9 L16.9 11.6 L19.5 12.5 L16.9 13.4 L16 16 L15.1 13.4 L12.5 12.5 L15.1 11.6 Z" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

function IllustrationDocuments() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="22" y="14" width="38" height="50" rx="6" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.18" />
      <rect x="17" y="19" width="38" height="50" rx="6" fill="currentColor" fillOpacity="0.09" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.22" />
      <rect x="12" y="24" width="38" height="50" rx="6" fill="white" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M36 24 L50 24 L50 38 Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M36 24 L36 38 L50 38" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.28" />
      <line x1="18" y1="46" x2="42" y2="46" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.38" />
      <line x1="18" y1="53" x2="42" y2="53" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.38" />
      <line x1="18" y1="60" x2="32" y2="60" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.38" />
    </svg>
  );
}

function IllustrationNews() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="8" y="14" width="56" height="54" rx="7" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.22" />
      <rect x="8" y="14" width="56" height="18" rx="7" fill="currentColor" fillOpacity="0.14" />
      <rect x="8" y="28" width="56" height="4" fill="currentColor" fillOpacity="0.06" />
      <line x1="15" y1="21" x2="46" y2="21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.48" />
      <line x1="15" y1="40" x2="57" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
      <line x1="15" y1="47" x2="57" y2="47" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
      <line x1="15" y1="54" x2="46" y2="54" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
      <rect x="44" y="58" width="16" height="6" rx="3" fill="currentColor" fillOpacity="0.14" />
      <circle cx="60" cy="17" r="6" fill="#0E7C66" />
      <circle cx="60" cy="17" r="3.5" fill="white" fillOpacity="0.75" />
    </svg>
  );
}

function IllustrationActionPlan() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="24" y1="22" x2="24" y2="68" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
      {/* Step 1 — done */}
      <circle cx="24" cy="24" r="9" fill="currentColor" fillOpacity="0.75" />
      <path d="M20 24 L23 27 L29 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Step 2 — active */}
      <circle cx="24" cy="46" r="9" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.55" />
      <circle cx="24" cy="46" r="3.5" fill="currentColor" fillOpacity="0.65" />
      {/* Step 3 — pending */}
      <circle cx="24" cy="68" r="9" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.22" />
      <path d="M21.5 67 L21.5 65 Q21.5 62.5 24 62.5 Q26.5 62.5 26.5 65 L26.5 67" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.38" />
      <rect x="20.5" y="67" width="7" height="4.5" rx="1.5" fill="currentColor" fillOpacity="0.18" />
      {/* Labels */}
      <line x1="38" y1="22" x2="66" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.48" />
      <line x1="38" y1="27" x2="58" y2="27" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.22" />
      <line x1="38" y1="44" x2="66" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.38" />
      <line x1="38" y1="49" x2="56" y2="49" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.18" />
      <line x1="38" y1="66" x2="62" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.2" />
      <line x1="38" y1="71" x2="52" y2="71" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.12" />
    </svg>
  );
}

// ——— Feature cards data ——————————————————————————————————————

type QuickAction = { label: string; icon: typeof ArrowRight; to: string };

type FeatureCard = {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  bgClass: string;
  illustration: React.FC;
  quickActions: QuickAction[];
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    id: "chat",
    title: "Asistent",
    subtitle: "ClaudIA te ajută",
    accentColor: "#0E7C66",
    bgClass: "from-[#0E7C66]/10 to-[#0E7C66]/4",
    illustration: IllustrationChat,
    quickActions: [
      { label: "Pune o întrebare", icon: Sparkles, to: "/chat" },
      { label: "Reînnoire buletin", icon: ArrowRight, to: "/chat" },
      { label: "Proceduri frecvente", icon: ArrowRight, to: "/chat" },
    ],
  },
  {
    id: "documents",
    title: "Documente",
    subtitle: "Acte și proceduri",
    accentColor: "#0B2540",
    bgClass: "from-[#0B2540]/10 to-[#0B2540]/4",
    illustration: IllustrationDocuments,
    quickActions: [
      { label: "Acte personale", icon: FolderOpen, to: "/documents" },
      { label: "Proceduri", icon: ArrowRight, to: "/documents" },
      { label: "Completare PDF", icon: ArrowRight, to: "/documents" },
    ],
  },
  {
    id: "news",
    title: "Noutăți",
    subtitle: "Buletin civic",
    accentColor: "#1F4E79",
    bgClass: "from-[#1F4E79]/10 to-[#1F4E79]/4",
    illustration: IllustrationNews,
    quickActions: [
      { label: "Citește știrile", icon: Newspaper, to: "/news" },
      { label: "Anunțuri legislative", icon: ArrowRight, to: "/news" },
    ],
  },
  {
    id: "action-plan",
    title: "Plan de acțiune",
    subtitle: "Pași clari înainte",
    accentColor: "#6D3AB5",
    bgClass: "from-[#6D3AB5]/10 to-[#6D3AB5]/4",
    illustration: IllustrationActionPlan,
    quickActions: [
      { label: "Continuă planul", icon: ListChecks, to: "/action-plan" },
      { label: "Plan cu Asistentul", icon: Sparkles, to: "/chat" },
    ],
  },
];

// ——— Feature grid ———————————————————————————————————————————

function FeatureGrid({ onCardClick }: { onCardClick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
      {FEATURE_CARDS.map((card) => {
        const Illustration = card.illustration;
        return (
          <motion.button
            key={card.id}
            onClick={() => onCardClick(card.id)}
            className={cn(
              "press rounded-[20px] bg-gradient-to-br text-left flex flex-col",
              "border border-black/[0.07] shadow-card overflow-hidden",
              card.bgClass,
            )}
            style={{ aspectRatio: "196 / 230", color: card.accentColor }}
            aria-label={`Deschide ${card.title}`}
          >
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-16">
                <Illustration />
              </div>
            </div>
            <div className="px-3 pb-4 pt-1">
              <p className="font-display font-semibold text-[13px] text-text-primary leading-tight">
                {card.title}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-tight">
                {card.subtitle}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// ——— Quick-action sheet ————————————————————————————————————

function QuickActionSheet({
  cardId,
  onClose,
}: {
  cardId: string | null;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const card = FEATURE_CARDS.find((c) => c.id === cardId);

  const handleAction = (to: string) => {
    onClose();
    setTimeout(() => nav({ to: to as "/chat" }), 100);
  };

  return (
    <Dialog.Root open={!!cardId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" />
        <Dialog.Content asChild>
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={slideUpSheet}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-[22px] shadow-sheet focus:outline-none"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-border" />
            </div>

            {card && (
              <>
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${card.accentColor}18`, color: card.accentColor }}
                  >
                    <div style={{ width: 28, height: 28 }}>
                      <card.illustration />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-[15px] text-text-primary leading-tight">
                      {card.title}
                    </p>
                    <p className="text-[12px] text-text-secondary">{card.subtitle}</p>
                  </div>
                  <Dialog.Close className="press ml-auto w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors shrink-0">
                    <X size={15} />
                  </Dialog.Close>
                </div>

                <div className="px-3 py-2.5 flex flex-col gap-0.5">
                  {card.quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => handleAction(action.to)}
                        className="press flex items-center gap-3 px-3 py-3 rounded-[14px] hover:bg-surface-secondary transition-colors text-left w-full"
                      >
                        <div
                          className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${card.accentColor}14`,
                            color: card.accentColor,
                          }}
                        >
                          <Icon size={15} />
                        </div>
                        <span className="text-[14px] font-medium text-text-primary">
                          {action.label}
                        </span>
                        <ChevronRight size={15} className="ml-auto text-text-tertiary shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ——— Overview widgets ————————————————————————————————————————

function ProfileWidget({ profile }: { profile: CitizenProfile | null | undefined }) {
  const nav = useNavigate();
  const { pct, filled, total } = profileCompletion(profile);
  const r = 19;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  return (
    <button
      onClick={() => nav({ to: "/profile" })}
      className="press flex items-center gap-3.5 p-4 rounded-2xl border border-border bg-surface shadow-card w-full text-left hover:shadow-elevated transition-shadow duration-200"
    >
      <div className="relative shrink-0 w-11 h-11">
        <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="22" cy="22" r={r} strokeWidth="3.5" stroke="var(--color-border)" fill="none" />
          <circle
            cx="22"
            cy="22"
            r={r}
            strokeWidth="3.5"
            stroke="var(--color-accent)"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-[11px] text-text-primary">
          {pct}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-[14px] text-text-primary leading-tight">
          Profilul tău
        </p>
        <p className="text-[12px] text-text-secondary mt-0.5">
          {filled} din {total} câmpuri completate
        </p>
      </div>
      <ChevronRight size={15} className="shrink-0 text-text-tertiary" />
    </button>
  );
}

function NewsWidget({ news }: { news: NewsItem[] }) {
  const nav = useNavigate();
  const latest = news[0];
  if (!latest) return null;

  return (
    <button
      onClick={() => nav({ to: "/news" })}
      className="press flex flex-col gap-2 p-4 rounded-2xl border border-border bg-surface shadow-card w-full text-left hover:shadow-elevated transition-shadow duration-200"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
          Buletin civic
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-accent ml-auto shrink-0" />
      </div>
      <p className="font-display font-semibold text-[14px] text-text-primary leading-snug line-clamp-2">
        {latest.title}
      </p>
      <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-2">
        {latest.summary}
      </p>
      <span className="flex items-center gap-1 text-accent text-[12px] font-medium">
        Citește <ChevronRight size={13} />
      </span>
    </button>
  );
}

function LifeEventWidget({ events }: { events: LifeEventProgressWithDetails[] }) {
  const nav = useNavigate();
  const active = events.find((e) => !e.is_completed);
  if (!active) return null;

  const pct =
    active.completion_percentage ??
    Math.round((active.current_step / active.total_steps) * 100);

  return (
    <button
      onClick={() => nav({ to: "/action-plan" })}
      className="press flex flex-col gap-3 p-4 rounded-2xl border border-border bg-surface shadow-card w-full text-left hover:shadow-elevated transition-shadow duration-200"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
          Plan activ
        </span>
        <span className="ml-auto text-[11px] text-text-secondary font-medium">
          {active.current_step}/{active.total_steps} pași
        </span>
      </div>
      <p className="font-display font-semibold text-[14px] text-text-primary leading-tight line-clamp-1">
        {active.event_title}
      </p>
      <div>
        <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-text-tertiary mt-1">{pct}% completat</p>
      </div>
    </button>
  );
}

// ——— Quick actions ——————————————————————————————————————————

const QUICK_ACTIONS = [
  { label: "Reînnoire buletin", icon: BadgeCheck, to: "/chat", color: "#0E7C66" },
  { label: "Înregistrare vehicul", icon: Car, to: "/chat", color: "#1F4E79" },
  { label: "Plată taxe locale", icon: CreditCard, to: "/chat", color: "#0B2540" },
  { label: "Adeverință domiciliu", icon: Building2, to: "/chat", color: "#6D3AB5" },
];

function QuickActionsSection() {
  const nav = useNavigate();
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={12} className="text-text-tertiary" />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Acțiuni rapide
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => nav({ to: a.to as "/chat" })}
              className="press flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border bg-surface shadow-card hover:shadow-elevated transition-shadow text-left"
            >
              <div
                className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${a.color}14`, color: a.color }}
              >
                <Icon size={15} />
              </div>
              <span className="text-[13px] font-medium text-text-primary leading-tight">
                {a.label}
              </span>
              <ChevronRight size={13} className="ml-auto shrink-0 text-text-tertiary" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ——— Popular guides ——————————————————————————————————————————

const POPULAR_GUIDES = [
  {
    title: "Cum îți reînnoiești buletinul de identitate",
    category: "Acte personale",
    time: "~30 min",
    icon: BadgeCheck,
    color: "#0E7C66",
    to: "/chat",
  },
  {
    title: "Înmatriculare autoturism nou",
    category: "Transport",
    time: "~1 oră",
    icon: Car,
    color: "#1F4E79",
    to: "/chat",
  },
  {
    title: "Obținerea unui certificat de naștere",
    category: "Familie",
    time: "~20 min",
    icon: FileText,
    color: "#0B2540",
    to: "/chat",
  },
  {
    title: "Schimbare domiciliu — pași obligatorii",
    category: "Domiciliu",
    time: "~45 min",
    icon: Building2,
    color: "#6D3AB5",
    to: "/chat",
  },
];

function PopularGuidesSection() {
  const nav = useNavigate();
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-3">
        <Newspaper size={12} className="text-text-tertiary" />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Ghiduri populare
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {POPULAR_GUIDES.map((g) => {
          const Icon = g.icon;
          return (
            <button
              key={g.title}
              onClick={() => nav({ to: g.to as "/chat" })}
              className="press flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-border bg-surface shadow-card hover:shadow-elevated transition-shadow text-left"
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${g.color}12`, color: g.color }}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-text-primary leading-snug line-clamp-1">
                  {g.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-text-tertiary">{g.category}</span>
                  <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                  <Clock size={10} className="text-text-tertiary shrink-0" />
                  <span className="text-[11px] text-text-tertiary">{g.time}</span>
                </div>
              </div>
              <ChevronRight size={14} className="shrink-0 text-text-tertiary" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ——— Main page ——————————————————————————————————————————————

function Home() {
  const nav = useNavigate();
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const { data: profile } = useProfile();
  const { data: news = [] } = useNews();
  const { data: lifeEvents = [] } = useLifeEvents();

  const firstName = profileDisplayName(profile).split(" ")[0];

  const handleSearchFocus = () => nav({ to: "/chat" });

  return (
    <AppShell topBar={<HomeTopBar />}>
      <div className="px-5 pt-4 pb-10 max-w-7xl mx-auto lg:grid lg:grid-cols-[1fr_340px] lg:gap-10 lg:items-start lg:pt-8 lg:px-10">

        {/* ── Left column ── */}
        <div>
          {/* Greeting */}
          <div className="anim-fade-up mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary mb-1.5">
              {getRoDate()}
            </p>
            <h1 className="font-display text-[30px] font-semibold text-text-primary leading-tight">
              {getGreeting()}, {firstName}.
            </h1>
          </div>

          {/* Search bar */}
          <div className="relative mb-7">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              readOnly
              onFocus={handleSearchFocus}
              onClick={handleSearchFocus}
              placeholder="Pune o întrebare..."
              className="w-full h-12 pl-10 pr-4 rounded-2xl border border-border bg-surface-secondary text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none cursor-pointer transition-colors duration-150 hover:bg-surface hover:border-border"
            />
          </div>

          {/* Feature grid */}
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-text-tertiary mb-1 px-0.5">
            Funcționalități
          </p>
          <FeatureGrid onCardClick={setActiveCard} />

          {/* Quick actions */}
          <div className="mt-8">
            <QuickActionsSection />
          </div>

          {/* Popular guides */}
          <div className="mt-8">
            <PopularGuidesSection />
          </div>
        </div>

        {/* ── Right column — overview widgets ── */}
        <div className="mt-8 lg:mt-0 lg:sticky lg:top-6">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-text-tertiary mb-3 px-0.5">
            Rezumat
          </p>
          <StaggerList className="flex flex-col gap-3">
            <StaggerItem>
              <ProfileWidget profile={profile} />
            </StaggerItem>
            {news.length > 0 && (
              <StaggerItem>
                <NewsWidget news={news} />
              </StaggerItem>
            )}
            {lifeEvents.some((e) => !e.is_completed) && (
              <StaggerItem>
                <LifeEventWidget events={lifeEvents} />
              </StaggerItem>
            )}
          </StaggerList>
        </div>
      </div>

      {/* ── Quick-action sheet ── */}
      <AnimatePresence>
        {activeCard && (
          <QuickActionSheet
            key={activeCard}
            cardId={activeCard}
            onClose={() => setActiveCard(null)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
