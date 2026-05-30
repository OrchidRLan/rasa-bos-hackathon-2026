"use client";

import { useStreamLines } from "@/hooks/useStreamLines";
import {
  simulateDebtPayoff,
  simulateSplitStrategy,
  fmt,
  formatMonth,
  type Debt,
} from "@/lib/debtCalculator";
import { CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

interface Props {
  debts: Debt[];
  monthlySurplus: number;
  streaming?: boolean;
}

function buildRamseyLines(debts: Debt[], surplus: number): string[] {
  const plan = simulateDebtPayoff(debts, surplus, "snowball");

  const lines: string[] = [
    `如果你每月还 ${fmt(surplus)}（Ramsey Snowball）：`,
    "├──────────────────────────────────",
  ];

  plan.events.forEach((e, i) => {
    const isLast = i === plan.events.length - 1 && plan.monthsToFreedom !== null;
    const prefix = isLast ? "├──" : "├──";
    lines.push(`${prefix} ${formatMonth(e.month)}：${e.debtName} 清零 ✓`);
  });

  if (plan.monthsToFreedom) {
    lines.push(`├── ${formatMonth(plan.monthsToFreedom)}：完全债务自由 🎉`);
    lines.push(`└── ${formatMonth(plan.monthsToFreedom + 1)} 起：${fmt(surplus)} 全部变投资`);
  }

  lines.push(`    利息总支出：${fmt(plan.totalInterestPaid)}`);
  return lines;
}

function buildSplitLines(debts: Debt[], surplus: number): string[] {
  // Musk: 36% debt repayment, 64% invest  (roughly $400 debt / $700 invest from the example)
  const debtPortion = Math.round(surplus * 0.36);
  const investPortion = surplus - debtPortion;
  const plan = simulateSplitStrategy(debts, surplus, 0.36, 0.08);

  const compareMonth = 11;
  const debtAtCompare = plan.monthlySnapshots[compareMonth - 1] ?? 0;
  const investAtCompare = plan.investmentBalance;

  // For comparison: what would debt-only net worth be at same month?
  const ramseyPlan = simulateDebtPayoff(debts, surplus, "snowball");
  const ramseyDebtAtSameMonth = ramseyPlan.monthlySnapshots[compareMonth - 1] ?? 0;
  const ramseyNet = -ramseyDebtAtSameMonth;
  const splitNet = investAtCompare - debtAtCompare;
  const diff = splitNet - ramseyNet;

  const lines: string[] = [
    `如果分拆（${fmt(debtPortion)} 还债 + ${fmt(investPortion)} 投资，年化8%）：`,
    "├──────────────────────────────────",
    `├── ${formatMonth(compareMonth)} 债务还剩 ${fmt(debtAtCompare)}`,
    `├── 投资账户已有 ${fmt(investAtCompare)}（含复利）`,
    `├── 净值差异 vs 全力还债：${diff >= 0 ? "+" : ""}${fmt(diff)}`,
    `└── ⚠️  若市场下跌20%：投资账户缩水 ${fmt(investAtCompare * 0.2)}`,
    `    但债务利息仍在计。`,
  ];

  return lines;
}

/** Single tree-line row with connector styling */
function TreeLine({ text, index, visible }: { text: string; index: number; visible: boolean }) {
  const isHeader = index === 0;
  const isDivider = text.includes("──────");
  const isPaidOff = text.includes("✓");
  const isFree = text.includes("🎉");
  const isWarning = text.includes("⚠️");
  const isInvestment = text.includes("投资账户");

  return (
    <div
      className={`font-mono text-sm leading-6 transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      } ${isHeader ? "text-slate-700 font-semibold mt-1" : ""}
      ${isDivider ? "text-slate-300" : ""}
      ${isPaidOff ? "text-emerald-600" : ""}
      ${isFree ? "text-emerald-700 font-semibold" : ""}
      ${isWarning ? "text-amber-600" : ""}
      ${isInvestment ? "text-blue-600" : ""}
      ${!isHeader && !isDivider && !isPaidOff && !isFree && !isWarning && !isInvestment ? "text-slate-600" : ""}
      `}
    >
      {text}
    </div>
  );
}

export default function DebtPlanCard({ debts, monthlySurplus, streaming = true }: Props) {
  const ramseyLines = buildRamseyLines(debts, monthlySurplus);
  const splitLines = buildSplitLines(debts, monthlySurplus);

  const { visibleLines: ramseyVisible, done: ramseyDone } = useStreamLines(
    ramseyLines,
    110,
    streaming
  );
  const { visibleLines: splitVisible } = useStreamLines(
    splitLines,
    110,
    streaming && ramseyDone
  );

  return (
    <div className="space-y-4 mt-2">
      {/* Ramsey block */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={15} className="text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Ramsey 计划
          </span>
        </div>
        <div className="space-y-0.5">
          {ramseyLines.map((line, i) => (
            <TreeLine key={i} text={line} index={i} visible={i < ramseyVisible.length} />
          ))}
        </div>
      </div>

      {/* Split block — only starts appearing after ramsey is done */}
      {(ramseyDone || !streaming) && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              分拆策略（Musk 风格）
            </span>
          </div>
          <div className="space-y-0.5">
            {splitLines.map((line, i) => (
              <TreeLine key={i} text={line} index={i} visible={i < splitVisible.length} />
            ))}
          </div>
        </div>
      )}

      {/* Verdict */}
      {splitVisible.length === splitLines.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Dave Ramsey 建议：</strong>先消灭所有债务再投资。
            分拆策略账面净值更高，但信用卡利率（~24%）通常跑赢任何稳健投资，
            且债务带来心理压力——行为风险往往大于数学优势。
          </p>
        </div>
      )}
    </div>
  );
}
