import { useState, useEffect } from 'react'

// ── Freshness Badge ───────────────────────────────────────
function FreshnessBadge({ freshness, daysOld }) {
  const labels = { fresh: 'Fresh', aging: 'Aging', expired: 'Expired', unknown: 'Unknown' }
  return (
    <span className={`freshness ${freshness}`}>
      <span className="freshness-dot" />
      {labels[freshness] || freshness} · {daysOld}d ago
    </span>
  )
}

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
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────
function JobCard({ job, rank }) {
  return (
    <div className="job-card">
      <span className="job-card-rank">#{rank}</span>

      <div>
        <div className="job-title">{job.title}</div>
        <div className="job-meta">
          <span className="job-meta-item">{job.company}</span>
          <span className="job-meta-item">{job.location}</span>
          <span className="job-meta-item">{job.domain}</span>
        </div>
      </div>

      <FreshnessBadge freshness={job.freshness} daysOld={job.days_old} />

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
            ))}
          </div>
        </div>
      )}

      {job.skill_gaps.length > 0 && (
        <div>
          <p className="chips-label">Skills to work on</p>
          <div className="chips">
            {job.skill_gaps.map((s, i) => (
              <span key={i} className="chip gap">{s}</span>
            ))}
          </div>
        </div>
      )}

      {job.expired_warning && (
        <div className="expired-warning">
          ⚠ This posting may be closed — posted {job.days_old} days ago
        </div>
      )}

      {job.apply_url && (
        <a
          className="apply-link"
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Job Posting →
        </a>
      )}
    </div>
  )
}

// ── Domain Row ────────────────────────────────────────────
function DomainRow({ domain, score, isBest, index }) {
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
    </div>
  )
}

// ── Skill Gap Panel ───────────────────────────────────────
function SkillGapPanel({ domainRanking, inputSkills }) {
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
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-wrap" style={{ padding: '20px 0' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && gapData && (
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
      )}
    </div>
  )
}

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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
