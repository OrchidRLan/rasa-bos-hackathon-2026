// Stable session ID stored in localStorage — used as Rasa sender_id + thread_id + user_id.

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr-session"
  let id = localStorage.getItem("huddlex_session_id")
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem("huddlex_session_id", id)
  }
  return id
}
