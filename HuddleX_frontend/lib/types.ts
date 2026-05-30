// Shared types for the HuddleX frontend.
// Shapes mirror the backend JSON:
//   Expert      ← GET /api/experts        (persona_store.list_personas_for_api)
//   Thread      ← GET /api/threads        (store.list_threads)
//   UserProfile ← GET /api/user/{id}      (store.load_user)
//   ChatMessage ← built client-side from POST /webhooks/rest/webhook replies

export interface Expert {
  id: string;
  display_name: string;
  subtitle: string;
  initials: string;
  avatar_color: string;
  x_source: string;
  x_handle?: string;
  wikipedia: string;
  last_updated: string;
  briefing?: string;
  rime_voice_id?: string;
}

export type ChatRole = "user" | "assistant" | "system_event";

export interface ChatMessage {
  id: string;
  timestamp: string;
  persona_id: string | null;
  role: ChatRole;
  content: string;
}

export interface Thread {
  thread_id: string;
  title: string;
  created_at?: string;
  last_active: string;
  active_persona_id?: string | null;
  personas_involved: string[];
  message_count: number;
}

export interface UserContext {
  name?: string;
  email?: string;
  role?: string;
  interests?: string[];
  raw_description?: string;
  updated_at?: string;
}

export interface UserProfile {
  user_id?: string;
  created_at?: string;
  user_context?: UserContext;
  threads?: unknown[];
  global_summary?: {
    text?: string;
    generated_at?: string;
    thread_count?: number;
  };
}

// A single entry in the Rasa REST webhook response array.
export interface RasaReply {
  recipient_id?: string;
  text?: string;
  custom?: Record<string, unknown>;
}
