"use client";

import { useEffect, useRef, useState } from "react";
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
	UserPlus,
	RotateCcw,
	ChevronDown,
	ChevronsUpDown,
	Search,
} from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { getExperts, switchPersona } from "@/lib/api";
import { getAvatarGradient, getInitials, makeInitials } from "@/lib/expertUtils";
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

const AVATAR_COLORS = [
	"from-violet-500 to-purple-700",
	"from-rose-500 to-pink-700",
	"from-amber-500 to-orange-600",
	"from-teal-500 to-cyan-700",
	"from-green-500 to-emerald-700",
	"from-sky-500 to-blue-700",
];

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


/* ── Add-Expert Modal ──────────────────────────────────────────────────────── */
interface AddModalProps {
	onClose: () => void;
	onAdd: (expert: Expert) => void;
}

function AddExpertModal({ onClose, onAdd }: AddModalProps) {
	const [name, setName] = useState("");
	const [handle, setHandle] = useState("");
	const [wiki, setWiki] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const backdropRef = useRef<HTMLDivElement>(null);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		const id = `custom_${Date.now()}`;
		const color =
			AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
		const expert: Expert = {
			id,
			display_name: name.trim(),
			subtitle: subtitle.trim(),
			initials: makeInitials(name.trim()),
			avatar_color: color,
			x_handle: handle.trim(),
			x_source: handle.trim(),
			wikipedia: wiki.trim(),
			last_updated: new Date().toISOString().slice(0, 10),
		};
		onAdd(expert);
		onClose();
	}

	return (
		<div
			ref={backdropRef}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
			onMouseDown={(e) => {
				if (e.target === backdropRef.current) onClose();
			}}
		>
			<div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
				<div className="flex items-center justify-between mb-5">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
							<UserPlus className="w-4 h-4 text-white" />
						</div>
						<h2 className="text-base font-semibold text-slate-900">
							Add New Expert
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-xs font-medium text-slate-500 mb-1">
							Name <span className="text-red-400">*</span>
						</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Sam Altman"
							required
							className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
						/>
					</div>

					<div>
						<label className="block text-xs font-medium text-slate-500 mb-1">
							Role / Subtitle
						</label>
						<input
							value={subtitle}
							onChange={(e) => setSubtitle(e.target.value)}
							placeholder="e.g. CEO of OpenAI"
							className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
						/>
					</div>

					<div>
						<label className="block text-xs font-medium text-slate-500 mb-1">
							X / Twitter handle
						</label>
						<div className="relative">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
								@
							</span>
							<input
								value={handle.replace(/^@/, "")}
								onChange={(e) =>
									setHandle(e.target.value.replace(/^@/, ""))
								}
								placeholder="username"
								className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-medium text-slate-500 mb-1">
							Wikipedia URL
						</label>
						<input
							value={wiki}
							onChange={(e) => setWiki(e.target.value)}
							placeholder="https://en.wikipedia.org/wiki/…"
							type="url"
							className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
						/>
					</div>

					<div className="flex gap-2 pt-1">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!name.trim()}
							className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
						>
							Add Expert
						</button>
					</div>
				</form>
			</div>
		</div>
	);
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
	const [allSeeded, setAllSeeded] = useState<Expert[]>([]);
	const [loading, setLoading] = useState(true);
	const [switching, setSwitching] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState<EditDraft>({
		display_name: "",
		x_source: "",
		wikipedia: "",
	});
	const [showModal, setShowModal] = useState(false);
	const [showRestore, setShowRestore] = useState(false);
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");

	function loadExperts() {
		return getExperts()
			.then((data) => {
				setAllSeeded(applyOverrides(data));
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

	function handleExpertAdded(expert: Expert) {
		setExperts((prev: Expert[]) => [...prev, expert]);
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

	function handleAddExpert(expert: Expert) {
		const custom = loadCustomExperts();
		saveCustomExperts([...custom, expert]);
		setExperts((prev) => [...prev, expert]);
	}

	function restoreExpert(expertId: string) {
		const s = loadHidden();
		s.delete(expertId);
		localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s]));
		const expert = allSeeded.find((e) => e.id === expertId);
		if (expert) setExperts((prev) => [...prev, expert]);
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
					onAdd={handleAddExpert}
				/>
			)}
			<section className="flex flex-col h-full min-h-0">
				<div className="flex items-center justify-between mb-4 px-1">
					<h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
						Experts
					</h2>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								const allIds = experts.map((e) => e.id);
								const allExpanded = allIds.every((id) => expandedIds.has(id));
								setExpandedIds(allExpanded ? new Set() : new Set(allIds));
							}}
							title={experts.every((e) => expandedIds.has(e.id)) ? "Collapse all" : "Expand all"}
							className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
						>
							<ChevronsUpDown className="w-4 h-4" />
						</button>
						<button
							type="button"
							onClick={() => setShowModal(true)}
							className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-sm"
						>
							<Plus className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Search bar */}
				<div className="relative mb-4">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search experts…"
						className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>

				{loading ? (
					<div className="flex-1 flex items-center justify-center">
						<Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
					</div>
				) : (
					<div className="flex-1 overflow-y-auto space-y-4 pr-1">
						{experts
							.filter((e) =>
								e.display_name.toLowerCase().includes(search.toLowerCase()) ||
								e.subtitle?.toLowerCase().includes(search.toLowerCase())
							)
							.map((expert) => {
							const selected = activePersona?.id === expert.id;
							const isSwitching = switching === expert.id;
							const isEditing = editingId === expert.id;
							const isExpanded = expandedIds.has(expert.id);

							return (
								<GlowCard
									key={expert.id}
									className={`p-4 transition-all ${
										selected
											? "ring-2 ring-blue-500/30 border-blue-200 shadow-md"
											: "hover:border-slate-300"
									}`}
								>
									{/* Header row */}
									<div className="flex items-center justify-between">
										<button
											type="button"
											className="flex items-center gap-3 text-left flex-1 min-w-0"
											onClick={() => handleSelect(expert)}
											disabled={isSwitching || isEditing}
										>
											<div
												className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
											style={{ background: getAvatarGradient(expert) }}
											>
												{isSwitching ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													getInitials(expert)
												)}
											</div>
											<div className="min-w-0">
												{isEditing ? (
													<input
														value={draft.display_name}
														onChange={(e) =>
															setDraft((d) => ({ ...d, display_name: e.target.value }))
														}
														onClick={(e) => e.stopPropagation()}
														className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
													/>
												) : (
													<h3 className="font-semibold text-slate-900 truncate">
														{expert.display_name}
													</h3>
												)}
												<p className="text-sm text-slate-500 mt-0.5 truncate">
													{expert.subtitle}
												</p>
											</div>
										</button>

										<div className="flex items-center gap-1.5 shrink-0 ml-2">
											{/* Edit / Save / Cancel */}
											{isEditing ? (
												<>
													<button
														type="button"
														onClick={(e) => cancelEdit(e)}
														className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
													>
														<X className="w-3.5 h-3.5" />
													</button>
													<button
														type="button"
														onClick={(e) => saveEdit(e, expert.id)}
														className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700"
													>
														<Check className="w-3.5 h-3.5" />
													</button>
												</>
											) : (
												<>
													<button
														type="button"
														onClick={(e) => startEdit(e, expert)}
														className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600"
														title="Edit expert"
													>
														<Pencil className="w-3.5 h-3.5" />
													</button>
													<button
														type="button"
														onClick={(e) => handleDelete(e, expert.id)}
														className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
														title="Delete expert"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</>
											)}

											{/* Expand / collapse chevron */}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setExpandedIds((prev) => {
																const next = new Set(prev);
																isExpanded ? next.delete(expert.id) : next.add(expert.id);
																return next;
															});
												}}
												className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
												aria-label={isExpanded ? "Collapse details" : "Expand details"}
											>
												<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
											</button>
										</div>
									</div>

									{/* Collapsible detail rows */}
									{isExpanded && (
										<div className="mt-4 space-y-0 border-t border-slate-100 pt-1">
											{/* X Source */}
											<div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
												<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
													<AtSign className="w-4 h-4 text-slate-500" />
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-xs text-slate-400">X Source</p>
													{isEditing ? (
														<input
															value={draft.x_source}
															onChange={(e) =>
																setDraft((d) => ({ ...d, x_source: e.target.value }))
															}
															onClick={(e) => e.stopPropagation()}
															placeholder="@handle"
															className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
														/>
													) : (
														<p className="text-sm text-slate-800 truncate">{expert.x_source}</p>
													)}
												</div>
											</div>

											{/* Wikipedia */}
											<div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
												<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
													<Link2 className="w-4 h-4 text-slate-500" />
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-xs text-slate-400">Wikipedia</p>
													{isEditing ? (
														<input
															value={draft.wikipedia}
															onChange={(e) =>
																setDraft((d) => ({ ...d, wikipedia: e.target.value }))
															}
															onClick={(e) => e.stopPropagation()}
															placeholder="https://en.wikipedia.org/wiki/…"
															className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
														/>
													) : (
														<p className="text-sm text-slate-800 truncate">{expert.wikipedia}</p>
													)}
												</div>
											</div>

											{/* Last Updated */}
											<div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
												<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
													<Clock className="w-4 h-4 text-slate-500" />
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-xs text-slate-400">Last Updated</p>
													<p className="text-sm text-slate-800 truncate">
														{expert.last_updated || "—"}
													</p>
												</div>
											</div>

											{/* System Prompt */}
											<div className="flex items-center gap-3 py-2.5">
												<div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
													<Code2 className="w-4 h-4 text-slate-500" />
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-xs text-slate-400">System Prompt</p>
													<p className="text-sm text-slate-800">••••••••••••••••</p>
												</div>
											</div>
										</div>
									)}
								</GlowCard>
							);
						})}
					</div>
				)}

				{/* Restore deleted seeded experts */}
				{(() => {
					const hidden = loadHidden();
					const restorable = allSeeded.filter((e) => hidden.has(e.id));
					if (restorable.length === 0) return null;
					return (
						<div className="mt-3 border-t border-slate-100 pt-3">
							<button
								type="button"
								onClick={() => setShowRestore((v) => !v)}
								className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors w-full"
							>
								<RotateCcw className="w-3.5 h-3.5" />
								<span>{restorable.length} hidden expert{restorable.length > 1 ? "s" : ""}</span>
								<ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showRestore ? "rotate-180" : ""}`} />
							</button>
							{showRestore && (
								<ul className="mt-2 space-y-1">
									{restorable.map((e) => (
										<li key={e.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50">
											<div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: getAvatarGradient(e) }}>
												{getInitials(e)}
											</div>
											<span className="text-sm text-slate-700 flex-1 truncate">{e.display_name}</span>
											<button
												type="button"
												onClick={() => restoreExpert(e.id)}
												className="text-xs text-blue-600 font-medium hover:underline shrink-0"
											>
												Restore
											</button>
										</li>
									))}
								</ul>
							)}
						</div>
					);
				})()}

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
