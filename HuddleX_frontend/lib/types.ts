export interface Expert {
  id: string;
  name: string;
  display_name: string;
  subtitle: string;
  initials: string;
  avatarColor?: string;
  avatar_color?: string;
  xSource?: string;
  x_source: string;
  last_updated: string;
  wikipedia: string;
  financialAccount?: string;
  lastUpdated?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system_event";
  content: string;
  timestamp: number | string;
  personaId?: string;
  persona_id?: string | null;
}

export interface Thread {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: number;
  personaId: string;
  thread_id: string;
  message_count: number;
  personas_involved: string[];
  last_active: string;
}

export interface UserProfile {
  id: string;
  name?: string;
  threads?: unknown[];
  initials?: string;
  subtitle?: string;
  xSource?: string;
  wikipedia?: string;
  financialAccount?: string;
  lastUpdated?: string;
  user_context?: {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
    interests?: string[];
    raw_description?: string;
    updated_at?: string;
    [key: string]: unknown;
  };
}
