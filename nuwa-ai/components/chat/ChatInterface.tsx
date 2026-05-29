"use client";

import { useState } from "react";
import { Mic, MicOff, Send, ArrowUpRight } from "lucide-react";

const SAMPLE_MESSAGES = [
  {
    role: "user" as const,
    content: "I have $12,400 in credit card debt and $1,100 left each month. Should I invest or pay off debt first?",
  },
  {
    role: "advisor" as const,
    advisor: "Dave Ramsey",
    content:
      "You already know the answer — you want permission to invest. I won't give it. $1,100 goes to debt every month until it's gone. No exceptions.",
    actions: [
      "Put all $1,100 toward the highest-interest card first",
      "Freeze every non-essential subscription for 11 months",
      "Month 12 reminder set — that's when investing begins",
    ],
    news: [
      { label: "Fed rate holds at 4.5%", detail: "Your APR won't drop soon — pay off faster" },
      { label: "S&P 500 +2.1% this week", detail: "Noted — irrelevant until debt is cleared" },
    ],
    filtered: 14,
  },
];

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Advisor header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
          DR
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight">Dave Ramsey</p>
          <p className="text-xs text-slate-400">The Disciplinarian</p>
        </div>
        <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Context loaded</span>
        <div className="ml-auto flex gap-2">
          <button className="text-sm font-semibold text-white bg-slate-900 px-4 py-1.5 rounded-lg">Chat</button>
          <button className="text-sm font-medium text-slate-500 px-4 py-1.5 rounded-lg hover:bg-slate-100">Overview</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {SAMPLE_MESSAGES.map((msg, i) => (
          <div key={i} className="space-y-4">
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-lg bg-emerald-50 text-slate-800 rounded-2xl rounded-tr-sm px-5 py-4 text-sm leading-relaxed">
                  &ldquo;{msg.content}&rdquo;
                </div>
              </div>
            )}
            {msg.role === "advisor" && (
              <div className="space-y-3">
                {/* Advisor bubble */}
                <div className="max-w-2xl bg-white rounded-2xl rounded-tl-sm border border-slate-200 px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 mb-2">{msg.advisor}</p>
                  <p className="text-slate-800 text-sm leading-relaxed mb-4">{msg.content}</p>
                  {msg.actions && (
                    <ol className="space-y-2">
                      {msg.actions.map((action, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                            {j + 1}
                          </span>
                          {action}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                {/* News cards */}
                {msg.news && (
                  <div className="space-y-2">
                    <div className="flex gap-3 flex-wrap">
                      {msg.news.map((n, j) => (
                        <div key={j} className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                            <span className="w-3 h-3 rounded bg-slate-200 inline-block" />
                            {n.label}
                          </div>
                          <p className="text-xs text-slate-400">{n.detail}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">
                      {msg.news.length} relevant updates surfaced
                      <span className="ml-4">{msg.filtered} irrelevant filtered out</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white">
        {/* Quick prompts */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {["Debt avalanche", "After debt clears", "Compare advisors"].map((p) => (
            <button
              key={p}
              className="shrink-0 flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
            >
              {p} <ArrowUpRight size={11} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setListening(!listening)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              listening ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          {listening && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Listening
            </span>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your advisor..."
            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-slate-400 transition-colors"
          />
          <button
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
