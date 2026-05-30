"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ChatMessage, Expert } from "@/lib/types";

const SESSION_KEY = "huddlex_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr-session";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `user_${crypto.randomUUID()}`
        : `user_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface AppContextValue {
  sessionId: string;
  activePersona: Expert | null;
  setActivePersona: (persona: Expert | null) => void;
  latestMessages: ChatMessage[];
  pushMessages: (msgs: ChatMessage[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState("ssr-session");
  const [activePersona, setActivePersona] = useState<Expert | null>(null);
  const [latestMessages, setLatestMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const pushMessages = useCallback((msgs: ChatMessage[]) => {
    setLatestMessages((prev) => [...prev, ...msgs]);
  }, []);

  const value = useMemo(
    () => ({
      sessionId,
      activePersona,
      setActivePersona,
      latestMessages,
      pushMessages,
    }),
    [sessionId, activePersona, latestMessages, pushMessages],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
