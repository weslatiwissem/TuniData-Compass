import { useState, useEffect } from 'react'

<<<<<<< HEAD
// ── Freshness Badge ───────────────────────────────────────
function FreshnessBadge({ freshness, daysOld }) {
  const labels = { fresh: 'Fresh', aging: 'Aging', expired: 'Expired', unknown: 'Unknown' }
  return (
    <span className={`freshness ${freshness}`}>
      <span className="freshness-dot" />
      {labels[freshness] || freshness} · {daysOld}d ago
=======
const API = 'http://localhost:8000'

// ── Tokens (mirrors App.css) ──────────────────────────────
const T = {
  ink2      : '#0e1119',
  ink3      : '#151924',
  ink4      : '#1c2232',
  line      : '#222840',
  lineLight : '#2d3554',
  gold      : '#e8a020',
  goldBright: '#f5b53f',
  goldDim   : 'rgba(232,160,32,0.10)',
  goldGlow  : 'rgba(232,160,32,0.18)',
  goldBorder: 'rgba(232,160,32,0.28)',
  ivory     : '#f0ede6',
  ivoryDim  : '#b8b4aa',
  ivoryMuted: '#666a7a',
  green     : '#3ecf8e',
  greenDim  : 'rgba(62,207,142,0.10)',
  red       : '#f06060',
  redDim    : 'rgba(240,96,96,0.10)',
  yellow    : '#f5c842',
  yellowDim : 'rgba(245,200,66,0.10)',
  fDisplay  : "'Playfair Display', Georgia, serif",
  fUi       : "'Cabinet Grotesk', sans-serif",
  fMono     : "'JetBrains Mono', monospace",
  r         : '10px',
  rSm       : '6px',
}

// ── Freshness Badge ───────────────────────────────────────
function FreshnessBadge({ freshness, daysOld }) {
  const cfg = {
    fresh  : { label: 'Fresh',   color: T.green,  bg: T.greenDim },
    aging  : { label: 'Aging',   color: T.yellow, bg: T.yellowDim },
    expired: { label: 'Expired', color: T.red,    bg: T.redDim },
    unknown: { label: 'Unknown', color: T.ivoryMuted, bg: 'rgba(102,106,122,0.1)' },
  }
  const c = cfg[freshness] || cfg.unknown
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100,
      fontSize: 11, fontFamily: T.fMono,
      background: c.bg, color: c.color,
      border: `1px solid ${c.color}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
      {c.label} · {daysOld}d
>>>>>>> origin/main
    </span>
  )
}

<<<<<<< HEAD
// ── Score Row ─────────────────────────────────────────────
function ScoreRow({ label, value, secondary }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(value * 100), 100)
    return () => clearTimeout(t)
  }, [value])
  return (
    <div className="score-row">
      <span className="score-label">{label}</span>
      <div className="score-bar-wrap">
        <div
          className={`score-bar${secondary ? ' secondary' : ''}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="score-value">{(value * 100).toFixed(0)}%</span>
=======
// ── Animated Bar ──────────────────────────────────────────
function AnimBar({ value, color = T.gold, delay = 0 }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(value * 100), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return (
    <div style={{ flex: 1, height: 4, background: T.ink4, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 4, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
>>>>>>> origin/main
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────
function JobCard({ job, rank }) {
<<<<<<< HEAD
  return (
    <div className="job-card">
      <span className="job-card-rank">#{rank}</span>

      <div>
        <div className="job-title">{job.title}</div>
        <div className="job-meta">
          <span className="job-meta-item">{job.company}</span>
          <span className="job-meta-item">{job.location}</span>
          <span className="job-meta-item">{job.domain}</span>
=======
  const [hovered, setHovered] = useState(false)
  const rankAccent = ['#e8a020', '#8b92a8', '#cd7f32']
  const rc = rankAccent[rank - 1] || T.lineLight

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background   : T.ink2,
        border       : `1px solid ${hovered ? T.lineLight : T.line}`,
        borderRadius : T.r,
        padding      : '24px',
        display      : 'flex',
        flexDirection: 'column',
        gap          : 18,
        transition   : 'border-color 0.2s, transform 0.2s',
        transform    : hovered ? 'translateY(-3px)' : 'translateY(0)',
        position     : 'relative',
        overflow     : 'hidden',
      }}
    >
      {/* Top color accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${rc}, transparent)` }} />

      {/* Rank */}
      <div style={{ position: 'absolute', top: 14, right: 14, fontFamily: T.fMono, fontSize: 10, color: rc, background: rc + '20', border: `1px solid ${rc}30`, padding: '2px 8px', borderRadius: 4 }}>#{rank}</div>

      {/* Title & meta */}
      <div style={{ paddingRight: 36 }}>
        <div style={{ fontFamily: T.fDisplay, fontSize: 17, fontWeight: 700, color: T.ivory, letterSpacing: '-0.3px', marginBottom: 10, lineHeight: 1.3 }}>
          {job.title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {[
            { icon: '🏢', val: job.company },
            { icon: '📍', val: job.location },
            { icon: '🏷', val: job.domain },
          ].map(({ icon, val }, i) => (
            <span key={i} style={{ fontFamily: T.fMono, fontSize: 11, color: T.ivoryDim, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ opacity: 0.6 }}>{icon}</span>{val}
            </span>
          ))}
>>>>>>> origin/main
        </div>
      </div>

      <FreshnessBadge freshness={job.freshness} daysOld={job.days_old} />

<<<<<<< HEAD
      <div>
        <ScoreRow label="Overall"    value={job.score}      />
        <ScoreRow label="Job match"  value={job.job_match}  secondary />
        <ScoreRow label="Domain fit" value={job.domain_fit} secondary />
      </div>

      {job.matched_skills.length > 0 && (
        <div>
          <p className="chips-label">Your matching skills</p>
          <div className="chips">
            {job.matched_skills.map((s, i) => (
              <span key={i} className="chip match">✓ {s}</span>
=======
      {/* Score bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Overall',    value: job.score,      color: T.gold,      delay: 200 },
          { label: 'Job match',  value: job.job_match,  color: T.lineLight, delay: 300 },
          { label: 'Domain fit', value: job.domain_fit, color: T.lineLight, delay: 400 },
        ].map(({ label, value, color, delay }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.ivoryMuted, width: 68, flexShrink: 0 }}>{label}</span>
            <AnimBar value={value} color={color} delay={delay} />
            <span style={{ fontFamily: T.fMono, fontSize: 11, color: color === T.gold ? T.gold : T.ivoryMuted, width: 34, textAlign: 'right', flexShrink: 0 }}>
              {(value * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Matched skills */}
      {job.matched_skills.length > 0 && (
        <div>
          <p style={{ fontFamily: T.fMono, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: T.ivoryMuted, marginBottom: 7 }}>Matching</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {job.matched_skills.map((s, i) => (
              <span key={i} style={{ padding: '3px 9px', borderRadius: 100, fontSize: 11, fontFamily: T.fMono, background: T.greenDim, color: T.green, border: `1px solid ${T.green}25` }}>✓ {s}</span>
>>>>>>> origin/main
            ))}
          </div>
        </div>
      )}

<<<<<<< HEAD
      {job.skill_gaps.length > 0 && (
        <div>
          <p className="chips-label">Skills to work on</p>
          <div className="chips">
            {job.skill_gaps.map((s, i) => (
              <span key={i} className="chip gap">{s}</span>
=======
      {/* Skill gaps */}
      {job.skill_gaps.length > 0 && (
        <div>
          <p style={{ fontFamily: T.fMono, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: T.ivoryMuted, marginBottom: 7 }}>To learn</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {job.skill_gaps.map((s, i) => (
              <span key={i} style={{ padding: '3px 9px', borderRadius: 100, fontSize: 11, fontFamily: T.fMono, background: T.ink4, color: T.ivoryDim, border: `1px solid ${T.line}` }}>{s}</span>
>>>>>>> origin/main
            ))}
          </div>
        </div>
      )}

      {job.expired_warning && (
<<<<<<< HEAD
        <div className="expired-warning">
          ⚠ This posting may be closed — posted {job.days_old} days ago
=======
        <div style={{ background: T.redDim, border: `1px solid ${T.red}25`, borderRadius: T.rSm, padding: '9px 13px', fontSize: 11, color: T.red, fontFamily: T.fMono }}>
          ⚠ Posting may be closed · {job.days_old}d ago
>>>>>>> origin/main
        </div>
      )}

      {job.apply_url && (
<<<<<<< HEAD
        <a
          className="apply-link"
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Job Posting →
        </a>
=======
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', marginTop: 'auto', padding: '10px 16px', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: T.rSm, color: T.ivoryDim, fontFamily: T.fMono, fontSize: 12, textAlign: 'center', textDecoration: 'none', transition: 'all 0.18s' }}
          onMouseEnter={e => { e.target.style.borderColor = T.gold; e.target.style.color = T.gold; e.target.style.background = T.goldDim }}
          onMouseLeave={e => { e.target.style.borderColor = T.line; e.target.style.color = T.ivoryDim; e.target.style.background = 'transparent' }}
        >View Job Posting →</a>
>>>>>>> origin/main
      )}
    </div>
  )
}

// ── Domain Row ────────────────────────────────────────────
function DomainRow({ domain, score, isBest, index }) {
<<<<<<< HEAD
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(score * 100), 100 + index * 60)
    return () => clearTimeout(t)
  }, [score, index])

  return (
    <div className={`domain-row${isBest ? ' best' : ''}`}>
      <div>
        <div className="domain-name">
          {domain}
          {isBest && <span className="best-badge">Best Match</span>}
        </div>
        <div className="domain-bar-wrap">
          <div className="domain-bar" style={{ width: `${width}%` }} />
        </div>
      </div>
      <span className="domain-score">{(score * 100).toFixed(1)}%</span>
=======
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), index * 55); return () => clearTimeout(t) }, [index])

  return (
    <div style={{
      background   : isBest ? `linear-gradient(135deg, ${T.ink2} 0%, rgba(232,160,32,0.05) 100%)` : T.ink2,
      border       : `1px solid ${isBest ? T.goldBorder : T.line}`,
      borderRadius : T.rSm,
      padding      : '16px 20px',
      display      : 'grid',
      gridTemplateColumns: '1fr auto',
      gap          : 16,
      alignItems   : 'center',
      position     : 'relative',
      overflow     : 'hidden',
      transition   : 'transform 0.4s ease, opacity 0.4s ease',
      transform    : ready ? 'translateX(0)' : 'translateX(-12px)',
      opacity      : ready ? 1 : 0,
    }}>
      {/* Left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: isBest ? T.gold : T.lineLight, borderRadius: '3px 0 0 3px' }} />

      <div style={{ paddingLeft: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: T.fUi, fontSize: 14, fontWeight: 500, color: T.ivory }}>{domain}</span>
          {isBest && (
            <span style={{ fontFamily: T.fMono, fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', background: T.goldDim, color: T.gold, border: `1px solid ${T.goldBorder}`, padding: '2px 8px', borderRadius: 4 }}>
              BEST MATCH
            </span>
          )}
        </div>
        <AnimBar value={score} color={isBest ? T.gold : T.lineLight} delay={80 + index * 55} />
      </div>

      <span style={{ fontFamily: T.fMono, fontSize: 15, fontWeight: 500, color: isBest ? T.gold : T.ivoryDim, whiteSpace: 'nowrap', minWidth: 48, textAlign: 'right' }}>
        {(score * 100).toFixed(1)}%
      </span>
>>>>>>> origin/main
    </div>
  )
}

// ── Skill Gap Panel ───────────────────────────────────────
function SkillGapPanel({ domainRanking, inputSkills }) {
<<<<<<< HEAD
  const [selected, setSelected]   = useState(domainRanking[0]?.domain)
  const [gapData, setGapData]     = useState(null)
  const [loading, setLoading]     = useState(false)

  const fetchGap = async (domain) => {
    setSelected(domain)
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/missing-skills', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ skills: inputSkills, domain, top_n: 15 }),
      })
      const data = await res.json()
      setGapData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load best domain on mount
  useEffect(() => {
    if (domainRanking[0]) fetchGap(domainRanking[0].domain)
  }, [])

  return (
    <div>
      <div className="domain-selector">
        {domainRanking.slice(0, 5).map(d => (
          <button
            key={d.domain}
            className={`domain-btn${selected === d.domain ? ' active' : ''}`}
            onClick={() => fetchGap(d.domain)}
          >
            {d.domain}
=======
  const [selected, setSelected] = useState(domainRanking[0]?.domain)
  const [gapData,  setGapData]  = useState(null)
  const [loading,  setLoading]  = useState(false)

  const fetchGap = async (domain) => {
    setSelected(domain); setLoading(true)
    try {
      const res  = await fetch(`${API}/missing-skills`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: inputSkills, domain, top_n: 15 }),
      })
      setGapData(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (domainRanking[0]) fetchGap(domainRanking[0].domain) }, [])

  const levelCfg = {
    critical : { color: T.red,    bg: T.redDim,    border: `${T.red}30`    },
    important: { color: T.yellow, bg: T.yellowDim, border: `${T.yellow}30` },
    useful   : { color: T.ivoryDim, bg: T.ink4,    border: T.line          },
  }

  return (
    <div>
      {/* Domain pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {domainRanking.slice(0, 5).map(d => (
          <button key={d.domain} onClick={() => fetchGap(d.domain)} style={{
            background  : selected === d.domain ? T.goldDim : T.ink2,
            border      : `1px solid ${selected === d.domain ? T.goldBorder : T.line}`,
            borderRadius: 100, padding: '7px 16px',
            color       : selected === d.domain ? T.gold : T.ivoryMuted,
            fontFamily  : T.fMono, fontSize: 11, cursor: 'pointer', transition: 'all 0.18s',
            display     : 'flex', alignItems: 'center', gap: 7,
          }}>
            {d.domain}
            <span style={{ opacity: 0.55, fontSize: 10 }}>{(d.score * 100).toFixed(0)}%</span>
>>>>>>> origin/main
          </button>
        ))}
      </div>

      {loading && (
<<<<<<< HEAD
        <div className="loading-wrap" style={{ padding: '20px 0' }}>
          <div className="spinner" />
=======
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div style={{ width: 26, height: 26, border: `2px solid ${T.line}`, borderTop: `2px solid ${T.gold}`, borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
>>>>>>> origin/main
        </div>
      )}

      {!loading && gapData && (
<<<<<<< HEAD
        <div className="gap-grid">
          {gapData.missing_skills.length === 0 ? (
            <p style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              ✓ You already cover the top skills for this domain!
            </p>
          ) : (
            gapData.missing_skills.map((s, i) => (
              <div key={i} className="gap-card">
                <span className="gap-skill-name">{s.skill}</span>
                <div className="gap-right">
                  <span className="gap-importance">{(s.importance * 100).toFixed(0)}%</span>
                  <span className={`level-badge ${s.level}`}>{s.level}</span>
                </div>
              </div>
            ))
          )}
        </div>
=======
        gapData.missing_skills.length === 0
          ? <div style={{ background: T.greenDim, border: `1px solid ${T.green}25`, borderRadius: T.rSm, padding: '18px 22px', fontFamily: T.fMono, fontSize: 13, color: T.green }}>
              ✓ You already cover the top skills for this domain!
            </div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
              {gapData.missing_skills.map((s, i) => {
                const lc = levelCfg[s.level] || levelCfg.useful
                return (
                  <div key={i} style={{
                    background: T.ink2, border: `1px solid ${T.line}`,
                    borderRadius: T.rSm, padding: '13px 17px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    animation: 'fadeUp 0.3s ease both', animationDelay: `${i * 25}ms`,
                  }}>
                    <span style={{ fontFamily: T.fUi, fontSize: 14, fontWeight: 500, color: T.ivory, flex: 1 }}>{s.skill}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.ivoryMuted }}>{(s.importance * 100).toFixed(0)}%</span>
                      <span style={{ padding: '2px 9px', borderRadius: 100, fontFamily: T.fMono, fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', background: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}>
                        {s.level}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
>>>>>>> origin/main
      )}
    </div>
  )
}

<<<<<<< HEAD
// ── Main Results Component ────────────────────────────────
export default function Results({ data, onReset }) {
  const {
    input_skills,
    unknown_skills,
    expanded_aliases,
    domain_ranking,
    top_jobs,
    fresh_alternatives,
  } = data

  return (
    <div className="results-page">

      {/* Top bar */}
      <div className="results-top">
        <h2 className="results-title">
          Results for <span>{input_skills.join(', ')}</span>
        </h2>
        <button className="reset-btn" onClick={onReset}>← New Search</button>
      </div>

      {/* Skills used */}
      <div className="skills-used">
        {input_skills.map((s, i) => <span key={i} className="tag">{s}</span>)}
      </div>

      {/* Unknown skills warning */}
      {unknown_skills.length > 0 && (
        <div className="unknown-box">
          <strong>⚠ Skipped:</strong> {unknown_skills.join(', ')} — not found in job data.
          Try using full skill names.
        </div>
      )}

      {/* ── Section 1: Domain Ranking ── */}
      <div className="section">
        <div className="section-header">
          <span className="section-number">01</span>
          <h3 className="section-title">Career Domain Ranking</h3>
        </div>
        <div className="domain-list">
          {domain_ranking.map((d, i) => (
            <DomainRow
              key={d.domain}
              domain={d.domain}
              score={d.score}
              isBest={i === 0}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ── Section 2: Top Jobs ── */}
      <div className="section">
        <div className="section-header">
          <span className="section-number">02</span>
          <h3 className="section-title">Top Matching Job Posts</h3>
        </div>
        <div className="jobs-grid">
          {top_jobs.map((job, i) => (
            <JobCard key={i} job={job} rank={i + 1} />
          ))}
        </div>

        {/* Fresh alternatives if any job is expired */}
        {fresh_alternatives.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--text-muted)', marginBottom: 12
            }}>
              FRESH ALTERNATIVES
            </p>
            <div className="alts-list">
              {fresh_alternatives.map((a, i) => (
                <div key={i} className="alt-row">
                  <div className="alt-info">
                    <div className="alt-title">{a.title}</div>
                    <div className="alt-company">{a.company} · {a.location}</div>
                  </div>
                  <div className="alt-right">
                    <FreshnessBadge freshness={a.freshness} daysOld={a.days_old} />
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: 'var(--amber)'
                    }}>
                      {(a.score * 100).toFixed(0)}%
                    </span>
                    {a.apply_url && (
                      <a className="apply-link" style={{ marginTop: 0, padding: '6px 14px' }}
                        href={a.apply_url} target="_blank" rel="noopener noreferrer">
                        View →
                      </a>
                    )}
=======
// ── Section ───────────────────────────────────────────────
function Section({ number, title, children }) {
  return (
    <div style={{ marginBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.line}` }}>
        <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.gold, background: T.goldDim, border: `1px solid ${T.goldBorder}`, padding: '3px 9px', borderRadius: 4, letterSpacing: '1px' }}>
          {String(number).padStart(2, '0')}
        </span>
        <h3 style={{ fontFamily: T.fDisplay, fontSize: 20, fontWeight: 700, color: T.ivory, letterSpacing: '-0.5px' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Main Results ──────────────────────────────────────────
export default function Results({ data, onReset }) {
  const { input_skills, unknown_skills, domain_ranking, top_jobs, fresh_alternatives } = data
  const bestDomain  = domain_ranking[0]?.domain || ''
  const titleSkills = input_skills.slice(0, 3).join(', ')
  const extraCount  = input_skills.length - 3

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', width: '100%', maxWidth: 1100, margin: '0 auto', padding: '48px 40px 80px' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 48, paddingBottom: 40, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            {/* Eyebrow */}
            <p style={{ fontFamily: T.fMono, fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: T.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 20, height: 1, background: T.gold, verticalAlign: 'middle' }} />
              Career Analysis · {input_skills.length} skill{input_skills.length !== 1 ? 's' : ''}
            </p>

            {/* Title */}
            <h1 style={{ fontFamily: T.fDisplay, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: T.ivory, letterSpacing: '-1.5px', lineHeight: 1.15, marginBottom: 12 }}>
              Best match:{' '}
              <span style={{ color: T.gold, fontStyle: 'italic' }}>{bestDomain}</span>
            </h1>

            {/* Subtitle */}
            <p style={{ fontFamily: T.fMono, fontSize: 12, color: T.ivoryMuted }}>
              Based on{' '}
              <span style={{ color: T.ivoryDim }}>{titleSkills}</span>
              {extraCount > 0 && <span style={{ color: T.gold, marginLeft: 5 }}>+{extraCount} more</span>}
            </p>
          </div>

          <button onClick={onReset} style={{
            background: 'transparent', border: `1px solid ${T.line}`,
            borderRadius: T.rSm, padding: '10px 20px',
            color: T.ivoryMuted, fontFamily: T.fMono, fontSize: 11,
            cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.ivoryMuted }}
          >← New Search</button>
        </div>

        {/* Skills pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 20 }}>
          {input_skills.map((s, i) => (
            <span key={i} style={{ background: T.goldDim, border: `1px solid ${T.goldBorder}`, color: T.goldBright, padding: '4px 12px', borderRadius: 100, fontSize: 11, fontFamily: T.fMono }}>
              {s}
            </span>
          ))}
        </div>

        {unknown_skills.length > 0 && (
          <div style={{ marginTop: 16, background: 'rgba(245,200,66,0.06)', border: `1px solid ${T.yellow}25`, borderRadius: T.rSm, padding: '11px 16px', fontSize: 12, color: T.ivoryDim, fontFamily: T.fMono }}>
            <span style={{ color: T.yellow }}>⚠ Skipped:</span> {unknown_skills.join(', ')} — not recognised in job data
          </div>
        )}
      </div>

      {/* ── Section 1: Domains ── */}
      <Section number={1} title="Career Domain Ranking">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {domain_ranking.map((d, i) => (
            <DomainRow key={d.domain} domain={d.domain} score={d.score} isBest={i === 0} index={i} />
          ))}
        </div>
      </Section>

      {/* ── Section 2: Jobs ── */}
      <Section number={2} title="Top Matching Job Posts">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {top_jobs.map((job, i) => <JobCard key={i} job={job} rank={i + 1} />)}
        </div>

        {fresh_alternatives.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontFamily: T.fMono, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: T.ivoryMuted, marginBottom: 12 }}>Fresh Alternatives</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fresh_alternatives.map((a, i) => (
                <div key={i} style={{ background: T.ink2, border: `1px solid ${T.line}`, borderRadius: T.rSm, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: T.fUi, fontSize: 14, fontWeight: 500, color: T.ivory, marginBottom: 3 }}>{a.title}</div>
                    <div style={{ fontFamily: T.fMono, fontSize: 11, color: T.ivoryMuted }}>{a.company} · {a.location}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FreshnessBadge freshness={a.freshness} daysOld={a.days_old} />
                    <span style={{ fontFamily: T.fMono, fontSize: 12, color: T.gold }}>{(a.score * 100).toFixed(0)}%</span>
                    {a.apply_url && <a href={a.apply_url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: T.rSm, color: T.ivoryMuted, fontFamily: T.fMono, fontSize: 11, textDecoration: 'none' }}>View →</a>}
>>>>>>> origin/main
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
<<<<<<< HEAD
      </div>

      {/* ── Section 3: Skill Gap ── */}
      <div className="section">
        <div className="section-header">
          <span className="section-number">03</span>
          <h3 className="section-title">Skills to Learn — by Domain</h3>
        </div>
        <SkillGapPanel
          domainRanking={domain_ranking}
          inputSkills={input_skills}
        />
      </div>

    </div>
  )
}
=======
      </Section>

      {/* ── Section 3: Skill Gaps ── */}
      <Section number={3} title="Skills to Learn — by Domain">
        <SkillGapPanel domainRanking={domain_ranking} inputSkills={input_skills} />
      </Section>
    </div>
  )
}
>>>>>>> origin/main
