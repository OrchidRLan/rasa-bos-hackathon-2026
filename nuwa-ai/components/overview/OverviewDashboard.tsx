"use client";

import { TrendingDown, Wallet, PiggyBank, Target, Lightbulb } from "lucide-react";

const METRICS = [
  { icon: TrendingDown, label: "Total Debt", value: "$12,400", change: "-$1,100 this month", color: "text-red-500", bg: "bg-red-50" },
  { icon: Wallet, label: "Monthly Surplus", value: "$1,100", change: "After expenses", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: PiggyBank, label: "Emergency Fund", value: "$2,800", change: "2.5 months covered", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Target, label: "Debt-Free In", value: "11 mo", change: "At current pace", color: "text-amber-500", bg: "bg-amber-50" },
];

const EXPENSES = [
  { label: "Housing", amount: 1800, pct: 36, color: "bg-blue-400" },
  { label: "Food", amount: 600, pct: 12, color: "bg-emerald-400" },
  { label: "Transport", amount: 400, pct: 8, color: "bg-amber-400" },
  { label: "Subscriptions", amount: 220, pct: 4.4, color: "bg-purple-400" },
  { label: "Other", amount: 880, pct: 17.6, color: "bg-slate-300" },
];

const MEMORY_ANCHORS = [
  {
    id: 1,
    text: "User mentioned a large incoming transfer next week — planning to invest in US stocks.",
    time: "3 days ago",
    status: "confirmed",
  },
  {
    id: 2,
    text: "User hasn't shared exact monthly expenses. Buffett mode will prompt next session.",
    time: "1 day ago",
    status: "incomplete",
  },
];

const FILTERED_INSIGHTS = [
  { label: "Fed rate holds at 4.5%", relevance: "High", tag: "Debt", detail: "APR unlikely to drop — pay faster." },
  { label: "BTC down 8% this week", relevance: "Low", tag: "Crypto", detail: "Not relevant until debt cleared." },
  { label: "S&P 500 +2.1%", relevance: "Low", tag: "Equities", detail: "Noted for post-debt investing phase." },
];

export default function OverviewDashboard() {
  const debtPaid = 1100;
  const debtTotal = 13500;
  const pct = Math.round((debtPaid / debtTotal) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Overview</h1>

      {/* 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map(({ icon: Icon, label, value, change, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{change}</p>
          </div>
        ))}
      </div>

      {/* Debt payoff progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" id="actions">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-800 text-sm">Debt Payoff Progress</p>
          <span className="text-xs text-slate-400">{pct}% cleared</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>${debtPaid.toLocaleString()} paid</span>
          <span>${debtTotal.toLocaleString()} original</span>
        </div>
      </div>

      {/* Expense breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="font-semibold text-slate-800 text-sm mb-4">Monthly Expenses</p>
        <div className="space-y-3">
          {EXPENSES.map(({ label, amount, pct: p, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${p * 2}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-14 text-right">${amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Memory anchors */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" id="memory">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-500" />
            <p className="font-semibold text-slate-800 text-sm">Memory Anchors</p>
          </div>
          <div className="space-y-3">
            {MEMORY_ANCHORS.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  m.status === "confirmed"
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-slate-700 text-xs leading-relaxed">{m.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400">{m.time}</span>
                  {m.status === "incomplete" && (
                    <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      Info missing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtered insights */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" id="insights">
          <p className="font-semibold text-slate-800 text-sm mb-4">Filtered Insights</p>
          <div className="space-y-2">
            {FILTERED_INSIGHTS.map((insight) => (
              <div key={insight.label} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                <span
                  className={`mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    insight.relevance === "High"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {insight.relevance}
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-700">{insight.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{insight.detail}</p>
                </div>
                <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                  {insight.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
