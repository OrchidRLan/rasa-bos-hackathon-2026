"use client";

import { useStreamLines } from "@/hooks/useStreamLines";
import { getAdvisorStances, type AdvisorStance } from "@/lib/advisorPersonas";

const RISK_CONFIG = {
  low:    { label: "Low Risk",    dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  medium: { label: "Medium Risk", dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  high:   { label: "High Risk",   dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
};

function AdvisorCard({
  stance,
  visible,
  onSelect,
  selected,
}: {
  stance: AdvisorStance;
  visible: boolean;
  onSelect: (s: AdvisorStance) => void;
  selected: boolean;
}) {
  const risk = RISK_CONFIG[stance.risk];
  return (
    <div
      className={`flex-1 min-w-[160px] rounded-2xl border transition-all duration-300 p-4 flex flex-col gap-3 cursor-pointer
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        ${selected
          ? "border-slate-900 bg-slate-900 text-white shadow-lg"
          : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm"
        }`}
      onClick={() => onSelect(stance)}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${stance.color}`}>
          {stance.initials}
        </span>
        <span className={`text-xs font-semibold truncate ${selected ? "text-white" : "text-slate-700"}`}>
          {stance.name}
        </span>
      </div>

      {/* Stance label */}
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full self-start ${
        selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
      }`}>
        {stance.label}
      </span>

      {/* Quote */}
      <p className={`text-xs leading-relaxed flex-1 ${selected ? "text-white/90" : "text-slate-500"}`}>
        &ldquo;{stance.quote}&rdquo;
      </p>

      {/* Allocation bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-medium">
          <span className={selected ? "text-white/70" : "text-slate-400"}>还债</span>
          <span className={selected ? "text-white/70" : "text-slate-400"}>投资</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
          {(() => {
            const total = stance.monthlyDebtPayment + stance.monthlyInvestment;
            const debtPct = total > 0 ? (stance.monthlyDebtPayment / total) * 100 : 100;
            return (
              <div className="h-full flex">
                <div className="bg-emerald-400 rounded-l-full" style={{ width: `${debtPct}%` }} />
                <div className="bg-blue-400 rounded-r-full flex-1" />
              </div>
            );
          })()}
        </div>
        <div className="flex justify-between text-[10px]">
          <span className={selected ? "text-white/80" : "text-slate-500"}>
            ${stance.monthlyDebtPayment}
          </span>
          <span className={selected ? "text-white/80" : "text-slate-500"}>
            ${stance.monthlyInvestment}
          </span>
        </div>
      </div>

      {/* Risk badge */}
      <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full self-start ${
        selected ? "bg-white/20 text-white" : `${risk.bg} ${risk.text}`
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white" : risk.dot}`} />
        {risk.label}
      </div>

      {/* Select button */}
      <button
        className={`text-xs font-semibold py-1.5 rounded-xl transition-colors ${
          selected
            ? "bg-white text-slate-900"
            : "bg-slate-900 text-white hover:bg-slate-700"
        }`}
        onClick={(e) => { e.stopPropagation(); onSelect(stance); }}
      >
        {selected ? "✓ 已选择" : "选这个"}
      </button>
    </div>
  );
}

interface Props {
  surplus: number;
  onSelect: (stance: AdvisorStance) => void;
  selectedId?: string;
  streaming?: boolean;
}

export default function AdvisorDivergenceCard({ surplus, onSelect, selectedId, streaming = true }: Props) {
  const stances = getAdvisorStances(surplus);
  const { visibleLines: visible } = useStreamLines(
    stances.map((s) => s.advisorId),
    180,
    streaming
  );

  const agreeCount = stances.filter((s) => s.label === stances[0].label).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">5 Advisors · 分歧对比</p>
        <span className="text-xs text-slate-400">{agreeCount}/5 agree on debt-first</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stances.map((stance, i) => (
          <AdvisorCard
            key={stance.advisorId}
            stance={stance}
            visible={i < visible.length}
            onSelect={onSelect}
            selected={selectedId === stance.advisorId}
          />
        ))}
      </div>
    </div>
  );
}
