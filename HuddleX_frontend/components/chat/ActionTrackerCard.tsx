"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import {
  answerFollowUp,
  advanceMonth,
  type TrackedAction,
  type FollowUp,
} from "@/lib/actionTracker";

interface Props {
  action: TrackedAction;
  onUpdate: () => void;
}

function FollowUpBanner({ action, followUp, onAnswer }: {
  action: TrackedAction;
  followUp: FollowUp;
  onAnswer: () => void;
}) {
  function handle(answer: "yes" | "no") {
    answerFollowUp(action.id, followUp.id, answer);
    onAnswer();
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Agent 追问</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{followUp.question}</p>
      <div className="flex gap-2">
        <button
          onClick={() => handle("yes")}
          className="flex-1 bg-emerald-500 text-white text-sm font-semibold py-2 rounded-xl hover:bg-emerald-400 transition-colors"
        >
          ✅ 做了
        </button>
        <button
          onClick={() => handle("no")}
          className="flex-1 bg-slate-100 text-slate-700 text-sm font-semibold py-2 rounded-xl hover:bg-slate-200 transition-colors"
        >
          ❌ 没做
        </button>
      </div>
    </div>
  );
}

export default function ActionTrackerCard({ action, onUpdate }: Props) {
  const [localAction, setLocalAction] = useState(action);

  const pct = Math.round((localAction.currentMonth / localAction.totalMonths) * 100);

  const dueFollowUp = localAction.followUps.find(
    (f) => !f.answeredAt && new Date(f.dueAt) <= new Date()
  );

  function handleFollowUpAnswer() {
    // Reload from storage
    onUpdate();
  }

  function handleAdvance() {
    advanceMonth(localAction.id);
    setLocalAction((prev) => ({
      ...prev,
      currentMonth: prev.currentMonth + 1,
      milestones: prev.milestones.map((m) =>
        m.month <= prev.currentMonth + 1 ? { ...m, completed: true } : m
      ),
    }));
    onUpdate();
  }

  return (
    <div className="space-y-3">
      {/* Due follow-up banner */}
      {dueFollowUp && (
        <FollowUpBanner
          action={localAction}
          followUp={dueFollowUp}
          onAnswer={handleFollowUpAnswer}
        />
      )}

      {/* Main tracker card */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Action 追踪中</span>
          </div>
          <span className="text-xs text-slate-400">
            第 {localAction.currentMonth} / {localAction.totalMonths} 个月
          </span>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">{localAction.description}</p>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{pct}% 完成</span>
            <span>还需 {localAction.totalMonths - localAction.currentMonth} 个月</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-2">
          {localAction.milestones.map((m) => (
            <div key={m.month} className="flex items-center gap-3">
              {m.completed ? (
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={14} className="text-slate-300 shrink-0" />
              )}
              <span className={`text-xs ${m.completed ? "text-slate-700 line-through" : "text-slate-500"}`}>
                第{m.month}个月：{m.label}
              </span>
            </div>
          ))}
        </div>

        {/* Advance button (demo) */}
        {localAction.status === "active" && (
          <button
            onClick={handleAdvance}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline"
          >
            + 标记本月完成（演示用）
          </button>
        )}

        {localAction.status === "completed" && (
          <div className="text-center py-2 text-emerald-600 font-semibold text-sm">
            🎉 债务自由！
          </div>
        )}
      </div>
    </div>
  );
}
