import type { AppendChatMessageInput, StoredChatMessage } from "@/lib/api-hooks";

export type Reply = {
  text: string;
  intro?: string;
  bullets?: string[];
  info?: { label: string; value: string }[];
  documents?: import("@/lib/chat-types").DocItem[];
  locations?: import("@/lib/office-locations").LocationItem[];
  create_life_event?: boolean;
  event_type?: string;
  clarification?: { question: string; options: string[] };
  category_counts?: { docs: number; financial: number; onsite: number };
  estimated_cost?: number;
};

export type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "ai"; reply: Reply }
  | { id: number; role: "steps"; eventId: string; eventType: string };

export function storedMessagesToMsgs(rows: StoredChatMessage[]): Msg[] {
  return rows.map((row, i) => {
    const id = i + 1;
    if (row.role === "user") {
      return { id, role: "user", text: row.content };
    }
    if (row.role === "steps") {
      const meta = row.metadata;
      return {
        id,
        role: "steps",
        eventId: (meta.eventId as string) ?? "",
        eventType: (meta.eventType as string) ?? "",
      };
    }
    const meta = row.metadata as Partial<Reply>;
    if (meta.text || Object.keys(meta).length > 1) {
      return {
        id,
        role: "ai",
        reply: { ...meta, text: meta.text ?? row.content },
      };
    }
    return { id, role: "ai", reply: { text: row.content } };
  });
}

export function msgToAppendInput(m: Msg): AppendChatMessageInput {
  if (m.role === "user") {
    return { role: "user", content: m.text };
  }
  if (m.role === "steps") {
    return {
      role: "steps",
      content: "",
      metadata: { eventId: m.eventId, eventType: m.eventType, uiKind: "steps" },
    };
  }
  return {
    role: "assistant",
    content: m.reply.text,
    metadata: m.reply as Record<string, unknown>,
  };
}

export function buildGreeting(displayName: string): Msg {
  return {
    id: 1,
    role: "ai",
    reply: {
      text: `Bună ziua, ${displayName}! Sunt ClaudIA, asistentul tău civic. Cu ce te pot ajuta azi? Poți întreba despre acte, formulare, taxe sau orice altceva legat de instituțiile statului.`,
    },
  };
}

export function greetingToAppendInput(displayName: string): AppendChatMessageInput {
  const greeting = buildGreeting(displayName);
  if (greeting.role !== "ai") throw new Error("unexpected");
  return msgToAppendInput(greeting);
}
