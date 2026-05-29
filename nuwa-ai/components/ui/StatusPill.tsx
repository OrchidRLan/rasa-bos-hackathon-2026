type StatusPillProps = {
  label: string;
  variant?: "success" | "warning" | "neutral";
};

const variants = {
  success: "bg-emerald-950 text-emerald-300",
  warning: "bg-orange-950 text-orange-300",
  neutral: "bg-slate-800 text-slate-300",
};

export default function StatusPill({
  label,
  variant = "neutral",
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs ${variants[variant]}`}
    >
      {label}
    </span>
  );
}
