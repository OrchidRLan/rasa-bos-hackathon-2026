"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Pencil, Check, X, AtSign, Link2, Clock, Code2, CreditCard } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { getUser, updateUser } from "@/lib/api";
import { useApp } from "@/lib/context";
import type { UserProfile } from "@/lib/types";

interface EditState {
  name: string;
  role: string;
  interests: string;   // comma-separated
  background: string;
}

function initEdit(profile: UserProfile | null): EditState {
  const ctx = profile?.user_context;
  return {
    name: ctx?.name ?? "",
    role: ctx?.role ?? "",
    interests: ctx?.interests?.join(", ") ?? "",
    background: ctx?.raw_description ?? "",
  };
}

export default function UserInfoPanel({ onCollapse: _onCollapse }: { onCollapse?: () => void }) {
  const { sessionId } = useApp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EditState>(initEdit(null));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved avatar from localStorage
  useEffect(() => {
    if (sessionId === "ssr-session") return;
    const saved = localStorage.getItem(`huddlex_avatar_${sessionId}`);
    if (saved) setAvatarUrl(saved);
  }, [sessionId]);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      localStorage.setItem(`huddlex_avatar_${sessionId}`, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  useEffect(() => {
    if (sessionId === "ssr-session") return;
    getUser(sessionId)
      .then((p) => { setProfile(p); setDraft(initEdit(p)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  function startEdit() {
    setDraft(initEdit(profile));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(initEdit(profile));
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const updated = await updateUser(sessionId, {
        name: draft.name,
        role: draft.role,
        interests: draft.interests.split(",").map((s) => s.trim()).filter(Boolean),
        raw_description: draft.background,
      });
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      console.error("save failed", e);
    } finally {
      setSaving(false);
    }
  }

  const ctx = profile?.user_context;
  const initials = ctx?.name
    ? ctx.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="mb-4 px-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">User Info</h2>
        {!loading && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : (
        <GlowCard className="p-5">

          {/* Avatar + name/role */}
          <div className="flex flex-col items-center text-center mb-4 pb-4 border-b border-slate-100">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />

            {/* Clickable avatar */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full mb-3 group focus:outline-none"
              title="Upload profile photo"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white text-xl font-semibold">
                  {editing
                    ? (draft.name ? draft.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?")
                    : initials}
                </div>
              )}
              {/* Upload overlay on hover */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>

            {editing ? (
              <div className="w-full space-y-2">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full text-center text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <input
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  placeholder="Role / title"
                  className="w-full text-center text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900">{ctx?.name || "Anonymous"}</h3>
                <p className="text-sm text-slate-500">{ctx?.role || "—"}</p>
              </>
            )}
          </div>

          {/* Interests */}
          <div className="flex items-start gap-3 py-2.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
              <AtSign className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 mb-1">Interests</p>
              {editing ? (
                <input
                  value={draft.interests}
                  onChange={(e) => setDraft((d) => ({ ...d, interests: e.target.value }))}
                  placeholder="e.g. AI, startups, design"
                  className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              ) : (
                <p className="text-sm text-slate-800">{ctx?.interests?.join(", ") || "—"}</p>
              )}
            </div>
          </div>

          {/* Background */}
          <div className="flex items-start gap-3 py-2.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
              <Link2 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 mb-1">Background</p>
              {editing ? (
                <textarea
                  value={draft.background}
                  onChange={(e) => setDraft((d) => ({ ...d, background: e.target.value }))}
                  placeholder="Brief background or bio…"
                  rows={3}
                  className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              ) : (
                <p className="text-sm text-slate-800 break-words">{ctx?.raw_description?.slice(0, 80) || "—"}</p>
              )}
            </div>
          </div>

          {/* Read-only rows */}
          <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Threads</p>
              <p className="text-sm text-slate-800">{profile?.threads?.length ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Last Updated</p>
              <p className="text-sm text-slate-800">{ctx?.updated_at?.slice(0, 10) || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
              <Code2 className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Global Summary</p>
              <p className="text-sm text-slate-800">••••••••••••••••</p>
            </div>
          </div>

        </GlowCard>
      )}
    </section>
  );
}
