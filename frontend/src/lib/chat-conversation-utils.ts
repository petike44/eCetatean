import type { ChatConversation } from "@/lib/api-hooks";

export type ConversationGroup = {
  label: string;
  items: ChatConversation[];
};

export function truncateTitle(text: string, max = 48): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function autoTitleFromMessage(text: string): string {
  return truncateTitle(text.replace(/\s+/g, " "), 48);
}

export function groupConversationsByDate(conversations: ChatConversation[]): ConversationGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const groups: Record<string, ChatConversation[]> = {
    Astăzi: [],
    Ieri: [],
    "Ultimele 7 zile": [],
    "Mai vechi": [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.updated_at);
    if (d >= startOfToday) groups["Astăzi"].push(conv);
    else if (d >= startOfYesterday) groups["Ieri"].push(conv);
    else if (d >= startOfWeek) groups["Ultimele 7 zile"].push(conv);
    else groups["Mai vechi"].push(conv);
  }

  return (Object.entries(groups) as [string, ChatConversation[]][])
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function conversationDisplayTitle(conv: ChatConversation): string {
  if (conv.title?.trim()) return conv.title.trim();
  return "Conversație nouă";
}
