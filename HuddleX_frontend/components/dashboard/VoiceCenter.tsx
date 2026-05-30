"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Square,
  Keyboard,
  Sparkles,
  Send,
} from "lucide-react";
import VoiceOrb from "./VoiceOrb";
import GlowCard from "@/components/ui/GlowCard";
import { activeExpert, suggestions } from "@/lib/mock-data";
import { useTranscriptStream } from "@/hooks/useTranscriptStream";

const RASA_URL = "http://localhost:5005/webhooks/rest/webhook";
const SENDER_ID = "frontend-user";

type Message = { role: "user" | "assistant"; text: string };

export default function VoiceCenter() {
  const transcript = useTranscriptStream();
  const [listening, setListening] = useState(true);
  const [textMode, setTextMode] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(RASA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: SENDER_ID, message: text }),
      });
      const data = await res.json();
      const reply = data.map((m: { text?: string }) => m.text).filter(Boolean).join("  ");
      setMessages((prev) => [...prev, { role: "assistant", text: reply || "(no response)" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "⚠️ Could not reach Rasa. Is it running on :5005?" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-6 px-1">
        <button
          type="button"
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 lg:invisible"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${activeExpert.avatarColor} flex items-center justify-center text-white text-xs font-semibold`}
          >
            {activeExpert.initials}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">
              {activeExpert.name}
            </p>
            <p className="text-xs text-slate-500">{activeExpert.subtitle}</p>
          </div>
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

      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        {textMode ? (
          <div className="w-full max-w-lg flex flex-col gap-3 py-2">
            {messages.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">
                Type a message to chat with {activeExpert.name}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-slate-100 text-slate-700 rounded-bl-md"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-400 px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm">
                  Thinking…
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <VoiceOrb />
            <GlowCard className="w-full max-w-lg p-4 mt-2 mb-6 bg-blue-50/80 border-blue-100">
              <p className="text-xs text-blue-500 font-medium mb-2 tracking-wide uppercase">
                Live Transcript
              </p>
              <p className="text-slate-700 leading-relaxed italic">&ldquo;{transcript}&rdquo;</p>
            </GlowCard>
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
                    onClick={() => { setTextMode(true); sendMessage(s); }}
                    className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {textMode && (
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2 pt-4 border-t border-slate-200/80"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${activeExpert.name}…`}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {!textMode && (
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => setListening(!listening)}
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
            onClick={() => { setTextMode(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50"
          >
            <Keyboard className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}
