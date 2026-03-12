// src/components/DomainExplorer.jsx
import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

export default function DomainExplorer() {
  const [domains, setDomains]       = useState([])
  const [selected, setSelected]     = useState(null)
  const [gapData, setGapData]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    fetch(`${API}/domains`)
      .then(r => r.json())
      .then(d => { setDomains(d); setInitLoading(false) })
      .catch(() => setInitLoading(false))
  }, [])

  const handleSelect = async (domain) => {
    if (selected === domain) { setSelected(null); setGapData(null); return }
    setSelected(domain)
    setGapData(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/missing-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: [], domain, top_n: 12 }),
      })
      const data = await res.json()
      setGapData(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const filtered = domains.filter(d => d.toLowerCase().includes(search.toLowerCase()))

  const levelColor = {
    critical : { bg: 'var(--red-dim)',    border: 'rgba(248,113,113,0.25)', text: 'var(--red)',    label: 'Critical' },
    important: { bg: 'var(--yellow-dim)', border: 'rgba(251,191,36,0.25)',  text: 'var(--yellow)', label: 'Important' },
    useful   : { bg: 'rgba(139,146,168,0.08)', border: 'var(--border)',     text: 'var(--text-secondary)', label: 'Useful' },
  }

  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.2)', padding: '2px 8px', borderRadius: 4 }}>02</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
            Domain <span style={{ color: 'var(--amber)' }}>Explorer</span>
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
          Click any domain to reveal its top required skills
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>⌕</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter domains…"
          style={{
            width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '12px 18px 12px 38px',
            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13,
            outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--amber)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {initLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {filtered.map((domain, i) => {
            const isActive = selected === domain
            return (
              <button
                key={domain}
                onClick={() => handleSelect(domain)}
                style={{
                  background   : isActive ? 'var(--amber-glow)' : 'var(--bg-card)',
                  border       : `1px solid ${isActive ? 'rgba(245,166,35,0.5)' : 'var(--border)'}`,
                  borderRadius : 'var(--radius-sm)',
                  padding      : '14px 16px',
                  color        : isActive ? 'var(--amber)' : 'var(--text-secondary)',
                  fontFamily   : 'var(--font-mono)',
                  fontSize     : 12,
                  cursor       : 'pointer',
                  textAlign    : 'left',
                  transition   : 'all 0.2s',
                  animationDelay: `${i * 20}ms`,
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)' }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}}
              >
                <span style={{ fontSize: 10, color: isActive ? 'var(--amber-dim)' : 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {domain}
                {isActive && <span style={{ float: 'right', fontSize: 10 }}>▾</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Skill panel */}
      {selected && (
        <div style={{
          marginTop    : 32,
          background   : 'var(--bg-card)',
          border       : '1px solid rgba(245,166,35,0.3)',
          borderRadius : 'var(--radius)',
          padding      : 32,
          animation    : 'fadeUp 0.3s ease',
          boxShadow    : 'var(--shadow-amber)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Top Skills Required</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>{selected}</h3>
            </div>
            <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {['critical', 'important', 'useful'].map(l => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, color: levelColor[l].text }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: levelColor[l].text, display: 'inline-block' }} />
                  {levelColor[l].label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : gapData?.missing_skills?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {gapData.missing_skills.map((s, i) => {
                const c = levelColor[s.level] || levelColor.useful
                return (
                  <div key={s.skill} style={{
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, animation: `fadeUp 0.3s ease ${i * 30}ms both`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{s.skill}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ width: 48, height: 4, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.importance * 100}%`, background: c.text, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c.text, padding: '2px 8px', borderRadius: 100, background: c.bg, border: `1px solid ${c.border}` }}>
                        {c.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center', padding: 32 }}>No skill data available for this domain.</p>
          )}
        </div>
      )}
    </div>
  )
}