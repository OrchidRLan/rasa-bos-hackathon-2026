"use client";

import { useEffect, useState } from "react";
import { transcriptStream } from "@/lib/mock-data";

export function useTranscriptStream() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % transcriptStream.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return transcriptStream[index];
}
