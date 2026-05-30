/**
 * Action Tracker — localStorage-based
 * Tracks user-committed financial actions and follow-up status
 */

export type ActionStatus = "active" | "completed" | "abandoned";

export interface TrackedAction {
  id: string;
  createdAt: string;         // ISO
  description: string;       // e.g. "每月还 $1,100，11个月还清"
  advisorId: string;
  monthlyAmount: number;
  totalMonths: number;
  currentMonth: number;
  status: ActionStatus;
  milestones: Milestone[];
  followUps: FollowUp[];
}

export interface Milestone {
  month: number;
  label: string;             // e.g. "信用卡A清零"
  completed: boolean;
}

export interface FollowUp {
  id: string;
  question: string;
  dueAt: string;             // ISO — when to surface this
  answeredAt?: string;
  answer?: "yes" | "no";
  note?: string;
}

const STORAGE_KEY = "huddlex_actions";

function load(): TrackedAction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(actions: TrackedAction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

export function getActions(): TrackedAction[] {
  return load();
}

export function getActiveAction(): TrackedAction | null {
  return load().find((a) => a.status === "active") ?? null;
}

export function addAction(action: Omit<TrackedAction, "id" | "createdAt">): TrackedAction {
  const actions = load();
  const newAction: TrackedAction = {
    ...action,
    id: `action_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  save([newAction, ...actions]);
  return newAction;
}

export function updateAction(id: string, patch: Partial<TrackedAction>) {
  const actions = load().map((a) => (a.id === id ? { ...a, ...patch } : a));
  save(actions);
}

export function advanceMonth(id: string) {
  const actions = load().map((a) => {
    if (a.id !== id) return a;
    const nextMonth = a.currentMonth + 1;
    const milestones = a.milestones.map((m) =>
      m.month <= nextMonth ? { ...m, completed: true } : m
    );
    const status: ActionStatus =
      nextMonth >= a.totalMonths ? "completed" : "active";
    return { ...a, currentMonth: nextMonth, milestones, status };
  });
  save(actions);
}

export function answerFollowUp(
  actionId: string,
  followUpId: string,
  answer: "yes" | "no",
  note?: string
) {
  const actions = load().map((a) => {
    if (a.id !== actionId) return a;
    const followUps = a.followUps.map((f) =>
      f.id === followUpId
        ? { ...f, answer, note, answeredAt: new Date().toISOString() }
        : f
    );
    return { ...a, followUps };
  });
  save(actions);
}

/** Returns follow-ups that are due (past dueAt) and unanswered */
export function getDueFollowUps(): Array<{ action: TrackedAction; followUp: FollowUp }> {
  const now = new Date();
  const result: Array<{ action: TrackedAction; followUp: FollowUp }> = [];
  for (const action of load()) {
    for (const f of action.followUps) {
      if (!f.answeredAt && new Date(f.dueAt) <= now) {
        result.push({ action, followUp: f });
      }
    }
  }
  return result;
}
