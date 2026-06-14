export default function EmptyState({ title, subtitle }) {
  return (
    <div className="text-slate-400">
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm mt-1">{subtitle}</div>
    </div>
  );
}
