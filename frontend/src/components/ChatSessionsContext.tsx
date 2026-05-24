import { createContext, useContext, useState, type ReactNode } from "react";

type ChatSessionsContextValue = {
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  openHistory: () => void;
  closeHistory: () => void;
};

const ChatSessionsContext = createContext<ChatSessionsContextValue | null>(null);

export function ChatSessionsProvider({ children }: { children: ReactNode }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <ChatSessionsContext.Provider
      value={{
        historyOpen,
        setHistoryOpen,
        openHistory: () => setHistoryOpen(true),
        closeHistory: () => setHistoryOpen(false),
      }}
    >
      {children}
    </ChatSessionsContext.Provider>
  );
}

export function useChatSessions() {
  const ctx = useContext(ChatSessionsContext);
  if (!ctx) {
    throw new Error("useChatSessions must be used within ChatSessionsProvider");
  }
  return ctx;
}

export function useChatSessionsOptional() {
  return useContext(ChatSessionsContext);
}
