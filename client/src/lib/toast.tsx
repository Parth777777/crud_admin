/**
 * A tiny toast/notification system. Not the focus of the lesson, but it makes
 * the CRUD feedback ("Saved!", "Deleted") feel polished. Any component can call
 * `useToast().show("message")`.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };
const ToastContext = createContext<{ show: (m: string, k?: Toast["kind"]) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card px-4 py-3 text-sm font-medium shadow-lg animate-[fadeIn_.2s_ease] ${
              t.kind === "error" ? "text-rose-600 ring-rose-200" : "text-brand-700 ring-brand-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
