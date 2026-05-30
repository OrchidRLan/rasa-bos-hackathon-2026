"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  onTranscript?: (text: string) => void;
  /** When true, automatically restarts listening after each transcription */
  continuous?: boolean;
}

// WAV Encoder helper functions
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function bufferToWav(buffer: Float32Array, sampleRate: number): Blob {
  const bufferLength = buffer.length;
  const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
  const view = new DataView(wavBuffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + bufferLength * 2, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, bufferLength * 2, true);

  // Write PCM samples
  floatTo16BitPCM(view, 44, buffer);

  return new Blob([view], { type: "audio/wav" });
}

export function useVoiceInput({ onTranscript, continuous = false }: Options = {}) {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const enabledRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const onTranscriptRef = useRef(onTranscript);
  const startOnceRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const stopAndProcess = useCallback(async () => {
    // Stop recording and gather tracks
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const localContext = audioContextRef.current;
    const localChunks = chunksRef.current;
    chunksRef.current = [];

    if (localContext) {
      void localContext.close();
      audioContextRef.current = null;
    }

    if (localChunks.length === 0) {
      if (continuous && enabledRef.current) void startOnceRef.current?.();
      return;
    }

    // Merge buffers
    const totalLength = localChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const resultBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of localChunks) {
      resultBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const sampleRate = localContext?.sampleRate || 44100;
    const blob = bufferToWav(resultBuffer, sampleRate);

    // Audio is too short (less than 5KB, roughly 0.15s of 16kHz audio or similar, WAV headers are 44 bytes)
    if (blob.size < 5000) {
      if (continuous && enabledRef.current) void startOnceRef.current?.();
      return;
    }

    setIsTranscribing(true);
    setTranscript("Transcribing…");

    try {
      const form = new FormData();
      form.append("file", blob, "recording.wav");
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
  }, [continuous]);

  const startOnce = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 4096 buffer size, 1 input channel, 1 output channel
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      chunksRef.current = [];

      processor.onaudioprocess = (e) => {
        if (!enabledRef.current) return;
        const channelData = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setTranscript("");
    } catch (err) {
      console.error("Microphone access denied", err);
      setTranscript("Microphone access denied");
      enabledRef.current = false;
      setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    startOnceRef.current = startOnce;
  }, [startOnce]);

  const startRecording = useCallback(async () => {
    enabledRef.current = true;
    await startOnce();
  }, [startOnce]);

  const stopRecording = useCallback(() => {
    enabledRef.current = false;
    setIsRecording(false);
    setTranscript("");
    void stopAndProcess();
  }, [stopAndProcess]);

  return { transcript, isRecording, isTranscribing, startRecording, stopRecording };
}
