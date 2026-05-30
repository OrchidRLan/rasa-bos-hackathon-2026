"use client";

import { useEffect, useState } from "react";

const PLACEHOLDER = [
  "I'd focus on product-market fit first…",
  "The real moat is distribution, not tech…",
  "Move fast, but don't break user trust…",
  "Hire people smarter than you in every area…",
];

export function useTranscriptStream() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PLACEHOLDER.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return PLACEHOLDER[index];
}
