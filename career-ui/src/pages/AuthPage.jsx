// src/pages/AuthPage.jsx
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

  const [loginData, setLoginData] = useState({ email:'', password:'' });
  const [regData,   setRegData]   = useState({
    first_name:'', last_name:'', email:'', password:'', role: ROLE_OPTIONS[0],
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
      onSuccess();          // App.jsx will navigate to dashboard
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!regData.first_name.trim()) { setError('First name is required.');       return; }
    if (!regData.email.trim())      { setError('Email is required.');             return; }
    if (regData.password.length < 6){ setError('Password must be 6+ characters.'); return; }
    setLoading(true);
    try {
      const user = await register({
        ...regData,
        email: regData.email.trim().toLowerCase(),
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
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:20,
      background:'radial-gradient(ellipse at 50% -20%, rgba(232,160,32,.07) 0%, transparent 65%)',
    }}>
      <div style={{ width:'100%', maxWidth:420, background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r)', overflow:'hidden', animation:'fadeUp .3s ease' }}>
        {/* Gold accent */}
        <div style={{ height:3, background:'linear-gradient(90deg, var(--gold), rgba(232,160,32,.3), transparent)' }} />

        <div style={{ padding:36 }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontFamily:'var(--f-display)', fontSize:24, marginBottom:6 }}>
              Welcome to <span style={{ color:'var(--gold)' }}>Compass</span>
            </div>
            <div style={{ color:'var(--ivory3)', fontSize:13 }}>Tunisia's career intelligence platform</div>
          </div>

          {/* Tabs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, background:'var(--ink3)', borderRadius:'var(--r-sm)', padding:3, marginBottom:28 }}>
            {[['login','Sign In'],['register','Create Account']].map(([id,label]) => (
              <button key={id} onClick={() => { setTab(id); setError(''); }} style={{
                padding:9, borderRadius:'calc(var(--r-sm) - 2px)',
                background: tab===id ? 'var(--ink2)':'transparent',
                border:     tab===id ? '1px solid var(--line)':'1px solid transparent',
                color:      tab===id ? 'var(--gold)':'var(--ivory3)',
                fontFamily:'var(--f-mono)', fontSize:12, cursor:'pointer', transition:'all .18s',
              }}>{label}</button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div style={{ background:'var(--red-dim)', border:'1px solid rgba(240,96,96,.3)', borderRadius:'var(--r-sm)', padding:'10px 14px', color:'var(--red)', fontSize:13, fontFamily:'var(--f-mono)', marginBottom:16 }}>
              ⚠ {error}
            </div>
          )}

          {/* Login form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Input label="Email Address" type="email" placeholder="you@example.com"
                value={loginData.email} onChange={e => setLoginData(p=>({...p, email:e.target.value}))} />
              <Input label="Password" type="password" placeholder="••••••••"
                value={loginData.password} onChange={e => setLoginData(p=>({...p, password:e.target.value}))} />
              <div style={{ textAlign:'right', marginTop:-8 }}>
                <span style={{ fontSize:12, color:'var(--gold)', cursor:'pointer', fontFamily:'var(--f-mono)' }}>Forgot password?</span>
              </div>
              <Button type="submit" size="lg" full loading={loading}>Sign In →</Button>
              <p style={{ textAlign:'center', fontSize:12, color:'var(--ivory3)', fontFamily:'var(--f-mono)', marginTop:4 }}>
                Demo: <span style={{ color:'var(--gold)' }}>demo@compass.tn</span> / <span style={{ color:'var(--gold)' }}>demo123</span>
              </p>
            </form>
          )}

          {/* Register form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="First Name" placeholder="Amira"   value={regData.first_name} onChange={e => setRegData(p=>({...p, first_name:e.target.value}))} />
                <Input label="Last Name"  placeholder="Ben Ali" value={regData.last_name}  onChange={e => setRegData(p=>({...p, last_name:e.target.value}))} />
              </div>
              <Input label="Email" type="email" placeholder="you@example.com"
                value={regData.email} onChange={e => setRegData(p=>({...p, email:e.target.value}))} />
              <Input label="Password" type="password" placeholder="Min. 6 characters"
                value={regData.password} onChange={e => setRegData(p=>({...p, password:e.target.value}))} />
              <Select label="Primary Role" options={ROLE_OPTIONS} value={regData.role} onChange={e => setRegData(p=>({...p, role:e.target.value}))} />
              <Button type="submit" size="lg" full loading={loading} style={{ marginTop:4 }}>Create Account →</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
