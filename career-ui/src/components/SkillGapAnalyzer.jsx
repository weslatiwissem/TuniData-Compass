// src/components/SkillGapAnalyzer.jsx
import { useState, useEffect } from 'react'

import API from '../api.js'

export default function SkillGapAnalyzer() {
  const [domains, setDomains]     = useState([])
  const [rawInput, setRawInput]   = useState('')
  const [domain, setDomain]       = useState('')
  const [domainSearch, setDomainSearch] = useState('')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [step, setStep]           = useState(1) // 1 = skills, 2 = domain, 3 = results

  useEffect(() => {
    fetch(`${API}/domains`).then(r => r.json()).then(setDomains).catch(() => {})
  }, [])

  const skills = rawInput.split(',').map(s => s.trim()).filter(Boolean)

  const filteredDomains = domains.filter(d =>
    d.toLowerCase().includes(domainSearch.toLowerCase())
  )

  const handleAnalyze = async () => {
    if (!skills.length || !domain) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch(`${API}/missing-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, domain, top_n: 15 }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail) }
      const data = await res.json()
      setResult(data)
      setStep(3)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const levelMeta = {
    critical : { color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(248,113,113,0.25)', icon: '●' },
    important: { color: 'var(--yellow)', bg: 'var(--yellow-dim)', border: 'rgba(251,191,36,0.25)',  icon: '◐' },
    useful   : { color: 'var(--text-secondary)', bg: 'rgba(139,146,168,0.08)', border: 'var(--border)', icon: '○' },
  }

  const coverage = result
    ? Math.round((result.input_skills.length / (result.input_skills.length + result.missing_skills.length)) * 100)
    : 0

  const criticalCount  = result?.missing_skills.filter(s => s.level === 'critical').length  || 0
  const importantCount = result?.missing_skills.filter(s => s.level === 'important').length || 0

  const reset = () => { setStep(1); setResult(null); setError(null); setDomain(''); setRawInput('') }

  return (
    <div style={{ width: '100%', maxWidth: 860, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.2)', padding: '2px 8px', borderRadius: 4 }}>03</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
            Skill Gap <span style={{ color: 'var(--amber)' }}>Analyzer</span>
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
          See exactly what's standing between you and your target role
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 36, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        {[['01', 'Your Skills'], ['02', 'Target Domain'], ['03', 'Gap Report']].map(([n, label], i) => {
          const active = step === i + 1
          const done   = step > i + 1
          return (
            <div key={n} style={{
              flex: 1, padding: '14px 16px',
              background: active ? 'var(--amber-glow)' : done ? 'rgba(52,211,153,0.06)' : 'transparent',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 7px', borderRadius: 4,
                background: active ? 'var(--amber)' : done ? 'var(--green)' : 'var(--border)',
                color: active || done ? '#0d0f14' : 'var(--text-muted)',
              }}>{done ? '✓' : n}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: active ? 'var(--amber)' : done ? 'var(--green)' : 'var(--text-muted)' }}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* STEP 1: Skills */}
      {step === 1 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
          <label className="input-label">Your current skills</label>
          <textarea
            className="input-field"
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="python, sql, machine learning, docker…"
            style={{ minHeight: 100 }}
          />
          <p className="input-hint">Separate with commas · <strong>ml</strong> and <strong>ci/cd</strong> auto-expand</p>
          {skills.length > 0 && (
            <div className="preview-tags" style={{ marginTop: 16 }}>
              {skills.map(s => <span key={s} className="tag">{s}</span>)}
            </div>
          )}
          <button
            className="submit-btn"
            disabled={skills.length === 0}
            onClick={() => setStep(2)}
            style={{ marginTop: 24 }}
          >
            Continue → Choose Domain
          </button>
        </div>
      )}

      {/* STEP 2: Domain selection */}
      {step === 2 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
          <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {skills.slice(0, 6).map(s => <span key={s} className="tag">{s}</span>)}
            <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 100, padding: '4px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>← Edit</button>
          </div>

          <label className="input-label">Target domain</label>
          <input
            className="input-field"
            value={domainSearch}
            onChange={e => setDomainSearch(e.target.value)}
            placeholder="Search domains…"
            style={{ minHeight: 'auto', resize: 'none', marginBottom: 16 }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
            {filteredDomains.map(d => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                style={{
                  background: domain === d ? 'var(--amber-glow)' : 'var(--bg-elevated)',
                  border: `1px solid ${domain === d ? 'rgba(245,166,35,0.5)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                  color: domain === d ? 'var(--amber)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >{d}</button>
            ))}
          </div>

          {error && <div className="error-box" style={{ marginTop: 16 }}>{error}</div>}

          <button
            className="submit-btn"
            disabled={!domain || loading}
            onClick={handleAnalyze}
            style={{ marginTop: 24 }}
          >
            {loading ? 'Analyzing…' : `Analyze gaps for "${domain}"`}
          </button>
        </div>
      )}

      {/* STEP 3: Results */}
      {step === 3 && result && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Coverage', value: `${coverage}%`, sub: 'skills matched', color: coverage >= 60 ? 'var(--green)' : coverage >= 30 ? 'var(--yellow)' : 'var(--red)' },
              { label: 'Critical Gaps', value: criticalCount, sub: 'must-learn skills', color: 'var(--red)' },
              { label: 'Total Missing', value: result.missing_skills.length, sub: `for ${result.domain}`, color: 'var(--amber)' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color, letterSpacing: -2 }}>{value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Your skill coverage for <strong style={{ color: 'var(--amber)' }}>{result.domain}</strong></span>
              <span style={{ color: 'var(--text-muted)' }}>{result.input_skills.length} / {result.input_skills.length + result.missing_skills.length} skills</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${coverage}%`, background: 'linear-gradient(90deg, var(--amber), #f7b84a)', borderRadius: 8, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {result.input_skills.slice(0, 8).map(s => (
                <span key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.2)', padding: '3px 10px', borderRadius: 100 }}>✓ {s}</span>
              ))}
            </div>
          </div>

          {/* Missing skills */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Skills to acquire</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.missing_skills.map((s, i) => {
                const m = levelMeta[s.level] || levelMeta.useful
                return (
                  <div key={s.skill} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '12px 16px', background: m.bg,
                    border: `1px solid ${m.border}`, borderRadius: 'var(--radius-sm)',
                    animation: `fadeUp 0.3s ease ${i * 25}ms both`,
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: m.color, width: 16 }}>{m.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{s.skill}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ width: 80, height: 4, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.importance * 100}%`, background: m.color, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: m.color, width: 56, textAlign: 'right' }}>{Math.round(s.importance * 100)}%</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 100, background: m.bg, border: `1px solid ${m.border}`, color: m.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.level}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button className="reset-btn" onClick={reset} style={{ marginTop: 24 }}>← New Analysis</button>
        </div>
      )}
    </div>
  )
}