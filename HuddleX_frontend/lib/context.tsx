"use client";

import { createContext, useContext, useState } from "react";
import type { ChatMessage, Expert } from "@/lib/types";

type AdvisorId = "dave-ramsey" | "warren-buffett" | "elon-musk" | "mr-money-mustache";

interface AppContextValue {
  // Advisor / persona
  advisorId: AdvisorId;
  setAdvisorId: (id: AdvisorId) => void;
  activePersona: Expert | null;
  setActivePersona: (e: Expert | null) => void;
  // Session
  sessionId: string;
  // Messages
  latestMessages: ChatMessage[];
  pushMessages: (msgs: ChatMessage[]) => void;
}

const AppContext = createContext<AppContextValue>({
  advisorId: "dave-ramsey",
  setAdvisorId: () => {},
  activePersona: null,
  setActivePersona: () => {},
  sessionId: "session_default",
  latestMessages: [],
  pushMessages: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [advisorId, setAdvisorId] = useState<AdvisorId>("dave-ramsey");
  const [activePersona, setActivePersona] = useState<Expert | null>(null);
  const [latestMessages, setLatestMessages] = useState<ChatMessage[]>([]);

  function pushMessages(msgs: ChatMessage[]) {
    setLatestMessages((prev) => [...prev, ...msgs]);
  }

  return (
    <AppContext.Provider
      value={{
        advisorId,
        setAdvisorId,
        activePersona,
        setActivePersona,
        sessionId: "session_default",
        latestMessages,
        pushMessages,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

// alias for our shell components
export function useAppContext() {
  return useContext(AppContext);
}
