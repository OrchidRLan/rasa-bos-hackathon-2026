"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChatMessage, Expert } from "@/lib/types";
import { getThread } from "@/lib/api";

// A conversation thread. Each thread's id doubles as the Rasa `sender` for that
// conversation, so every thread is an independent backend conversation (its own
// persisted history + persona context). Threads are managed client-side and
// persisted in localStorage; switching one rehydrates its history from the backend.
export interface ThreadMeta {
  id: string;
  title: string;
}

interface AppContextValue {
  // The active thread id, used as the Rasa `sender` / conversation key.
  // "ssr-session" until hydrated on the client (components gate on this).
  sessionId: string;

  activePersona: Expert | null;
  setActivePersona: (expert: Expert | null) => void;

  latestMessages: ChatMessage[];
  pushMessages: (msgs: ChatMessage[]) => void;

  // Multi-thread management (the chat sidebar).
  threads: ThreadMeta[];
  activeThreadId: string;
  createThread: () => void;
  switchThread: (id: string) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
}

const SSR_SESSION = "ssr-session";
const THREADS_KEY = "huddlex_threads";
const ACTIVE_KEY = "huddlex_active_thread";
const NEW_TITLE = "New chat";

const AppContext = createContext<AppContextValue>({
  sessionId: SSR_SESSION,
  activePersona: null,
  setActivePersona: () => {},
  latestMessages: [],
  pushMessages: () => {},
  threads: [],
  activeThreadId: SSR_SESSION,
  createThread: () => {},
  switchThread: () => {},
  deleteThread: () => {},
  renameThread: () => {},
});

function newId(): string {
  return `t_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>(SSR_SESSION);
  const [activePersona, setActivePersona] = useState<Expert | null>(null);
  const [latestMessages, setLatestMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  async function loadHistory(threadId: string) {
    if (!threadId || threadId === SSR_SESSION) {
      setLatestMessages([]);
      return;
    }
    setLatestMessages(await getThread(threadId));
  }

  // Hydrate threads + active thread from localStorage on mount (client only).
  useEffect(() => {
    let list: ThreadMeta[] = [];
    let active = "";
    try {
      const raw = window.localStorage.getItem(THREADS_KEY);
      list = raw ? (JSON.parse(raw) as ThreadMeta[]) : [];
      active = window.localStorage.getItem(ACTIVE_KEY) || "";
    } catch {
      /* localStorage unavailable */
    }
    if (!Array.isArray(list) || list.length === 0) {
      list = [{ id: newId(), title: NEW_TITLE }];
    }
    if (!active || !list.some((t) => t.id === active)) active = list[0].id;
    setThreads(list);
    setActiveThreadId(active);
    setHydrated(true);
    loadHistory(active);
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    } catch {}
  }, [threads, hydrated]);
  useEffect(() => {
    if (!hydrated || activeThreadId === SSR_SESSION) return;
    try {
      window.localStorage.setItem(ACTIVE_KEY, activeThreadId);
    } catch {}
  }, [activeThreadId, hydrated]);

  const activeIdRef = useRef(activeThreadId);
  useEffect(() => {
    activeIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const pushMessages = useCallback((msgs: ChatMessage[]) => {
    if (msgs.length === 0) return;
    setLatestMessages((prev) => [...prev, ...msgs]);
    // Auto-title a fresh thread from its first user message.
    const firstUser = msgs.find((m) => m.role === "user");
    if (firstUser) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeIdRef.current && t.title === NEW_TITLE
            ? { ...t, title: firstUser.content.slice(0, 40) || NEW_TITLE }
            : t,
        ),
      );
    }
  }, []);

  const createThread = useCallback(() => {
    const id = newId();
    setThreads((prev) => [{ id, title: NEW_TITLE }, ...prev]);
    setActiveThreadId(id);
    setLatestMessages([]);
  }, []);

  const switchThread = useCallback((id: string) => {
    if (id === activeIdRef.current) return;
    setActiveThreadId(id);
    loadHistory(id);
  }, []);

  const renameThread = useCallback((id: string, title: string) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  const deleteThread = useCallback((id: string) => {
    setThreads((prev) => {
      let next = prev.filter((t) => t.id !== id);
      if (next.length === 0) next = [{ id: newId(), title: NEW_TITLE }];
      if (id === activeIdRef.current) {
        const target = next[0].id;
        setActiveThreadId(target);
        loadHistory(target);
      }
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        sessionId: activeThreadId,
        activePersona,
        setActivePersona,
        latestMessages,
        pushMessages,
        threads,
        activeThreadId,
        createThread,
        switchThread,
        deleteThread,
        renameThread,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
