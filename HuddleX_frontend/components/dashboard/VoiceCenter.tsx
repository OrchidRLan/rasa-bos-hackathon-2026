"use client";

import { useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Square,
  Keyboard,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import VoiceOrb from "./VoiceOrb";
import GlowCard from "@/components/ui/GlowCard";
import { suggestions } from "@/lib/mock-data";
import { useTranscriptStream } from "@/hooks/useTranscriptStream";
import { useApp } from "@/lib/context";
import { sendMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

export default function VoiceCenter() {
  const transcript = useTranscriptStream();
  const [listening, setListening] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sessionId, activePersona, pushMessages } = useApp();

  const submit = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      setSending(true);

      const userMsg: ChatMessage = {
        id: `local_${Date.now()}`,
        timestamp: new Date().toISOString(),
        persona_id: null,
        role: "user",
        content: text.trim(),
      };
      pushMessages([userMsg]);
      setInput("");

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

  return (
    <section className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <button
          type="button"
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 lg:invisible"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          {activePersona ? (
            <>
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${activePersona.avatar_color} flex items-center justify-center text-white text-xs font-semibold`}
              >
                {activePersona.initials}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm leading-tight">
                  {activePersona.display_name}
                </p>
                <p className="text-xs text-slate-500">{activePersona.subtitle}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Select an expert →</p>
          )}
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Context Loaded
          </span>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Switch
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <VoiceOrb />

        {/* Live transcript */}
        <GlowCard className="w-full max-w-lg p-4 mt-2 mb-6 bg-blue-50/80 border-blue-100">
          <p className="text-xs text-blue-500 font-medium mb-2 tracking-wide uppercase">
            Live Transcript
          </p>
          <p className="text-slate-700 leading-relaxed italic">&ldquo;{transcript}&rdquo;</p>
        </GlowCard>

        {/* Suggestions */}
        <div className="w-full max-w-lg mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Suggestions for you</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Text input (shown when keyboard mode active) */}
        {textMode && (
          <form
            className="w-full max-w-lg flex gap-2 mb-4"
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
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => setListening((v) => !v)}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
            listening
              ? "bg-red-500 hover:bg-red-600 shadow-red-200"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
          }`}
        >
          {listening ? (
            <Square className="w-5 h-5 text-white fill-white" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-white" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setTextMode((v) => !v);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
            textMode
              ? "border-blue-400 bg-blue-50 text-blue-600"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
