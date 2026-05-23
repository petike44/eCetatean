import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Info, MapPin, Clock, Phone, Navigation2, Check, Sparkles, Car, IdCard, Briefcase, Plane, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DrpcivStepsPanel } from "@/components/DrpcivStepsPanel";
import { locationsCatalog, type LocationItem } from "@/lib/office-locations";
import type { DocItem } from "@/lib/chat-types";
import { useUser } from "@/lib/clerk-stub";
import { profileDisplayName } from "@/lib/profile-utils";
import { useToast } from "@/components/Toast";
import { Protected } from "@/lib/auth-guard";
import {
  useSendChatMessage,
  useCreateLifeEvent,
  useGeneratePdf,
  useProfile,
  type ChatMessage,
  type ClaudIAStreamChunk,
} from "@/lib/api-hooks";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "ClaudIA — eCetățean" }] }),
  component: () => (
    <Protected>
      <Chat />
    </Protected>
  ),
});

type Reply = {
  text: string;
  intro?: string;
  bullets?: string[];
  info?: { label: string; value: string }[];
  documents?: DocItem[];
  locations?: LocationItem[];
  create_life_event?: boolean;
  event_type?: string;
  clarification?: { question: string; options: string[] };
};

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "ai"; reply: Reply }
  | { id: number; role: "steps"; eventId: string; eventType: string };

const SUGGESTIONS: { label: string; icon: typeof Car; query: string }[] = [
  { label: "Mașină din Germania", icon: Car, query: "Am adus o mașină din Germania" },
  { label: "Mașină din România", icon: Car, query: "Am cumpărat o mașină în România" },
  { label: "Mă mut la Cluj", icon: Plane, query: "Mă mut la Cluj pentru facultate" },
  { label: "Reînnoire buletin", icon: IdCard, query: "Reînnoire buletin" },
  { label: "Înregistrare PFA", icon: Briefcase, query: "Înregistrare PFA" },
];

// Local catalog used to enrich the backend's tool_result with locations.
// Maps office_type from ClaudIA tool results to local office listings.
const OFFICE_LOCATION_MAP: Record<string, LocationItem[] | undefined> = {
  dgep: locationsCatalog.buletin,
  spcep: locationsCatalog.buletin,
  primarie: locationsCatalog.pasaport,
  onrc: locationsCatalog.pfa,
  drpciv: locationsCatalog.inmatriculare,
};

/** PDF slug in document-preview for a life-event type */
const PREVIEW_FORM_BY_EVENT: Record<string, string> = {
  car_from_germany: "cerere-inmatriculare-drpciv",
  car_domestic: "cerere-inmatriculare-drpciv",
  bought_car: "cerere-inmatriculare-drpciv",
  moving_to_cluj: "cerere-viza-flotant",
  renewal_id: "cerere-viza-flotant",
  pfa_registration: "cerere-certificat-fiscal",
};

function navigateAfterLifeEvent(
  nav: ReturnType<typeof useNavigate>,
  eventType: string,
  eventId: string,
) {
  nav({ to: "/life-event/$id", params: { id: eventId } });
}

type ActionPlanProcedure = {
  event_type: string;
  title: string;
  emoji?: string;
  summary?: string;
  total_estimated_time?: string;
  steps?: Array<{
    order: number;
    title: string;
    office?: string;
    address?: string;
    fee?: string;
    deadline?: string;
    documents?: string[];
  }>;
};

function mapChunksToReply(chunks: ClaudIAStreamChunk[]): Reply {
  const textParts: string[] = [];
  let bullets: string[] | undefined;
  let info: { label: string; value: string }[] | undefined;
  let documents: DocItem[] | undefined;
  let locations: LocationItem[] | undefined;
  let create_life_event: boolean | undefined;
  let event_type: string | undefined;
  let clarification: { question: string; options: string[] } | undefined;

  for (const chunk of chunks) {
    if (chunk.type === "text") {
      if (chunk.content) textParts.push(chunk.content);
      continue;
    }

    const r = chunk.result as Record<string, unknown>;
    const kind = r.type as string | undefined;

    if (kind === "action_plan") {
      const procedure = r.procedure as ActionPlanProcedure | undefined;
      if (r.create_life_event) create_life_event = true;
      if (r.event_type) event_type = r.event_type as string;
      if (procedure) {
        textParts.push(`${procedure.emoji ?? ""} ${procedure.title}`.trim());
        if (procedure.summary) textParts.push(procedure.summary);
        if (procedure.steps?.length) {
          bullets = procedure.steps.map((s) => `${s.order}. ${s.title}${s.office ? ` — ${s.office}` : ""}`);
          documents = procedure.steps.flatMap<DocItem>((s) =>
            (s.documents ?? []).map((d) => ({
              name: d,
              status: "obtain" as const,
              institution: s.office,
              address: s.address,
            })),
          );
        }
        if (procedure.total_estimated_time) {
          info = [{ label: "Timp estimat", value: procedure.total_estimated_time }];
        }
      }
    } else if (kind === "office_info") {
      const office = r.office as { name?: string; address?: string; hours?: string; phone?: string } | undefined;
      const officeType = r.office_type as string | undefined;
      if (office) {
        info = [
          { label: "Birou", value: office.name ?? "—" },
          ...(office.address ? [{ label: "Adresă", value: office.address }] : []),
          ...(office.hours ? [{ label: "Program", value: office.hours }] : []),
          ...(office.phone ? [{ label: "Telefon", value: office.phone }] : []),
        ];
      }
      if (officeType) locations = OFFICE_LOCATION_MAP[officeType];
    } else if (kind === "pdf_ready") {
      const formType = r.form_type as string | undefined;
      documents = [
        {
          name: `Formular: ${formType ?? "necunoscut"}`,
          status: "generate",
          form_type: formType,
        },
      ];
    } else if (kind === "clarification") {
      const question = r.question as string | undefined;
      const options = r.options as string[] | undefined;
      if (question && options?.length) {
        clarification = { question, options };
      }
    } else if (kind === "reminder_set") {
      const title = r.title as string | undefined;
      const deadline = r.deadline_days as number | undefined;
      info = [
        ...(title ? [{ label: "Reminder", value: title }] : []),
        ...(typeof deadline === "number" ? [{ label: "Termen", value: `${deadline} zile` }] : []),
      ];
    } else if (kind === "text_only") {
      const m = r.message as string | undefined;
      if (m) textParts.push(m);
    }
  }

  return {
    text: textParts.join("\n\n") || "Răspuns gol primit de la ClaudIA.",
    bullets,
    info,
    documents,
    locations,
    create_life_event,
    event_type,
    clarification,
  };
}

function Chat() {
  const { show } = useToast();
  const sendChat = useSendChatMessage();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { user } = useUser();
  const authEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const displayName = profileDisplayName(profile, authEmail).split(" ")[0];
  const [msgs, setMsgs] = useState<Msg[]>([]);

  useEffect(() => {
    if (profileLoading) return;
    setMsgs((prev) => {
      if (prev.length > 1) return prev;
      return [
        {
          id: 1,
          role: "ai",
          reply: {
            text: `Bună ziua, ${displayName}! Sunt ClaudIA, asistentul tău civic. Cu ce te pot ajuta azi? Poți întreba despre acte, formulare, taxe sau orice altceva legat de instituțiile statului.`,
          },
        },
      ];
    });
  }, [displayName, profileLoading]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typing = sendChat.isPending;

  const handleTrackProgress = (eventId: string, eventType: string) => {
    setMsgs((prev) => [
      ...prev,
      { id: Date.now(), role: "steps", eventId, eventType },
    ]);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    setMsgs((p) => [...p, { id: Date.now(), role: "user", text: t }]);

    const history: ChatMessage[] = [];
    for (const m of msgs.slice(1)) {
      if (m.role === "user") history.push({ role: "user", content: m.text });
      else if (m.role === "ai") history.push({ role: "assistant", content: m.reply.text });
    }
    history.push({ role: "user", content: t });

    try {
      const chunks = await sendChat.mutateAsync({
        messages: history,
        profile: profile ?? undefined,
      });
      const r = mapChunksToReply(chunks);
      setMsgs((p) => [...p, { id: Date.now() + 1, role: "ai", reply: r }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare necunoscută";
      setMsgs((p) => [...p, { id: Date.now() + 1, role: "ai", reply: { text: `⚠️ ${message}` } }]);
      show("error", message);
    }
  };

  const isEmpty = msgs.length <= 1;

  const chatTopBar = (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-14 lg:sticky lg:inset-x-0 lg:top-0 border-b border-border flex items-center justify-between px-6 backdrop-blur-md bg-background/85"
      role="banner"
    >
      <div className="flex items-center gap-1.5">
        <h1 className="font-display font-bold text-[19px] tracking-tight text-foreground">
          ClaudIA
        </h1>
        <Sparkles size={15} className="text-primary" fill="currentColor" />
      </div>
      <button
        aria-label="Despre ClaudIA"
        className="press p-2 -mr-2 rounded-full hover:bg-surface-secondary transition-colors"
      >
        <Info size={19} className="text-text-secondary" />
      </button>
    </header>
  );

  return (
    <AppShell
      topBar={chatTopBar}
      desktopScrollable={false}
      className="flex flex-col lg:flex-1 lg:overflow-hidden"
    >
      <div
        className="flex flex-col min-h-[calc(100dvh-56px-64px)] lg:min-h-0 lg:flex-1 lg:overflow-hidden bg-background text-foreground"
        style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
      >
        {isEmpty ? (
          /* ───── EMPTY / HERO STATE ───── */
          <div className="flex-1 flex flex-col px-6 pt-4 lg:max-w-xl lg:mx-auto lg:w-full anim-fade-up">
            {/* Disclaimer */}
            <div className="mb-8 px-4 py-2.5 rounded-xl border border-accent-light bg-accent-light/40 text-center">
              <p className="text-[11px] font-medium leading-tight text-accent-dark">
                ClaudIA folosește date din surse oficiale verificate.
              </p>
            </div>

            {/* Greeting */}
            <div className="mb-10">
              <h2
                className="font-display font-semibold text-[30px] leading-[1.15] mb-4 text-foreground"
                style={{ letterSpacing: "-0.01em" }}
              >
                Bună ziua, {displayName}.<br />Cu ce te ajut azi?
              </h2>
              <p className="text-[15px] leading-relaxed text-text-secondary">
                Sunt asistentul tău civic pentru interacțiunea cu instituțiile statului.
              </p>
            </div>

            {/* Prompt cards 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={() => send(s.query)}
                    className="press group p-4 rounded-2xl border border-border bg-surface text-left shadow-card hover:border-primary/40 hover:shadow-elevated transition-all anim-fade-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="mb-3 w-9 h-9 rounded-lg flex items-center justify-center bg-primary-light text-primary">
                      <Icon size={17} strokeWidth={1.8} />
                    </div>
                    <span className="font-display text-[13.5px] font-semibold leading-snug text-foreground">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ───── CONVERSATION STATE ───── */
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="px-5 py-6 space-y-4 lg:max-w-2xl lg:mx-auto lg:w-full">
            {msgs.slice(1).map((m) => {
              if (m.role === "steps") {
                return (
                  <div key={m.id} className="anim-fade-up">
                    <DrpcivStepsPanel eventId={m.eventId} />
                  </div>
                );
              }

              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex justify-end gap-2 anim-fade-up">
                    <div
                      className="max-w-[80%] px-4 py-3 rounded-2xl bg-primary text-primary-foreground"
                      style={{ borderBottomRightRadius: "6px" }}
                    >
                      <p className="text-[14.5px] leading-relaxed whitespace-pre-line">{m.text}</p>
                    </div>
                  </div>
                );
              }

              // AI message
              const hasExtras =
                !!(m.reply.bullets?.length) ||
                !!(m.reply.info?.length) ||
                !!(m.reply.documents?.length) ||
                !!(m.reply.locations?.length) ||
                !!(m.reply.create_life_event || m.reply.event_type);

              return (
                <div key={m.id} className="flex justify-start gap-2 anim-fade-up">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary text-primary-foreground mt-0.5">
                    <Sparkles size={14} fill="currentColor" />
                  </div>
                  <div className="flex flex-col gap-3 flex-1 min-w-0 max-w-[calc(100%-2.5rem)]">
                    {/* Text bubble */}
                    <div
                      className="px-4 py-3 rounded-2xl bg-surface-secondary text-foreground border border-border self-start max-w-[85%]"
                      style={{ borderBottomLeftRadius: "6px" }}
                    >
                      <p className="text-[14.5px] leading-relaxed whitespace-pre-line">{m.reply.text}</p>
                      {m.reply.clarification && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {m.reply.clarification.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => send(opt)}
                              className="press text-[12.5px] font-semibold px-3 py-1.5 rounded-full border border-primary text-primary bg-primary-light"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Inline extras */}
                    {hasExtras && (
                      <ReplyExtras reply={m.reply} onTrackProgress={handleTrackProgress} onSend={send} />
                    )}
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="flex gap-2 items-end anim-fade-up">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
                  <Sparkles size={14} fill="currentColor" />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl bg-surface-secondary border border-border"
                  style={{ borderBottomLeftRadius: "6px" }}
                >
                  <div className="anim-typing flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-text-tertiary" />
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-text-tertiary" />
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-text-tertiary" />
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="sticky bottom-16 lg:bottom-0 z-30 px-4 py-3 bg-background border-t border-border"
        >
          <div className="relative flex items-center lg:max-w-2xl lg:mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrie un mesaj..."
              aria-label="Mesaj pentru ClaudIA"
              className="w-full h-14 pl-5 pr-14 rounded-2xl outline-none text-[15px] bg-surface-secondary border border-border text-foreground shadow-sm focus:border-primary"
              style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
            />
            <button
              type="submit"
              aria-label="Trimite"
              disabled={!input.trim()}
              className="press absolute right-2 w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-opacity bg-primary text-primary-foreground"
              style={{ opacity: input.trim() ? 1 : 0.35 }}
            >
              <Send size={17} strokeWidth={2.2} />
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

/* ───────────── Inline reply extras ───────────── */

const DRPCIV_EVENT_TYPES = new Set(["bought_car", "car_domestic", "car_from_germany"]);

type CategoryChip = { icon: React.ReactNode; label: string; detail: string; color: string; bg: string };
const EVENT_CATEGORY_CHIPS: Record<string, CategoryChip[]> = {
  bought_car:       [
    { icon: <FileText size={12} />,   label: "Documente",    detail: "1 formular · Gratuit",  color: "text-blue-700",  bg: "bg-blue-50" },
    { icon: <CreditCard size={12} />, label: "Plăți",        detail: "~100 RON taxe",          color: "text-amber-700", bg: "bg-amber-50" },
    { icon: <Building2 size={12} />,  label: "La ghișeu",    detail: "Notar + DRPCIV",          color: "text-green-700", bg: "bg-green-50" },
  ],
  car_domestic:     [
    { icon: <FileText size={12} />,   label: "Documente",    detail: "1 formular · Gratuit",  color: "text-blue-700",  bg: "bg-blue-50" },
    { icon: <CreditCard size={12} />, label: "Plăți",        detail: "~100 RON taxe",          color: "text-amber-700", bg: "bg-amber-50" },
    { icon: <Building2 size={12} />,  label: "La ghișeu",    detail: "Notar + DRPCIV",          color: "text-green-700", bg: "bg-green-50" },
  ],
  car_from_germany: [
    { icon: <FileText size={12} />,   label: "Documente",    detail: "1 formular · Gratuit",  color: "text-blue-700",  bg: "bg-blue-50" },
    { icon: <CreditCard size={12} />, label: "Plăți",        detail: "~100 RON taxe",          color: "text-amber-700", bg: "bg-amber-50" },
    { icon: <Building2 size={12} />,  label: "La ghișeu",    detail: "DRPCIV + RAR",            color: "text-green-700", bg: "bg-green-50" },
  ],
  moving_to_cluj:   [
    { icon: <FileText size={12} />,   label: "Documente",    detail: "1 formular · Gratuit",  color: "text-blue-700",  bg: "bg-blue-50" },
    { icon: <Building2 size={12} />,  label: "La ghișeu",    detail: "DGEP Cluj",               color: "text-green-700", bg: "bg-green-50" },
  ],
  renewal_id:       [
    { icon: <FileText size={12} />,   label: "Documente",    detail: "1 formular · Gratuit",  color: "text-blue-700",  bg: "bg-blue-50" },
    { icon: <CreditCard size={12} />, label: "Plăți",        detail: "~7 RON taxă",            color: "text-amber-700", bg: "bg-amber-50" },
    { icon: <Building2 size={12} />,  label: "La ghișeu",    detail: "SPCLEP Cluj",             color: "text-green-700", bg: "bg-green-50" },
  ],
  pfa_registration: [
    { icon: <FileText size={12} />,   label: "Documente",    detail: "Dosar complet",          color: "text-blue-700",  bg: "bg-blue-50" },
    { icon: <CreditCard size={12} />, label: "Plăți",        detail: "Taxe ONRC",              color: "text-amber-700", bg: "bg-amber-50" },
    { icon: <Building2 size={12} />,  label: "La ghișeu",    detail: "ONRC Cluj",               color: "text-green-700", bg: "bg-green-50" },
  ],
};

function ReplyExtras({
  reply,
  onTrackProgress,
  onSend,
}: {
  reply: Reply;
  onTrackProgress: (id: string, type: string) => void;
  onSend: (text: string) => void;
}) {
  const nav = useNavigate();
  const createLifeEvent = useCreateLifeEvent();
  const { show } = useToast();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasBullets = (reply.bullets?.length ?? 0) > 0;
  const previewBullets = reply.bullets?.slice(0, 2) ?? [];
  const totalSteps = reply.bullets?.length ?? 0;
  const hasMore =
    totalSteps > 2 ||
    (reply.info?.length ?? 0) > 0 ||
    (reply.documents?.length ?? 0) > 0 ||
    (reply.locations?.length ?? 0) > 0;

  const createAndOpenPlan = async () => {
    if (!reply.event_type) {
      show("error", "Nu am identificat tipul procedurii — descrie situația ta în chat.");
      return;
    }
    setCreating(true);
    try {
      const result = await createLifeEvent.mutateAsync({ event_type: reply.event_type });
      if (DRPCIV_EVENT_TYPES.has(reply.event_type)) {
        onTrackProgress(result.id, reply.event_type);
      } else {
        navigateAfterLifeEvent(nav, reply.event_type, result.id);
      }
    } catch {
      show("error", "Eroare la crearea evenimentului civic");
      setCreating(false);
    }
  };

  const handlePreviewRequest = () => {
    const formSlug =
      (reply.event_type && PREVIEW_FORM_BY_EVENT[reply.event_type]) ||
      "cerere-inmatriculare-drpciv";
    nav({ to: "/document-preview", search: { form: formSlug } });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Compact preview card */}
      {hasBullets && (
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-semibold text-[13px] text-text-primary">
              Plan în {totalSteps} pași
            </p>
            {reply.info?.find((i) => i.label === "Timp estimat") && (
              <span className="text-[11px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                {reply.info.find((i) => i.label === "Timp estimat")!.value}
              </span>
            )}
          </div>
          <ul className="text-[13px] text-text-secondary space-y-1 list-disc list-inside marker:text-accent">
            {previewBullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
          {!expanded && hasMore && (
            <p className="text-[12px] text-text-tertiary mt-1.5 ml-0.5">
              +{totalSteps - 2} pași suplimentari...
            </p>
          )}

          {/* Expanded content */}
          {expanded && (
            <div className="mt-3 flex flex-col gap-3">
              {totalSteps > 2 && (
                <ul className="text-[13px] text-text-secondary space-y-1 list-disc list-inside marker:text-accent">
                  {reply.bullets!.slice(2).map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
              {reply.info && reply.info.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {reply.info.map((i) => (
                    <div key={i.label} className="bg-primary-light rounded-xl p-3">
                      <p className="font-display font-semibold text-[12px] text-primary">{i.label}</p>
                      <p className="text-[12.5px] text-text-secondary mt-0.5">{i.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {reply.documents && reply.documents.length > 0 && (
                <div>
                  <p className="font-display font-semibold text-[12px] text-text-primary mb-2">Documente necesare</p>
                  <div className="space-y-2">
                    {reply.documents.map((d) => <DocCard key={d.name} doc={d} />)}
                  </div>
                </div>
              )}
              {reply.locations && reply.locations.length > 0 && (
                <div>
                  <p className="font-display font-semibold text-[12px] text-text-primary mb-2">Locații</p>
                  <PageMap locations={reply.locations} />
                </div>
              )}
            </div>
          )}

          {/* Expand / collapse toggle */}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="press mt-3 w-full text-[12.5px] font-semibold text-primary bg-primary-light rounded-xl py-2 flex items-center justify-center gap-1.5"
            >
              {expanded ? "Restrânge" : "Arată planul complet"}
              <ArrowRight size={13} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>
      )}

      {/* Info-only (no bullets) */}
      {!hasBullets && reply.info && reply.info.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {reply.info.map((i) => (
            <div key={i.label} className="bg-primary-light rounded-xl p-3">
              <p className="font-display font-semibold text-[12px] text-primary">{i.label}</p>
              <p className="text-[12.5px] text-text-secondary mt-0.5">{i.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Docs-only (no bullets) */}
      {!hasBullets && reply.documents && reply.documents.length > 0 && (
        <div>
          <p className="font-display font-semibold text-[13px] text-text-primary mb-2">Documente necesare</p>
          <div className="space-y-2.5">
            {reply.documents.map((d) => <DocCard key={d.name} doc={d} />)}
          </div>
        </div>
      )}

      {/* Locations-only (no bullets) */}
      {!hasBullets && reply.locations && reply.locations.length > 0 && (
        <div>
          <p className="font-display font-semibold text-[13px] text-text-primary mb-2">Locații</p>
          <PageMap locations={reply.locations} />
        </div>
      )}

      {/* Category chips — shown before action buttons when event_type is known */}
      {reply.event_type && EVENT_CATEGORY_CHIPS[reply.event_type] && (
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORY_CHIPS[reply.event_type].map((chip) => (
            <div
              key={chip.label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${chip.bg} ${chip.color} border-current/20`}
            >
              {chip.icon}
              <span className="text-[12px] font-semibold">{chip.label}</span>
              <span className="text-[11px] opacity-70">· {chip.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {(reply.create_life_event || reply.event_type) && (
        <div className="flex flex-col gap-2">
          {reply.create_life_event && reply.event_type && (
            <button
              onClick={createAndOpenPlan}
              disabled={creating}
              className="press bg-accent text-white font-semibold text-[14px] py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {creating ? (
                "Se crează..."
              ) : (
                <>
                  Urmărește progresul și bifează pașii
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
          <button
            onClick={createAndOpenPlan}
            disabled={creating || !reply.event_type}
            className="press bg-accent text-white font-semibold text-[14px] py-3 px-4 rounded-xl disabled:opacity-60"
          >
            {creating ? "Se generează planul..." : "Generează plan complet"}
          </button>
          <button
            onClick={handlePreviewRequest}
            className="press border border-border bg-white text-text-primary font-semibold text-[14px] py-3 px-4 rounded-xl"
          >
            Previzualizează cererea
          </button>
        </div>
      )}
    </div>
  );
}

function DocCard({ doc }: { doc: DocItem }) {
  const { show } = useToast();
  const generatePdf = useGeneratePdf();
  const [done, setDone] = useState(false);
  const start = async () => {
    if (!doc.form_type || generatePdf.isPending || done) return;
    try {
      await generatePdf.mutateAsync({ formType: doc.form_type });
      setDone(true);
      show("success", `${doc.name} descărcat`);
    } catch {
      show("error", "Eroare la generarea PDF-ului");
    }
  };
  const chip =
    doc.status === "have" ? <span className="inline-flex items-center gap-1 bg-success-light text-success font-display font-bold text-[11px] px-2.5 py-1 rounded-full"><Check size={11} strokeWidth={3} /> Ai deja</span> :
    doc.status === "obtain" ? <span className="bg-accent-light text-accent-dark font-display font-bold text-[11px] px-2.5 py-1 rounded-full">Trebuie obținut</span> :
    <span className="bg-primary-light text-primary font-display font-bold text-[11px] px-2.5 py-1 rounded-full">De generat</span>;

  return (
    <article className="bg-surface border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-display font-semibold text-[15px] text-text-primary flex-1">{doc.name}</p>
        {chip}
      </div>
      {doc.status === "obtain" && doc.institution && (
        <div className="text-[12.5px] text-text-secondary">
          <p className="font-medium text-text-primary">{doc.institution}</p>
          <p className="flex items-center gap-1 mt-0.5"><MapPin size={11} /> {doc.address}</p>
        </div>
      )}
      {doc.status === "generate" && (
        <button
          onClick={() => void start()}
          disabled={!doc.form_type || generatePdf.isPending || done}
          className="press w-full bg-accent text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl mt-2 disabled:opacity-60"
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {generatePdf.isPending && <>Se generează...</>}
            {!generatePdf.isPending && !done && <>Generează completat</>}
            {done && (
              <>
                <Check size={14} strokeWidth={3} /> Descărcat
              </>
            )}
          </span>
        </button>
      )}
    </article>
  );
}

function PageMap({ locations }: { locations: LocationItem[] }) {
  const { show } = useToast();
  return (
    <div className="space-y-3">
      <div
        className="relative w-full h-32 bg-primary-light rounded-2xl overflow-hidden border border-border"
        style={{
          backgroundImage:
            "linear-gradient(rgba(31,78,121,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(31,78,121,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        role="img"
        aria-label="Hartă locații"
      >
        <div className="absolute top-1/3 left-0 right-0 h-1 bg-white/60 rotate-[6deg]" />
        <div className="absolute left-1/3 top-0 bottom-0 w-1 bg-white/60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-card" />
        {[
          { top: "20%", left: "25%" },
          { top: "60%", left: "65%" },
          { top: "30%", left: "75%" },
        ].slice(0, locations.length).map((p, i) => (
          <div key={i} className="absolute w-3.5 h-3.5 bg-accent rounded-full border-2 border-white shadow-card" style={p} />
        ))}
      </div>
      {locations.map((l) => (
        <article key={l.name} className="bg-surface border border-border rounded-2xl p-4 shadow-card">
          <p className="font-display font-semibold text-[14.5px] text-text-primary">{l.name}</p>
          <p className="text-[12.5px] text-text-secondary mt-1 flex items-center gap-1.5">
            <MapPin size={12} className="shrink-0" /> {l.address} • {l.distance}
          </p>
          <p className="text-[12.5px] text-text-secondary mt-1 flex items-center gap-1.5">
            <Clock size={12} className="shrink-0" /> {l.hours}
          </p>
          <p className="text-[12.5px] text-text-secondary mt-1 flex items-center gap-1.5">
            <Phone size={12} className="shrink-0" /> {l.phone}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 bg-accent-light text-accent-dark font-display font-bold text-[11px] px-2.5 py-1 rounded-full">
              <Clock size={10} /> {l.wait} așteptare
            </span>
            <button
              onClick={() => show("success", `Indicații către ${l.name}`)}
              className="press inline-flex items-center gap-1.5 bg-accent text-white font-semibold text-[12.5px] py-2 px-3 rounded-xl"
            >
              <Navigation2 size={13} /> Indicații
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
