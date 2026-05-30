"use client";

import { useCallback, useRef, useState } from "react";

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, personaId?: string) => {
      if (!text.trim()) return;
      stop();

      try {
        const res = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, persona_id: personaId ?? null }),
        });
        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        setIsSpeaking(true);
        audio.onended = () => { URL.revokeObjectURL(url); setIsSpeaking(false); };
        audio.onerror = () => { URL.revokeObjectURL(url); setIsSpeaking(false); };
        await audio.play();
      } catch (err) {
        console.error("TTS failed", err);
        setIsSpeaking(false);
      }
    },
    [stop]
  );

  return { speak, stop, isSpeaking };
}
