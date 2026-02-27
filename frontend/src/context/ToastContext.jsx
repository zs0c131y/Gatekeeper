import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "border-green-500/40 bg-green-500/10 text-green-400",
  error: "border-red-500/40 bg-red-500/10 text-red-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-400",
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "info", duration = 5000) => {
      const id = ++_id;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast],
  );

  const toast = useMemo(
    () => ({
      success: (msg, dur) => addToast(msg, "success", dur),
      error: (msg, dur) => addToast(msg, "error", dur),
      warning: (msg, dur) => addToast(msg, "warning", dur),
      info: (msg, dur) => addToast(msg, "info", dur),
    }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ duration: 0.25 }}
                className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm max-w-sm ${COLORS[t.type]}`}
                role="alert"
                aria-live="assertive"
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">{t.message}</span>
                <button
                  onClick={() => removeToast(t.id)}
                  className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export default ToastContext;
