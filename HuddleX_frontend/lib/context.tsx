"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ChatMessage, Expert } from "@/lib/types";

interface AppContextValue {
  // Stable per-browser id, used as the Rasa `sender` and the user id.
  // Starts as "ssr-session" on the server, then becomes a persisted id on the
  // client after mount (components gate backend calls on this to avoid
  // hydration mismatches and duplicate fetches).
  sessionId: string;

  // Currently selected expert persona.
  activePersona: Expert | null;
  setActivePersona: (expert: Expert | null) => void;

  // Rolling chat history shown in the dashboard.
  latestMessages: ChatMessage[];
  pushMessages: (msgs: ChatMessage[]) => void;
}

const SSR_SESSION = "ssr-session";
const STORAGE_KEY = "huddlex_session_id";

const AppContext = createContext<AppContextValue>({
  sessionId: SSR_SESSION,
  activePersona: null,
  setActivePersona: () => {},
  latestMessages: [],
  pushMessages: () => {},
});

function loadOrCreateSessionId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = `session_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to ephemeral id.
    return `session_${Date.now().toString(36)}`;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState(SSR_SESSION);
  const [activePersona, setActivePersona] = useState<Expert | null>(null);
  const [latestMessages, setLatestMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setSessionId(loadOrCreateSessionId());
  }, []);

  function pushMessages(msgs: ChatMessage[]) {
    if (msgs.length === 0) return;
    setLatestMessages((prev) => [...prev, ...msgs]);
  }

  return (
    <AppContext.Provider
      value={{
        sessionId,
        activePersona,
        setActivePersona,
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
