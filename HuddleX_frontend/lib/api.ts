// API client for the HuddleX frontend.
//
// All requests use RELATIVE paths so they flow through the Next.js rewrite
// proxy configured in next.config.ts:
//   /api/*      → FastAPI  (http://localhost:8080)   experts, user, threads
//   /webhooks/* → Rasa     (http://localhost:5005)   chat + persona switching
//
// List endpoints fail soft (return []/null) so the dashboard still renders
// when the backend is down. addExpert throws so the modal can surface the error.

import type { Expert, Thread, UserProfile, RasaReply } from "@/lib/types";

// ── Personas ────────────────────────────────────────────────────────────────

export async function getExperts(): Promise<Expert[]> {
  try {
    const res = await fetch("/api/experts");
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as Expert[];
  } catch (e) {
    console.error("getExperts failed", e);
    return [];
  }
}

export interface AddExpertInput {
  display_name: string;
  x_handle?: string;
  wikipedia_url?: string;
}

export async function addExpert(input: AddExpertInput): Promise<Expert> {
  const res = await fetch("/api/experts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await res.json()) as Expert;
}

// ── Chat (Rasa) ───────────────────────────────────────────────────────────────

export async function sendMessage(
  sessionId: string,
  message: string,
  personaId?: string,
  fileIds?: string[],
): Promise<RasaReply[]> {
  try {
    const metadata: Record<string, unknown> = {};
    if (personaId) metadata.persona_id = personaId;
    if (fileIds && fileIds.length > 0) metadata.file_ids = fileIds;
    const res = await fetch("/webhooks/rest/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: sessionId,
        message,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as RasaReply[];
  } catch (e) {
    console.error("sendMessage failed", e);
    return [{ text: "⚠️ Backend not reachable — is Rasa running? (make run-rasa)" }];
  }
}

export async function uploadFile(
  file: File,
  userId: string,
): Promise<{ status: string; file: { file_id: string; filename: string; size: number } }> {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", userId);
  const res = await fetch("/api/files/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function switchPersona(
  sessionId: string,
  personaId: string,
): Promise<RasaReply[]> {
  // The switch_persona CALM flow accepts this slash payload directly,
  // filling the target_persona_id slot without an LLM extraction step.
  return sendMessage(sessionId, `/switch_persona{"target_persona_id":"${personaId}"}`);
}

// ── User ──────────────────────────────────────────────────────────────────────

export async function getUser(userId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/user/${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as UserProfile;
  } catch (e) {
    console.error("getUser failed", e);
    return null;
  }
}

export interface UserUpdate {
  name?: string;
  role?: string;
  interests?: string[];
  raw_description?: string;
}

export async function updateUser(
  userId: string,
  data: UserUpdate,
): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/user/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as UserProfile;
  } catch (e) {
    console.error("updateUser failed", e);
    return null;
  }
}

// ── Threads ───────────────────────────────────────────────────────────────────

export async function getThreads(): Promise<Thread[]> {
  try {
    const res = await fetch("/api/threads");
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as Thread[];
  } catch (e) {
    console.error("getThreads failed", e);
    return [];
  }
}
