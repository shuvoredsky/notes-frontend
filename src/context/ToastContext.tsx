'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = nextIdRef.current++;
    const duration = type === 'error' ? 4000 : 3000;

    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      if (next.length > MAX_TOASTS) {
        const oldest = next[0];
        const timer = timersRef.current.get(oldest.id);
        if (timer) {
          clearTimeout(timer);
          timersRef.current.delete(oldest.id);
        }
        return next.slice(next.length - MAX_TOASTS);
      }
      return next;
    });

    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    timersRef.current.set(id, timer);
  }, [removeToast]);

  const success = useCallback((message: string) => {
    addToast('success', message);
  }, [addToast]);

  const error = useCallback((message: string) => {
    addToast('error', message);
  }, [addToast]);

  // Clean up all active timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      {/* Toast container: top-center full-width with margin on mobile, top-right fixed on md+ */}
      <div
        aria-live="polite"
        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : 'status'}
              className={`pointer-events-auto animate-toast border border-l-4 rounded shadow-lg p-3 text-sm flex items-start justify-between gap-3 ${
                isError
                  ? 'bg-red-100 text-red-900 border-red-500 dark:bg-red-900 dark:text-red-50 dark:border-red-500'
                  : 'bg-green-100 text-green-900 border-green-500 dark:bg-green-900 dark:text-green-50 dark:border-green-500'
              }`}
            >
              <div className="flex items-start gap-2">
                {isError ? (
                  <span className="text-red-500 font-bold" aria-hidden="true">✕</span>
                ) : (
                  <span className="text-green-500 font-bold" aria-hidden="true">✓</span>
                )}
                <span className="leading-snug break-words">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer font-bold px-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

