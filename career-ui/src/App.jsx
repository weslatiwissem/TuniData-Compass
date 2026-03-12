import { useState } from 'react'
import SkillInput from './components/SkillInput'
import Results from './components/Results'
import './App.css'

// ── Compass Rose SVG ──────────────────────────────────────
function CompassIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="#e8a020" strokeWidth="1" strokeOpacity="0.4"/>
      <circle cx="16" cy="16" r="9" stroke="#e8a020" strokeWidth="0.5" strokeOpacity="0.25"/>
      {/* N needle */}
      <path d="M16 4 L18 16 L16 14 L14 16 Z" fill="#e8a020"/>
      {/* S needle */}
      <path d="M16 28 L18 16 L16 18 L14 16 Z" fill="#444a60"/>
      {/* Tick marks */}
      <line x1="16" y1="2" x2="16" y2="5" stroke="#e8a020" strokeWidth="1.5" strokeOpacity="0.6"/>
      <line x1="30" y1="16" x2="27" y2="16" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="2"  y1="16" x2="5"  y2="16" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="16" y1="30" x2="16" y2="27" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <circle cx="16" cy="16" r="2" fill="#e8a020"/>
    </svg>
  )
}

export default function App() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async (skills) => {
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('http://localhost:8000/recommend', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ skills, top_n: 3 }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Something went wrong')
      }
      const data = await res.json()
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => { setResults(null); setError(null) }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon"><CompassIcon /></div>
            <div className="logo-text-group">
              <span className="logo-name">Tuni<span>Data</span> Compass</span>
              <span className="logo-sub">Career Intelligence</span>
            </div>
          </div>

          <div className="header-right">
            <div className="header-stat">
              <span className="header-stat-dot" />
              API Online
            </div>
            <div className="header-divider" />
            <div className="header-stat">
              Tunisian Job Market
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main">
        {!results ? (
          <SkillInput onSubmit={handleSubmit} loading={loading} error={error} />
        ) : (
          <Results data={results} onReset={handleReset} />
        )}
      </main>

      {/* ── Footer ── */}
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