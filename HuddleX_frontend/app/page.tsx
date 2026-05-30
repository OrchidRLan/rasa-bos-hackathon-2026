"use client";

import { useState } from "react";
import type { ElementType } from "react";
import { BookUser, UsersRound } from "lucide-react";
import ExpertsLibrary from "@/components/dashboard/ExpertsLibrary";
import VoiceCenter from "@/components/dashboard/VoiceCenter";
import UserInfoPanel from "@/components/dashboard/UserInfoPanel";
import TasksPanel from "@/components/dashboard/TasksPanel";
import ChatPreview, { BottomNav } from "@/components/dashboard/ChatPreview";

function CollapsedLibraryButton({
  side,
  label,
  icon: Icon,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  icon: ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${label}`}
      title={label}
      className={`h-full min-h-[92px] w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm flex lg:flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/40 transition-colors ${
        side === "right" ? "lg:order-last" : ""
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden lg:block text-[11px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">
        {label}
      </span>
      <span className="lg:hidden text-xs font-semibold uppercase tracking-widest">{label}</span>
    </button>
  );
}

export default function HomePage() {
  const [expertsCollapsed, setExpertsCollapsed] = useState(false);
  const [userInfoCollapsed, setUserInfoCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex flex-col">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">HuddleX</h1>
            <p className="text-sm text-slate-500">Persistent Autonomous Voice Agent</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Always-on coworker active
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 lg:p-6 pb-24 lg:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-[calc(100vh-120px)]">
          <aside className={`${expertsCollapsed ? "lg:col-span-1" : "lg:col-span-4"} min-h-[84px] lg:min-h-0`}>
            {expertsCollapsed ? (
              <CollapsedLibraryButton
                side="left"
                label="Experts"
                icon={UsersRound}
                onClick={() => setExpertsCollapsed(false)}
              />
            ) : (
              <ExpertsLibrary onCollapse={() => setExpertsCollapsed(true)} />
            )}
          </aside>

          <div className="lg:col-span-3 min-h-[200px] lg:min-h-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5 lg:p-6">
            <VoiceCenter onExpertClick={() => setExpertsCollapsed(false)} />
          </div>

          <aside className={`${expertsCollapsed ? "lg:col-span-8" : "lg:col-span-5"} min-h-0 flex flex-col`}>
            <div className={`${userInfoCollapsed ? "flex justify-end mb-5" : ""}`}>
              {!userInfoCollapsed && (
                <UserInfoPanel onCollapse={() => setUserInfoCollapsed(true)} />
              )}
              {userInfoCollapsed && (
                <div className="w-full lg:w-[72px]">
                  <CollapsedLibraryButton
                    side="right"
                    label="User Info"
                    icon={BookUser}
                    onClick={() => setUserInfoCollapsed(false)}
                  />
                </div>
              )}
            </div>
            <TasksPanel />
            <ChatPreview />
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
