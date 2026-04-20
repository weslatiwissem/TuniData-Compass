// src/components/AuthModal.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth()
  const [mode, setMode]     = useState('login')   // 'login' | 'register'
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [error, setError]   = useState(null)
  const [busy, setBusy]     = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!email || !password) return setError('Email and password are required')
    if (mode === 'register' && !name) return setError('Name is required')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else                  await register(name, email, password)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)', zIndex: 200,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 36, width: '100%', maxWidth: 420,
        zIndex: 201, boxShadow: 'var(--shadow), var(--shadow-amber)',
        animation: 'fadeUp 0.25s ease',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, background: 'transparent',
            border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer',
            lineHeight: 1, padding: 4,
          }}
        >×</button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <span style={{ color: 'var(--amber)', fontSize: 18 }}>◈</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>TuniData Compas</span>
        </div>

        {/* Title */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
          {mode === 'login'
            ? 'Sign in to access your saved CV and profile'
            : 'Join to save your CV and track career progress'}
        </p>

        {/* Toggle tabs */}
        <div style={{
          display: 'flex', background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          overflow: 'hidden', marginBottom: 24,
        }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null) }} style={{
              flex: 1, padding: '10px', border: 'none',
              background: mode === m ? 'var(--amber-glow)' : 'transparent',
              color: mode === m ? 'var(--amber)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
              transition: 'all 0.2s', textTransform: 'capitalize',
              borderRight: m === 'login' ? '1px solid var(--border)' : 'none',
            }}>{m === 'login' ? 'Sign In' : 'Register'}</button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Full Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={handleKey} placeholder="Your name"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey} placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPass(e.target.value)}
              onKeyDown={handleKey} placeholder="••••••••"
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 16, background: 'var(--red-dim)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            color: 'var(--red)', fontSize: 13, fontFamily: 'var(--font-mono)',
          }}>⚠ {error}</div>
        )}

        <button
          onClick={handleSubmit} disabled={busy}
          style={{
            width: '100%', marginTop: 20, padding: 14,
            background: busy ? 'var(--amber-dim)' : 'var(--amber)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: '#0d0f14', fontFamily: 'var(--font-display)',
            fontSize: 15, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { if (!busy) e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,166,35,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          {busy ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </>
  )
}

const inputStyle = {
  width: '100%', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  padding: '11px 14px', color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
}