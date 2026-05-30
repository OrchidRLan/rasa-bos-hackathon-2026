"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useApp } from "@/lib/context";
import { sendMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

export default function VoiceCenter() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sessionId, activePersona, pushMessages } = useApp();

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
    if (voiceEnabled) {
      stopRecording();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      startRecording();
    }
  }, [voiceEnabled, startRecording, stopRecording]);

  const voiceStatus = voiceEnabled
    ? isTranscribing ? "Transcribing…"
    : sending       ? "Sending…"
    : isRecording   ? "Listening…"
    :                 "Starting…"
    : null;

  return (
    <section className="flex flex-col h-full min-h-0 gap-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        Voice Agent
      </p>

      {/* Active expert */}
      {activePersona && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${activePersona.avatar_color} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
          >
            {activePersona.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{activePersona.display_name}</p>
            <p className="text-xs text-slate-400 truncate">{activePersona.subtitle}</p>
          </div>
        </div>
      )}

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
            ref={inputRef}
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

      {/* Mic off indicator — shown when voice is off */}
      {!voiceEnabled && (
        <div className="flex items-center gap-1.5 mt-1">
          <MicOff className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs text-slate-300">Voice off</span>
        </div>
      )}
    </section>
  );
}
