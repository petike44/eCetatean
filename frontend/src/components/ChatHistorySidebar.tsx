import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, MessageSquare, Loader2 } from "lucide-react";
import {
  useConversations,
  useDeleteConversation,
  useUpdateConversation,
  type ChatConversation,
} from "@/lib/api-hooks";
import {
  conversationDisplayTitle,
  groupConversationsByDate,
} from "@/lib/chat-conversation-utils";
import { useChatSessionsOptional } from "@/components/ChatSessionsContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ConversationRow({
  conv,
  active,
  onSelect,
}: {
  conv: ChatConversation;
  active: boolean;
  onSelect?: () => void;
}) {
  const deleteConv = useDeleteConversation();
  const updateConv = useUpdateConversation();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(conversationDisplayTitle(conv));

  const handleDelete = async () => {
    if (!window.confirm("Ștergi această conversație?")) return;
    await deleteConv.mutateAsync(conv.id);
    if (active) navigate({ to: "/chat" });
  };

  const handleRename = async () => {
    const title = draft.trim();
    if (!title) return;
    await updateConv.mutateAsync({ id: conv.id, title });
    setRenaming(false);
  };

  if (renaming) {
    return (
      <div className="px-2 py-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void handleRename()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleRename();
            if (e.key === "Escape") setRenaming(false);
          }}
          className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-[13px] outline-none focus:border-primary"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="group relative flex items-center">
      <Link
        to="/chat/$conversationId"
        params={{ conversationId: conv.id }}
        onClick={onSelect}
        className={cn(
          "press flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors duration-150 min-h-11",
          active
            ? "bg-primary/8 text-primary font-medium"
            : "text-text-secondary hover:bg-black/[0.04] hover:text-foreground",
        )}
      >
        <MessageSquare size={15} className="shrink-0 opacity-60" strokeWidth={1.8} />
        <span className="truncate">{conversationDisplayTitle(conv)}</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Opțiuni conversație"
            className={cn(
              "press absolute right-1 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary",
              "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 data-[state=open]:opacity-100",
              "hover:bg-black/[0.06] transition-opacity",
            )}
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => {
              setDraft(conversationDisplayTitle(conv));
              setRenaming(true);
            }}
          >
            <Pencil size={14} className="mr-2" /> Redenumește
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-error focus:text-error"
            onClick={() => void handleDelete()}
          >
            <Trash2 size={14} className="mr-2" /> Șterge
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ChatHistoryList({
  activeId,
  onSelect,
  className,
}: {
  activeId?: string;
  onSelect?: () => void;
  className?: string;
}) {
  const { data: conversations = [], isLoading } = useConversations();
  const groups = groupConversationsByDate(conversations);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12 text-text-tertiary", className)}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={cn("px-4 py-8 text-center", className)}>
        <MessageSquare size={28} className="mx-auto mb-3 text-text-tertiary opacity-40" />
        <p className="text-[13px] font-medium text-text-secondary">Nicio conversație încă</p>
        <p className="text-[12px] text-text-tertiary mt-1">Începe un chat nou cu ClaudIA</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 px-2 pb-4", className)}>
      {groups.map(({ label, items }) => (
        <div key={label}>
          <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            {label}
          </p>
          <div className="flex flex-col gap-0.5">
            {items.map((conv) => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                active={conv.id === activeId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewChatButton({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      to="/chat"
      onClick={onClick}
      className={cn(
        "press flex items-center justify-center gap-2 w-full h-10 px-3 rounded-xl",
        "bg-primary text-primary-foreground font-medium text-[13px]",
        "hover:opacity-90 transition-opacity",
        className,
      )}
    >
      <Plus size={16} strokeWidth={2.2} />
      Chat nou
    </Link>
  );
}

export function ChatHistorySidebar() {
  const { location } = useRouterState();
  const path = location.pathname;
  const activeId = path.startsWith("/chat/") ? path.split("/")[2] : undefined;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 sticky top-0 h-dvh bg-bg border-r border-border">
      <div className="h-14 flex items-center px-4 shrink-0 border-b border-border">
        <Link
          to="/home"
          className="font-display font-bold text-[15px] tracking-tight text-primary hover:opacity-70 transition-opacity duration-150"
        >
          eCetățean
        </Link>
      </div>

      <div className="px-3 py-3 shrink-0">
        <NewChatButton />
      </div>

      <div className="flex-1 overflow-y-auto">
        <ChatHistoryList activeId={activeId} />
      </div>
    </aside>
  );
}

export function ChatHistoryMobileSheet() {
  const sessions = useChatSessionsOptional();
  const { location } = useRouterState();
  const path = location.pathname;
  const activeId = path.startsWith("/chat/") ? path.split("/")[2] : undefined;

  if (!sessions) return null;

  return (
    <Sheet open={sessions.historyOpen} onOpenChange={sessions.setHistoryOpen}>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-[320px] p-0 flex flex-col gap-0 border-r"
      >
        <SheetTitle className="sr-only">Istoric conversații</SheetTitle>
        <div className="h-14 flex items-center px-4 border-b border-border shrink-0 pt-[env(safe-area-inset-top)]">
          <Link
            to="/home"
            onClick={sessions.closeHistory}
            className="font-display font-bold text-[15px] text-primary hover:opacity-70 transition-opacity duration-150"
          >
            eCetățean
          </Link>
        </div>
        <div className="px-3 py-3 shrink-0">
          <NewChatButton onClick={sessions.closeHistory} />
        </div>
        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <ChatHistoryList activeId={activeId} onSelect={sessions.closeHistory} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
