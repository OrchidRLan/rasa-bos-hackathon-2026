"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GlowCard from "@/components/ui/GlowCard";
import { getThreads } from "@/lib/api";
import type { Thread } from "@/lib/types";

function threadProgress(t: Thread): number {
  // Simple heuristic: cap at 95%, grow with message count
  return Math.min(95, Math.floor((t.message_count / 20) * 100));
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TasksPanel() {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    getThreads().then(setThreads).catch(console.error);
    const id = setInterval(() => {
      getThreads().then(setThreads).catch(console.error);
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  if (threads.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 px-1">进行中的任务</h2>

      <div className="space-y-3">
        {threads.slice(0, 4).map((t) => (
          <GlowCard key={t.thread_id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-slate-900 text-sm">
                  {t.title || `Thread ${t.thread_id.slice(-6)}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.personas_involved.join(", ") || "No experts yet"} ·{" "}
                  {relativeTime(t.last_active)}
                </p>
              </div>
              <span className="text-sm font-semibold text-blue-600">
                {t.message_count} msgs
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${threadProgress(t)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
              />
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}
