import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from '../types';
import { X } from 'lucide-react';

interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto dismiss after 5 seconds if not an undo action
    if (!toast.action) {
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    } else {
      // Even with action, dismiss eventually
      setTimeout(() => {
        removeToast(id);
      }, 8000);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm px-4 md:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center justify-between p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 animate-in slide-in-from-bottom-5
              ${toast.type === 'success' ? 'bg-white dark:bg-slate-800 border-green-500 text-slate-800 dark:text-white' : ''}
              ${toast.type === 'error' ? 'bg-white dark:bg-slate-800 border-red-500 text-slate-800 dark:text-white' : ''}
              ${toast.type === 'info' ? 'bg-white dark:bg-slate-800 border-blue-500 text-slate-800 dark:text-white' : ''}
            `}
          >
            <div className="flex-1 mr-2">
              <h4 className="font-semibold text-sm">{toast.title}</h4>
              {toast.description && <p className="text-xs opacity-90">{toast.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="text-sm font-bold text-corporate-primary dark:text-indigo-400 hover:underline"
                >
                  {toast.action.label}
                </button>
              )}
              <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
