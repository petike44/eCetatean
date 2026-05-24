import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, MapPin, Clock, Phone, Navigation2, Check, Sparkles, Car, IdCard, Briefcase, Plane, ArrowRight, FileText, PanelLeft, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LifeEventStepsPanel } from "@/components/LifeEventStepsPanel";
import { TopBarButton } from "@/components/TopBar";
import { useChatSessions } from "@/components/ChatSessionsContext";
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
  useConversation,
  useCreateConversation,
  useAppendMessages,
  useUpdateConversation,
  type ChatMessage,
  type ClaudIAStreamChunk,
} from "@/lib/api-hooks";
import {
  type Reply,
  type Msg,
  buildGreeting,
  storedMessagesToMsgs,
  msgToAppendInput,
  greetingToAppendInput,
} from "@/lib/chat-message-map";
import { autoTitleFromMessage } from "@/lib/chat-conversation-utils";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "ClaudIA — eCetățean" }] }),
  component: () => (
    <Protected>
      <Chat />
    </Protected>
  ),
});

// Reply and Msg types exported from chat-message-map

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
    category?: "docs" | "financial" | "onsite";
  }>;
};

function parseFeeLei(fee: string | undefined): number {
  if (!fee) return 0;
  const lower = fee.toLowerCase();
  if (lower.includes("gratuit") || lower.includes("gratis")) return 0;
  const match = lower.match(/[\d]+(?:[.,][\d]+)?/);
  if (!match) return 0;
  return parseFloat(match[0].replace(",", "."));
}

function mapChunksToReply(chunks: ClaudIAStreamChunk[]): Reply {
  const textParts: string[] = [];
  let bullets: string[] | undefined;
  let info: { label: string; value: string }[] | undefined;
  let documents: DocItem[] | undefined;
  let locations: LocationItem[] | undefined;
  let create_life_event: boolean | undefined;
  let event_type: string | undefined;
  let clarification: { question: string; options: string[] } | undefined;
  let category_counts: { docs: number; financial: number; onsite: number } | undefined;
  let estimated_cost: number | undefined;

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
          const counts = { docs: 0, financial: 0, onsite: 0 };
          let totalCost = 0;
          for (const s of procedure.steps) {
            const cat = s.category ?? "onsite";
            counts[cat]++;
            totalCost += parseFeeLei(s.fee);
          }
          if (counts.docs + counts.financial + counts.onsite > 0) category_counts = counts;
          estimated_cost = totalCost;
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
    category_counts,
    estimated_cost,
  };
}

export function Chat({ conversationId }: { conversationId?: string }) {
  const navigate = useNavigate();
  const { show } = useToast();
  const sendChat = useSendChatMessage();
  const createConversation = useCreateConversation();
  const appendMessages = useAppendMessages();
  const updateConversation = useUpdateConversation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: convData, isLoading: convLoading } = useConversation(conversationId);
  const { user } = useUser();
  const authEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const displayName = profileDisplayName(profile, authEmail).split(" ")[0];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const convIdRef = useRef(conversationId);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (profileLoading) return;

    if (conversationId) {
      if (convLoading) return;
      if (hydratedRef.current === conversationId) return;
      if (convData) {
        const mapped = storedMessagesToMsgs(convData.messages);
        setMsgs(mapped.length > 0 ? mapped : [buildGreeting(displayName)]);
        hydratedRef.current = conversationId;
      }
      return;
    }

    hydratedRef.current = null;
    setMsgs((prev) => {
      if (prev.length > 1) return prev;
      return [buildGreeting(displayName)];
    });
  }, [conversationId, convData, convLoading, displayName, profileLoading]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typing = sendChat.isPending;

  const handleTrackProgress = useCallback(async (eventId: string, eventType: string) => {
    const stepMsg: Msg = { id: Date.now(), role: "steps", eventId, eventType };
    setMsgs((prev) => [...prev, stepMsg]);
    const cid = convIdRef.current;
    if (cid) {
      try {
        await appendMessages.mutateAsync({
          conversationId: cid,
          messages: [msgToAppendInput(stepMsg)],
        });
      } catch {
        show("error", "Nu am putut salva progresul în conversație");
      }
    }
  }, [appendMessages, show]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    setMsgs((p) => [...p, { id: Date.now(), role: "user", text: t }]);

    let activeConvId = convIdRef.current;

    try {
      if (!activeConvId) {
        const conv = await createConversation.mutateAsync({});
        activeConvId = conv.id;
        convIdRef.current = conv.id;
        await appendMessages.mutateAsync({
          conversationId: conv.id,
          messages: [greetingToAppendInput(displayName), { role: "user", content: t }],
        });
        await updateConversation.mutateAsync({
          id: conv.id,
          title: autoTitleFromMessage(t),
        });
      } else {
        await appendMessages.mutateAsync({
          conversationId: activeConvId,
          messages: [{ role: "user", content: t }],
        });
      }

      const history: ChatMessage[] = [];
      for (const m of msgs.slice(1)) {
        if (m.role === "user") history.push({ role: "user", content: m.text });
        else if (m.role === "ai") history.push({ role: "assistant", content: m.reply.text });
      }
      history.push({ role: "user", content: t });

      const chunks = await sendChat.mutateAsync({
        messages: history,
        profile: profile ?? undefined,
      });
      const r = mapChunksToReply(chunks);
      const aiMsg: Msg = { id: Date.now() + 1, role: "ai", reply: r };
      setMsgs((p) => [...p, aiMsg]);

      if (activeConvId) {
        await appendMessages.mutateAsync({
          conversationId: activeConvId,
          messages: [msgToAppendInput(aiMsg)],
        });
      }

      if (!conversationId && activeConvId) {
        hydratedRef.current = activeConvId;
        navigate({
          to: "/chat/$conversationId",
          params: { conversationId: activeConvId },
          replace: true,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare necunoscută";
      setMsgs((p) => [...p, { id: Date.now() + 1, role: "ai", reply: { text: `⚠️ ${message}` } }]);
      show("error", message);
    }
  };

  const isEmpty = msgs.length <= 1;

  const chatTopBar = (
    <header
      className="sticky top-0 z-30 h-14 hidden lg:flex items-center px-4 pointer-events-none"
      style={{ background: "linear-gradient(to bottom, var(--bg) 55%, transparent 100%)" }}
      role="banner"
    >
      <div className="flex items-center gap-2 pointer-events-auto">
        <h1 className="font-display font-semibold text-[15px] tracking-tight text-foreground leading-none">
          ClaudIA
        </h1>
        <span className="text-[10px] font-semibold text-text-tertiary bg-surface-secondary border border-border px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none">
          beta
        </span>
      </div>
    </header>
  );

  const mobileHistoryBtn = <ChatHistoryOpenButton />;

  const mobileNewChatBtn = (
    <Link to="/chat" aria-label="Chat nou" className="lg:hidden">
      <TopBarButton aria-label="Chat nou">
        <Plus size={17} strokeWidth={2} />
      </TopBarButton>
    </Link>
  );

  return (
    <AppShell
      headerVariant="chat"
      headerLeftAction={mobileHistoryBtn}
      headerRightAction={mobileNewChatBtn}
      topBar={chatTopBar}
      desktopScrollable={false}
      className="flex flex-col lg:flex-1 lg:overflow-hidden lg:!px-0 lg:!py-0"
    >
      <div
        className="flex flex-col min-h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-1 lg:overflow-hidden bg-background text-foreground"
        style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
      >
        {isEmpty ? (
          /* ───── EMPTY / HERO STATE ───── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 anim-fade-up">
            <div className="w-full max-w-md">
              {/* Disclaimer */}
              <div className="mb-7 flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-text-tertiary px-3 py-1.5 rounded-full border border-border bg-surface">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  Date din surse oficiale verificate
                </span>
              </div>

              {/* Greeting */}
              <div className="mb-8 text-center">
                <h2
                  className="font-display font-semibold text-[32px] leading-[1.1] mb-3 text-foreground"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Bună ziua, {displayName}.<br />Cu ce te ajut azi?
                </h2>
                <p className="text-[14.5px] text-text-secondary">
                  Asistent civic pentru instituțiile statului.
                </p>
              </div>

              {/* Suggestion dial */}
              <div className="mb-5">
                <SuggestionDial onSelect={send} />
              </div>

              {/* Inline input — bigger */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
              >
                <div className="relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Sau scrie ce ai nevoie..."
                    aria-label="Mesaj pentru ClaudIA"
                    className="w-full h-[60px] pl-5 pr-16 rounded-2xl outline-none text-[15.5px] bg-surface border border-border text-foreground shadow-sm focus:border-primary focus:shadow-[0_0_0_3px_rgba(11,37,64,0.08)] transition-all"
                    style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    aria-label="Trimite"
                    disabled={!input.trim()}
                    className="press absolute right-2 top-2 bottom-2 aspect-square rounded-xl flex items-center justify-center bg-primary text-primary-foreground transition-opacity disabled:opacity-25"
                  >
                    <Send size={17} strokeWidth={2.2} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* ───── CONVERSATION STATE ───── */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-14 z-10"
              style={{ background: "linear-gradient(to bottom, var(--bg) 0%, transparent 100%)" }}
            />
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="px-5 py-6 space-y-4 lg:max-w-4xl lg:mx-auto lg:w-full">
                {msgs.slice(1).map((m) => {
                  if (m.role === "steps") {
                    return (
                      <div key={m.id} className="anim-fade-up ml-10">
                        <LifeEventStepsPanel eventId={m.eventId} />
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

            {/* Input bar — pinned below scroll area, fade instead of hard border */}
            <div className="relative shrink-0">
              <div className="absolute -top-8 inset-x-0 h-8 pointer-events-none bg-gradient-to-t from-background/90 to-transparent" />
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="px-4 pt-2 bg-background pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-5"
            >
              <div className="relative flex items-center lg:max-w-4xl lg:mx-auto">
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
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ───────────── Suggestion dial ───────────── */

function ChatHistoryOpenButton() {
  const { openHistory } = useChatSessions();
  return (
    <TopBarButton aria-label="Istoric conversații" onClick={openHistory} className="lg:hidden">
      <PanelLeft size={17} strokeWidth={2} />
    </TopBarButton>
  );
}

const ITEM_H = 52;
const VISIBLE = 3; // center + 1 above + 1 below visible; ±1 more faded outside

function SuggestionDial({ onSelect }: { onSelect: (q: string) => void }) {
  const [active, setActive] = useState(0);
  const touchY = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const n = SUGGESTIONS.length;

  const go = (dir: 1 | -1) => setActive((i) => (i + dir + n) % n);

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: ITEM_H * VISIBLE }}
      onWheel={(e) => {
        e.preventDefault();
        const now = Date.now();
        if (Math.abs(e.deltaY) < 12 || now - lastWheel.current < 220) return;
        lastWheel.current = now;
        go(e.deltaY > 0 ? 1 : -1);
      }}
      onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        if (touchY.current === null) return;
        const dy = e.changedTouches[0].clientY - touchY.current;
        if (dy < -18) go(1);
        else if (dy > 18) go(-1);
        touchY.current = null;
      }}
    >
      {/* Fade masks — create the drum "exit" effect */}
      <div className="absolute inset-x-0 top-0 h-[52px] z-10 pointer-events-none bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[52px] z-10 pointer-events-none bg-gradient-to-t from-background to-transparent" />

      {/* Center-row highlight */}
      <div
        className="absolute inset-x-0 z-0 rounded-2xl bg-primary/5 border border-primary/12"
        style={{ top: ITEM_H, height: ITEM_H }}
      />

      {/* Items */}
      {SUGGESTIONS.map((s, i) => {
        const raw = ((i - active) % n + n) % n;
        const d = raw > n / 2 ? raw - n : raw; // normalize to -2..2
        if (Math.abs(d) > 2) return null;

        const isCenter = d === 0;
        const opacity = isCenter ? 1 : Math.max(0, 1 - Math.abs(d) * 0.48);
        const angleDeg = d * -22;
        const Icon = s.icon;

        return (
          <button
            key={i}
            type="button"
            onClick={() => (isCenter ? onSelect(s.query) : setActive(i))}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: ITEM_H + d * ITEM_H,
              height: ITEM_H,
              opacity,
              transform: `perspective(480px) rotateX(${angleDeg}deg)`,
              transformOrigin: "center center",
              transition: "top 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease, transform 0.32s cubic-bezier(0.22,1,0.36,1)",
              zIndex: isCenter ? 2 : 1,
            }}
            className="flex items-center gap-3 px-4"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                isCenter ? "bg-primary text-primary-foreground" : "bg-primary/8 text-primary/60"
              }`}
            >
              <Icon size={15} strokeWidth={isCenter ? 2 : 1.7} />
            </div>
            <span
              className={`font-display font-semibold text-[14.5px] transition-colors duration-300 ${
                isCenter ? "text-foreground" : "text-text-tertiary"
              }`}
            >
              {s.label}
            </span>
            {isCenter && (
              <ArrowRight size={14} className="ml-auto text-primary/40 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Inline reply extras ───────────── */

function ReplyExtras({
  reply,
  onTrackProgress,
}: {
  reply: Reply;
  onTrackProgress: (id: string, type: string) => void;
  onSend: (text: string) => void;
}) {
  const createLifeEvent = useCreateLifeEvent();
  const { show } = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const openPlan = async () => {
    if (!reply.event_type) {
      show("error", "Nu am identificat tipul procedurii — descrie situația ta în chat.");
      return;
    }
    setCreating(true);
    try {
      await createLifeEvent.mutateAsync({ event_type: reply.event_type });
      navigate({ to: "/plans" });
    } catch {
      show("error", "Eroare la crearea planului");
      setCreating(false);
    }
  };

  // ── Action plan response ──
  if (reply.event_type) {
    const totalSteps = reply.bullets?.length ?? 0;
    const timeEstimate = reply.info?.find((i) => i.label === "Timp estimat")?.value;
    const cats = reply.category_counts;
    const cost = reply.estimated_cost;

    return (
      <div className="flex flex-col gap-2.5">
        {/* Quick summary chip row */}
        <div className="flex flex-wrap gap-2">
          {totalSteps > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl bg-primary-light text-primary border border-primary/15">
              <FileText size={12} /> {totalSteps} pași
            </span>
          )}
          {timeEstimate && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl bg-surface border border-border text-text-secondary">
              <Clock size={12} /> {timeEstimate}
            </span>
          )}
          {typeof cost === "number" && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              {cost === 0 ? "Gratuit" : `~${cost} RON`}
            </span>
          )}
        </div>

        {/* Category breakdown */}
        {cats && (cats.docs > 0 || cats.financial > 0 || cats.onsite > 0) && (
          <div className="grid grid-cols-3 gap-2">
            {cats.docs > 0 && (
              <motion.div
                className="rounded-xl bg-blue-50 border border-blue-100 px-2 py-3 flex flex-col items-center gap-1"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <DocFanIllustration count={cats.docs} />
                <p className="font-display font-bold text-[14px] text-blue-700 leading-none">{cats.docs}</p>
                <p className="text-[10px] text-blue-500 font-medium">Documente</p>
              </motion.div>
            )}
            {cats.financial > 0 && (
              <motion.div
                className="rounded-xl bg-amber-50 border border-amber-100 px-2 py-3 flex flex-col items-center gap-1"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              >
                <PiggyBankIllustration count={cats.financial} />
                <p className="font-display font-bold text-[14px] text-amber-700 leading-none">{cats.financial}</p>
                <p className="text-[10px] text-amber-500 font-medium">Financiar</p>
              </motion.div>
            )}
            {cats.onsite > 0 && (
              <motion.div
                className="rounded-xl bg-emerald-50 border border-emerald-100 px-2 py-3 flex flex-col items-center gap-1"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              >
                <BuildingQueueIllustration count={cats.onsite} />
                <p className="font-display font-bold text-[14px] text-emerald-700 leading-none">{cats.onsite}</p>
                <p className="text-[10px] text-emerald-500 font-medium">La ghișeu</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Step summary */}
        {reply.bullets && reply.bullets.length > 0 && (
          <StepSummary bullets={reply.bullets} />
        )}

        {/* CTA */}
        <button
          onClick={openPlan}
          disabled={creating}
          className="press bg-accent text-white font-semibold text-[14px] py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {creating ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Se pregătește planul...</>
          ) : (
            <>Deschide planul și urmărește progresul <ArrowRight size={16} /></>
          )}
        </button>
      </div>
    );
  }

  // ── Info / office response ──
  return (
    <div className="flex flex-col gap-2.5">
      {reply.info && reply.info.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
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
          <p className="font-display font-semibold text-[13px] text-text-primary mb-2">Documente necesare</p>
          <div className="space-y-2.5">
            {reply.documents.map((d) => <DocCard key={d.name} doc={d} />)}
          </div>
        </div>
      )}
      {reply.locations && reply.locations.length > 0 && (
        <div>
          <p className="font-display font-semibold text-[13px] text-text-primary mb-2">Locații</p>
          <PageMap locations={reply.locations} />
        </div>
      )}
    </div>
  );
}

/* ─── Category breakdown illustrations ─── */

function DocFanIllustration({ count }: { count: number }) {
  const shown = Math.min(count, 5);
  const angles = shown === 1
    ? [0]
    : Array.from({ length: shown }, (_, i) => -24 + (48 / (shown - 1)) * i);

  return (
    <div className="relative h-11" style={{ width: 52, margin: "0 auto", paddingBottom: 7 }}>
      {angles.map((angle, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            bottom: 0,
            left: "calc(50% - 12px)",
            transformOrigin: "12px bottom",
            transform: `rotate(${angle}deg)`,
            zIndex: i,
          }}
        >
          <svg width="24" height="30" viewBox="0 0 24 30" fill="none">
            <rect x="1" y="1" width="22" height="28" rx="2.5" fill="white" stroke="#93C5FD" strokeWidth="1.5"/>
            <path d="M15 1.5v6h6.5" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeLinejoin="round"/>
            <line x1="4.5" y1="14" x2="16" y2="14" stroke="#BFDBFE" strokeWidth="1.1" strokeLinecap="round"/>
            <line x1="4.5" y1="18" x2="16" y2="18" stroke="#BFDBFE" strokeWidth="1.1" strokeLinecap="round"/>
            <line x1="4.5" y1="22" x2="11" y2="22" stroke="#BFDBFE" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
        </div>
      ))}
    </div>
  );
}

function PiggyBankIllustration({ count }: { count: number }) {
  return (
    <div className="h-11 flex items-center justify-center">
      <svg width="54" height="38" viewBox="0 0 64 44" fill="none">
        {/* Coin stack */}
        <ellipse cx="7" cy="38" rx="5" ry="2.2" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1"/>
        <ellipse cx="7" cy="34" rx="5" ry="2.2" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1"/>
        <ellipse cx="7" cy="30" rx="5" ry="2.2" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1"/>
        {/* Curly tail — short line + 1 loop */}
        <path d="M19 27 Q10 25 12 20 Q14 15 19 17" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Body */}
        <ellipse cx="35" cy="27" rx="16" ry="13" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
        {/* Coin slot */}
        <rect x="29" y="13" width="12" height="2" rx="1" fill="#D97706"/>
        {/* Head */}
        <circle cx="50" cy="18" r="9" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
        {/* Ear */}
        <ellipse cx="47" cy="11" rx="2.5" ry="1.8" transform="rotate(-15 47 11)" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1"/>
        {/* Eye */}
        <circle cx="52" cy="15" r="1.3" fill="#92400E"/>
        <circle cx="52.5" cy="14.5" r="0.45" fill="white"/>
        {/* Snout */}
        <ellipse cx="57" cy="21" rx="4" ry="3.2" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1"/>
        <circle cx="55.5" cy="21.5" r="0.75" fill="#D97706"/>
        <circle cx="58.5" cy="21.5" r="0.75" fill="#D97706"/>
        {/* Legs */}
        <rect x="23" y="37" width="7" height="6" rx="2" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1"/>
        <rect x="33" y="37" width="7" height="6" rx="2" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1"/>
        {/* Count on body */}
        <text x="35" y="31" textAnchor="middle" fontSize="13" fontWeight="800" fill="#D97706" fontFamily="system-ui, sans-serif">{count}</text>
      </svg>
    </div>
  );
}

function BuildingQueueIllustration({ count }: { count: number }) {
  const shown = Math.min(count, 5);
  const personXs = Array.from({ length: shown }, (_, i) => {
    const spacing = 46 / (shown + 1);
    return 5 + spacing * (i + 1);
  });

  return (
    <div className="h-11 flex items-center justify-center">
      <svg width="48" height="42" viewBox="0 0 56 46" fill="none">
        {/* Pediment (triangle roof) */}
        <path d="M 9 14 L 28 4 L 47 14 Z" fill="#6EE7B7" stroke="#34D399" strokeWidth="1"/>
        {/* Entablature */}
        <rect x="9" y="14" width="38" height="3.5" rx="0.5" fill="#34D399"/>
        {/* Left column */}
        <rect x="13" y="17.5" width="5" height="12" rx="1" fill="#A7F3D0" stroke="#34D399" strokeWidth="0.75"/>
        {/* Right column */}
        <rect x="38" y="17.5" width="5" height="12" rx="1" fill="#A7F3D0" stroke="#34D399" strokeWidth="0.75"/>
        {/* Centre column */}
        <rect x="25.5" y="17.5" width="5" height="12" rx="1" fill="#A7F3D0" stroke="#34D399" strokeWidth="0.75"/>
        {/* Door */}
        <rect x="22" y="22" width="12" height="7.5" rx="1.5" fill="#34D399"/>
        {/* Step 1 */}
        <rect x="9" y="29.5" width="38" height="2.5" rx="0.5" fill="#34D399"/>
        {/* Step 2 */}
        <rect x="6" y="32" width="44" height="2" rx="0.5" fill="#34D399" opacity="0.55"/>
        {/* People queue */}
        {personXs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy="37.5" r="2.8" fill="#059669"/>
            <ellipse cx={x} cy="43.5" rx="3.2" ry="2.5" fill="#059669"/>
          </g>
        ))}
      </svg>
    </div>
  );
}

const PREVIEW_COUNT = 3;

function StepSummary({ bullets }: { bullets: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? bullets : bullets.slice(0, PREVIEW_COUNT);
  const hidden = bullets.length - PREVIEW_COUNT;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <ul className="divide-y divide-border">
        {visible.map((b, i) => {
          const dotPos = b.indexOf(". ");
          const num = dotPos > -1 ? b.slice(0, dotPos) : String(i + 1);
          const rest = dotPos > -1 ? b.slice(dotPos + 2) : b;
          const dashPos = rest.indexOf(" — ");
          const title = dashPos > -1 ? rest.slice(0, dashPos) : rest;
          const office = dashPos > -1 ? rest.slice(dashPos + 3) : null;

          return (
            <li key={i} className="flex items-start gap-3 px-3 py-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary-light text-primary font-display font-bold text-[11px] flex items-center justify-center mt-0.5">
                {num}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-text-primary leading-snug">{title}</p>
                {office && (
                  <p className="text-[11.5px] text-text-tertiary mt-0.5">{office}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {bullets.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-2 text-[12px] font-semibold text-primary border-t border-border bg-primary-light/40 hover:bg-primary-light transition-colors"
        >
          {expanded ? "Restrânge" : `+${hidden} pași mai mult`}
        </button>
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
