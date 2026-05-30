"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  onTranscript?: (text: string) => void;
  /** When true, automatically restarts listening after each transcription */
  continuous?: boolean;
}

export function useVoiceInput({ onTranscript, continuous = false }: Options = {}) {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const enabledRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const startOnceRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const startOnce = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) {
          if (continuous && enabledRef.current) void startOnceRef.current?.();
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        setTranscript("Transcribing…");

        try {
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const { transcript: text } = await res.json();
          const result = text?.trim() || "";
          setTranscript(result);
          if (result) onTranscriptRef.current?.(result);
        } catch (err) {
          console.error("Transcription failed", err);
          setTranscript("Transcription failed");
        } finally {
          setIsTranscribing(false);
          if (continuous && enabledRef.current) void startOnceRef.current?.();
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setTranscript("");
    } catch {
      setTranscript("Microphone access denied");
      enabledRef.current = false;
      setIsRecording(false);
    }
  }, [continuous]);
  useEffect(() => {
    startOnceRef.current = startOnce;
  }, [startOnce]);

  const startRecording = useCallback(async () => {
    enabledRef.current = true;
    await startOnce();
  }, [startOnce]);

  const stopRecording = useCallback(() => {
    enabledRef.current = false;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
    setTranscript("");
  }, []);

  return { transcript, isRecording, isTranscribing, startRecording, stopRecording };
}
