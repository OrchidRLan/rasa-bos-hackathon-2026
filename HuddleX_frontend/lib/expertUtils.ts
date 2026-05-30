// Helpers for rendering expert avatars.
// getAvatarGradient returns a CSS gradient string (used in inline `style`),
// converting a persona's Tailwind `avatar_color` (e.g. "from-slate-700 to-slate-900")
// into real colors, with a deterministic hue fallback for custom/unknown experts.

import type { Expert } from "@/lib/types";

// Tailwind palette subset — the shades used by seeded personas plus a few common
// ones for custom experts. Unknown tokens fall back to the hashed gradient.
const TW: Record<string, string> = {
  "slate-600": "#475569", "slate-700": "#334155", "slate-800": "#1e293b", "slate-900": "#0f172a",
  "blue-600": "#2563eb", "blue-700": "#1d4ed8", "blue-800": "#1e40af", "blue-900": "#1e3a8a",
  "orange-600": "#ea580c", "red-700": "#b91c1c",
  "violet-700": "#6d28d9", "purple-900": "#581c87",
  "green-700": "#15803d", "emerald-900": "#064e3b",
  "rose-600": "#e11d48", "pink-900": "#831843",
  "indigo-600": "#4f46e5", "indigo-900": "#312e81",
  "amber-600": "#d97706", "teal-700": "#0f766e", "cyan-700": "#0e7490",
};

type ExpertLike = Partial<Pick<Expert, "id" | "avatar_color" | "initials" | "display_name">>;

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function getAvatarGradient(expert: ExpertLike | null | undefined): string {
  const raw = expert?.avatar_color ?? "";
  const from = raw.match(/from-([a-z]+-\d{2,3})/)?.[1];
  const to = raw.match(/to-([a-z]+-\d{2,3})/)?.[1];
  const c1 = from ? TW[from] : undefined;
  const c2 = to ? TW[to] : undefined;
  if (c1 && c2) return `linear-gradient(135deg, ${c1}, ${c2})`;

  // Deterministic fallback from a stable key.
  const hue = hashHue(expert?.id || expert?.display_name || "expert");
  return `linear-gradient(135deg, hsl(${hue} 60% 45%), hsl(${(hue + 40) % 360} 65% 30%))`;
}

// Derive initials from a raw name string (e.g. for a not-yet-created expert).
export function makeInitials(name: string): string {
  const fromName = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return fromName || "AI";
}

export function getInitials(expert: ExpertLike | null | undefined): string {
  if (expert?.initials) return expert.initials;
  return makeInitials(expert?.display_name ?? "");
}
