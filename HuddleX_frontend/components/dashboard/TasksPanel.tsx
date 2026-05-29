"use client";

import { motion } from "framer-motion";
import GlowCard from "@/components/ui/GlowCard";
import { ongoingTasks } from "@/lib/mock-data";

export default function TasksPanel() {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 px-1">进行中的任务</h2>

      <div className="space-y-3">
        {ongoingTasks.map((task) => (
          <GlowCard key={task.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-slate-900 text-sm">{task.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{task.status}</p>
              </div>
              <span className="text-sm font-semibold text-blue-600">{task.progress}%</span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
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
