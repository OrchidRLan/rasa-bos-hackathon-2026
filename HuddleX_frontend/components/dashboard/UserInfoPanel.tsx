"use client";

import { useEffect, useState } from "react";
import { Shield, Loader2, PanelRightClose } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { AtSign, Link2, Clock, Code2, CreditCard } from "lucide-react";
import { getUser } from "@/lib/api";
import { useApp } from "@/lib/context";
import type { UserProfile } from "@/lib/types";

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

export default function UserInfoPanel({ onCollapse }: { onCollapse?: () => void }) {
  const { sessionId } = useApp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId === "ssr-session") return;
    getUser(sessionId)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  const ctx = profile?.user_context;
  const initials = ctx?.name
    ? ctx.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold text-slate-900">User Info Library</h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse User Info Library"
          title="Collapse User Info Library"
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : (
        <>
          <GlowCard className="p-5 mb-4">
            <div className="flex flex-col items-center text-center mb-4 pb-4 border-b border-slate-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white text-xl font-semibold mb-3">
                {initials}
              </div>
              <h3 className="font-semibold text-slate-900">{ctx?.name || "Anonymous"}</h3>
              <p className="text-sm text-slate-500">{ctx?.role || "—"}</p>
            </div>

            <MetaRow icon={AtSign}      label="Interests"         value={ctx?.interests?.join(", ") || "—"} />
            <MetaRow icon={Link2}       label="Background"        value={ctx?.raw_description?.slice(0, 60) || "—"} />
            <MetaRow icon={CreditCard}  label="Threads"           value={String(profile?.threads?.length ?? 0)} />
            <MetaRow icon={Clock}       label="Last Updated"      value={ctx?.updated_at?.slice(0, 10) || "—"} />
            <MetaRow icon={Code2}       label="Global Summary"    value="••••••••••••••••" />
          </GlowCard>

          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700 leading-relaxed">
                你的個人記憶與偏好會幫助 AI 提供更專業、更貼近你的建議。
              </p>
              <button
                type="button"
                className="text-sm text-blue-600 font-medium mt-2 hover:underline"
              >
                Learn more
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
