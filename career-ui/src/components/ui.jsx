// src/components/ui.jsx — refined design primitives
import { useState } from 'react';

// ── Button ────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  full = false, disabled = false, loading = false,
  onClick, style = {}, type = 'button',
}) {
  const [hov, setHov] = useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderRadius: 'var(--r-sm)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--f-ui)', fontWeight: 600,
    transition: 'all .18s', whiteSpace: 'nowrap',
    opacity: disabled || loading ? .5 : 1,
    width: full ? '100%' : undefined,
    letterSpacing: '-.1px',
  };
  const sizes = {
    sm: { padding: '6px 14px', fontSize: 12 },
    md: { padding: '9px 18px', fontSize: 13 },
    lg: { padding: '12px 24px', fontSize: 14 },
  };
  const variants = {
    primary: {
      background: hov && !disabled ? 'var(--blue-600)' : 'var(--blue-500)',
      border: 'none', color: '#fff',
      boxShadow: hov && !disabled ? 'var(--shadow-md)' : 'var(--shadow-xs)',
      transform: hov && !disabled ? 'translateY(-1px)' : 'none',
    },
    ghost: {
      background: hov && !disabled ? 'var(--surface-2)' : 'transparent',
      border: '1px solid var(--border-med)',
      color: hov && !disabled ? 'var(--text-primary)' : 'var(--text-secondary)',
    },
    danger: {
      background: hov && !disabled ? 'rgba(240,65,108,.15)' : 'var(--rose-dim)',
      border: '1px solid rgba(240,65,108,.25)',
      color: 'var(--rose)',
    },
    success: {
      background: hov && !disabled ? 'rgba(14,165,114,.15)' : 'var(--emerald-dim)',
      border: '1px solid rgba(14,165,114,.25)',
      color: 'var(--emerald)',
    },
  };
  return (
    <button
      type={type} disabled={disabled || loading} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {loading ? <Spinner size={13} /> : null}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, icon, style = {}, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{
          fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--blue-600)', fontWeight: 500,
        }}>{label}</label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-faint)', fontSize: 15, pointerEvents: 'none',
          }}>{icon}</span>
        )}
        <input
          style={{
            width: '100%', background: 'var(--surface-0)',
            border: `1px solid ${error ? 'var(--rose)' : 'var(--border)'}`,
            borderRadius: 'var(--r-sm)', padding: icon ? '10px 12px 10px 38px' : '10px 12px',
            color: 'var(--text-primary)', fontSize: 14, outline: 'none',
            transition: 'border-color .18s, box-shadow .18s', ...style,
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--rose)', fontFamily: 'var(--f-mono)' }}>{error}</span>
      )}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────
export function Textarea({ label, rows = 4, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{
          fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--blue-600)', fontWeight: 500,
        }}>{label}</label>
      )}
      <textarea rows={rows} style={{
        width: '100%', background: 'var(--surface-0)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--text-primary)',
        fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6,
        transition: 'border-color .18s, box-shadow .18s',
      }} {...props} />
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, options = [], ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{
          fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--blue-600)', fontWeight: 500,
        }}>{label}</label>
      )}
      <select style={{
        width: '100%', background: 'var(--surface-0)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--text-primary)',
        fontSize: 14, outline: 'none', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%235e6c87' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        paddingRight: 36,
      }} {...props}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style = {}, hover = false, onClick, accentColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: 'var(--surface-0)',
        border: `1px solid ${hov ? 'var(--border-med)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        borderTop: accentColor ? `3px solid ${accentColor}` : undefined,
        padding: 24,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all .2s',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: hov ? 'translateY(-2px)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const cfg = {
    green:  { bg: 'rgba(14,165,114,.1)',  color: '#057a53',         border: 'rgba(14,165,114,.25)'  },
    gold:   { bg: 'rgba(245,158,11,.1)',  color: '#b45309',         border: 'rgba(245,158,11,.25)'  },
    blue:   { bg: 'var(--blue-50)',        color: 'var(--blue-700)', border: 'var(--blue-200)'       },
    red:    { bg: 'rgba(240,65,108,.1)',  color: '#b8124a',         border: 'rgba(240,65,108,.25)'  },
    teal:   { bg: 'rgba(20,184,166,.1)',  color: '#0f766e',         border: 'rgba(20,184,166,.25)'  },
    violet: { bg: 'rgba(124,58,237,.1)',  color: '#6d28d9',         border: 'rgba(124,58,237,.25)'  },
    gray:   { bg: 'var(--surface-2)',      color: 'var(--text-secondary)', border: 'var(--border)' },
  };
  const c = cfg[color] || cfg.gray;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 11,
      fontFamily: 'var(--f-mono)', fontWeight: 500,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {children}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ initials, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--blue-500)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.34, flexShrink: 0,
      fontFamily: 'var(--f-mono)', border: '2px solid var(--surface-0)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {initials}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--blue-500)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border)`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin .7s linear infinite', flexShrink: 0,
    }} />
  );
}

// ── Progress bar ───────────────────────────────────────────────
export function ProgressBar({ value, color = 'var(--blue-500)', height = 5 }) {
  return (
    <div style={{ height, background: 'var(--surface-3)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', background: color, borderRadius: height,
        width: `${Math.max(0, Math.min(100, value))}%`,
        transition: 'width 1s cubic-bezier(.16,1,.3,1)',
      }} />
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────
export function Divider({ margin = 20 }) {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: `${margin}px 0` }} />;
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 500 }) {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,20,36,.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn .2s ease',
      }}
    >
      <div style={{
        background: 'var(--surface-0)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: width,
        maxHeight: '88vh', overflowY: 'auto',
        animation: 'fadeUp .25s ease',
      }}>
        <div style={{
          padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{
            fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 400,
            color: 'var(--text-primary)',
          }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', color: 'var(--text-muted)',
            fontSize: 18, cursor: 'pointer', lineHeight: 1,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s',
          }}>×</button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Section title ──────────────────────────────────────────────
export function SectionTitle({ num, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      {num && (
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--blue-700)',
          background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
          padding: '2px 8px', borderRadius: 'var(--r-xs)', fontWeight: 500,
        }}>{num}</span>
      )}
      <span style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 400, color: 'var(--text-primary)' }}>{children}</span>
    </div>
  );
}

// ── Tag pill with remove ───────────────────────────────────────
export function Tag({ children, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 100, fontSize: 11,
      fontFamily: 'var(--f-mono)', fontWeight: 500,
      background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
      color: 'var(--blue-700)',
      animation: 'tagPop .2s cubic-bezier(.34,1.56,.64,1)',
    }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', color: 'var(--blue-400)',
          cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1, opacity: .7,
        }}>×</button>
      )}
    </span>
  );
}

// ── Empty state ────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 'var(--r-lg)',
        background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, margin: '0 auto 16px',
      }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--f-display)', fontSize: 20, marginBottom: 8,
        color: 'var(--text-primary)',
      }}>{title}</div>
      {description && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: action ? 20 : 0, lineHeight: 1.7 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}