"use client";

import { MessageSquare, Users, Mic } from "lucide-react";
import { chatMessages } from "@/lib/mock-data";
import GlowCard from "@/components/ui/GlowCard";

export default function ChatPreview() {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 px-1">Recent Activity</h2>

      <GlowCard className="p-4 max-h-48 overflow-y-auto space-y-3">
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-slate-100 text-slate-700 rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </GlowCard>
    </section>
  );
}

export function BottomNav() {
  const tabs = [
    { icon: Users, label: "Experts", active: false },
    { icon: MessageSquare, label: "Profile", active: false },
    { icon: Mic, label: "Voice", active: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/90 backdrop-blur border-t border-slate-200 px-6 py-3 flex justify-around z-50">
      {tabs.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          type="button"
          className={`flex flex-col items-center gap-1 text-xs font-medium ${
            active ? "text-blue-600" : "text-slate-400"
          }`}
        >
          <Icon className="w-5 h-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}
