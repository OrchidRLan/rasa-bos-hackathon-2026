"use client";

import { useState, useEffect } from "react";

/**
 * Progressively reveals an array of lines one by one,
 * simulating a streaming / typing effect.
 */
export function useStreamLines(lines: string[], delayMs = 120, enabled = true) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(lines.length);
      return;
    }
    setVisibleCount(0);
    if (lines.length === 0) return;

    let i = 0;
    const tick = () => {
      i++;
      setVisibleCount(i);
      if (i < lines.length) {
        timer = setTimeout(tick, delayMs);
      }
    };
    let timer = setTimeout(tick, delayMs);
    return () => clearTimeout(timer);
  }, [lines.join("|"), enabled]);

  return { visibleLines: lines.slice(0, visibleCount), done: visibleCount >= lines.length };
}
