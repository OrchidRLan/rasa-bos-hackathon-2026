"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  onTranscript?: (text: string) => void;
  /** RMS amplitude below which audio is considered silence (0–1). Default 0.01 */
  silenceThreshold?: number;
  /** Milliseconds of continuous silence before auto-submitting. Default 3000 */
  silenceMs?: number;
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function useVoiceInput({
  onTranscript,
  silenceThreshold = 0.01,
  silenceMs = 3000,
}: Options = {}) {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const enabledRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);          // ref so cancelRecording can clear it
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSoundRef = useRef<number>(Date.now());
  const recordingStartRef = useRef<number>(Date.now());

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const stopSilenceCheck = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const cleanupRefs = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void audioCtxRef.current?.close();
    streamRef.current = null;
    audioCtxRef.current = null;
    recorderRef.current = null;
  }, []);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    if (blob.size < 5000) return;

    setIsRecording(false);
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
    }
    // No auto-restart — parent drives the restart after TTS finishes
  }, []);

  const startRecording = useCallback(async () => {
    if (enabledRef.current) return; // already running
    enabledRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        cleanupRefs();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (enabledRef.current) {
          // Normal VAD-triggered stop: transcribe
          enabledRef.current = false;
          void transcribeBlob(blob);
        }
        // If enabledRef is already false (cancel), skip transcription
      };

      recorder.start();
      lastSoundRef.current = Date.now();
      recordingStartRef.current = Date.now();
      setIsRecording(true);
      setTranscript("");

      const dataArray = new Float32Array(analyser.fftSize);
      silenceTimerRef.current = setInterval(() => {
        if (!enabledRef.current || recorder.state !== "recording") {
          stopSilenceCheck();
          return;
        }
        analyser.getFloatTimeDomainData(dataArray);
        const level = rms(dataArray);
        if (level > silenceThreshold) {
          lastSoundRef.current = Date.now();
        } else {
          const age = Date.now() - recordingStartRef.current;
          if (age > 1000 && Date.now() - lastSoundRef.current > silenceMs) {
            stopSilenceCheck();
            recorder.stop(); // onstop will transcribe (enabledRef still true at this point)
          }
        }
      }, 100);

    } catch (err) {
      console.error("Microphone access denied", err);
      setTranscript("Microphone access denied");
      enabledRef.current = false;
      setIsRecording(false);
    }
  }, [silenceThreshold, silenceMs, stopSilenceCheck, cleanupRefs, transcribeBlob]);

  /** Stop and transcribe whatever was recorded (manual stop). */
  const stopRecording = useCallback(() => {
    if (!enabledRef.current && recorderRef.current?.state === "inactive") return;
    stopSilenceCheck();
    setIsRecording(false);
    setTranscript("");
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop(); // onstop → transcribe (enabledRef still true)
    } else {
      enabledRef.current = false;
      cleanupRefs();
    }
  }, [stopSilenceCheck, cleanupRefs]);

  /** Cancel recording and DISCARD audio — used when TTS starts playing. */
  const cancelRecording = useCallback(() => {
    stopSilenceCheck();
    enabledRef.current = false; // onstop will skip transcription
    chunksRef.current = [];     // discard accumulated audio
    setIsRecording(false);
    setTranscript("");
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop();
    } else {
      cleanupRefs();
    }
  }, [stopSilenceCheck, cleanupRefs]);

  return { transcript, isRecording, isTranscribing, startRecording, stopRecording, cancelRecording };
}
