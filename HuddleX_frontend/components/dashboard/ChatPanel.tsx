"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown, Loader2, Mic, MicOff, Send, Plus,
  MessageSquarePlus, Trash2, PanelLeftClose, PanelLeftOpen,
  Paperclip, X, FileText,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useApp } from "@/lib/context";
import { getExperts, sendMessage, switchPersona, uploadFile } from "@/lib/api";
import { getAvatarGradient, getInitials } from "@/lib/expertUtils";
import type { ChatMessage, Expert } from "@/lib/types";

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expert dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    sessionId, activePersona, setActivePersona,
    latestMessages, pushMessages,
    threads, activeThreadId, createThread, switchThread, deleteThread, renameThread,
  } = useApp();

  useEffect(() => {
    getExperts().then(setExperts).catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestMessages]);

  async function handleSelectExpert(expert: Expert) {
    if (expert.id === activePersona?.id) { setDropdownOpen(false); return; }
    setSwitching(true);
    try {
      await switchPersona(sessionId, expert.id);
      setActivePersona(expert);
    } catch (e) {
      console.error("switch failed", e);
    } finally {
      setSwitching(false);
      setDropdownOpen(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    e.target.value = "";
  }

  const submit = useCallback(
    async (text: string) => {
      if ((!text.trim() && !attachedFile) || sending) return;
      setSending(true);
      setInput("");
      const file = attachedFile;
      setAttachedFile(null);
      // Upload file first if attached
      let fileLabel = "";
      const fileIds: string[] = [];
      if (file) {
        setUploading(true);
        try {
          const result = await uploadFile(file, sessionId);
          fileIds.push(result.file.file_id);
          fileLabel = `[File: ${file.name}] `;
        } catch (e) {
          console.error("upload failed", e);
        } finally {
          setUploading(false);
        }
      }

      const messageText = (fileLabel + text.trim()).trim() || `[File: ${file?.name}]`;
      pushMessages([{
        id: `local_${Date.now()}`,
        timestamp: new Date().toISOString(),
        persona_id: null,
        role: "user",
        content: messageText,
      }]);
      try {
        const replies = await sendMessage(sessionId, messageText, activePersona?.id, fileIds.length > 0 ? fileIds : undefined);
        const msgs: ChatMessage[] = replies
          .filter((r) => r.text)
          .map((r, i) => ({
            id: `reply_${Date.now()}_${i}`,
            timestamp: new Date().toISOString(),
            persona_id: activePersona?.id ?? null,
            role: "assistant",
            content: r.text!,
          }));
        pushMessages(msgs);
      } catch (e) {
        console.error("send failed", e);
      } finally {
        setSending(false);
      }
    },
    [sessionId, activePersona, pushMessages, sending, attachedFile]
  );

  const { transcript, isRecording, isTranscribing, startRecording, stopRecording } =
    useVoiceInput({ onTranscript: submit, continuous: true });

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) { stopRecording(); setVoiceEnabled(false); }
    else { setVoiceEnabled(true); startRecording(); }
  }, [voiceEnabled, startRecording, stopRecording]);

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 px-3 py-3 border-b border-slate-100 flex items-center gap-2" ref={dropdownRef}>

        {/* Thread sidebar toggle */}
        <button
          type="button"
          onClick={() => setThreadsOpen((o) => !o)}
          title={threadsOpen ? "Hide chats" : "Show chats"}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0 transition-colors"
        >
          {threadsOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        {/* Expert dropdown */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors w-auto"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            {activePersona ? (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: getAvatarGradient(activePersona) }}>
                  {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : getInitials(activePersona)}
                </div>
                <span className="text-sm font-semibold text-slate-800">{activePersona.display_name}</span>
              </>
            ) : (
              <span className="text-sm text-slate-400">Select an expert…</span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && experts.length > 0 && (
            <ul role="listbox" className="absolute z-50 top-full left-0 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {experts.map((expert) => {
                const selected = expert.id === activePersona?.id;
                return (
                  <li key={expert.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => handleSelectExpert(expert)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${selected ? "bg-blue-50/60" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: getAvatarGradient(expert) }}>
                        {getInitials(expert)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{expert.display_name}</p>
                        <p className="text-xs text-slate-400 truncate">{expert.subtitle}</p>
                      </div>
                      {selected && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Voice status badge */}
        {voiceEnabled && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 shrink-0">
            {isTranscribing || sending ? (
              <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <span className="text-xs text-red-500 font-medium">
              {isTranscribing ? "Transcribing" : sending ? "Sending" : "Listening"}
            </span>
          </div>
        )}
      </div>

      {/* ── Body: thread list + messages ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* Thread list sidebar */}
        {threadsOpen && (
          <div className="w-52 shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/60">
            {/* New chat button */}
            <button
              type="button"
              onClick={createThread}
              className="flex items-center gap-2 mx-2 mt-2 mb-1 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4 text-blue-500 shrink-0" />
              New chat
            </button>

            {/* Thread list */}
            <ul className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {threads.map((thread: import("@/lib/context").LocalThread) => {
                const isActive = thread.id === activeThreadId;
                const isRenaming = editingThreadId === thread.id;
                return (
                  <li key={thread.id} className="group relative">
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => {
                          const title = editingTitle.trim();
                          if (title) renameThread(thread.id, title);
                          setEditingThreadId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const title = editingTitle.trim();
                            if (title) renameThread(thread.id, title);
                            setEditingThreadId(null);
                          } else if (e.key === "Escape") {
                            setEditingThreadId(null);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-blue-300 ring-2 ring-blue-100 text-slate-900 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => switchThread(thread.id)}
                        onDoubleClick={() => {
                          setEditingThreadId(thread.id);
                          setEditingTitle(thread.title);
                          setTimeout(() => renameInputRef.current?.select(), 0);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm truncate transition-colors pr-8 ${
                          isActive
                            ? "bg-white text-slate-900 font-medium shadow-sm border border-slate-200/80"
                            : "text-slate-600 hover:bg-white hover:text-slate-800"
                        }`}
                      >
                        {thread.title}
                      </button>
                    )}
                    {!isRenaming && (
                      <button
                        type="button"
                        onClick={() => deleteThread(thread.id)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 min-w-0 overflow-y-auto px-5 py-4 space-y-4">
          {latestMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold" style={{ background: activePersona ? getAvatarGradient(activePersona) : "linear-gradient(135deg, #475569, #1e293b)" }}>
                {activePersona ? getInitials(activePersona) : "AI"}
              </div>
              <p className="text-slate-800 font-semibold">
                {activePersona ? `Chat with ${activePersona.display_name}` : "Select an expert to start"}
              </p>
              <p className="text-sm text-slate-400">Ask anything — type below or use the mic</p>
            </div>
          ) : (
            latestMessages.map((msg) => {
              if (msg.role === "system_event") return null;
              const isUser = msg.role === "user";
              const label = isUser ? "You" : (msg.persona_id ?? activePersona?.display_name ?? "Expert");
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-slate-400 mb-1 px-1">{label}</span>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-700 rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}

          {/* Live transcript preview */}
          {voiceEnabled && transcript && !isTranscribing && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400 mb-1 px-1">You</span>
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md bg-blue-100 text-blue-700 text-sm italic">
                {transcript}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-100">
        {/* File attachment preview */}
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 w-fit max-w-full">
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-xs text-blue-700 truncate max-w-[200px]">{attachedFile.name}</span>
            <span className="text-xs text-blue-400">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-blue-400 hover:text-blue-600 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />

        <form
          className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 shrink-0 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${activePersona?.display_name ?? "anything"}…`}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />

          {/* Voice toggle */}
          <button
            type="button"
            onClick={toggleVoice}
            title={voiceEnabled ? "Stop voice mode" : "Start voice mode"}
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              voiceEnabled
                ? "bg-red-500 text-white hover:bg-red-600"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            }`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Send */}
          <button
            type="submit"
            disabled={sending || uploading || (!input.trim() && !attachedFile)}
            className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-40 shrink-0 transition-colors"
          >
            {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

    </div>
  );
}
