"use client";

import { useState } from "react";
import Image from "next/image";
import { BookUser, UsersRound, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import ExpertsLibrary from "@/components/dashboard/ExpertsLibrary";
import UserInfoPanel from "@/components/dashboard/UserInfoPanel";
import TasksPanel from "@/components/dashboard/TasksPanel";
import ChatPanel from "@/components/dashboard/ChatPanel";
import { BottomNav } from "@/components/dashboard/ChatPreview";

type SidebarTab = "experts" | "user";

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("experts");

  return (
    <div className="h-screen bg-[#F4F6FA] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/HuddleX_logo_black.png"
              alt="HuddleX logo"
              width={36}
              height={36}
              className="shrink-0"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">HuddleX</h1>
              <p className="text-sm text-slate-500">Persistent Autonomous Voice Agent</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Always-on coworker active
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto p-4 lg:p-6 pb-20 lg:pb-6 flex gap-5">

        {/* ── Left Sidebar ── */}
        {sidebarCollapsed ? (
          /* Collapsed strip */
          <div className="hidden lg:flex flex-col items-center gap-3 w-14 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("experts"); setSidebarCollapsed(false); }}
              title="Experts"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200"
            >
              <UsersRound className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("user"); setSidebarCollapsed(false); }}
              title="User Info"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200"
            >
              <BookUser className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Expanded sidebar */
          <aside className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center border-b border-slate-100 px-3 pt-3 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("experts")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  activeTab === "experts"
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <UsersRound className="w-4 h-4" />
                Experts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("user")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  activeTab === "user"
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <BookUser className="w-4 h-4" />
                User Info
              </button>

              {/* Collapse button pushed to right */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                title="Collapse sidebar"
                className="ml-auto w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 mb-1"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {activeTab === "experts" ? (
                <ExpertsLibrary onCollapse={undefined} />
              ) : (
                <UserInfoPanel onCollapse={undefined} />
              )}
            </div>
          </aside>
        )}

        {/* ── Main: unified chat panel ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <TasksPanel />
          <ChatPanel />
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
