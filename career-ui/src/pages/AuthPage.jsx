// src/pages/AuthPage.jsx — refined professional auth, no emojis
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select } from '../components/ui';

const ROLE_OPTIONS = [
  'Data Engineer', 'Frontend Developer', 'Backend Developer',
  'ML Engineer', 'DevOps Engineer', 'Full Stack Developer',
  'Data Scientist', 'Product Manager', 'UI/UX Designer', 'Cybersecurity Engineer',
];

export default function AuthPage({ initialTab = 'login', onSuccess }) {
  const [tab,     setTab]     = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { login, register }   = useAuth();
  const { push }              = useToast();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData,   setRegData]   = useState({
    first_name: '', last_name: '', email: '', password: '', role: ROLE_OPTIONS[0],
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginData.email)    { setError('Please enter your email.');    return; }
    if (!loginData.password) { setError('Please enter your password.'); return; }
    setLoading(true);
    try {
      const user = await login(loginData.email.trim(), loginData.password);
      push(`Welcome back, ${user.first_name}!`, 'success');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!regData.first_name.trim())  { setError('First name is required.');         return; }
    if (!regData.email.trim())       { setError('Email is required.');               return; }
    if (regData.password.length < 6) { setError('Password must be 6+ characters.'); return; }
    setLoading(true);
    try {
      const user = await register({
        ...regData,
        email:      regData.email.trim().toLowerCase(),
        first_name: regData.first_name.trim(),
        last_name:  regData.last_name.trim(),
      });
      push(`Welcome, ${user.first_name}! Account created.`, 'success');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--surface-1)' }}>

      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px',
        background: 'linear-gradient(160deg, var(--blue-700) 0%, var(--blue-500) 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 300, height: 300,
          borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60, width: 240, height: 240,
          borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none',
        }} />
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="1" fill="none" />
                <path d="M16 7L17.5 16L16 15L14.5 16Z" fill="white" />
                <path d="M16 25L17.5 16L16 17L14.5 16Z" fill="rgba(255,255,255,.5)" />
                <circle cx="16" cy="16" r="2" fill="white" />
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--f-display)', fontSize: 18, color: '#fff', letterSpacing: '-.3px',
            }}>TuniData</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--f-display)', fontSize: 'clamp(28px, 3.5vw, 44px)',
            fontWeight: 400, color: '#fff', lineHeight: 1.15,
            letterSpacing: '-1px', marginBottom: 18,
          }}>
            Find your next<br />
            <em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,.78)' }}>
              career opportunity
            </em>
            <br />in Tunisia
          </h1>

          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,.72)', lineHeight: 1.8,
            maxWidth: 380, marginBottom: 44,
          }}>
            AI-powered job matching for Tunisia's tech market. Upload your CV and get
            matched with the right roles instantly.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              ['1,062+', 'Live Jobs'],
              ['10',     'Career Domains'],
              ['287',    'Skills Tracked'],
            ].map(([num, label]) => (
              <div key={label}>
                <div style={{
                  fontFamily: 'var(--f-display)', fontSize: 26, color: '#fff',
                  letterSpacing: '-0.5px', lineHeight: 1,
                }}>{num}</div>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 10, color: 'rgba(255,255,255,.55)',
                  letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 5,
                }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px',
        background: 'var(--surface-0)',
        borderLeft: '1px solid var(--border)',
      }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp .3s ease' }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 400,
              color: 'var(--text-primary)', letterSpacing: '-.5px', marginBottom: 6,
            }}>
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {tab === 'login'
                ? 'Sign in to your TuniData account'
                : "Join Tunisia's leading career platform"}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3,
            background: 'var(--surface-2)', borderRadius: 'var(--r-sm)',
            padding: 3, marginBottom: 28,
          }}>
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); setError(''); }} style={{
                padding: '9px', borderRadius: 'calc(var(--r-sm) - 2px)',
                background: tab === id ? 'var(--surface-0)' : 'transparent',
                border: tab === id ? '1px solid var(--border)' : '1px solid transparent',
                color: tab === id ? 'var(--blue-600)' : 'var(--text-muted)',
                fontFamily: 'var(--f-mono)', fontSize: 12, cursor: 'pointer',
                transition: 'all .18s', fontWeight: tab === id ? 500 : 400,
                boxShadow: tab === id ? 'var(--shadow-xs)' : 'none',
              }}>{label}</button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--rose-dim)', border: '1px solid rgba(240,65,108,.3)',
              borderLeft: '3px solid var(--rose)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
              color: 'var(--rose)', fontSize: 13, fontFamily: 'var(--f-mono)',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Login form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Email Address" type="email" placeholder="you@example.com"
                value={loginData.email}
                onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} />
              <Input label="Password" type="password" placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} />
              <div style={{ textAlign: 'right', marginTop: -8 }}>
                <span style={{
                  fontSize: 12, color: 'var(--blue-500)',
                  cursor: 'pointer', fontFamily: 'var(--f-mono)', fontWeight: 500,
                }}>Forgot password?</span>
              </div>
              <Button type="submit" size="lg" full loading={loading}>
                Sign In
              </Button>
              <div style={{
                textAlign: 'center', padding: '12px 14px', background: 'var(--surface-1)',
                borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--text-muted)',
                fontFamily: 'var(--f-mono)', border: '1px solid var(--border)',
              }}>
                Demo account:{' '}
                <span style={{ color: 'var(--blue-600)', fontWeight: 500 }}>demo@compass.tn</span>
                {' '}·{' '}
                <span style={{ color: 'var(--blue-600)', fontWeight: 500 }}>demo123</span>
              </div>
            </form>
          )}

          {/* Register form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="First Name" placeholder="Amira"
                  value={regData.first_name}
                  onChange={e => setRegData(p => ({ ...p, first_name: e.target.value }))} />
                <Input label="Last Name" placeholder="Ben Ali"
                  value={regData.last_name}
                  onChange={e => setRegData(p => ({ ...p, last_name: e.target.value }))} />
              </div>
              <Input label="Email" type="email" placeholder="you@example.com"
                value={regData.email}
                onChange={e => setRegData(p => ({ ...p, email: e.target.value }))} />
              <Input label="Password" type="password" placeholder="Min. 6 characters"
                value={regData.password}
                onChange={e => setRegData(p => ({ ...p, password: e.target.value }))} />
              <Select label="Primary Role" options={ROLE_OPTIONS}
                value={regData.role}
                onChange={e => setRegData(p => ({ ...p, role: e.target.value }))} />
              <Button type="submit" size="lg" full loading={loading} style={{ marginTop: 4 }}>
                Create Account
              </Button>
            </form>
          )}

          {/* Switch prompt */}
          <p style={{
            textAlign: 'center', fontSize: 13, color: 'var(--text-muted)',
            marginTop: 24, fontFamily: 'var(--f-mono)',
          }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span
              onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); }}
              style={{ color: 'var(--blue-500)', cursor: 'pointer', fontWeight: 500 }}
            >
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}