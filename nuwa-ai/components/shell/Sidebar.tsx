"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, LayoutDashboard, Anchor, TrendingUp, List } from "lucide-react";

const ADVISORS = [
  { id: "dave-ramsey", name: "Dave Ramsey", subtitle: "The Disciplinarian", initials: "DR", color: "bg-emerald-500" },
  { id: "warren-buffett", name: "Warren Buffett", subtitle: "The Value Investor", initials: "WB", color: "bg-blue-500" },
  { id: "elon-musk", name: "Elon Musk", subtitle: "The Disruptor", initials: "EM", color: "bg-slate-500" },
  { id: "mr-money-mustache", name: "Mr. Money Mustache", subtitle: "The Minimalist", initials: "MM", color: "bg-amber-500" },
];

const RECENT_CHATS = [
  { id: "1", title: "Debt vs invest dilemma", time: "2m ago" },
  { id: "2", title: "Should I buy a car now?", time: "1h ago" },
  { id: "3", title: "Cut subscriptions or not", time: "3h ago" },
  { id: "4", title: "Monthly budget review", time: "Yesterday" },
  { id: "5", title: "Tech stocks — worth the r...", time: "Yesterday" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full bg-white border-r border-slate-200 overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-900 text-lg tracking-tight">Centric</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Your private financial advisor</p>
      </div>

      {/* Nav */}
      <nav className="px-3 py-3 flex flex-col gap-1">
        <Link
          href="/chat"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/chat")
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <MessageCircle size={16} />
          Chat
        </Link>
        <Link
          href="/overview"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/overview")
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <LayoutDashboard size={16} />
          Overview
        </Link>
      </nav>

      {/* Recent Chats */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Chats</p>
        <div className="flex flex-col gap-0.5">
          {RECENT_CHATS.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat?id=${chat.id}`}
              className="flex flex-col px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <span className="text-sm text-slate-700 truncate group-hover:text-slate-900">{chat.title}</span>
              <span className="text-xs text-slate-400">{chat.time}</span>
            </Link>
          ))}
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

      {/* Advisor Style */}
      <div className="px-4 pt-4 pb-4 mt-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Advisor Style</p>
        <div className="flex flex-col gap-1">
          {ADVISORS.map((advisor) => (
            <button
              key={advisor.id}
              className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left w-full ${
                advisor.id === "dave-ramsey"
                  ? "bg-slate-50 text-slate-900 font-medium"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${advisor.id === "dave-ramsey" ? "bg-emerald-500" : "bg-slate-300"}`} />
              {advisor.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
