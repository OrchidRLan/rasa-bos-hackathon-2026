"use client";

import { motion } from "framer-motion";

const bars = [0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.65, 0.45];

export default function VoiceOrb() {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full bg-indigo-400/30 blur-3xl scale-125" />

        <div className="relative w-52 h-52 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 flex items-center justify-center shadow-xl shadow-indigo-300/50">
          <div className="flex items-end justify-center gap-1.5 h-12">
            {bars.map((height, i) => (
              <motion.div
                key={i}
                animate={{ scaleY: [height, 1, height * 0.6, height] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8 + i * 0.1,
                  ease: "easeInOut",
                }}
                className="w-1.5 origin-bottom rounded-full bg-white/90"
                style={{ height: `${height * 48}px` }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <div className="mt-6 text-center">
        <p className="text-slate-600 font-medium">正在聆听…</p>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">00:08</p>
      </div>
    </div>
  );
}
