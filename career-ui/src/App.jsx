// src/App.jsx
import { useState } from 'react'
import SkillInput       from './components/SkillInput'
import Results          from './components/Results'
import DomainExplorer   from './components/DomainExplorer'
import SkillGapAnalyzer from './components/SkillGapAnalyzer'
import MarketStats      from './components/MarketStats'
import CareerComparison from './components/CareerComparison'
import ProfilePage      from './components/ProfilePage'
import AuthModal        from './components/AuthModal'
import { useAuth }      from './context/AuthContext'
import './App.css'
import API from './api.js'

const NAV = [
  { id: 'recommend', label: '◈ Recommend', short: 'Recommend' },
  { id: 'explorer',  label: '⬡ Explore',   short: 'Explore'  },
  { id: 'gap',       label: '◆ Gap',        short: 'Gap'      },
  { id: 'stats',     label: '▦ Stats',      short: 'Stats'    },
  { id: 'compare',   label: '⇌ Compare',    short: 'Compare'  },
]

export default function App() {
  const { user, logout, loading: authLoading } = useAuth()

  const [page, setPage]         = useState('recommend')
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  const handleSubmit = async (skills) => {
    setLoading(true); setError(null); setResults(null)
    try {
      const res = await fetch(`${API}/recommend`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ skills, top_n: 3 }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Something went wrong') }
      setResults(await res.json())
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }

  const handleReset = () => { setResults(null); setError(null) }

  const handleNavClick = (id) => {
    setPage(id)
    if (id === 'recommend') handleReset()
  }

  if (authLoading) return null   // avoid flash

  return (
    <div className="app">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <header className="header">
        <div className="header-inner" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

          {/* Logo + tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div className="logo">
              <span className="logo-mark">◈</span>
              <span className="logo-text">TuniData Compas</span>
            </div>
            <p className="tagline">AI-powered career matching for the Tunisian job market</p>
          </div>

          {/* Nav + auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <nav style={{ display: 'flex', gap: 4 }}>
              {NAV.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNavClick(n.id)}
                  style={{
                    background  : page === n.id ? 'var(--amber-glow)' : 'transparent',
                    border      : `1px solid ${page === n.id ? 'rgba(245,166,35,0.4)' : 'transparent'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding     : '8px 14px',
                    color       : page === n.id ? 'var(--amber)' : 'var(--text-muted)',
                    fontFamily  : 'var(--font-mono)',
                    fontSize    : 12,
                    cursor      : 'pointer',
                    transition  : 'all 0.2s',
                    whiteSpace  : 'nowrap',
                  }}
                  onMouseEnter={e => { if (page !== n.id) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}}
                  onMouseLeave={e => { if (page !== n.id) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent' }}}
                >
                  {n.label}
                </button>
              ))}
            </nav>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

            {/* Auth area */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Profile button */}
                <button
                  onClick={() => setPage('profile')}
                  style={{
                    display     : 'flex', alignItems: 'center', gap: 8,
                    background  : page === 'profile' ? 'var(--amber-glow)' : 'var(--bg-elevated)',
                    border      : `1px solid ${page === 'profile' ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '7px 12px',
                    color       : page === 'profile' ? 'var(--amber)' : 'var(--text-secondary)',
                    fontFamily  : 'var(--font-mono)', fontSize: 12,
                    cursor      : 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: 'var(--amber)', flexShrink: 0,
                  }}>
                    {user.name?.slice(0,1).toUpperCase()}
                  </span>
                  {user.name?.split(' ')[0]}
                </button>

                {/* Logout */}
                <button
                  onClick={logout}
                  title="Sign out"
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '7px 10px',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                    fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >Sign out</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  background: 'var(--amber)', border: 'none',
                  borderRadius: 'var(--radius-sm)', padding: '8px 18px',
                  color: '#0d0f14', fontFamily: 'var(--font-display)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f7b84a'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,166,35,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.boxShadow = 'none' }}
              >Sign In</button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {page === 'recommend' && (
          !results
            ? <SkillInput onSubmit={handleSubmit} loading={loading} error={error} />
            : <Results data={results} onReset={handleReset} />
        )}
        {page === 'explorer' && <DomainExplorer />}
        {page === 'gap'      && <SkillGapAnalyzer />}
        {page === 'stats'    && <MarketStats />}
        {page === 'compare'  && <CareerComparison />}
        {page === 'profile'  && (
          user
            ? <ProfilePage />
            : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Sign in to view your profile
                </p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="submit-btn"
                  style={{ width: 'auto', padding: '12px 32px' }}
                >Sign In / Register</button>
              </div>
            )
        )}
      </main>

      <footer className="footer">
        <p>Powered by TF-IDF · Cosine Similarity · FastAPI</p>
      </footer>
    </div>
  )
}