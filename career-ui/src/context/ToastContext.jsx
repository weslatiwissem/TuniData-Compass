// src/context/ToastContext.jsx — refined toast, no emojis
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

  const cfg = {
    success: {
      bg: '#f0fdf9',
      border: 'rgba(14,165,114,.28)',
      color: '#065f46',
      barColor: '#0ea572',
    },
    error: {
      bg: '#fff1f4',
      border: 'rgba(240,65,108,.28)',
      color: '#881337',
      barColor: '#f0416c',
    },
    info: {
      bg: '#eff4ff',
      border: 'rgba(37,87,240,.22)',
      color: '#1e3a8a',
      barColor: '#2557f0',
    },
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
    }}>
      {toasts.map(t => {
        const c = cfg[t.type] || cfg.info;
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.barColor}`,
              borderRadius: '10px',
              padding: '13px 18px',
              color: c.color,
              fontSize: 13,
              fontFamily: 'var(--f-ui)',
              cursor: 'pointer',
              maxWidth: 340,
              minWidth: 260,
              animation: 'slideInRight .25s cubic-bezier(.16,1,.3,1)',
              boxShadow: '0 4px 14px rgba(13,20,36,.09)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}