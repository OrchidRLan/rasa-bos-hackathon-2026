type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      {subtitle && <p className="text-slate-400">{subtitle}</p>}
    </div>
  );
}
