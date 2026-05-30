"use client";

import { useState } from "react";
import { Brain, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { getMetaRecommendation, type AdvisorStance, DEFAULT_PROFILE } from "@/lib/advisorPersonas";
import { addAction, type TrackedAction } from "@/lib/actionTracker";
import type { Debt } from "@/lib/debtCalculator";
import { simulateDebtPayoff } from "@/lib/debtCalculator";

interface Props {
  stances: AdvisorStance[];
  debts: Debt[];
  monthlySurplus: number;
  onCommit: (action: TrackedAction) => void;
}

export default function MetaAdvisorCard({ stances, debts, monthlySurplus, onCommit }: Props) {
  const [showIgnored, setShowIgnored] = useState(false);
  const [committed, setCommitted] = useState(false);

  const profile = { ...DEFAULT_PROFILE, monthlySurplus };
  const { best, ignored, suggestedAction, adoptedAdvisors } = getMetaRecommendation(stances, profile);

  const plan = simulateDebtPayoff(debts, best.monthlyDebtPayment || monthlySurplus, "snowball");

  function handleCommit() {
    const milestones = plan.events.map((e) => ({
      month: e.month,
      label: `${e.debtName}清零`,
      completed: false,
    }));
    if (plan.monthsToFreedom) {
      milestones.push({ month: plan.monthsToFreedom, label: "完全债务自由 🎉", completed: false });
    }

    // Follow-ups: one every 2 weeks for first 2 months
    const followUps = [
      {
        id: `fu_${Date.now()}_1`,
        question: "你上次决定每月还 $1,100，第一笔还款做了吗？",
        dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `fu_${Date.now()}_2`,
        question: "有没有取消不必要的订阅来增加还款余量？",
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const action = addAction({
      description: suggestedAction,
      advisorId: best.advisorId,
      monthlyAmount: best.monthlyDebtPayment || monthlySurplus,
      totalMonths: plan.monthsToFreedom ?? 12,
      currentMonth: 0,
      status: "active",
      milestones,
      followUps,
    });

    setCommitted(true);
    onCommit(action);
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={16} className="text-emerald-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Meta-Advisor</span>
        <span className="ml-auto text-xs text-white/40">基于你的画像综合分析</span>
      </div>

      {/* Adopted */}
      <div className="space-y-2">
        <p className="text-xs text-white/60 font-medium">采纳</p>
        <div className="flex flex-wrap gap-2">
          {adoptedAdvisors.map((s) => (
            <div key={s.advisorId} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span className="text-xs font-medium">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ignored toggle */}
      <button
        onClick={() => setShowIgnored(!showIgnored)}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        {showIgnored ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showIgnored ? "收起" : `查看被忽略的 ${ignored.length} 个建议`}
      </button>

      {showIgnored && (
        <div className="space-y-2">
          {ignored.map(({ stance, reason }) => (
            <div key={stance.advisorId} className="flex items-start gap-2 bg-white/5 rounded-xl px-3 py-2">
              <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium text-white/70">{stance.name}</span>
                <p className="text-xs text-white/40 mt-0.5">{reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommended action */}
      <div className="bg-white/10 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-emerald-400">✦ 推荐 Action</p>
        <p className="text-sm leading-relaxed text-white/90">{suggestedAction}</p>

        {plan.monthsToFreedom && (
          <div className="flex gap-4 text-xs text-white/60">
            <span>⏱ {plan.monthsToFreedom} 个月还清</span>
            <span>💰 利息支出 ${Math.round(plan.totalInterestPaid).toLocaleString()}</span>
          </div>
        )}

        {!committed ? (
          <button
            onClick={handleCommit}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Commit to this plan →
          </button>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 size={16} />
            已承诺，正在追踪进度…
          </div>
        )}
      </div>
    </div>
  );
}
