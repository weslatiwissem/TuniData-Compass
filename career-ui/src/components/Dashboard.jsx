import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

// ── Helpers ───────────────────────────────────────────────
const fmt  = (n) => (n * 100).toFixed(1) + '%'
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

const PALETTE = [
  '#f5a623','#34d399','#60a5fa','#f472b6',
  '#a78bfa','#fb923c','#38bdf8','#4ade80',
]
const domainColor = (i) => PALETTE[i % PALETTE.length]

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

function Counter({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let cur = 0
    const step = value / (duration / 16)
    const id = setInterval(() => {
      cur += step
      if (cur >= value) { setDisplay(value); clearInterval(id) }
      else setDisplay(Math.floor(cur))
    }, 16)
    return () => clearInterval(id)
  }, [value, duration])
  return <>{display.toLocaleString()}</>
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 6,
      borderTop: `3px solid ${accent || 'var(--amber)'}`,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2,
        textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 36,
        fontWeight: 800, color: accent || 'var(--amber)', lineHeight: 1 }}>
        <Counter value={value} />
      </span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--text-secondary)' }}>{sub}</span>}
    </div>
  )
}

function Donut({ slices, size = 140 }) {
  const r = 50; const cx = 70; const cy = 70
  const circ = 2 * Math.PI * r
  let offset = 0
  const total = slices.reduce((a, s) => a + s.value, 0)
  if (total === 0) return null
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--bg-elevated)" strokeWidth={18} />
      {slices.map((s, i) => {
        const dash = (s.value / total) * circ
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={18}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'var(--font-display)', fontSize: 20,
          fontWeight: 800, fill: 'var(--text-primary)' }}>
        {total}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
          fill: 'var(--text-muted)', letterSpacing: 1 }}>JOBS</text>
    </svg>
  )
}

function Radar({ skills, size = 220 }) {
  if (!skills || skills.length < 3) return (
    <div style={{ width: size, height: size, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
      fontSize: 12, textAlign: 'center', opacity: 0.5 }}>
      Need ≥3 skills<br />for radar
    </div>
  )
  const cx = size / 2; const cy = size / 2
  const r  = size * 0.35
  const n  = skills.length

  const toXY = (val, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2
    const dist = r * clamp(val, 0, 1)
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }
  const axisEnd = skills.map((_, i) => toXY(1, i))
  const userPts  = skills.map((s, i) => toXY(s.user, i))
  const domPts   = skills.map((s, i) => toXY(s.domain, i))
  const poly = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(lv => (
        <polygon key={lv}
          points={poly(axisEnd.map(([x, y]) => [cx + (x-cx)*lv, cy + (y-cy)*lv]))}
          fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      {axisEnd.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="var(--border)" strokeWidth={1} />
      ))}
      <polygon points={poly(domPts)}
        fill="rgba(245,166,35,0.08)" stroke="rgba(245,166,35,0.35)" strokeWidth={1.5} />
      <polygon points={poly(userPts)}
        fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth={2} />
      {skills.map((s, i) => {
        const [ex, ey] = axisEnd[i]
        const dx = ex - cx; const dy = ey - cy
        const len = Math.sqrt(dx*dx + dy*dy) || 1
        const lx = ex + (dx/len)*20; const ly = ey + (dy/len)*18
        return (
          <text key={i} x={lx} y={ly}
            textAnchor={lx < cx-5 ? 'end' : lx > cx+5 ? 'start' : 'middle'}
            dominantBaseline="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
              fill: 'var(--text-secondary)' }}>
            {s.label.length > 14 ? s.label.slice(0,14)+'…' : s.label}
          </text>
        )
      })}
    </svg>
  )
}

function Section({ num, title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)',
          background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.2)',
          padding: '2px 8px', borderRadius: 4 }}>{num}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18,
          fontWeight: 700, letterSpacing: '-0.5px' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function FreshnessTag({ freshness, daysOld }) {
  const cfg = {
    fresh  : { bg: 'var(--green-dim)',  color: 'var(--green)',  border: 'rgba(52,211,153,0.2)'  },
    aging  : { bg: 'var(--yellow-dim)', color: 'var(--yellow)', border: 'rgba(251,191,36,0.2)'  },
    expired: { bg: 'var(--red-dim)',    color: 'var(--red)',    border: 'rgba(248,113,113,0.2)' },
    unknown: { bg: 'rgba(139,146,168,0.08)', color: 'var(--text-muted)', border: 'var(--border)' },
  }
  const c = cfg[freshness] || cfg.unknown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 11,
      fontFamily: 'var(--font-mono)', background: c.bg,
      color: c.color, border: `1px solid ${c.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%',
        background: 'currentColor', display: 'inline-block' }} />
      {freshness} · {daysOld}d
    </span>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────
export default function Dashboard({ data, onReset }) {
  const [activeTab,   setActiveTab]   = useState('overview')
  const [gapDomain,   setGapDomain]   = useState(null)
  const [gapData,     setGapData]     = useState(null)
  const [gapLoading,  setGapLoading]  = useState(false)

  const { domain_ranking, top_jobs, input_skills, unknown_skills,
          expanded_aliases, fresh_alternatives } = data

  // Auto-select best domain
  useEffect(() => {
    if (domain_ranking?.length) setGapDomain(domain_ranking[0].domain)
  }, [domain_ranking])

  // Fetch gap data when domain changes
  useEffect(() => {
    if (!gapDomain || !input_skills?.length) return
    setGapLoading(true)
    fetch(`${API}/missing-skills`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ skills: input_skills, domain: gapDomain, top_n: 10 }),
    })
      .then(r => r.json())
      .then(setGapData)
      .catch(() => {})
      .finally(() => setGapLoading(false))
  }, [gapDomain, input_skills])

  // ── Derived ──────────────────────────────────────────────
  const bestDomain   = domain_ranking?.[0]
  const freshCount   = top_jobs?.filter(j => j.freshness === 'fresh').length || 0
  const matchedTotal = top_jobs?.reduce((a, j) => a + j.matched_skills.length, 0) || 0

  const freshnessSlices = [
    { label: 'Fresh',   value: top_jobs?.filter(j => j.freshness === 'fresh').length  || 0, color: '#34d399' },
    { label: 'Aging',   value: top_jobs?.filter(j => j.freshness === 'aging').length  || 0, color: '#fbbf24' },
    { label: 'Expired', value: top_jobs?.filter(j => j.freshness === 'expired').length|| 0, color: '#f87171' },
  ].filter(s => s.value > 0)

  const radarSkills = (() => {
    if (!gapData) return []
    const userSet = new Set(input_skills.map(s => s.toLowerCase()))
    return gapData.missing_skills.slice(0, 8).map(s => ({
      label : s.skill,
      user  : userSet.has(s.skill) ? 1 : 0,
      domain: s.importance,
    }))
  })()

  const TABS = [
    { id: 'overview', label: '01 — Overview'      },
    { id: 'skills',   label: '02 — Skill Gaps'    },
    { id: 'career',   label: '03 — Career Paths'  },
  ]

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', width: '100%', maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28,
            fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 }}>
            Career <span style={{ color: 'var(--amber)' }}>Analytics</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            {input_skills.length} skills · {domain_ranking?.length || 0} domains · {top_jobs?.length || 0} jobs
            {unknown_skills?.length > 0 && (
              <span style={{ color: 'var(--yellow)', marginLeft: 12 }}>
                ⚠ {unknown_skills.length} unrecognised: {unknown_skills.join(', ')}
              </span>
            )}
          </p>
        </div>
        <button onClick={onReset} style={{
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 20px',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
          fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.color = 'var(--amber)' }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
        >← New Search</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 40,
        borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${activeTab === t.id ? 'var(--amber)' : 'transparent'}`,
            padding: '10px 22px', marginBottom: -1,
            color: activeTab === t.id ? 'var(--amber)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 0.5,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════ TAB 1 — OVERVIEW ════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Stat strip */}
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16, marginBottom: 48 }}>
            <StatCard label="Domains Matched" value={domain_ranking?.length || 0}
              sub="career fields analysed" accent="var(--amber)" />
            <StatCard label="Jobs Found"      value={top_jobs?.length || 0}
              sub="personalised results"   accent="#60a5fa" />
            <StatCard label="Fresh Jobs"      value={freshCount}
              sub="posted ≤ 30 days ago"   accent="#34d399" />
            <StatCard label="Skills Matched"  value={matchedTotal}
              sub="across all job listings" accent="#a78bfa" />
          </div>

          {/* Best domain spotlight */}
          {bestDomain && (
            <Section num="01" title="Best Domain Match">
              <div style={{
                background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(245,166,35,0.06) 100%)',
                border: '1px solid rgba(245,166,35,0.35)', borderRadius: 'var(--radius)',
                padding: '28px 32px', display: 'grid',
                gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--amber)', letterSpacing: 2, marginBottom: 8 }}>TOP DOMAIN</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32,
                    fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>
                    {bestDomain.domain}
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)',
                    borderRadius: 6, overflow: 'hidden', maxWidth: 400 }}>
                    <div style={{ height: '100%', borderRadius: 6,
                      background: 'var(--amber)', width: fmt(bestDomain.score),
                      transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13,
                    color: 'var(--amber)', marginTop: 8 }}>
                    {fmt(bestDomain.score)} compatibility
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 64,
                    fontWeight: 800, color: 'var(--amber)', lineHeight: 1 }}>
                    {Math.round(bestDomain.score * 100)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-muted)', letterSpacing: 1 }}>MATCH SCORE</div>
                </div>
              </div>
            </Section>
          )}

          {/* Job quality: donut + score breakdown */}
          <Section num="02" title="Job Quality Breakdown">
            <div style={{ display: 'grid',
              gridTemplateColumns: 'auto 1fr', gap: 40, alignItems: 'start' }}>

              {/* Donut + legend */}
              <div style={{ display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 16 }}>
                <Donut slices={freshnessSlices} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Fresh  (≤ 30d)', color: '#34d399' },
                    { label: 'Aging  (≤ 60d)', color: '#fbbf24' },
                    { label: 'Expired (> 60d)', color: '#f87171' },
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%',
                        background: l.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--text-secondary)' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-job score rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {top_jobs?.map((j, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '18px 22px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15,
                          fontWeight: 700, marginBottom: 2 }}>{j.title}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                          color: 'var(--text-muted)' }}>{j.company} · {j.location}</div>
                      </div>
                      <FreshnessTag freshness={j.freshness} daysOld={j.days_old} />
                    </div>
                    {[
                      { label: 'Overall Score', val: j.score      },
                      { label: 'Job Match',     val: j.job_match  },
                      { label: 'Domain Fit',    val: j.domain_fit },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex',
                        alignItems: 'center', gap: 12, marginBottom: 7 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                          color: 'var(--text-muted)', width: 90, flexShrink: 0 }}>
                          {row.label}
                        </span>
                        <div style={{ flex: 1, height: 5, background: 'var(--bg-elevated)',
                          borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 5,
                            background: 'var(--amber)', width: fmt(row.val),
                            transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                          color: 'var(--amber)', width: 42, textAlign: 'right' }}>
                          {fmt(row.val)}
                        </span>
                      </div>
                    ))}
                    {/* Matched / gap chips */}
                    {j.matched_skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {j.matched_skills.map(s => (
                          <span key={s} style={{
                            padding: '3px 10px', borderRadius: 100, fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--green-dim)', color: 'var(--green)',
                            border: '1px solid rgba(52,211,153,0.2)',
                          }}>✓ {s}</span>
                        ))}
                        {j.skill_gaps.slice(0, 3).map(s => (
                          <span key={s} style={{
                            padding: '3px 10px', borderRadius: 100, fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            background: 'rgba(139,146,168,0.08)', color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                          }}>+ {s}</span>
                        ))}
                      </div>
                    )}
                    {j.apply_url && (
                      <a href={j.apply_url} target="_blank" rel="noreferrer" style={{
                        display: 'inline-block', marginTop: 12, padding: '8px 16px',
                        background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)', fontSize: 12,
                        textDecoration: 'none', transition: 'all 0.2s',
                      }}
                        onMouseEnter={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.color = 'var(--amber)' }}
                        onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
                      >Apply →</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Fresh alternatives (if any) */}
          {fresh_alternatives?.length > 0 && (
            <Section num="03" title="Fresh Alternatives">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-secondary)', marginBottom: 16 }}>
                Some top results are expired — here are fresher options:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fresh_alternatives.map((a, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '14px 18px',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{a.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                        color: 'var(--text-muted)' }}>{a.company}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FreshnessTag freshness={a.freshness} daysOld={a.days_old} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                        color: 'var(--amber)' }}>{fmt(a.score)}</span>
                      {a.apply_url && (
                        <a href={a.apply_url} target="_blank" rel="noreferrer" style={{
                          padding: '6px 14px', background: 'transparent',
                          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                          fontSize: 11, textDecoration: 'none',
                        }}>Apply →</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* ════════════════════ TAB 2 — SKILL GAPS ══════════════════ */}
      {activeTab === 'skills' && (
        <>
          {/* Domain selector */}
          <Section num="01" title="Select Target Domain">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {domain_ranking?.slice(0, 14).map(d => (
                <button key={d.domain} onClick={() => setGapDomain(d.domain)} style={{
                  background: gapDomain === d.domain ? 'var(--amber-glow)' : 'var(--bg-card)',
                  border: `1px solid ${gapDomain === d.domain
                    ? 'rgba(245,166,35,0.5)' : 'var(--border)'}`,
                  borderRadius: 100, padding: '7px 16px',
                  color: gapDomain === d.domain ? 'var(--amber)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {d.domain}
                  <span style={{ marginLeft: 6, opacity: 0.55 }}>{fmt(d.score)}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Radar + gap list */}
          {gapLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12,
              color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
              fontSize: 13, padding: '24px 0' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border)',
                borderTop: '2px solid var(--amber)', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite' }} />
              Analysing skill gaps…
            </div>
          )}

          {gapData && !gapLoading && (
            <Section num="02" title={`Skill Gap — ${gapDomain}`}>
              <div style={{ display: 'grid',
                gridTemplateColumns: '260px 1fr', gap: 40, alignItems: 'start' }}>

                {/* Radar */}
                <div style={{ display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 16 }}>
                  <Radar skills={radarSkills} size={230} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Domain profile', color: 'rgba(245,166,35,0.6)' },
                      { label: 'Your coverage',  color: '#34d399' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 3, borderRadius: 3,
                          background: l.color }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                          color: 'var(--text-secondary)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gap cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {gapData.missing_skills.length === 0 ? (
                    <div style={{
                      background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.2)',
                      borderRadius: 'var(--radius-sm)', padding: '20px 24px',
                      color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 13,
                    }}>✓ You already cover all key skills for {gapDomain}!</div>
                  ) : gapData.missing_skills.map((s, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '14px 20px',
                      display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.skill}</div>
                        <div style={{ height: 3, background: 'var(--bg-elevated)',
                          borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
                          <div style={{ height: '100%', borderRadius: 3,
                            background: s.level === 'critical' ? 'var(--red)'
                              : s.level === 'important' ? 'var(--yellow)' : 'var(--border-light)',
                            width: fmt(s.importance),
                            transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                        color: 'var(--text-muted)' }}>{fmt(s.importance)}</span>
                      <span style={{
                        padding: '3px 10px', borderRadius: 100, fontFamily: 'var(--font-mono)',
                        fontSize: 10, fontWeight: 500, letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        background: s.level === 'critical' ? 'var(--red-dim)'
                          : s.level === 'important' ? 'var(--yellow-dim)'
                          : 'rgba(139,146,168,0.08)',
                        color: s.level === 'critical' ? 'var(--red)'
                          : s.level === 'important' ? 'var(--yellow)' : 'var(--text-secondary)',
                        border: `1px solid ${s.level === 'critical'
                          ? 'rgba(248,113,113,0.2)' : s.level === 'important'
                          ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
                      }}>{s.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Skill inventory */}
          <Section num="03" title="Your Skill Inventory">
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {input_skills.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)', border: '1px solid rgba(52,211,153,0.2)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%',
                    background: '#34d399', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{s}</span>
                </div>
              ))}
              {unknown_skills?.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13,
                    textDecoration: 'line-through', color: 'var(--text-muted)' }}>{s}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10,
                    color: 'var(--yellow)', fontFamily: 'var(--font-mono)' }}>unknown</span>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ════════════════════ TAB 3 — CAREER PATHS ═══════════════════ */}
      {activeTab === 'career' && (
        <>
          {/* Full domain ranking */}
          <Section num="01" title="Domain Compatibility Ranking">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {domain_ranking?.map((d, i) => {
                const color = domainColor(i)
                const isBest = i === 0
                return (
                  <div key={d.domain} style={{
                    background: isBest
                      ? 'linear-gradient(135deg, var(--bg-card) 0%, rgba(245,166,35,0.04) 100%)'
                      : 'var(--bg-card)',
                    border: `1px solid ${isBest ? 'rgba(245,166,35,0.35)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '15px 20px',
                    display: 'grid', gridTemplateColumns: '28px 1fr auto',
                    gap: 16, alignItems: 'center', position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: 3, background: isBest ? 'var(--amber)' : color,
                      borderRadius: '3px 0 0 3px' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--text-muted)', paddingLeft: 4 }}>#{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 8 }}>
                        {d.domain}
                        {isBest && (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10,
                            letterSpacing: 1, textTransform: 'uppercase',
                            background: 'var(--amber-glow)', color: 'var(--amber)',
                            border: '1px solid rgba(245,166,35,0.3)',
                            padding: '2px 8px', borderRadius: 4,
                          }}>BEST FIT</span>
                        )}
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-elevated)',
                        borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: isBest ? 'var(--amber)' : color,
                          width: fmt(d.score),
                          transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
                        }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14,
                      fontWeight: 500, color: isBest ? 'var(--amber)' : color,
                      minWidth: 48, textAlign: 'right' }}>
                      {fmt(d.score)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Adjacent opportunities */}
          <Section num="02" title="Adjacent Opportunities">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.8 }}>
              Domains with moderate fit — a few extra skills could unlock them.
              Click any card to analyse the skill gap.
            </p>
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {domain_ranking
                ?.filter(d => d.score > 0.04 && d.score < (bestDomain?.score || 1) * 0.82)
                .slice(0, 6)
                .map((d, i) => (
                  <div key={d.domain}
                    onClick={() => { setGapDomain(d.domain); setActiveTab('skills') }}
                    style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '18px 20px',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{d.domain}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                        color: domainColor(i + 2) }}>{fmt(d.score)}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--bg-elevated)',
                      borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ height: '100%', borderRadius: 3,
                        background: domainColor(i + 2), width: fmt(d.score),
                        transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--amber)' }}>→ analyse skill gaps</span>
                  </div>
                ))}
            </div>
          </Section>

          {/* Expanded aliases info */}
          {Object.keys(expanded_aliases || {}).length > 0 && (
            <Section num="03" title="Skill Aliases Resolved">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(expanded_aliases).map(([alias, full]) => (
                  <div key={alias} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    fontFamily: 'var(--font-mono)', fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--yellow)' }}>{alias}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span style={{ color: 'var(--text-primary)' }}>{full}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}