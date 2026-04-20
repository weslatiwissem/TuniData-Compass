// src/components/ui.jsx  — reusable primitives used across all pages
import { useState } from 'react';

// ── Button ────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  full = false, disabled = false, loading = false,
  onClick, style = {}, type = 'button',
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 7, border: 'none', borderRadius: 'var(--r-sm)', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--f-ui)', fontWeight: 500, transition: 'all .18s',
    whiteSpace: 'nowrap', opacity: disabled || loading ? .5 : 1,
    width: full ? '100%' : undefined,
  };
  const sizes = {
    sm: { padding: '7px 14px', fontSize: 12 },
    md: { padding: '10px 20px', fontSize: 13 },
    lg: { padding: '14px 28px', fontSize: 15, borderRadius: 'var(--r-md)' },
  };
  const variants = {
    primary: { background: 'var(--gold)', color: '#0A0C10' },
    ghost: { background: 'transparent', border: '1px solid var(--line)', color: 'var(--ivory2)' },
    danger: { background: 'var(--red-dim)', border: '1px solid rgba(240,96,96,.25)', color: 'var(--red)' },
    success: { background: 'var(--green-dim)', border: '1px solid rgba(34,200,122,.25)', color: 'var(--green)' },
  };
  return (
    <button
      type={type} disabled={disabled || loading} onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, icon, style = {}, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ivory3)', fontSize: 15, pointerEvents: 'none' }}>{icon}</span>}
        <input
          style={{
            width: '100%', background: 'var(--ink3)', border: `1px solid ${error ? 'var(--red)' : 'var(--line)'}`,
            borderRadius: 'var(--r-sm)', padding: icon ? '11px 14px 11px 40px' : '11px 14px',
            color: 'var(--ivory)', fontSize: 14, outline: 'none', fontFamily: 'var(--f-ui)',
            transition: 'border-color .18s, box-shadow .18s', ...style,
          }}
          {...props}
        />
      </div>
      {error && <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--f-mono)' }}>{error}</span>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────
export function Textarea({ label, rows = 4, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>{label}</label>}
      <textarea rows={rows} style={{
        width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)', padding: '11px 14px', color: 'var(--ivory)',
        fontSize: 14, outline: 'none', fontFamily: 'var(--f-ui)', resize: 'vertical',
        lineHeight: 1.6, transition: 'border-color .18s, box-shadow .18s',
      }} {...props} />
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, options = [], ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>{label}</label>}
      <select style={{
        width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)', padding: '11px 14px', color: 'var(--ivory)',
        fontSize: 14, outline: 'none', fontFamily: 'var(--f-ui)', appearance: 'none',
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
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--ink2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r)', padding: 24,
        borderTop: accentColor ? `3px solid ${accentColor}` : undefined,
        cursor: onClick ? 'pointer' : undefined,
        transition: hover ? 'border-color .2s, transform .2s' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => { e.currentTarget.style.borderColor = 'var(--line2)'; e.currentTarget.style.transform = 'translateY(-2px)'; } : undefined}
      onMouseLeave={hover ? e => { e.currentTarget.style.borderColor = 'var(--line)';  e.currentTarget.style.transform = 'translateY(0)'; } : undefined}
    >
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const cfg = {
    green: { bg: 'var(--green-dim)', color: 'var(--green)', border: 'rgba(34,200,122,.2)' },
    gold: { bg: 'var(--gold-dim)', color: 'var(--gold2)', border: 'var(--gold-border)' },
    blue: { bg: 'var(--blue-dim)', color: 'var(--blue)', border: 'rgba(59,130,246,.2)' },
    red: { bg: 'var(--red-dim)', color: 'var(--red)', border: 'rgba(240,96,96,.2)' },
    teal: { bg: 'var(--teal-dim)', color: 'var(--teal)', border: 'rgba(45,212,191,.2)' },
    gray: { bg: 'rgba(139,146,168,.08)', color: 'var(--ivory2)', border: 'var(--line)' },
  };
  const c = cfg[color] || cfg.gray;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--f-mono)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {children}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ initials, size = 40, color = 'var(--gold-dim)', textColor = 'var(--gold2)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: textColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.32, flexShrink: 0,
      fontFamily: 'var(--f-mono)', border: '2px solid var(--ink)',
    }}>
      {initials}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 22, color = 'var(--gold)' }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid var(--line)`,
      borderTop: `2px solid ${color}`, borderRadius: '50%',
      animation: 'spin .75s linear infinite', flexShrink: 0,
    }} />
  );
}

// ── Progress bar ───────────────────────────────────────────────
export function ProgressBar({ value, color = 'var(--gold)', height = 4 }) {
  return (
    <div style={{ height, background: 'var(--ink4)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', background: color, borderRadius: height, width: `${value}%`, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }} />
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────
export function Divider({ margin = 20 }) {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: `${margin}px 0` }} />;
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 500 }) {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'fadeIn .2s ease',
      }}
    >
      <div style={{
        background: 'var(--ink2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r)', width: '100%', maxWidth: width,
        maxHeight: '88vh', overflowY: 'auto', animation: 'fadeUp .25s ease',
      }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 400 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ivory3)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '0 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Section title ──────────────────────────────────────────────
export function SectionTitle({ num, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      {num && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', padding: '2px 8px', borderRadius: 4 }}>{num}</span>}
      <span style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 400 }}>{children}</span>
    </div>
  );
}

// ── Tag pill with remove ───────────────────────────────────────
export function Tag({ children, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--f-mono)',
      background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', color: 'var(--gold2)',
      animation: 'tagPop .2s cubic-bezier(.34,1.56,.64,1)',
    }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1, opacity: .6 }}>×</button>
      )}
    </span>
  );
}

// ── Empty state ────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: .4 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, marginBottom: 8, color: 'var(--ivory2)' }}>{title}</div>
      {description && <p style={{ color: 'var(--ivory3)', fontSize: 14, marginBottom: action ? 20 : 0 }}>{description}</p>}
      {action}
    </div>
  );
}
