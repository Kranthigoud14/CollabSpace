import { useState, useEffect, useCallback, useRef } from "react";

let pushFn = null;
let lastPushedMessage = "";
let lastPushedTime = 0;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    pushFn = (text, type = "info", duration = 3500) => {
      const now = Date.now();
      // Debounce identical messages sent within 800ms
      if (text === lastPushedMessage && now - lastPushedTime < 800) {
        return;
      }
      lastPushedMessage = text;
      lastPushedTime = now;

      const id = `${now}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast = { id, text, type };

      setToasts((prev) => {
        // Keep at most 4 toasts visible at once
        const next = [...prev, newToast];
        if (next.length > 4) {
          const removed = next.slice(0, next.length - 4);
          removed.forEach((r) => {
            if (timersRef.current.has(r.id)) {
              clearTimeout(timersRef.current.get(r.id));
              timersRef.current.delete(r.id);
            }
          });
          return next.slice(-4);
        }
        return next;
      });

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);

      timersRef.current.set(id, timer);
    };

    return () => {
      pushFn = null;
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const isError =
          t.type === "error" ||
          t.text.toLowerCase().includes("fail") ||
          t.text.toLowerCase().includes("error") ||
          t.text.toLowerCase().includes("cannot");
        const isSuccess =
          t.type === "success" ||
          t.text.includes("✓") ||
          t.text.toLowerCase().includes("success") ||
          t.text.toLowerCase().includes("created");

        let borderStyle = "border-slate-700/80";
        let icon = "ℹ️";

        if (isError) {
          borderStyle = "border-red-500/40 bg-red-950/90 text-red-100";
          icon = "⚠️";
        } else if (isSuccess) {
          borderStyle = "border-emerald-500/40 bg-slate-900/95 text-emerald-100";
          icon = "✅";
        } else {
          borderStyle = "border-indigo-500/30 bg-slate-900/95 text-slate-100";
          icon = "✨";
        }

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl shadow-black/50 text-xs font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${borderStyle}`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-sm shrink-0">{icon}</span>
              <p className="truncate leading-relaxed">{t.text}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 rounded-lg shrink-0 text-sm leading-none"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export const pushToast = (text, type = "info", duration = 3500) => {
  if (pushFn) {
    pushFn(text, type, duration);
  } else {
    console.log(`[Toast] (${type}):`, text);
  }
};

export default function Toast() {
  return null;
}
