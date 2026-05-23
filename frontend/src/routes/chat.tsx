import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Info, FileText, MapPin, Clock, Phone, Navigation2, ChevronLeft, ChevronRight, X, Check, Sparkles, Car, IdCard, Briefcase, Plane, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { citizen, locationsCatalog, type DocItem, type LocationItem } from "@/lib/mock-data";
import { useToast } from "@/components/Toast";
import { Protected } from "@/lib/auth-guard";
import { useSendChatMessage, useCreateLifeEvent, type ChatMessage, type ClaudIAStreamChunk } from "@/lib/api-hooks";

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
};

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "ai"; reply: Reply };

const SUGGESTIONS: { label: string; icon: typeof Car; query: string }[] = [
  { label: "Înmatriculare mașină", icon: Car, query: "Înmatriculare mașină" },
  { label: "Reînnoire buletin", icon: IdCard, query: "Reînnoire buletin" },
  { label: "Înregistrare PFA", icon: Briefcase, query: "Înregistrare PFA" },
  { label: "Pașaport urgent", icon: Plane, query: "Vreau să îmi fac un pașaport" },
];

// Local catalog used to enrich the backend's tool_result with locations.
// The stub maps office_type → key; we surface the matching list from mock-data.
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
      documents = [{ name: `Formular: ${formType ?? "necunoscut"}`, status: "generate" }];
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
  };
}

function Chat() {
  const { show } = useToast();
  const sendChat = useSendChatMessage();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 1,
      role: "ai",
      reply: {
        text: `Bună ziua, ${citizen.name.split(" ")[0]}! Sunt ClaudIA, asistentul tău civic. Cu ce te pot ajuta azi? Poți întreba despre acte, formulare, taxe sau orice altceva legat de instituțiile statului.`,
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [panelReply, setPanelReply] = useState<Reply | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typing = sendChat.isPending;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    setPanelReply(null);
    setMsgs((p) => [...p, { id: Date.now(), role: "user", text: t }]);

    const history: ChatMessage[] = [];
    for (const m of msgs.slice(1)) {
      if (m.role === "user") history.push({ role: "user", content: m.text });
      else history.push({ role: "assistant", content: m.reply.text });
    }
    history.push({ role: "user", content: t });

    try {
      const chunks = await sendChat.mutateAsync(history);
      const r = mapChunksToReply(chunks);
      setMsgs((p) => [...p, { id: Date.now() + 1, role: "ai", reply: r }]);
      if (r.bullets || r.documents || r.locations) setPanelReply(r);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare necunoscută";
      setMsgs((p) => [...p, { id: Date.now() + 1, role: "ai", reply: { text: `⚠️ ${message}` } }]);
      show("error", message);
    }
  };

  const isEmpty = msgs.length === 1;

  return (
    <AppShell
      topBar={
        <header
          className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-border flex items-center justify-between px-6 backdrop-blur-md bg-background/85"
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
      }
      className="flex flex-col"
    >
      <div
        className="flex flex-col min-h-[calc(100dvh-56px-64px)] bg-background text-foreground"
        style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
      >
        {isEmpty ? (
          /* ───── EMPTY / HERO STATE ───── */
          <div className="flex-1 flex flex-col px-6 pt-4 anim-fade-up">
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
                Bună ziua, {citizen.name.split(" ")[0]}.<br />Cu ce te ajut azi?
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {msgs.slice(1).map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2 anim-fade-up`}
              >
                {m.role === "ai" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
                    <Sparkles size={14} fill="currentColor" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-secondary text-foreground border border-border"
                  }`}
                  style={
                    m.role === "user"
                      ? { borderBottomRightRadius: "6px" }
                      : { borderBottomLeftRadius: "6px" }
                  }
                >
                  <p className="text-[14.5px] leading-relaxed whitespace-pre-line">
                    {m.role === "user" ? m.text : m.reply.text}
                  </p>
                </div>
              </div>
            ))}

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
        )}

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="sticky bottom-16 z-30 px-4 py-3 bg-background border-t border-border"
        >
          <div className="relative flex items-center">
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




      {panelReply && (
        <ResultPanel reply={panelReply} onClose={() => setPanelReply(null)} />
      )}
    </AppShell>
  );
}

/* ───────────── Result Panel ───────────── */

function ResultPanel({ reply, onClose }: { reply: Reply; onClose: () => void }) {
  const hasLocations = !!reply.locations?.length;
  const pages: ("answer" | "docs" | "map")[] = ["answer", "docs"];
  if (hasLocations) pages.push("map");
  const [page, setPage] = useState(0);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);

  const onHandleStart = (y: number) => { startY.current = y; };
  const onHandleMove = (y: number) => {
    if (startY.current == null) return;
    const dy = y - startY.current;
    if (dy > 0) setDragY(Math.min(dy, 400));
  };
  const onHandleEnd = () => {
    if (dragY > 120) onClose();
    setDragY(0);
    startY.current = null;
  };

  const onTrackStart = (x: number) => { startX.current = x; };
  const onTrackEnd = (x: number) => {
    if (startX.current == null) return;
    const dx = x - startX.current;
    if (dx < -50 && page < pages.length - 1) setPage(page + 1);
    if (dx > 50 && page > 0) setPage(page - 1);
    startX.current = null;
  };

  return (
    <div
      className="fixed left-0 right-0 z-40 mx-auto max-w-[440px] md:max-w-[640px] lg:max-w-[480px] bg-surface rounded-t-3xl shadow-sheet border-t border-border anim-fade-up"
      style={{
        bottom: "calc(64px + 64px)", // bottom nav + input
        height: "55vh",
        transform: `translateY(${dragY}px)`,
        transition: startY.current == null ? "transform 200ms ease" : "none",
      }}
      role="dialog"
      aria-label="Detalii răspuns ClaudIA"
    >
      {/* Drag handle + close */}
      <div
        className="flex flex-col items-center pt-2 pb-1 cursor-grab touch-none select-none"
        onTouchStart={(e) => onHandleStart(e.touches[0].clientY)}
        onTouchMove={(e) => onHandleMove(e.touches[0].clientY)}
        onTouchEnd={onHandleEnd}
        onMouseDown={(e) => onHandleStart(e.clientY)}
      >
        <div className="w-10 h-1 bg-border rounded-full" />
      </div>
      <button
        onClick={onClose}
        aria-label="Închide panoul"
        className="press absolute top-2 right-3 p-1.5 rounded-lg text-text-tertiary"
      >
        <X size={18} />
      </button>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 py-1.5">
        {pages.map((p, i) => (
          <button
            key={p}
            onClick={() => setPage(i)}
            aria-label={`Pagina ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === page ? "w-6 bg-accent" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>

      {/* Pages track */}
      <div
        className="relative overflow-hidden"
        style={{ height: "calc(55vh - 56px)" }}
        onTouchStart={(e) => onTrackStart(e.touches[0].clientX)}
        onTouchEnd={(e) => onTrackEnd(e.changedTouches[0].clientX)}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ width: `${pages.length * 100}%`, transform: `translateX(-${page * (100 / pages.length)}%)` }}
        >
          <div className="h-full overflow-y-auto px-5 pb-6" style={{ width: `${100 / pages.length}%` }}>
            <PageAnswer reply={reply} />
            {pages.length > 1 && (
              <p className="text-[11px] text-text-tertiary text-right mt-3">
                Documente <ChevronRight size={11} className="inline -mt-0.5" />
              </p>
            )}
          </div>
          <div className="h-full overflow-y-auto px-5 pb-6" style={{ width: `${100 / pages.length}%` }}>
            <PageDocs documents={reply.documents ?? []} />
            <div className="flex justify-between text-[11px] text-text-tertiary mt-3">
              <span><ChevronLeft size={11} className="inline -mt-0.5" /> Răspuns</span>
              {hasLocations && <span>Hartă <ChevronRight size={11} className="inline -mt-0.5" /></span>}
            </div>
          </div>
          {hasLocations && (
            <div className="h-full overflow-y-auto px-5 pb-6" style={{ width: `${100 / pages.length}%` }}>
              <PageMap locations={reply.locations!} />
              <p className="text-[11px] text-text-tertiary mt-3">
                <ChevronLeft size={11} className="inline -mt-0.5" /> Documente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageAnswer({ reply }: { reply: Reply }) {
  const nav = useNavigate();
  const createLifeEvent = useCreateLifeEvent();
  const { show } = useToast();
  const [creating, setCreating] = useState(false);

  const handleTrackProgress = async () => {
    if (!reply.event_type) return;
    setCreating(true);
    try {
      const result = await createLifeEvent.mutateAsync({ event_type: reply.event_type });
      nav({ to: "/life-event/$id", params: { id: result.id } });
    } catch {
      show("error", "Eroare la crearea evenimentului civic");
      setCreating(false);
    }
  };

  return (
    <div className="pt-2 space-y-4">
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-card">
        <p className="text-[14.5px] leading-relaxed text-text-primary">{reply.text}</p>
        {reply.bullets && (
          <div className="mt-4">
            <p className="font-display font-semibold text-[13px] text-text-primary mb-2">Pașii necesari</p>
            <ul className="text-[13.5px] text-text-secondary space-y-1 list-disc list-inside marker:text-accent">
              {reply.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        )}
        {reply.info && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {reply.info.map((i) => (
              <div key={i.label} className="bg-primary-light rounded-xl p-3">
                <p className="font-display font-semibold text-[12px] text-primary">{i.label}</p>
                <p className="text-[12.5px] text-text-secondary mt-0.5">{i.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {reply.create_life_event && reply.event_type && (
          <button
            onClick={handleTrackProgress}
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
        <button onClick={() => nav({ to: "/action-plan" })} className="press bg-accent text-white font-semibold text-[14px] py-3 px-4 rounded-xl">
          Generează plan complet
        </button>
        <button onClick={() => nav({ to: "/document-preview" })} className="press border border-border bg-white text-text-primary font-semibold text-[14px] py-3 px-4 rounded-xl">
          Previzualizează cererea
        </button>
      </div>
    </div>
  );
}

function PageDocs({ documents }: { documents: DocItem[] }) {
  if (!documents.length) {
    return <p className="pt-6 text-center text-[13px] text-text-tertiary">Nu există documente asociate.</p>;
  }
  return (
    <div className="pt-2 space-y-2.5">
      <p className="font-display font-semibold text-[15px] text-text-primary">Documente necesare</p>
      {documents.map((d) => <DocCard key={d.name} doc={d} />)}
    </div>
  );
}

function DocCard({ doc }: { doc: DocItem }) {
  const { show } = useToast();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const start = () => {
    if (state !== "idle") return;
    setState("loading");
    setTimeout(() => { setState("done"); show("success", `${doc.name} descărcat`); }, 1400);
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
          onClick={start}
          disabled={state !== "idle"}
          className="press relative overflow-hidden w-full bg-accent text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl mt-2"
        >
          {state === "loading" && (
            <span className="absolute inset-y-0 left-0 bg-accent-dark/40" style={{ animation: "grow 1.4s ease-out forwards" }} />
          )}
          <span className="relative inline-flex items-center justify-center gap-1.5">
            {state === "idle" && <>Generează completat</>}
            {state === "loading" && <>Se generează...</>}
            {state === "done" && <><Check size={14} strokeWidth={3} /> Descărcat</>}
          </span>
        </button>
      )}
      <style>{`@keyframes grow { from { width: 0% } to { width: 100% } }`}</style>
    </article>
  );
}

function PageMap({ locations }: { locations: LocationItem[] }) {
  const { show } = useToast();
  return (
    <div className="pt-2 space-y-3">
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
            <p className="text-[10.5px] text-text-tertiary text-center pt-1">
        <FileText size={10} className="inline -mt-0.5" /> Date demonstrative
      </p>
    </div>
  );
}
