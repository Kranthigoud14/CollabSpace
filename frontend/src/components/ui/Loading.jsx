export default function Loading({ className = "", text = "Loading..." }) {
  return (
    <div className={`text-slate-400 ${className}`}>{text}</div>
  );
}
