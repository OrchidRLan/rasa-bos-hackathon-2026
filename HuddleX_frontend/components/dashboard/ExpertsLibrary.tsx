"use client";

import { useEffect, useState } from "react";
import {
	Plus,
	Pencil,
	Check,
	X,
	Trash2,
	AtSign,
	Link2,
	Clock,
	Code2,
	Loader2,
} from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import AddExpertModal from "@/components/dashboard/AddExpertModal";
import { getExperts, switchPersona } from "@/lib/api";
import { useApp } from "@/lib/context";
import type { Expert } from "@/lib/types";

const STORAGE_KEY = "huddlex_expert_overrides";
const CUSTOM_KEY = "huddlex_custom_experts";
const HIDDEN_KEY = "huddlex_hidden_experts";

function loadHidden(): Set<string> {
	try {
		return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"));
	} catch {
		return new Set();
	}
}
function hideExpert(id: string) {
	const s = loadHidden();
	s.add(id);
	localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s]));
}

function loadCustomExperts(): Expert[] {
	try {
		return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]");
	} catch {
		return [];
	}
}

function saveCustomExperts(list: Expert[]) {
	localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

function loadOverrides(): Record<string, Partial<Expert>> {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
	} catch {
		return {};
	}
}

function saveOverride(id: string, patch: Partial<Expert>) {
	const all = loadOverrides();
	all[id] = { ...all[id], ...patch };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function applyOverrides(experts: Expert[]): Expert[] {
	const overrides = loadOverrides();
	return experts.map((e) => ({ ...e, ...overrides[e.id] }));
}

interface EditDraft {
	display_name: string;
	x_source: string;
	wikipedia: string;
}

export default function ExpertsLibrary({
	onCollapse: _onCollapse,
}: {
	onCollapse?: () => void;
}) {
	const { sessionId, activePersona, setActivePersona } = useApp();
	const [experts, setExperts] = useState<Expert[]>([]);
	const [loading, setLoading] = useState(true);
	const [switching, setSwitching] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState<EditDraft>({
		display_name: "",
		x_source: "",
		wikipedia: "",
	});
	const [showModal, setShowModal] = useState(false);

	function loadExperts() {
		return getExperts()
			.then((data) => {
				const hidden = loadHidden();
				const merged = [
					...applyOverrides(data),
					...loadCustomExperts(),
				].filter((e) => !hidden.has(e.id));
				setExperts(merged);
				if (merged.length > 0 && !activePersona) {
					const def =
						merged.find((e) => e.id === "elon_musk") ??
						merged.find(
							(e) => e.display_name.toLowerCase() === "elon musk",
						) ??
						merged[0];
					setActivePersona(def);
				}
			})
			.catch(console.error);
	}

	useEffect(() => {
		loadExperts().finally(() => setLoading(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function handleExpertAdded(expert: Expert) {
		setExperts((prev: Expert[]) => [...prev, expert]);
		try {
			await switchPersona(sessionId, expert.id);
		} catch (e) {
			console.error("switchPersona failed after distillation", e);
		}
		setActivePersona(expert);
	}

	async function handleSelect(expert: Expert) {
		if (expert.id === activePersona?.id || editingId === expert.id) return;
		setSwitching(expert.id);
		try {
			await switchPersona(sessionId, expert.id);
			setActivePersona(expert);
		} catch (e) {
			console.error("switch failed", e);
		} finally {
			setSwitching(null);
		}
	}

	function startEdit(e: React.MouseEvent, expert: Expert) {
		e.stopPropagation();
		setEditingId(expert.id);
		setDraft({
			display_name: expert.display_name,
			x_source: expert.x_source,
			wikipedia: expert.wikipedia,
		});
	}

	function cancelEdit(e: React.MouseEvent) {
		e.stopPropagation();
		setEditingId(null);
	}

	function handleDelete(e: React.MouseEvent, expertId: string) {
		e.stopPropagation();
		if (!confirm("Remove this expert?")) return;
		// For custom experts remove from storage; for seeded ones, hide
		if (expertId.startsWith("custom_")) {
			const updated = loadCustomExperts().filter(
				(ex) => ex.id !== expertId,
			);
			saveCustomExperts(updated);
		} else {
			hideExpert(expertId);
		}
		const remaining = experts.filter((ex) => ex.id !== expertId);
		setExperts(remaining);
		if (activePersona?.id === expertId) {
			setActivePersona(remaining[0] ?? (null as never));
		}
	}

	function saveEdit(e: React.MouseEvent, expertId: string) {
		e.stopPropagation();
		saveOverride(expertId, draft);
		setExperts((prev) =>
			prev.map((ex) => (ex.id === expertId ? { ...ex, ...draft } : ex)),
		);
		// update activePersona if it's the one being edited
		if (activePersona?.id === expertId) {
			setActivePersona({ ...activePersona, ...draft });
		}
		setEditingId(null);
	}

	return (
		<>
			{showModal && (
				<AddExpertModal
					onClose={() => setShowModal(false)}
					onAdded={handleExpertAdded}
				/>
			)}
			<section className="flex flex-col h-full min-h-0">
				<div className="flex items-center justify-between mb-4 px-1">
					<h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
						Experts
					</h2>
					<button
						type="button"
						onClick={() => setShowModal(true)}
						className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-sm"
					>
						<Plus className="w-4 h-4" />
					</button>
				</div>

				{loading ? (
					<div className="flex-1 flex items-center justify-center">
						<Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
					</div>
				) : (
					<div className="flex-1 overflow-y-auto space-y-4 pr-1">
						{experts.map((expert) => {
							const selected = activePersona?.id === expert.id;
							const isSwitching = switching === expert.id;
							const isEditing = editingId === expert.id;

							return (
								<GlowCard
									key={expert.id}
									className={`p-4 transition-all ${
										selected
											? "ring-2 ring-blue-500/30 border-blue-200 shadow-md"
											: "hover:border-slate-300"
									} ${isEditing ? "" : "cursor-pointer"}`}
								>
									{/* Header row */}
									<div className="flex items-start justify-between mb-4">
										<button
											type="button"
											className="flex items-center gap-3 text-left"
											onClick={() => handleSelect(expert)}
											disabled={isSwitching || isEditing}
										>
											<div
												className={`w-12 h-12 rounded-full bg-gradient-to-br ${expert.avatar_color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}
											>
												{isSwitching ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													expert.initials
												)}
											</div>
											<div>
												{isEditing ? (
													<input
														value={
															draft.display_name
														}
														onChange={(e) =>
															setDraft((d) => ({
																...d,
																display_name:
																	e.target
																		.value,
															}))
														}
														onClick={(e) =>
															e.stopPropagation()
														}
														className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
													/>
												) : (
													<h3 className="font-semibold text-slate-900">
														{expert.display_name}
													</h3>
												)}
												<p className="text-sm text-slate-500 mt-0.5">
													{expert.subtitle}
												</p>
											</div>
										</button>

										{/* Edit / Save / Cancel / Delete buttons */}
										{isEditing ? (
											<div className="flex items-center gap-1 shrink-0">
												<button
													type="button"
													onClick={(e) =>
														cancelEdit(e)
													}
													className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
												>
													<X className="w-3.5 h-3.5" />
												</button>
												<button
													type="button"
													onClick={(e) =>
														saveEdit(e, expert.id)
													}
													className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700"
												>
													<Check className="w-3.5 h-3.5" />
												</button>
											</div>
										) : (
											<div className="flex items-center gap-1.5 shrink-0">
												<button
													type="button"
													onClick={(e) =>
														startEdit(e, expert)
													}
													className="text-xs text-blue-600 font-medium flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100"
												>
													<Pencil className="w-3 h-3" />
													Edit
												</button>
												<button
													type="button"
													onClick={(e) =>
														handleDelete(
															e,
															expert.id,
														)
													}
													className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 transition-colors"
													title="Delete expert"
												>
													<Trash2 className="w-3 h-3" />
													Delete
												</button>
											</div>
										)}
									</div>

									{/* Meta rows */}
									<div className="space-y-0">
										{/* X Source */}
										<div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
											<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
												<AtSign className="w-4 h-4 text-slate-500" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-slate-400">
													X Source
												</p>
												{isEditing ? (
													<input
														value={draft.x_source}
														onChange={(e) =>
															setDraft((d) => ({
																...d,
																x_source:
																	e.target
																		.value,
															}))
														}
														onClick={(e) =>
															e.stopPropagation()
														}
														placeholder="@handle"
														className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
													/>
												) : (
													<p className="text-sm text-slate-800 truncate">
														{expert.x_source}
													</p>
												)}
											</div>
										</div>

										{/* Wikipedia */}
										<div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
											<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
												<Link2 className="w-4 h-4 text-slate-500" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-slate-400">
													Wikipedia
												</p>
												{isEditing ? (
													<input
														value={draft.wikipedia}
														onChange={(e) =>
															setDraft((d) => ({
																...d,
																wikipedia:
																	e.target
																		.value,
															}))
														}
														onClick={(e) =>
															e.stopPropagation()
														}
														placeholder="https://en.wikipedia.org/wiki/…"
														className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
													/>
												) : (
													<p className="text-sm text-slate-800 truncate">
														{expert.wikipedia}
													</p>
												)}
											</div>
										</div>

										{/* Read-only rows */}
										<div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
											<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
												<Clock className="w-4 h-4 text-slate-500" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-slate-400">
													Last Updated
												</p>
												<p className="text-sm text-slate-800 truncate">
													{expert.last_updated || "—"}
												</p>
											</div>
										</div>

										<div className="flex items-center gap-3 py-2.5">
											<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
												<Code2 className="w-4 h-4 text-slate-500" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-slate-400">
													System Prompt
												</p>
												<p className="text-sm text-slate-800">
													••••••••••••••••
												</p>
											</div>
										</div>
									</div>
								</GlowCard>
							);
						})}
					</div>
				)}
				{/* 
				{showAddModal && (
					<AddExpertModal
						onClose={() => setShowAddModal(false)}
						onAdded={handleExpertAdded}
					/>
				)} */}
			</section>
		</>
	);
}
