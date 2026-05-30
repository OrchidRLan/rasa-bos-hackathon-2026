"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown, Loader2, Mic, MicOff, Send, Plus,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useApp } from "@/lib/context";
import { getExperts, sendMessage, switchPersona } from "@/lib/api";
import { getAvatarGradient, getInitials } from "@/lib/expertUtils";
import type { ChatMessage, Expert } from "@/lib/types";

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Expert dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const { sessionId, activePersona, setActivePersona, latestMessages, pushMessages } = useApp();

  useEffect(() => {
    getExperts().then(setExperts).catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestMessages]);

  async function handleSelectExpert(expert: Expert) {
    if (expert.id === activePersona?.id) { setDropdownOpen(false); return; }
    setSwitching(true);
    try {
      await switchPersona(sessionId, expert.id);
      setActivePersona(expert);
    } catch (e) {
      console.error("switch failed", e);
    } finally {
      setSwitching(false);
      setDropdownOpen(false);
    }
  }

  const submit = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      setSending(true);
      setInput("");
      pushMessages([{
        id: `local_${Date.now()}`,
        timestamp: new Date().toISOString(),
        persona_id: null,
        role: "user",
        content: text.trim(),
      }]);
      try {
        const replies = await sendMessage(sessionId, text.trim());
        const msgs: ChatMessage[] = replies
          .filter((r) => r.text)
          .map((r, i) => ({
            id: `reply_${Date.now()}_${i}`,
            timestamp: new Date().toISOString(),
            persona_id: activePersona?.id ?? null,
            role: "assistant",
            content: r.text!,
          }));
        pushMessages(msgs);
      } catch (e) {
        console.error("send failed", e);
      } finally {
        setSending(false);
      }
    },
    [sessionId, activePersona, pushMessages, sending]
  );

  const { transcript, isRecording, isTranscribing, startRecording, stopRecording } =
    useVoiceInput({ onTranscript: submit, continuous: true });

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) { stopRecording(); setVoiceEnabled(false); }
    else { setVoiceEnabled(true); startRecording(); }
  }, [voiceEnabled, startRecording, stopRecording]);

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">

      {/* ── Top bar: expert selector ── */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-3" ref={dropdownRef}>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors w-auto"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            {activePersona ? (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: getAvatarGradient(activePersona) }}>
                  {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : getInitials(activePersona)}
                </div>
                <span className="text-sm font-semibold text-slate-800">{activePersona.display_name}</span>
              </>
            ) : (
              <span className="text-sm text-slate-400">Select an expert…</span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && experts.length > 0 && (
            <ul role="listbox" className="absolute z-50 top-full left-0 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {experts.map((expert) => {
                const selected = expert.id === activePersona?.id;
                return (
                  <li key={expert.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => handleSelectExpert(expert)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${selected ? "bg-blue-50/60" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: getAvatarGradient(expert) }}>
                        {getInitials(expert)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{expert.display_name}</p>
                        <p className="text-xs text-slate-400 truncate">{expert.subtitle}</p>
                      </div>
                      {selected && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Voice status badge */}
        {voiceEnabled && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100">
            {isTranscribing || sending ? (
              <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <span className="text-xs text-red-500 font-medium">
              {isTranscribing ? "Transcribing" : sending ? "Sending" : "Listening"}
            </span>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
        {latestMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold" style={{ background: activePersona ? getAvatarGradient(activePersona) : "linear-gradient(135deg, #475569, #1e293b)" }}>
              {activePersona ? getInitials(activePersona) : "AI"}
            </div>
            <p className="text-slate-800 font-semibold">
              {activePersona ? `Chat with ${activePersona.display_name}` : "Select an expert to start"}
            </p>
            <p className="text-sm text-slate-400">Ask anything — type below or use the mic</p>
          </div>
        ) : (
          latestMessages.map((msg) => {
            if (msg.role === "system_event") return null;
            const isUser = msg.role === "user";
            const label = isUser ? "You" : (msg.persona_id ?? activePersona?.display_name ?? "Expert");
            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <span className="text-xs text-slate-400 mb-1 px-1">{label}</span>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-slate-100 text-slate-700 rounded-bl-md"
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}

        {/* Live transcript preview */}
        {voiceEnabled && transcript && !isTranscribing && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 mb-1 px-1">You</span>
            <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md bg-blue-100 text-blue-700 text-sm italic">
              {transcript}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-100">
        <form
          className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
        >
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${activePersona?.display_name ?? "anything"}…`}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />

          {/* Voice toggle */}
          <button
            type="button"
            onClick={toggleVoice}
            title={voiceEnabled ? "Stop voice mode" : "Start voice mode"}
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              voiceEnabled
                ? "bg-red-500 text-white hover:bg-red-600"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            }`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Send */}
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-40 shrink-0 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

    </div>
  );
}
