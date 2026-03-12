// src/App.jsx
import { useState } from 'react'
import SkillInput from './components/SkillInput'
import Results from './components/Results'
import DomainExplorer from './components/DomainExplorer'
import SkillGapAnalyzer from './components/SkillGapAnalyzer'
import MarketStats from './components/MarketStats'
import CareerComparison from './components/CareerComparison'
import './App.css'

const API = 'http://localhost:8000'

const NAV = [
  { id: 'recommend',   label: '◈ Recommend',   short: 'Recommend' },
  { id: 'explorer',    label: '⬡ Explore',      short: 'Explore' },
  { id: 'gap',         label: '◆ Gap Analysis', short: 'Gap' },
  { id: 'stats',       label: '▦ Market Stats', short: 'Stats' },
  { id: 'compare',     label: '⇌ Compare',      short: 'Compare' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div className="logo">
              <span className="logo-mark">◈</span>
              <span className="logo-text">TuniData Compas</span>
            </div>
            <p className="tagline">AI-powered career matching for the Tunisian job market</p>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', gap: 4 }}>
            {NAV.map(n => (
              <button
                key={n.id}
                onClick={() => handleNavClick(n.id)}
                style={{
                  background   : page === n.id ? 'var(--amber-glow)' : 'transparent',
                  border       : `1px solid ${page === n.id ? 'rgba(245,166,35,0.4)' : 'transparent'}`,
                  borderRadius : 'var(--radius-sm)',
                  padding      : '8px 14px',
                  color        : page === n.id ? 'var(--amber)' : 'var(--text-muted)',
                  fontFamily   : 'var(--font-mono)',
                  fontSize     : 12,
                  cursor       : 'pointer',
                  transition   : 'all 0.2s',
                  whiteSpace   : 'nowrap',
                }}
                onMouseEnter={e => { if (page !== n.id) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}}
                onMouseLeave={e => { if (page !== n.id) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent' }}}
              >
                {n.label}
              </button>
            ))}
          </nav>
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

      <footer className="footer">
        <p>Powered by TF-IDF · Cosine Similarity · FastAPI</p>
      </footer>
    </div>
  )
}