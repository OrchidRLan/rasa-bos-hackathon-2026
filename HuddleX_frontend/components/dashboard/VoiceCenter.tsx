"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Mic, MicOff, Send } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTTS } from "@/hooks/useTTS";
import { useApp } from "@/lib/context";
import { getExperts, sendMessage, switchPersona } from "@/lib/api";
import { getAvatarGradient, getInitials } from "@/lib/expertUtils";
import type { ChatMessage, Expert } from "@/lib/types";

export default function VoiceCenter({ onExpertClick }: { onExpertClick?: () => void }) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceEnabledRef = useRef(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Expert dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { sessionId, activePersona, setActivePersona, pushMessages } = useApp();
  const { speak, isSpeaking } = useTTS();

  // Load expert list once
  useEffect(() => {
    getExperts().then(setExperts).catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

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
      const wasVoice = voiceEnabledRef.current;
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
        const assistantMsgs: ChatMessage[] = replies
          .filter((r) => r.text)
          .map((r, i) => ({
            id: `reply_${Date.now()}_${i}`,
            timestamp: new Date().toISOString(),
            persona_id: activePersona?.id ?? null,
            role: "assistant",
            content: r.text!,
          }));
        pushMessages(assistantMsgs);
        if (wasVoice && assistantMsgs.length > 0) {
          const last = assistantMsgs[assistantMsgs.length - 1];
          speak(last.content, activePersona?.id ?? undefined);
        }
      } catch (e) {
        console.error("send failed", e);
      } finally {
        setSending(false);
      }
    },
    [sessionId, activePersona, pushMessages, sending, speak]
  );

  const { transcript, isRecording, isTranscribing, startRecording, stopRecording, cancelRecording } =
    useVoiceInput({ onTranscript: submit });

  // When TTS starts: cancel mic (discard echo). When TTS ends: resume listening.
  useEffect(() => {
    if (!voiceEnabled) return;
    if (isSpeaking) {
      cancelRecording();
    } else if (!isTranscribing && !isRecording) {
      void startRecording();
    }
  }, [isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) {
      voiceEnabledRef.current = false;
      cancelRecording();
      setVoiceEnabled(false);
    } else {
      voiceEnabledRef.current = true;
      setVoiceEnabled(true);
      void startRecording();
    }
  }, [voiceEnabled, startRecording, cancelRecording]);

  const voiceStatus = voiceEnabled
    ? isSpeaking    ? "Speaking…"
    : isTranscribing ? "Transcribing…"
    : sending       ? "Sending…"
    : isRecording   ? "Listening…"
    :                 "Starting…"
    : null;

  return (
    <section className="flex flex-col h-full min-h-0 gap-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        Voice Agent
      </p>

      {/* Expert selector dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-left hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
          aria-label="Select expert"
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          {activePersona ? (
            <>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ background: getAvatarGradient(activePersona) }}
              >
                {switching ? <Loader2 className="w-4 h-4 animate-spin" /> : getInitials(activePersona)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{activePersona.display_name}</p>
                <p className="text-xs text-slate-400 truncate">{activePersona.subtitle}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 flex-1">Select an expert…</p>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown list */}
        {dropdownOpen && experts.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
          >
            {experts.map((expert) => {
              const selected = expert.id === activePersona?.id;
              return (
                <li key={expert.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => handleSelectExpert(expert)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${
                      selected ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: getAvatarGradient(expert) }}
                    >
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

      {/* Voice Agent Mode toggle */}
      <div className="flex items-center justify-between py-3 border-t border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-800">Voice Agent Mode</p>
          <p className="text-xs text-slate-400 mt-0.5">Continuously listen and respond</p>
        </div>
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={voiceEnabled}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            voiceEnabled ? "bg-blue-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
              voiceEnabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Voice status */}
      {voiceEnabled && (
        <div className="flex items-center gap-2">
          {isTranscribing || sending ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
          ) : isSpeaking ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          ) : isRecording ? (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className="text-xs text-slate-400">{voiceStatus}</span>
          {transcript && !isTranscribing && (
            <span className="text-xs text-slate-500 italic truncate">&ldquo;{transcript}&rdquo;</span>
          )}
        </div>
      )}

      {/* Text input — shown when voice is off */}
      {!voiceEnabled && (
        <form
          className="flex gap-2 mt-auto"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${activePersona?.display_name ?? "an expert"}…`}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-40 shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      )}

      {/* Mic off indicator */}
      {!voiceEnabled && (
        <div className="flex items-center gap-1.5 mt-1">
          <MicOff className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs text-slate-300">Voice off</span>
        </div>
      )}
    </section>
  );
}
