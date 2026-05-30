"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, ArrowUpRight } from "lucide-react";
import DebtPlanCard from "./DebtPlanCard";
import type { Debt } from "@/lib/debtCalculator";

// ─── User financial profile (will come from Rasa / SQLite later) ───────────
const USER_DEBTS: Debt[] = [
  { id: "cc-a", name: "信用卡A", balance: 3200, apr: 0.28, minPayment: 64 },
  { id: "cc-b", name: "信用卡B", balance: 5800, apr: 0.24, minPayment: 116 },
  { id: "cc-c", name: "信用卡C", balance: 3400, apr: 0.22, minPayment: 68 },
];
const MONTHLY_SURPLUS = 1100;

// ─── Intent detection ────────────────────────────────────────────────────────
const DEBT_PLAN_TRIGGERS = [
  "ramsey", "snowball", "还债", "债务", "还清", "payoff", "pay off",
  "debt", "按ramsey", "按 ramsey",
];

function detectDebtPlanIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return DEBT_PLAN_TRIGGERS.some((t) => lower.includes(t));
}

// ─── Message types ───────────────────────────────────────────────────────────
type UserMessage = { role: "user"; content: string };
type AdvisorMessage = {
  role: "advisor";
  advisor: string;
  content: string;
  showDebtPlan?: boolean;
  actions?: string[];
  news?: { label: string; detail: string }[];
  filtered?: number;
};
type Message = UserMessage | AdvisorMessage;

const INITIAL_MESSAGES: Message[] = [
  {
    role: "user",
    content: "I have $12,400 in credit card debt and $1,100 left each month. Should I invest or pay off debt first?",
  },
  {
    role: "advisor",
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

const QUICK_PROMPTS = [
  "我要按Ramsey方法还债",
  "比较两种策略",
  "债务清零后怎么投资",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMsg: UserMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate advisor response after short delay
    setTimeout(() => {
      const isDebtPlan = detectDebtPlanIntent(content);

      const advisorMsg: AdvisorMessage = isDebtPlan
        ? {
            role: "advisor",
            advisor: "Dave Ramsey",
            content: "好，我来帮你算清楚。根据你的三张信用卡和每月 $1,100 的盈余，这是你的两条路：",
            showDebtPlan: true,
          }
        : {
            role: "advisor",
            advisor: "Dave Ramsey",
            content: `我听到了："${content}"。先把债务清零，其他事情之后再说。`,
            actions: ["继续执行还债计划", "下次对话时更新你的支出"],
          };

      setMessages((prev) => [...prev, advisorMsg]);
    }, 600);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Advisor header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
          DR
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight">Dave Ramsey</p>
          <p className="text-xs text-slate-400">The Disciplinarian</p>
        </div>
        <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          Context loaded
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className="space-y-4">
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-lg bg-emerald-50 text-slate-800 rounded-2xl rounded-tr-sm px-5 py-4 text-sm leading-relaxed">
                  &ldquo;{msg.content}&rdquo;
                </div>
              </div>
            )}

            {msg.role === "advisor" && (
              <div className="space-y-3 max-w-2xl">
                {/* Advisor bubble */}
                <div className="bg-white rounded-2xl rounded-tl-sm border border-slate-200 px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 mb-2">{msg.advisor}</p>
                  <p className="text-slate-800 text-sm leading-relaxed">
                    {msg.content}
                  </p>
                  {msg.actions && (
                    <ol className="space-y-2 mt-4">
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

                {/* Debt plan streaming card */}
                {msg.showDebtPlan && (
                  <DebtPlanCard
                    debts={USER_DEBTS}
                    monthlySurplus={MONTHLY_SURPLUS}
                    streaming={true}
                  />
                )}

                {/* News cards */}
                {msg.news && (
                  <div className="space-y-2">
                    <div className="flex gap-3 flex-wrap">
                      {msg.news.map((n, j) => (
                        <div
                          key={j}
                          className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
                        >
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
        {/* Quick prompts */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="shrink-0 flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
            >
              {p} <ArrowUpRight size={11} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setListening(!listening)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              listening
                ? "bg-red-500 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          {listening && (
            <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Listening
            </span>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，或试试快捷提示..."
            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-slate-400 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
