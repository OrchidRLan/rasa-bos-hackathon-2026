"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ChatMessage, Expert } from "@/lib/types";

// ── Thread storage ────────────────────────────────────────────────────────────

const THREADS_KEY = "huddlex_threads_v2";

export interface LocalThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  expertId: string | null;
  createdAt: string;
}

function loadThreads(): LocalThread[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(THREADS_KEY) ?? "[]");
  } catch { return []; }
}

function saveThreads(threads: LocalThread[]) {
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

function makeNewThread(): LocalThread {
  return {
    id: `thread_${Date.now()}`,
    title: "New chat",
    messages: [],
    expertId: null,
    createdAt: new Date().toISOString(),
  };
}

// ── Session ID ────────────────────────────────────────────────────────────────

const SSR_SESSION = "ssr-session";
const STORAGE_KEY = "huddlex_session_id";

function loadOrCreateSessionId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = `session_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return `session_${Date.now().toString(36)}`;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  sessionId: string;
  activePersona: Expert | null;
  setActivePersona: (expert: Expert | null) => void;
  latestMessages: ChatMessage[];
  pushMessages: (msgs: ChatMessage[]) => void;
  threads: LocalThread[];
  activeThreadId: string;
  createThread: () => void;
  switchThread: (id: string) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
}

const AppContext = createContext<AppContextValue>({
  sessionId: SSR_SESSION,
  activePersona: null,
  setActivePersona: () => {},
  latestMessages: [],
  pushMessages: () => {},
  threads: [],
  activeThreadId: "",
  createThread: () => {},
  switchThread: () => {},
  deleteThread: () => {},
  renameThread: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState(SSR_SESSION);
  const [activePersona, setActivePersona] = useState<Expert | null>(null);
  const [threads, setThreads] = useState<LocalThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");

  useEffect(() => {
    setSessionId(loadOrCreateSessionId());
    let stored = loadThreads();
    if (stored.length === 0) {
      const first = makeNewThread();
      stored = [first];
      saveThreads(stored);
    }
    setThreads(stored);
    setActiveThreadId(stored[0].id);
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const latestMessages = activeThread?.messages ?? [];

  const pushMessages = useCallback((msgs: ChatMessage[]) => {
    if (msgs.length === 0) return;
    setThreads((prev) => {
      const next = prev.map((t) => {
        if (t.id !== activeThreadId) return t;
        const newMessages = [...t.messages, ...msgs].slice(-200);
        const title =
          t.title === "New chat"
            ? msgs.find((m) => m.role === "user")?.content.slice(0, 40) ?? t.title
            : t.title;
        return { ...t, messages: newMessages, title };
      });
      saveThreads(next);
      return next;
    });
  }, [activeThreadId]);

  const createThread = useCallback(() => {
    const t = makeNewThread();
    setThreads((prev) => {
      const next = [t, ...prev];
      saveThreads(next);
      return next;
    });
    setActiveThreadId(t.id);
  }, []);

  const switchThread = useCallback((id: string) => {
    setActiveThreadId(id);
  }, []);

  const deleteThread = useCallback((id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = makeNewThread();
        saveThreads([fresh]);
        setActiveThreadId(fresh.id);
        return [fresh];
      }
      saveThreads(next);
      setActiveThreadId((cur) => cur === id ? next[0].id : cur);
      return next;
    });
  }, []);

  const renameThread = useCallback((id: string, title: string) => {
    setThreads((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, title } : t);
      saveThreads(next);
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        sessionId, activePersona, setActivePersona,
        latestMessages, pushMessages,
        threads, activeThreadId, createThread, switchThread, deleteThread, renameThread,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
