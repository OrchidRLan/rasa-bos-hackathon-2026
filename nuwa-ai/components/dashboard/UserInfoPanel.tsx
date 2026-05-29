"use client";

import { Shield } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { userProfile } from "@/lib/mock-data";
import {
  AtSign,
  Link2,
  Clock,
  Code2,
  CreditCard,
} from "lucide-react";

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

export default function UserInfoPanel() {
  return (
    <section className="flex flex-col h-full min-h-0">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 px-1">
        User Info Library
      </h2>

      <GlowCard className="p-5 mb-4">
        <div className="flex flex-col items-center text-center mb-4 pb-4 border-b border-slate-100">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white text-xl font-semibold mb-3">
            {userProfile.initials}
          </div>
          <h3 className="font-semibold text-slate-900">{userProfile.name}</h3>
          <p className="text-sm text-slate-500">{userProfile.subtitle}</p>
        </div>

        <MetaRow icon={AtSign} label="X Source" value={userProfile.xSource} />
        <MetaRow icon={Link2} label="Wikipedia" value={userProfile.wikipedia} />
        <MetaRow
          icon={CreditCard}
          label="Financial Account"
          value={userProfile.financialAccount}
        />
        <MetaRow icon={Clock} label="Last Updated" value={userProfile.lastUpdated} />
        <MetaRow icon={Code2} label="System Prompt" value="••••••••••••••••" />
      </GlowCard>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-slate-700 leading-relaxed">
            你的個人記憶與偏好會幫助 AI 提供更專業、更貼近你的建議。
          </p>
          <button type="button" className="text-sm text-blue-600 font-medium mt-2 hover:underline">
            Learn more
          </button>
        </div>
      </div>
    </section>
  );
}
