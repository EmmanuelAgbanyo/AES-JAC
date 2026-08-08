import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Trash2, HelpCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  confirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<(ConfirmOptions & { isOpen: boolean }) | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, message, type, title, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);
  const warning = useCallback((message: string, title?: string) => showToast(message, 'warning', title), [showToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmModal({ ...options, isOpen: true });
  }, []);

  const handleConfirmClose = () => {
    setConfirmModal(null);
  };

  const handleConfirmExecute = async () => {
    if (confirmModal?.onConfirm) {
      try {
        await confirmModal.onConfirm();
      } catch (err) {
        console.error("Confirmation execution error:", err);
      }
    }
    setConfirmModal(null);
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, confirm }}>
      {children}

      {/* Global Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20 dark:border-white/10 ${
                toast.type === 'success'
                  ? 'bg-emerald-500/90 text-white shadow-emerald-500/20'
                  : toast.type === 'error'
                  ? 'bg-rose-500/90 text-white shadow-rose-500/20'
                  : toast.type === 'warning'
                  ? 'bg-amber-500/90 text-white shadow-amber-500/20'
                  : 'bg-indigo-600/90 text-white shadow-indigo-500/20'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-white" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-white" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-white" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && <h4 className="font-bold text-sm leading-tight text-white mb-0.5">{toast.title}</h4>}
                <p className="text-xs font-medium leading-snug text-white/90">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Global Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleConfirmClose}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl overflow-hidden z-10"
            >
              {/* Top Accent Gradient */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                  confirmModal.variant === 'danger'
                    ? 'from-rose-500 to-red-600'
                    : confirmModal.variant === 'warning'
                    ? 'from-amber-400 to-orange-500'
                    : 'from-indigo-500 to-purple-600'
                }`}
              />

              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    confirmModal.variant === 'danger'
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : confirmModal.variant === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {confirmModal.variant === 'danger' ? (
                    <Trash2 className="w-6 h-6" />
                  ) : (
                    <HelpCircle className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mb-2">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleConfirmClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmExecute}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                    confirmModal.variant === 'danger'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/30'
                      : confirmModal.variant === 'warning'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30'
                      : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/30'
                  }`}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
