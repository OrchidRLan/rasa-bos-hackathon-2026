/**
 * API client — connects to HuddleX_backend
 *
 * FastAPI  → http://localhost:8080   /api/experts, /api/user, /api/threads
 * Rasa     → http://localhost:5005   /webhooks/rest/webhook  (all chat)
 */

import type { Expert, UserProfile, Thread } from "@/lib/types";

const API_URL  = process.env.NEXT_PUBLIC_API_URL  ?? "http://localhost:8080";
const RASA_URL = process.env.NEXT_PUBLIC_RASA_URL ?? "http://localhost:5005";

// ── Personas ──────────────────────────────────────────────────────────────────

export async function getExperts(): Promise<Expert[]> {
  try {
    const res = await fetch(`${API_URL}/api/experts`);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function switchPersona(sessionId: string, personaId: string) {
  // Persona switching goes through Rasa as a special message
  return sendMessage(sessionId, `/switch_persona{"persona_id":"${personaId}"}`);
}

// ── User ──────────────────────────────────────────────────────────────────────

export async function getUser(sessionId?: string): Promise<UserProfile | null> {
  const id = sessionId ?? "default_user";
  try {
    const res = await fetch(`${API_URL}/api/user/${id}`);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

export async function updateUser(sessionId: string, data: Partial<UserProfile>) {
  try {
    const res = await fetch(`${API_URL}/api/user/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  } catch {
    return null;
  }
}

// ── Threads ───────────────────────────────────────────────────────────────────

export async function getThreads(): Promise<Thread[]> {
  try {
    const res = await fetch(`${API_URL}/api/threads`);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

// ── Chat (Rasa) ───────────────────────────────────────────────────────────────

export async function sendMessage(
  sessionId: string,
  message: string,
  personaId?: string
): Promise<Array<{ text?: string; persona_id?: string }>> {
  try {
    const res = await fetch(`${RASA_URL}/webhooks/rest/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: sessionId,
        message,
        ...(personaId ? { metadata: { persona_id: personaId } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return [{ text: "⚠️ 后端未连接，请先启动 Rasa (make run-rasa)" }];
  }
}
