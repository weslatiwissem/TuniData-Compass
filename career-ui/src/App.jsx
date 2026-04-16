// src/App.jsx
import { useState } from 'react'
import SkillInput from './components/SkillInput'
import Results from './components/Results'
import DomainExplorer from './components/DomainExplorer'
import SkillGapAnalyzer from './components/SkillGapAnalyzer'
import MarketStats from './components/MarketStats'
import CareerComparison from './components/CareerComparison'
import './App.css'

import API from './api.js'

// ── Compass Rose SVG (from coworker) ─────────────────────
function CompassIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="#e8a020" strokeWidth="1" strokeOpacity="0.4"/>
      <circle cx="16" cy="16" r="9" stroke="#e8a020" strokeWidth="0.5" strokeOpacity="0.25"/>
      <path d="M16 4 L18 16 L16 14 L14 16 Z" fill="#e8a020"/>
      <path d="M16 28 L18 16 L16 18 L14 16 Z" fill="#444a60"/>
      <line x1="16" y1="2" x2="16" y2="5" stroke="#e8a020" strokeWidth="1.5" strokeOpacity="0.6"/>
      <line x1="30" y1="16" x2="27" y2="16" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="2"  y1="16" x2="5"  y2="16" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="16" y1="30" x2="16" y2="27" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <circle cx="16" cy="16" r="2" fill="#e8a020"/>
    </svg>
  )
}

const NAV = [
  { id: 'recommend', label: '◈ Recommend' },
  { id: 'explorer',  label: '⬡ Explore'   },
  { id: 'gap',       label: '◆ Gap Analysis' },
  { id: 'stats',     label: '▦ Market Stats' },
  { id: 'compare',   label: '⇌ Compare'   },
]

export default function App() {
  const [page, setPage]       = useState('recommend')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

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
    finally { setLoading(false) }
  }

  const handleReset = () => { setResults(null); setError(null) }

  const handleNavClick = (id) => {
    setPage(id)
    if (id === 'recommend') handleReset()
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

          {/* Logo — coworker's version */}
          <div className="logo">
            <div className="logo-icon"><CompassIcon /></div>
            <div className="logo-text-group">
              <span className="logo-name">Tuni<span>Data</span> Compass</span>
              <span className="logo-sub">Career Intelligence</span>
            </div>
          </div>

          {/* Nav — your new pages */}
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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

          {/* Status indicator — coworker's version */}
          <div className="header-right">
            <div className="header-stat">
              <span className="header-stat-dot" />
              API Online
            </div>
            <div className="header-divider" />
            <div className="header-stat">Tunisian Job Market</div>
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
      </main>

      {/* Footer — coworker's version */}
      <footer className="footer">
        <div className="footer-left">
          <span>TF-IDF · Cosine Similarity</span>
          <span className="footer-sep">·</span>
          <span>FastAPI · React</span>
        </div>
        <div className="footer-right">TuniData Compass © 2025</div>
      </footer>
    </div>
  )
}