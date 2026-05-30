"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, LayoutDashboard, Anchor, TrendingUp, List, Loader2 } from "lucide-react";
import { useApp } from "@/lib/context";
import { getExperts, getThreads } from "@/lib/api";
import type { Expert, Thread } from "@/lib/types";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { activePersona, setActivePersona } = useApp();

  const [experts, setExperts] = useState<Expert[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(true);

  // Load experts from backend
  useEffect(() => {
    getExperts()
      .then((data) => {
        setExperts(data);
        // Auto-select first if none selected
        if (data.length > 0 && !activePersona) {
          setActivePersona(data[0]);
        }
      })
      .finally(() => setLoadingExperts(false));
  }, []);

  // Load thread history
  useEffect(() => {
    getThreads().then(setThreads);
  }, []);

  function handleSelectAdvisor(expert: Expert) {
    setActivePersona(expert);
  }

  // Fallback initials from display_name or name
  function getInitials(e: Expert) {
    const name = e.display_name ?? e.name ?? "";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full bg-white border-r border-slate-200 overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-900 text-lg tracking-tight">HuddleX</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Your private financial advisor</p>
      </div>

      {/* Nav */}
      <nav className="px-3 py-3 flex flex-col gap-1">
        <Link
          href="/chat"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/chat") ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <MessageCircle size={16} />
          Chat
        </Link>
        <Link
          href="/overview"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/overview") ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <LayoutDashboard size={16} />
          Overview
        </Link>
      </nav>

      {/* Recent Chats — from backend threads */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Chats</p>
        <div className="flex flex-col gap-0.5">
          {threads.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-1">No conversations yet</p>
          ) : (
            threads.slice(0, 6).map((t) => (
              <Link
                key={t.thread_id}
                href={`/chat?thread=${t.thread_id}`}
                className="flex flex-col px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <span className="text-sm text-slate-700 truncate group-hover:text-slate-900">
                  {t.title || `Thread ${t.thread_id.slice(-6)}`}
                </span>
                <span className="text-xs text-slate-400">{relativeTime(t.last_active)}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Navigate */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Navigate</p>
        <div className="flex flex-col gap-0.5">
          {[
            { icon: Anchor, label: "Memory anchors", href: "/overview#memory" },
            { icon: TrendingUp, label: "Filtered insights", href: "/overview#insights" },
            { icon: List, label: "Action plan", href: "/overview#actions" },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Advisor Style — from backend */}
      <div className="px-4 pt-4 pb-4 mt-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Advisor Style</p>

        {loadingExperts ? (
          <div className="flex items-center gap-2 px-2 py-2 text-xs text-slate-400">
            <Loader2 size={12} className="animate-spin" /> Loading advisors...
          </div>
        ) : experts.length === 0 ? (
          <p className="text-xs text-slate-400 px-2 py-1">Backend offline — no advisors loaded</p>
        ) : (
          <div className="flex flex-col gap-1">
            {experts.map((expert) => {
              const isActive = activePersona?.id === expert.id;
              return (
                <button
                  key={expert.id}
                  onClick={() => handleSelectAdvisor(expert)}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left w-full ${
                    isActive ? "bg-slate-50 text-slate-900 font-medium" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white ${
                    isActive ? "bg-emerald-500" : "bg-slate-300"
                  }`}>
                    {getInitials(expert)}
                  </span>
                  <span className="truncate">{expert.display_name ?? expert.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
