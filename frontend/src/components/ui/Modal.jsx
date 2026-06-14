import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl z-10">
        {title && <div className="text-white font-semibold mb-4">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
