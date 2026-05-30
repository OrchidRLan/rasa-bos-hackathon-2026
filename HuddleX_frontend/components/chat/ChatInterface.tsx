"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, ArrowUpRight } from "lucide-react";
import DebtPlanCard from "./DebtPlanCard";
import { sendMessage } from "@/lib/api";
import { useApp } from "@/lib/context";
import type { Debt } from "@/lib/debtCalculator";

// ─── User financial profile (will come from Rasa memory / SQLite later) ──────
const USER_DEBTS: Debt[] = [
  { id: "cc-a", name: "信用卡A", balance: 3200, apr: 0.28, minPayment: 64 },
  { id: "cc-b", name: "信用卡B", balance: 5800, apr: 0.24, minPayment: 116 },
  { id: "cc-c", name: "信用卡C", balance: 3400, apr: 0.22, minPayment: 68 },
];
const MONTHLY_SURPLUS = 1100;

// ─── Intent detection ─────────────────────────────────────────────────────────
const DEBT_PLAN_TRIGGERS = [
  "ramsey", "snowball", "还债", "债务", "还清", "payoff", "pay off",
  "debt", "按ramsey", "按 ramsey",
];
function detectDebtPlanIntent(text: string) {
  return DEBT_PLAN_TRIGGERS.some((t) => text.toLowerCase().includes(t));
}

// ─── Message types ────────────────────────────────────────────────────────────
type UserMessage = { role: "user"; content: string };
type AdvisorMessage = {
  role: "advisor";
  advisor: string;
  content: string;
  showDebtPlan?: boolean;
  actions?: string[];
};
type Message = UserMessage | AdvisorMessage;

const QUICK_PROMPTS = ["我要按Ramsey方法还债", "比较两种策略", "债务清零后怎么投资"];

export default function ChatInterface() {
  const { sessionId, activePersona } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content }]);

    const advisorName = activePersona?.display_name ?? activePersona?.name ?? "Dave Ramsey";

    // Debt plan intent — handle locally with calculator
    if (detectDebtPlanIntent(content)) {
      setMessages((prev) => [...prev, {
        role: "advisor",
        advisor: advisorName,
        content: "好，我来帮你算清楚。根据你的债务和每月 $1,100 的盈余，这是你的两条路：",
        showDebtPlan: true,
      }]);
      setSending(false);
      return;
    }

    // All other messages → Rasa
    try {
      const replies = await sendMessage(sessionId, content, activePersona?.id);
      const responses: AdvisorMessage[] = replies
        .filter((r) => r.text)
        .map((r) => ({ role: "advisor" as const, advisor: advisorName, content: r.text! }));

      setMessages((prev) => [
        ...prev,
        ...(responses.length > 0
          ? responses
          : [{ role: "advisor" as const, advisor: advisorName, content: "（Rasa 无回应，请检查后端是否运行）" }]),
      ]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "advisor", advisor: "System",
        content: "⚠️ 连接失败。请在 HuddleX_backend 目录运行：make run-rasa && make run-api",
      }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const advisorName = activePersona?.display_name ?? activePersona?.name ?? "Dave Ramsey";
  const advisorInitials = advisorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
          {advisorInitials}
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight">{advisorName}</p>
          <p className="text-xs text-slate-400">{activePersona?.subtitle ?? "Financial Advisor"}</p>
        </div>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
          activePersona ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"
        }`}>
          {activePersona ? "Context loaded" : "Select an advisor →"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 text-sm text-center">
            <p>在左侧 Experts Library 选择一个 Advisor</p>
            <p className="text-xs">或直接点击下方快捷提示开始</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-lg bg-emerald-50 text-slate-800 rounded-2xl rounded-tr-sm px-5 py-4 text-sm leading-relaxed">
                  &ldquo;{msg.content}&rdquo;
                </div>
              </div>
            )}
            {msg.role === "advisor" && (
              <div className="space-y-3 max-w-2xl">
                <div className="bg-white rounded-2xl rounded-tl-sm border border-slate-200 px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 mb-2">{msg.advisor}</p>
                  <p className="text-slate-800 text-sm leading-relaxed">{msg.content}</p>
                  {msg.actions && (
                    <ol className="space-y-2 mt-4">
                      {msg.actions.map((action, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{j + 1}</span>
                          {action}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                {msg.showDebtPlan && (
                  <DebtPlanCard debts={USER_DEBTS} monthlySurplus={MONTHLY_SURPLUS} streaming />
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-1.5 text-slate-400">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} onClick={() => handleSend(p)}
              className="shrink-0 flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors">
              {p} <ArrowUpRight size={11} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setListening(!listening)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              listening ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}>
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={activePersona ? `问 ${advisorName}...` : "先选择一个 Advisor..."}
            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-slate-400 transition-colors" />
          <button onClick={() => handleSend()} disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 transition-colors shrink-0">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
