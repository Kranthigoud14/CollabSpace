import { useState, useEffect } from 'react';

let pushFn = null;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    pushFn = (t) => setToasts((s) => [...s, t]);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((t, i) => (
        <div key={i} className="bg-slate-800 text-white px-4 py-2 rounded shadow">{t}</div>
      ))}
    </div>
  );
}

export const pushToast = (text) => {
  if (pushFn) pushFn(text);
};

export default function Toast() {
  return null;
}
