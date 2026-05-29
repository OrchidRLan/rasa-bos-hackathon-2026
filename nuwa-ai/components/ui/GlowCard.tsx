import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function GlowCard({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
