// src/context/ToastContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastStack({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            background: t.type === 'success' ? 'var(--green-dim)' :
                        t.type === 'error'   ? 'var(--red-dim)'   : 'var(--ink2)',
            border: `1px solid ${
              t.type === 'success' ? 'rgba(34,200,122,.3)' :
              t.type === 'error'   ? 'rgba(240,96,96,.3)'  : 'var(--line)'}`,
            borderRadius: 'var(--r-sm)',
            padding: '12px 18px',
            color: t.type === 'success' ? 'var(--green)' :
                   t.type === 'error'   ? 'var(--red)'   : 'var(--ivory)',
            fontSize: 13,
            fontFamily: 'var(--f-ui)',
            cursor: 'pointer',
            maxWidth: 340,
            animation: 'slideInRight .25s ease',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '⚠' : 'ℹ'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
