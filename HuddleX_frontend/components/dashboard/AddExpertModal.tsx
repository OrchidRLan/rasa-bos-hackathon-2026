"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Sparkles,
  AtSign,
  Link2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  User,
} from "lucide-react";
import { addExpert } from "@/lib/api";
import type { Expert } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = "input" | "distilling" | "done";

interface Phase {
  label: string;
  done: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toWikipediaUrl(name: string): string {
  if (!name.trim()) return "";
  const slug = name.trim().replace(/\s+/g, "_");
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InputField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  required,
  hint,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function PhaseRow({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 shrink-0 flex items-center justify-center">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : active ? (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-200" />
        )}
      </div>
      <span
        className={`text-sm ${
          done
            ? "text-emerald-600 line-through decoration-emerald-300"
            : active
            ? "text-blue-700 font-medium"
            : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AddExpertModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (expert: Expert) => void;
}) {
  const [step, setStep] = useState<Step>("input");
  const [name, setName] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [wikiUrl, setWikiUrl] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Expert | null>(null);

  // Track distillation phases for the progress screen
  // Timing mirrors the actual backend pipeline:
  //   Phase 1  (~3s)  : Wikipedia fetch
  //   Phase 1.5 (~10s) : 6 parallel LLM dimension research calls
  //   Phase 2-3 (~8s)  : LLM synthesis → cognitive framework JSON
  //   Phase 4  (~5s)  : Chroma embed + quality check + persist
  const [phases, setPhases] = useState<Phase[]>([
    { label: "Phase 1 — Fetching Wikipedia knowledge…", done: false },
    { label: "Phase 1.5 — Researching 6 thinking dimensions…", done: false },
    { label: "Phase 2-3 — Synthesizing cognitive framework…", done: false },
    { label: "Phase 4 — Quality check & embedding…", done: false },
  ]);
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Auto-fill Wikipedia when name changes (debounced)
  useEffect(() => {
    if (!wikiUrl || wikiUrl === toWikipediaUrl(name.slice(0, -1))) {
      setWikiUrl(toWikipediaUrl(name));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Keyboard: close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function advancePhases() {
    // Cosmetic timers that approximate real backend phase durations:
    //   Phase 1  done at  3s  (Wikipedia fetch)
    //   Phase 1.5 done at 13s  (6 parallel LLM calls, ~10s)
    //   Phase 2-3 done at 22s  (synthesis call, ~8s)
    //   Phase 4  done at 28s  (embed + persist, ~5s)
    const delays = [3000, 13000, 22000, 28000];
    delays.forEach((ms, i) => {
      const t = setTimeout(() => {
        setPhases((prev) =>
          prev.map((p, idx) => (idx <= i ? { ...p, done: true } : p))
        );
      }, ms);
      phaseTimers.current.push(t);
    });
  }

  function clearPhaseTimers() {
    phaseTimers.current.forEach(clearTimeout);
    phaseTimers.current = [];
  }

  async function handleDistill() {
    if (!name.trim()) {
      setError("Please enter the expert's name.");
      return;
    }
    setError("");
    setStep("distilling");
    setPhases((prev) => prev.map((p) => ({ ...p, done: false })));
    advancePhases();

    try {
      const expert = await addExpert({
        display_name: name.trim(),
        x_handle: xHandle.trim(),
        wikipedia_url: wikiUrl.trim(),
      });
      clearPhaseTimers();
      // Mark all phases done
      setPhases((prev) => prev.map((p) => ({ ...p, done: true })));
      setResult(expert);
      setTimeout(() => setStep("done"), 400);
    } catch (e: unknown) {
      clearPhaseTimers();
      setStep("input");
      setError(e instanceof Error ? e.message : "Distillation failed. Please try again.");
    }
  }

  function handleStartConversation() {
    if (result) {
      onAdded(result);
      onClose();
    }
  }

  const activePhaseIndex = phases.findIndex((p) => !p.done);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Distill an Expert</h2>
              <p className="text-xs text-slate-400">女娲蒸馏 · synthesize a new mindset</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── Step 1: Input ──────────────────────────────────────────────── */}
          {step === "input" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Enter the name of the person you want to add to your expert team. We'll fetch their
                Wikipedia profile and distill their thinking frameworks.
              </p>

              <InputField
                label="Expert Name"
                icon={User}
                value={name}
                onChange={setName}
                placeholder="e.g. Richard Feynman"
                required
              />

              <InputField
                label="X (Twitter) Handle"
                icon={AtSign}
                value={xHandle}
                onChange={setXHandle}
                placeholder="@handle (optional)"
                hint="Used to fetch recent posts and speaking style."
              />

              <InputField
                label="Wikipedia URL"
                icon={Link2}
                value={wikiUrl}
                onChange={setWikiUrl}
                placeholder="https://en.wikipedia.org/wiki/…"
                hint="Auto-suggested from the name — edit if needed."
              />

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleDistill}
                disabled={!name.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Start Distillation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Distilling ─────────────────────────────────────────── */}
          {step === "distilling" && (
            <div className="space-y-6">
              {/* Animated expert avatar preview */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold animate-pulse">
                    {getInitials(name) || "?"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-white flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-400">Distillation in progress…</p>
                </div>
              </div>

              {/* Phase tracker */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                {phases.map((phase, i) => (
                  <PhaseRow
                    key={phase.label}
                    label={phase.label}
                    done={phase.done}
                    active={i === activePhaseIndex}
                  />
                ))}
              </div>

              <p className="text-xs text-center text-slate-400">
                Runs 6 parallel research agents + LLM synthesis. Typically 30–45s.
              </p>
            </div>
          )}

          {/* ── Step 3: Done ───────────────────────────────────────────────── */}
          {step === "done" && result && (
            <div className="space-y-4">
              {/* Expert card */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${result.avatar_color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}
                  >
                    {result.initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{result.display_name}</h3>
                    {result.subtitle && (
                      <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                    )}
                    {(result.x_handle || result.x_source) && (
                      <p className="text-xs text-slate-400 truncate">{result.x_handle || result.x_source}</p>
                    )}
                  </div>
                </div>
                {result.briefing && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {result.briefing}
                  </p>
                )}
              </div>

              {/* Distillation process summary */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Distillation Process
                </p>
                {phases.map((phase) => (
                  <div key={phase.label} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs text-slate-600">{phase.label.replace(/…$/, "")}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 pt-1 border-t border-slate-200 mt-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-700 font-medium">
                    Knowledge embedded into vector database — ready to chat
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleStartConversation}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Start Conversation
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
