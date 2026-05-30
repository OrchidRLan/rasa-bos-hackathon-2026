import type { Expert, RasaMessage, Thread, UserProfile } from "@/lib/types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

export function getExperts(): Promise<Expert[]> {
  return apiFetch<Expert[]>("/api/experts");
}

export function getUser(userId: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/user/${encodeURIComponent(userId)}`);
}

export function updateUser(
  userId: string,
  body: {
    name?: string;
    role?: string;
    interests?: string[];
    raw_description?: string;
  },
): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/user/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function getThreads(): Promise<Thread[]> {
  return apiFetch<Thread[]>("/api/threads");
}

export function sendMessage(sender: string, message: string): Promise<RasaMessage[]> {
  return apiFetch<RasaMessage[]>("/webhooks/rest/webhook", {
    method: "POST",
    body: JSON.stringify({ sender, message }),
  });
}

export function switchPersona(sender: string, targetPersonaId: string): Promise<RasaMessage[]> {
  const message = `/switch_persona{"target_persona_id": "${targetPersonaId}"}`;
  return sendMessage(sender, message);
}

export function addExpert(
  body: {
    display_name: string;
    x_handle?: string;
    wikipedia_url?: string;
  },
  signal?: AbortSignal,
): Promise<Expert> {
  return apiFetch<Expert>("/api/experts", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}
