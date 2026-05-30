"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Users, Mic } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { useApp } from "@/lib/context";

export default function ChatPreview() {
  const { latestMessages, activePersona } = useApp();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestMessages]);

  return (
    <section className="mt-6 flex flex-col flex-1 min-h-0">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 px-1 shrink-0">Recent Activity</h2>

      <GlowCard className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
        {latestMessages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Start chatting to see messages here.
          </p>
        ) : (
          latestMessages.map((msg) => {
            if (msg.role === "system_event") return null;
            const isUser = msg.role === "user";
            const label = isUser ? "You" : (msg.persona_id ?? activePersona?.display_name ?? "Expert");
            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <span className="text-xs text-slate-400 mb-1 px-1">{label}</span>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-700 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
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
