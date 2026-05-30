"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TranscriptAudioStopEvent,
  TranscriptServerEvent,
  TranscriptStreamStatus,
} from "@/lib/types";

interface TranscriptStreamOptions {
  sessionId?: string;
  enabled?: boolean;
  chunkMs?: number;
  onFinalTranscript?: (text: string, utteranceId?: string) => void;
}

const DEFAULT_WS_PATH = "/api/transcript/ws";

function getWsBase() {
  const configured = process.env.NEXT_PUBLIC_WS_BASE;
  if (configured) return configured.replace(/\/$/, "");

  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "ws://localhost:8080";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

function createUtteranceId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `utt_${random}`;
}

// Convert Float32 PCM → Int16 little-endian → base64 (what Speechmatics expects)
function float32ToBase64Pcm(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(""));
}

export function useTranscriptStream({
  sessionId,
  enabled = false,
  chunkMs: _chunkMs,
  onFinalTranscript,
}: TranscriptStreamOptions = {}) {
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [status, setStatus] = useState<TranscriptStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const enabledRef = useRef(false);
  const utteranceIdRef = useRef(createUtteranceId());
  const sequenceRef = useRef(0);
  const submittedUtterancesRef = useRef(new Set<string>());
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const releaseResources = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    streamRef.current = null;

    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    releaseResources();
    setPartialTranscript("");
    setStatus("idle");
  }, [releaseResources]);

  const handleTranscriptEvent = useCallback((event: TranscriptServerEvent) => {
    const text = (event.text ?? event.transcript ?? "").trim();
    const utteranceId = event.utterance_id ?? utteranceIdRef.current;

    if (event.type === "transcript.error" || event.error) {
      setError(event.error ?? event.message ?? "Transcript stream failed");
      setStatus("error");
      return;
    }

    if (!text) return;

    const isFinal =
      event.type === "transcript.final" ||
      event.type === "final" ||
      event.is_final === true;

    if (isFinal) {
      setFinalTranscript(text);
      setTranscript(text);
      setPartialTranscript("");
      setStatus("listening");

      if (!submittedUtterancesRef.current.has(utteranceId)) {
        submittedUtterancesRef.current.add(utteranceId);
        onFinalTranscriptRef.current?.(text, utteranceId);
      }

      utteranceIdRef.current = createUtteranceId();
      sequenceRef.current = 0;
      return;
    }

    setPartialTranscript(text);
    setTranscript(text);
    setStatus("transcribing");
  }, []);

  const start = useCallback(async () => {
    if (enabledRef.current) return;

    enabledRef.current = true;
    setStatus("connecting");
    setError(null);
    setTranscript("");
    setPartialTranscript("");
    setFinalTranscript("");
    sequenceRef.current = 0;
    utteranceIdRef.current = createUtteranceId();

    try {
      const params = new URLSearchParams();
      if (sessionId) params.set("session_id", sessionId);

      console.log("creating transcript ws", sessionId);
      const socket = new WebSocket(`${getWsBase()}${DEFAULT_WS_PATH}?${params.toString()}`);
      socketRef.current = socket;

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as TranscriptServerEvent;
          if (process.env.NODE_ENV === "development") {
            console.debug("[transcript] recv", event);
          }
          handleTranscriptEvent(event);
        } catch {
          setError("Received invalid transcript event");
          setStatus("error");
        }
      };
      socket.onclose = () => {
        if (enabledRef.current) {
          enabledRef.current = false;
          setStatus("error");
          setError("Transcript stream disconnected");
        }
      };

      await new Promise<void>((resolve, reject) => {
        socket.onopen = () => resolve();
        socket.onerror = () => reject(new Error("Transcript WebSocket failed to connect"));
      });

      if (!enabledRef.current) {
        cleanup();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Capture raw PCM at 16 kHz — Speechmatics real-time API requires pcm_s16le,
      // not WebM/Opus which MediaRecorder would produce.
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // AudioWorkletNode: modern replacement for the deprecated ScriptProcessorNode.
      // The worklet processor lives in /audio-processor.js (served as a static asset).
      await audioCtx.audioWorklet.addModule("/audio-processor.js");
      const worklet = new AudioWorkletNode(audioCtx, "pcm-processor");
      processorRef.current = worklet;

      worklet.port.onmessage = (ev: MessageEvent<Float32Array>) => {
        if (!enabledRef.current || socket.readyState !== WebSocket.OPEN) return;

        const audio = float32ToBase64Pcm(ev.data);
        const payload = {
          type: "audio_chunk",
          session_id: sessionId,
          utterance_id: utteranceIdRef.current,
          seq: sequenceRef.current,
          sample_rate: audioCtx.sampleRate,
          mime_type: "audio/pcm",
          audio,
        };
        socket.send(JSON.stringify(payload));

        if (sequenceRef.current === 0) {
          setStatus("transcribing");
        }
        sequenceRef.current += 1;
      };

      source.connect(worklet);
      worklet.connect(audioCtx.destination);

      setStatus("listening");
    } catch (err) {
      enabledRef.current = false;
      cleanup();
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to start transcript stream");
    }
  }, [cleanup, handleTranscriptEvent, sessionId]);

  const stop = useCallback(() => {
    enabledRef.current = false;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const payload: TranscriptAudioStopEvent = {
        type: "audio_stop",
        session_id: sessionId,
        utterance_id: utteranceIdRef.current,
      };
      socketRef.current.send(JSON.stringify(payload));
    }

    cleanup();
    setTranscript("");
    setFinalTranscript("");
    setError(null);
  }, [cleanup, sessionId]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void start();
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, start, stop]);

  useEffect(() => {
    return () => {
      enabledRef.current = false;
      releaseResources();
    };
  }, [releaseResources]);

  return {
    transcript,
    partialTranscript,
    finalTranscript,
    status,
    error,
    isRecording: status === "listening" || status === "transcribing",
    isTranscribing: status === "connecting" || status === "transcribing",
    start,
    stop,
  };
}
