"use client";

import { useState } from "react";
import { Plus, Menu, Pencil, AtSign, Link2, Clock, Code2 } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { experts } from "@/lib/mock-data";

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ExpertsLibrary() {
  const [selectedId, setSelectedId] = useState(experts[0].id);

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Experts Library</h2>
        </div>
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {experts.map((expert) => {
          const selected = selectedId === expert.id;
          return (
            <GlowCard
              key={expert.id}
              className={`p-4 transition-all cursor-pointer ${
                selected
                  ? "ring-2 ring-blue-500/30 border-blue-200 shadow-md"
                  : "hover:border-slate-300"
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setSelectedId(expert.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${expert.avatarColor} flex items-center justify-center text-white text-sm font-semibold`}
                    >
                      {expert.initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{expert.name}</h3>
                      <p className="text-sm text-slate-500">{expert.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50">
                    <Pencil className="w-3 h-3" />
                    Edit
                  </span>
                </div>

                <MetaRow icon={AtSign} label="X Source" value={expert.xSource} />
                <MetaRow icon={Link2} label="Wikipedia" value={expert.wikipedia} />
                <MetaRow icon={Clock} label="Last Updated" value={expert.lastUpdated} />
                <MetaRow icon={Code2} label="System Prompt" value="••••••••••••••••" />
              </button>
            </GlowCard>
          );
        })}
      </div>
    </section>
  );
}
