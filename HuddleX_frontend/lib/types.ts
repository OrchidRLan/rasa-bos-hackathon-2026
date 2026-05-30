export interface Expert {
  id: string;
  display_name: string;
  x_handle: string;
  x_source: string;
  wikipedia: string;
  avatar_color: string;
  initials: string;
  rime_voice_id: string;
  briefing: string;
  last_updated: string;
  subtitle: string;
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  persona_id: string | null;
  role: "user" | "assistant" | "system_event";
  content: string;
}

export interface UserContext {
  name: string;
  role: string;
  interests: string[];
  raw_description: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  user_context: UserContext;
  threads: unknown[];
  global_summary: {
    text: string;
    generated_at: string;
    thread_count: number;
  };
}

export interface Thread {
  thread_id: string;
  title: string;
  created_at: string;
  last_active: string;
  active_persona_id: string | null;
  personas_involved: string[];
  message_count: number;
}

export interface RasaMessage {
  recipient_id?: string;
  text?: string;
  custom?: {
    type?: string;
    persona_id?: string;
    persona?: Expert;
    [key: string]: unknown;
  };
}

export type TranscriptStreamStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "transcribing"
  | "error";

export interface TranscriptServerEvent {
  type?: string;
  text?: string;
  transcript?: string;
  utterance_id?: string;
  is_final?: boolean;
  error?: string;
  message?: string;
}

export interface TranscriptAudioStopEvent {
  type: "audio_stop";
  session_id?: string;
  utterance_id: string;
}
