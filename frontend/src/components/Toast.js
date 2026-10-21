import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Icon from './ui/Icon';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((message, type = 'info', ms = 3500) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const api = useRef(null);
  api.current = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error', 5000),
    info: (m) => push(m, 'info'),
  };

  // Stable object so it can be used in effect deps safely.
  const [stable] = useState(() => ({
    success: (m) => api.current.success(m),
    error: (m) => api.current.error(m),
    info: (m) => api.current.info(m),
  }));

  return (
    <ToastContext.Provider value={stable}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon name={t.type === 'success' ? 'checkCircle' : t.type === 'error' ? 'alert' : 'info'} size={15} />
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss"><Icon name="x" size={13} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
