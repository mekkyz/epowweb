'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// =============================================================================
// Context
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// Provider
// =============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useState(() => {
    setMounted(true);
  });

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const duration = toast.duration ?? 5000;

      setToasts((prev) => [...prev, { ...toast, id }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message, duration: 8000 });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      {mounted && typeof document !== 'undefined' && 
        createPortal(
          <ToastContainer toasts={toasts} onRemove={removeToast} />,
          document.body
        )
      }
    </ToastContext.Provider>
  );
}

// =============================================================================
// Toast Container
// =============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-3 p-4 sm:bottom-auto sm:right-0 sm:top-20 sm:w-auto sm:max-w-sm sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

// =============================================================================
// Toast Item
// =============================================================================

const toastStyles: Record<ToastType, { bg: string; border: string; icon: typeof CheckCircle2 }> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/30',
    icon: CheckCircle2,
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-400/30',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/30',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-400/30',
    icon: Info,
  },
};

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  return (
    <div
      role="alert"
      className={clsx(
        'pointer-events-auto w-full animate-in slide-in-from-right-full duration-300',
        'rounded-xl border backdrop-blur-xl shadow-xl',
        'flex items-start gap-3 p-4',
        style.bg,
        style.border
      )}
    >
      <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', iconColors[toast.type])} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm text-foreground-secondary">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 text-foreground-tertiary transition-colors hover:bg-surface hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export { ToastContext };
export type { Toast, ToastType };
