<<<<<<< HEAD
import { useState } from 'react'

export default function SkillInput({ onSubmit, loading, error }) {
  const [input, setInput] = useState('')

  const parsedSkills = input
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)

  const handleSubmit = () => {
    if (parsedSkills.length === 0) return
    onSubmit(parsedSkills)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="input-page">
      <div className="input-hero">
        <h1>
          Find your <br />career match
        </h1>
        <p>
          Enter your skills and our we will match you to the right
          career domain, most relevant job postings,
          
        </p>
      </div>

      <div className="input-card">
        <label className="input-label">Your Skills</label>
        <textarea
          className="input-field"
          placeholder="python, machine learning, sql, docker..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <p className="input-hint">
          Separate skills with commas &nbsp;·&nbsp;
          
        </p>

        {parsedSkills.length > 0 && (
          <div className="preview-tags">
            {parsedSkills.map((s, i) => (
              <span key={i} className="tag">{s}</span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            <p>Analyzing your skills...</p>
          </div>
        ) : (
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={parsedSkills.length === 0}
          >
            Analyze My Skills →
          </button>
        )}

        {error && (
          <div className="error-box">⚠ {error}</div>
        )}
=======
import { useState, useRef } from 'react'

const API = 'http://localhost:8000'

const MODES = [
  { id: 'cv',     icon: '📄', label: 'Upload CV'   },
  { id: 'text',   icon: '✍️',  label: 'Write Text'  },
  { id: 'manual', icon: '⌨️',  label: 'Type Skills' },
]

// ── Skill Tag ─────────────────────────────────────────────
function SkillTag({ skill, onRemove }) {
  return (
    <span className="skill-tag">
      {skill}
      {onRemove && (
        <button className="skill-tag-remove" onClick={() => onRemove(skill)}>×</button>
      )}
    </span>
  )
}

// ── Confirm Step ──────────────────────────────────────────
function ConfirmSkills({ skills, onConfirm, onBack, loading }) {
  const [confirmed, setConfirmed] = useState(skills)
  const [input, setInput]         = useState('')

  const remove = s => setConfirmed(p => p.filter(x => x !== s))
  const add = () => {
    const t = input.trim().toLowerCase()
    if (t && !confirmed.includes(t)) setConfirmed(p => [...p, t])
    setInput('')
  }
  const handleKey = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700 }}>Skills Extracted</span>
        </div>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory-muted)' }}>
          {confirmed.length} skill{confirmed.length !== 1 ? 's' : ''} found — remove false positives or add missing ones
        </p>
      </div>

      {/* Tags */}
      <div style={{
        background: 'var(--ink-3)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)', padding: 16, minHeight: 72,
        display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14,
      }}>
        {confirmed.length === 0
          ? <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory-muted)' }}>No skills — add some below</span>
          : confirmed.map(s => <SkillTag key={s} skill={s} onRemove={remove} />)
        }
      </div>

      {/* Add input */}
      <div className="add-row" style={{ marginBottom: 20 }}>
        <input className="add-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} placeholder="Add a missing skill..." />
        <button className="add-btn" onClick={add}>+ Add</button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{
          flex: 1, padding: '13px', background: 'transparent',
          border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
          color: 'var(--ivory-muted)', fontFamily: 'var(--f-mono)', fontSize: 12,
          cursor: 'pointer', transition: 'all 0.18s',
        }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--line-light)'; e.target.style.color = 'var(--ivory-dim)' }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--line)'; e.target.style.color = 'var(--ivory-muted)' }}
        >← Try Again</button>
        <button onClick={() => onConfirm(confirmed)}
          disabled={confirmed.length === 0 || loading}
          className="cta-btn" style={{ flex: 2, marginTop: 0 }}
        >
          {loading ? 'Matching Jobs…' : `Find Jobs · ${confirmed.length} Skills →`}
        </button>
>>>>>>> origin/main
      </div>
    </div>
  )
}
<<<<<<< HEAD
=======

// ── Main ──────────────────────────────────────────────────
export default function SkillInput({ onSubmit, loading, error }) {
  const [mode,           setMode]           = useState('cv')
  const [parseLoading,   setParseLoading]   = useState(false)
  const [parseError,     setParseError]     = useState(null)
  const [extracted,      setExtracted]      = useState(null)
  const [dragOver,       setDragOver]       = useState(false)
  const [fileName,       setFileName]       = useState(null)
  const [selectedFile,   setSelectedFile]   = useState(null)
  const [freeText,       setFreeText]       = useState('')
  const [manualInput,    setManualInput]    = useState('')
  const [manualSkills,   setManualSkills]   = useState([])
  const fileRef = useRef()

  const reset = () => {
    setExtracted(null); setParseError(null); setFileName(null)
    setSelectedFile(null); setFreeText(''); setManualInput(''); setManualSkills([])
  }

  const selectFile = f => {
    if (!f) return
    if (!f.name.endsWith('.pdf')) { setParseError('Please upload a PDF file.'); return }
    setParseError(null); setFileName(f.name); setSelectedFile(f)
  }

  const handleFile = async () => {
    if (!selectedFile) { setParseError('Please select a PDF file first.'); return }
    setParseLoading(true); setParseError(null)
    try {
      const form = new FormData(); form.append('file', selectedFile)
      const res  = await fetch(`${API}/parse-cv`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to parse CV')
      setExtracted(data.extracted_skills)
    } catch (e) { setParseError(e.message) }
    finally { setParseLoading(false) }
  }

  const handleFreeText = async () => {
    if (freeText.trim().length < 20) { setParseError('Please write at least 20 characters.'); return }
    setParseLoading(true); setParseError(null)
    try {
      const res  = await fetch(`${API}/parse-text`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: freeText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to parse text')
      setExtracted(data.extracted_skills)
    } catch (e) { setParseError(e.message) }
    finally { setParseLoading(false) }
  }

  const addManual = () => {
    const t = manualInput.trim().toLowerCase()
    if (t && !manualSkills.includes(t)) setManualSkills(p => [...p, t])
    setManualInput('')
  }
  const removeManual = s => setManualSkills(p => p.filter(x => x !== s))
  const handleManualKey = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addManual() } }

  // ── Confirm screen ──
  if (extracted) {
    return (
      <div className="input-page">
        <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
          <div className="input-card">
            <div className="card-accent" />
            <div className="card-body">
              <ConfirmSkills skills={extracted} onConfirm={onSubmit} onBack={reset} loading={loading} />
              {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="input-page">
      <div className="input-layout">

        {/* ── Left: Hero ── */}
        <div className="hero">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            AI-Powered Career Matching
          </div>

          <h1 className="hero-title">
            Navigate Your<br />
            <em>Career Path</em>
            <span className="hero-title-line2">in Tunisia</span>
          </h1>

          <p className="hero-desc">
            Upload your CV, describe your experience, or type your skills —
            our engine matches you with the best opportunities in the Tunisian job market.
          </p>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">1,062<span>+</span></span>
              <span className="hero-stat-label">Job Listings</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">10</span>
              <span className="hero-stat-label">Career Domains</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">287</span>
              <span className="hero-stat-label">Tracked Skills</span>
            </div>
          </div>
        </div>

        {/* ── Right: Input Card ── */}
        <div className="input-card">
          <div className="card-accent" />
          <div className="card-body">

            {/* Mode tabs */}
            <div className="mode-tabs">
              {MODES.map(m => (
                <button key={m.id}
                  className={`mode-tab${mode === m.id ? ' active' : ''}`}
                  onClick={() => { setMode(m.id); setParseError(null) }}
                >
                  <span className="mode-tab-icon">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* ── CV Upload ── */}
            {mode === 'cv' && (
              <div>
                <span className="field-label">Upload your CV (PDF)</span>
                <div
                  className={`drop-zone${dragOver ? ' over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files[0]) }}
                  onClick={() => fileRef.current.click()}
                >
                  <div className="drop-icon">{fileName ? '📄' : '⬆️'}</div>
                  <div className="drop-primary">
                    {fileName
                      ? <span style={{ color: 'var(--gold-bright)' }}>{fileName}</span>
                      : <><span>Drop your PDF</span> or <span style={{ color: 'var(--gold)' }}>click to browse</span></>
                    }
                  </div>
                  <div className="drop-secondary">
                    {fileName ? 'Click to change' : 'PDF files only · Max 10MB'}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf"
                    style={{ display: 'none' }} onChange={e => selectFile(e.target.files[0])} />
                </div>
                <button onClick={handleFile} disabled={parseLoading || !selectedFile}
                  className="cta-btn" style={{ opacity: !selectedFile ? 0.4 : 1 }}>
                  {parseLoading ? 'Extracting Skills…' : 'Extract Skills from CV'}
                </button>
              </div>
            )}

            {/* ── Free Text ── */}
            {mode === 'text' && (
              <div>
                <span className="field-label">Describe yourself</span>
                <textarea className="text-field"
                  value={freeText} onChange={e => setFreeText(e.target.value)}
                  placeholder={"Example: I'm a data engineer with 3 years of experience in Python, SQL, Apache Spark and Azure. I've also worked with Power BI and machine learning pipelines..."}
                />
                <div className="field-hint">
                  Write naturally — AI extracts your skills automatically.{' '}
                  <strong>Minimum 20 characters.</strong>
                </div>
                <button onClick={handleFreeText}
                  disabled={parseLoading || freeText.trim().length < 20}
                  className="cta-btn">
                  {parseLoading ? 'Extracting Skills…' : 'Extract Skills from Text'}
                </button>
              </div>
            )}

            {/* ── Manual ── */}
            {mode === 'manual' && (
              <div>
                <span className="field-label">Type your skills</span>
                <div className="add-row">
                  <input className="add-input"
                    value={manualInput} onChange={e => setManualInput(e.target.value)}
                    onKeyDown={handleManualKey}
                    placeholder="e.g. python, sql, react..." />
                  <button className="add-btn" onClick={addManual}>+ Add</button>
                </div>
                <div className="field-hint" style={{ marginBottom: 14 }}>
                  Press <strong>Enter</strong> or <strong>,</strong> to add each skill
                </div>

                {manualSkills.length > 0 && (
                  <div className="tags-container">
                    {manualSkills.map(s => (
                      <SkillTag key={s} skill={s} onRemove={removeManual} />
                    ))}
                  </div>
                )}

                <button onClick={() => onSubmit(manualSkills)}
                  disabled={manualSkills.length === 0 || loading}
                  className="cta-btn">
                  {loading
                    ? 'Matching Jobs…'
                    : manualSkills.length === 0
                      ? 'Add skills above to continue'
                      : `Find Jobs · ${manualSkills.length} Skill${manualSkills.length !== 1 ? 's' : ''} →`
                  }
                </button>
              </div>
            )}

            {/* Error & loading */}
            {(parseError || error) && (
              <div className="error-box" style={{ marginTop: 14 }}>{parseError || error}</div>
            )}

            {parseLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory-muted)' }}>
                  Analysing your profile…
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
>>>>>>> origin/main
