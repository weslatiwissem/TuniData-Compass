// src/components/CareerComparison.jsx
import { useState, useEffect } from 'react'

import API from '../api.js'

const COLORS = ['var(--amber)', '#60a5fa', '#34d399']
const COLORS_DIM = ['var(--amber-glow)', 'rgba(96,165,250,0.12)', 'rgba(52,211,153,0.12)']
const COLORS_BORDER = ['rgba(245,166,35,0.35)', 'rgba(96,165,250,0.3)', 'rgba(52,211,153,0.3)']

export default function CareerComparison() {
  const [domains, setDomains]      = useState([])
  const [rawInput, setRawInput]    = useState('')
  const [picks, setPicks]          = useState([])
  const [search, setSearch]        = useState('')
  const [results, setResults]      = useState([])
  const [loading, setLoading]      = useState(false)
  const [error, setError]          = useState(null)
  const [analyzed, setAnalyzed]    = useState(false)

  useEffect(() => {
    fetch(`${API}/domains`).then(r => r.json()).then(setDomains).catch(() => {})
  }, [])

  const skills       = rawInput.split(',').map(s => s.trim()).filter(Boolean)
  const filteredDoms = domains.filter(d => d.toLowerCase().includes(search.toLowerCase()) && !picks.includes(d))

  const togglePick = (d) => {
    if (picks.includes(d)) setPicks(picks.filter(p => p !== d))
    else if (picks.length < 3) setPicks([...picks, d])
  }

  const handleCompare = async () => {
    if (!skills.length || picks.length < 2) return
    setLoading(true); setError(null); setResults([])
    try {
      const fetches = picks.map(domain =>
        fetch(`${API}/missing-skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills, domain, top_n: 20 }),
        }).then(r => r.json())
      )
      const data = await Promise.all(fetches)
      setResults(data)
      setAnalyzed(true)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const reset = () => { setAnalyzed(false); setResults([]); setPicks([]); setRawInput('') }

  // Compute coverage per domain
  const coverages = results.map(r => {
    const total = (r.input_skills?.length || 0) + (r.missing_skills?.length || 0)
    return total ? Math.round((r.input_skills.length / total) * 100) : 0
  })

  // Find shared missing skills (appear in 2+ domains)
  const allMissing = results.flatMap(r => r.missing_skills?.map(s => s.skill) || [])
  const skillFreq  = allMissing.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})
  const sharedSkills = Object.entries(skillFreq).filter(([, c]) => c >= 2).map(([s]) => s)

  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.2)', padding: '2px 8px', borderRadius: 4 }}>05</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
            Career Path <span style={{ color: 'var(--amber)' }}>Comparison</span>
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
          Compare your fit across 2–3 domains simultaneously
        </p>
      </div>

      {!analyzed ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Left: skills */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28 }}>
            <label className="input-label">Your skills</label>
            <textarea
              className="input-field"
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder="python, sql, docker, react…"
              style={{ minHeight: 90 }}
            />
            <p className="input-hint">Comma-separated · <strong>ml</strong>, <strong>ci/cd</strong> supported</p>
            {skills.length > 0 && (
              <div className="preview-tags" style={{ marginTop: 12 }}>
                {skills.map(s => <span key={s} className="tag">{s}</span>)}
              </div>
            )}

            {/* Selected domains display */}
            {picks.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Comparing</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {picks.map((p, i) => (
                    <div key={p} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                      background: COLORS_DIM[i], border: `1px solid ${COLORS_BORDER[i]}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i], display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: COLORS[i] }}>{p}</span>
                      </div>
                      <button onClick={() => togglePick(p)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="error-box" style={{ marginTop: 16 }}>{error}</div>}

            <button
              className="submit-btn"
              disabled={skills.length === 0 || picks.length < 2 || loading}
              onClick={handleCompare}
              style={{ marginTop: 24 }}
            >
              {loading ? 'Comparing…' : picks.length < 2 ? `Pick ${2 - picks.length} more domain${2 - picks.length !== 1 ? 's' : ''}` : `Compare ${picks.length} Domains`}
            </button>
          </div>

          {/* Right: domain picker */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28 }}>
            <label className="input-label">Pick 2–3 domains {picks.length > 0 && <span style={{ color: 'var(--text-muted)' }}>({picks.length}/3 selected)</span>}</label>
            <input
              className="input-field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search domains…"
              style={{ minHeight: 'auto', marginBottom: 12, resize: 'none' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
              {filteredDoms.map(d => (
                <button
                  key={d}
                  onClick={() => togglePick(d)}
                  disabled={picks.length >= 3 && !picks.includes(d)}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                    color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12,
                    cursor: picks.length >= 3 ? 'not-allowed' : 'pointer', textAlign: 'left',
                    opacity: picks.length >= 3 ? 0.4 : 1, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (picks.length < 3) e.currentTarget.style.borderColor = 'var(--border-light)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >{d}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>

          {/* Coverage comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${picks.length}, 1fr)`, gap: 16, marginBottom: 28 }}>
            {results.map((r, i) => (
              <div key={r.domain} style={{
                background: 'var(--bg-card)', border: `1px solid ${COLORS_BORDER[i]}`,
                borderRadius: 'var(--radius)', padding: 24,
                boxShadow: i === coverages.indexOf(Math.max(...coverages)) ? `0 0 30px ${COLORS_DIM[i]}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS[i], flex: 1 }}>{r.domain}</span>
                  {i === coverages.indexOf(Math.max(...coverages)) && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: COLORS[i], background: COLORS_DIM[i], border: `1px solid ${COLORS_BORDER[i]}`, padding: '2px 6px', borderRadius: 4, letterSpacing: 1 }}>BEST FIT</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, color: COLORS[i], letterSpacing: -3, lineHeight: 1 }}>{coverages[i]}%</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 6, marginBottom: 14 }}>skill coverage</div>
                <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${coverages[i]}%`, background: COLORS[i], borderRadius: 6, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                </div>
                <div style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {r.missing_skills?.filter(s => s.level === 'critical').length || 0} critical gap{r.missing_skills?.filter(s => s.level === 'critical').length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Shared skills banner */}
          {sharedSkills.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                🎯 Skills needed across ALL selected domains (highest ROI to learn)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sharedSkills.map(s => (
                  <span key={s} style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, padding: '5px 14px',
                    borderRadius: 100, background: 'var(--amber-glow)',
                    border: '1px solid rgba(245,166,35,0.35)', color: 'var(--amber)',
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-side missing skills */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Missing skills comparison</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${picks.length}, 1fr)`, gap: 16 }}>
              {results.map((r, i) => (
                <div key={r.domain}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 1, background: COLORS[i] }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS[i] }}>{r.domain}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {r.missing_skills?.slice(0, 10).map(s => {
                      const isShared = sharedSkills.includes(s.skill)
                      return (
                        <div key={s.skill} style={{
                          padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                          background: isShared ? 'var(--amber-glow2)' : 'var(--bg-elevated)',
                          border: `1px solid ${isShared ? 'rgba(245,166,35,0.2)' : 'var(--border)'}`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isShared ? 'var(--amber)' : 'var(--text-secondary)', flex: 1 }}>{s.skill}</span>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 9,
                            padding: '1px 6px', borderRadius: 100, textTransform: 'uppercase',
                            background: s.level === 'critical' ? 'var(--red-dim)' : s.level === 'important' ? 'var(--yellow-dim)' : 'transparent',
                            color: s.level === 'critical' ? 'var(--red)' : s.level === 'important' ? 'var(--yellow)' : 'var(--text-muted)',
                            border: s.level === 'critical' ? '1px solid rgba(248,113,113,0.2)' : s.level === 'important' ? '1px solid rgba(251,191,36,0.2)' : '1px solid var(--border)',
                          }}>{s.level}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="reset-btn" onClick={reset} style={{ marginTop: 24 }}>← New Comparison</button>
        </div>
      )}
    </div>
  )
}