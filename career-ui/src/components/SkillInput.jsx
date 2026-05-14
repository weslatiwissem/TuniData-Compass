// src/components/SkillInput.jsx — Redesigned with professional dashboard card style
import { useState, useRef } from 'react'

const API = 'http://localhost:8000'

const MODES = [
  { id: 'cv',     icon: '📄', label: 'Upload CV'      },
  { id: 'text',   icon: '✍️',  label: 'Describe Yourself' },
  { id: 'manual', icon: '⌨️',  label: 'Type Skills'   },
]

// ── Pill tag ──────────────────────────────────────────────
function SkillTag({ skill, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500,
      background: '#E6F1FB', color: '#185FA5',
      border: '1px solid #B5D4F440',
      fontFamily: 'var(--f-mono, monospace)',
    }}>
      {skill}
      {onRemove && (
        <button
          onClick={() => onRemove(skill)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#378ADD', fontSize: 14, lineHeight: 1, padding: 0,
            display: 'flex', alignItems: 'center',
          }}
        >×</button>
      )}
    </span>
  )
}

// ── Confirm Step ──────────────────────────────────────────
function ConfirmSkills({ skills, onConfirm, onBack, loading }) {
  const [confirmed, setConfirmed] = useState(skills)
  const [input, setInput] = useState('')

  const remove = s => setConfirmed(p => p.filter(x => x !== s))
  const add = () => {
    const t = input.trim().toLowerCase()
    if (t && !confirmed.includes(t)) setConfirmed(p => [...p, t])
    setInput('')
  }
  const handleKey = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }

  return (
    <div style={{ animation: 'fadeUp .25s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#EAF3DE', border: '1px solid #C0DD9750',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>✓</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#2C2C2A', margin: 0 }}>
            Skills Extracted
          </h3>
        </div>
        <p style={{ fontSize: 12, color: '#888780', margin: 0, fontFamily: 'var(--f-mono, monospace)' }}>
          {confirmed.length} skill{confirmed.length !== 1 ? 's' : ''} found — remove false positives or add missing ones
        </p>
      </div>

      {/* Tag cloud */}
      <div style={{
        background: '#F7F6F2', border: '1px solid #E8E6DF',
        borderRadius: 10, padding: 14, minHeight: 72,
        display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14,
      }}>
        {confirmed.length === 0 ? (
          <span style={{ fontSize: 12, color: '#B4B2A9', fontFamily: 'var(--f-mono, monospace)' }}>
            No skills — add some below
          </span>
        ) : (
          confirmed.map(s => <SkillTag key={s} skill={s} onRemove={remove} />)
        )}
      </div>

      {/* Add input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Add a missing skill…"
          style={{
            flex: 1, padding: '9px 12px',
            background: '#fff', border: '1px solid #E8E6DF',
            borderRadius: 8, fontSize: 13, color: '#2C2C2A',
            outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = '#185FA5'}
          onBlur={e => e.target.style.borderColor = '#E8E6DF'}
        />
        <button
          onClick={add}
          style={{
            padding: '9px 16px', background: '#F7F6F2',
            border: '1px solid #E8E6DF', borderRadius: 8,
            fontSize: 13, color: '#185FA5', cursor: 'pointer',
            fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#E6F1FB'; e.currentTarget.style.borderColor = '#B5D4F4'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F7F6F2'; e.currentTarget.style.borderColor = '#E8E6DF'; }}
        >+ Add</button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: '11px', background: '#fff',
            border: '1px solid #E8E6DF', borderRadius: 8,
            color: '#888780', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#B4B2A9'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#E8E6DF'}
        >← Try Again</button>

        <button
          onClick={() => onConfirm(confirmed)}
          disabled={confirmed.length === 0 || loading}
          style={{
            flex: 2, padding: '11px', borderRadius: 8,
            background: confirmed.length === 0 || loading ? '#B5D4F4' : '#185FA5',
            border: 'none', color: '#fff', fontSize: 14,
            fontWeight: 700, cursor: confirmed.length === 0 || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background .15s',
          }}
        >
          {loading
            ? 'Matching Jobs…'
            : `Find Jobs · ${confirmed.length} Skills →`
          }
        </button>
      </div>
    </div>
  )
}

// ── Stats card ────────────────────────────────────────────
function StatCard({ value, label, color = '#185FA5', bg = '#E6F1FB', icon }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E8E6DF',
      borderRadius: 12, padding: '18px 20px',
      borderTop: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: color }}>{value}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>{icon}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '1.2px',
        textTransform: 'uppercase', color: '#888780',
        fontFamily: 'var(--f-mono, monospace)',
      }}>{label}</span>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: '2px solid #E6F1FB', borderTop: '2px solid #185FA5',
      animation: 'spin .7s linear infinite', flexShrink: 0,
    }} />
  )
}

// ── Main ──────────────────────────────────────────────────
export default function SkillInput({ onSubmit, loading, error }) {
  const [mode, setMode] = useState('cv')
  const [parseLoading, setParseLoading] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [freeText, setFreeText] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [manualSkills, setManualSkills] = useState([])
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
      const res = await fetch(`${API}/parse-cv`, { method: 'POST', body: form })
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
      const res = await fetch(`${API}/parse-text`, {
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
      <div style={{
        minHeight: '100vh', background: '#F7F6F2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <div style={{
            background: '#fff', border: '1px solid #E8E6DF',
            borderRadius: 16, overflow: 'hidden',
            borderTop: '3px solid #185FA5',
          }}>
            <div style={{ padding: '28px 28px 32px' }}>
              <ConfirmSkills skills={extracted} onConfirm={onSubmit} onBack={reset} loading={loading} />
              {error && (
                <div style={{
                  marginTop: 14, padding: '10px 14px',
                  background: '#FCEBEB', border: '1px solid #F7C1C1',
                  borderRadius: 8, fontSize: 13, color: '#A32D2D',
                }}>{error}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F2' }}>

      {/* ── Hero section ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E8E6DF',
        padding: '48px 24px 40px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 100,
            background: '#E6F1FB', border: '1px solid #B5D4F450',
            marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#185FA5' }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#185FA5',
              fontFamily: 'var(--f-mono, monospace)', letterSpacing: '0.5px',
            }}>AI-POWERED CAREER MATCHING</span>
          </div>

          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Left: headline */}
            <div style={{ flex: '1 1 340px' }}>
              <h1 style={{
                fontSize: 36, fontWeight: 800, color: '#2C2C2A',
                lineHeight: 1.15, marginBottom: 14, letterSpacing: '-0.5px',
              }}>
                Navigate Your{' '}
                <span style={{ color: '#185FA5', fontStyle: 'italic' }}>Career Path</span>
                <br />in Tunisia
              </h1>
              <p style={{
                fontSize: 14, color: '#5F5E5A', lineHeight: 1.7,
                maxWidth: 420, marginBottom: 24,
              }}>
                Upload your CV, describe your experience, or type your skills —
                our engine matches you with the best opportunities in the Tunisian job market.
              </p>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 420 }}>
                <StatCard value="1,062+" label="Job Listings" color="#185FA5" bg="#E6F1FB" icon="💼" />
                <StatCard value="12" label="Domains" color="#534AB7" bg="#EEEDFE" icon="🗂" />
                <StatCard value="287" label="Skills Tracked" color="#3B6D11" bg="#EAF3DE" icon="⚡" />
              </div>
            </div>

            {/* Right: input card */}
            <div style={{
              flex: '1 1 380px', maxWidth: 480,
              background: '#fff', border: '1px solid #E8E6DF',
              borderRadius: 16, overflow: 'hidden',
              borderTop: '3px solid #185FA5',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}>
              {/* Mode tabs */}
              <div style={{
                display: 'flex', borderBottom: '1px solid #E8E6DF',
                background: '#F7F6F2',
              }}>
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setParseError(null); }}
                    style={{
                      flex: 1, padding: '12px 4px',
                      background: mode === m.id ? '#fff' : 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${mode === m.id ? '#185FA5' : 'transparent'}`,
                      borderRadius: 0,
                      color: mode === m.id ? '#185FA5' : '#888780',
                      fontSize: 12, fontWeight: mode === m.id ? 600 : 400,
                      cursor: 'pointer', transition: 'all .15s',
                      fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{m.icon}</span>
                    <span style={{ fontSize: 11 }}>{m.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ padding: '24px 24px 28px' }}>

                {/* ── CV Upload mode ── */}
                {mode === 'cv' && (
                  <div>
                    <label style={{
                      display: 'block', fontSize: 11, fontWeight: 600,
                      letterSpacing: '1px', textTransform: 'uppercase',
                      color: '#888780', fontFamily: 'var(--f-mono, monospace)',
                      marginBottom: 10,
                    }}>Upload your CV (PDF)</label>

                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files[0]); }}
                      onClick={() => fileRef.current.click()}
                      style={{
                        border: `2px dashed ${dragOver ? '#185FA5' : selectedFile ? '#378ADD' : '#D3D1C7'}`,
                        borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                        cursor: 'pointer', transition: 'all .2s', marginBottom: 14,
                        background: dragOver ? '#E6F1FB' : selectedFile ? '#F0F5FC' : '#FAFAF8',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>
                        {selectedFile ? '📄' : '⬆️'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', marginBottom: 4 }}>
                        {selectedFile ? (
                          <span style={{ color: '#185FA5' }}>{fileName}</span>
                        ) : (
                          <>Drop your PDF or <span style={{ color: '#185FA5', textDecoration: 'underline' }}>browse</span></>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#888780', fontFamily: 'var(--f-mono, monospace)' }}>
                        {selectedFile ? 'Click to change file' : 'PDF files only · Max 10MB'}
                      </div>
                      <input
                        ref={fileRef} type="file" accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={e => selectFile(e.target.files[0])}
                      />
                    </div>

                    {/* ── Submit CV Button ── */}
                    <button
                      onClick={handleFile}
                      disabled={parseLoading || !selectedFile}
                      style={{
                        width: '100%', padding: '12px',
                        background: !selectedFile ? '#B5D4F4' : parseLoading ? '#378ADD' : '#185FA5',
                        border: 'none', borderRadius: 10,
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: !selectedFile || parseLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', transition: 'background .15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                      onMouseEnter={e => { if (selectedFile && !parseLoading) e.currentTarget.style.background = '#0C447C'; }}
                      onMouseLeave={e => { if (selectedFile && !parseLoading) e.currentTarget.style.background = '#185FA5'; }}
                    >
                      {parseLoading ? (
                        <>
                          <Spinner />
                          Extracting Skills…
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 16 }}>📤</span>
                          {selectedFile ? 'Submit CV & Extract Skills' : 'Select a PDF to continue'}
                        </>
                      )}
                    </button>

                    {selectedFile && !parseLoading && (
                      <p style={{
                        marginTop: 10, textAlign: 'center', fontSize: 11,
                        color: '#888780', fontFamily: 'var(--f-mono, monospace)',
                      }}>
                        AI will extract your skills automatically
                      </p>
                    )}
                  </div>
                )}

                {/* ── Free text mode ── */}
                {mode === 'text' && (
                  <div>
                    <label style={{
                      display: 'block', fontSize: 11, fontWeight: 600,
                      letterSpacing: '1px', textTransform: 'uppercase',
                      color: '#888780', fontFamily: 'var(--f-mono, monospace)',
                      marginBottom: 10,
                    }}>Describe yourself</label>

                    <textarea
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                      placeholder={"Example: I'm a data engineer with 3 years of experience in Python, SQL, Apache Spark and Azure. I've also worked with Power BI and machine learning pipelines…"}
                      style={{
                        width: '100%', minHeight: 130, padding: '12px 14px',
                        background: '#F7F6F2', border: '1px solid #E8E6DF',
                        borderRadius: 10, fontSize: 13, color: '#2C2C2A',
                        lineHeight: 1.7, outline: 'none', resize: 'vertical',
                        fontFamily: 'inherit', marginBottom: 8,
                        transition: 'border-color .15s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#185FA5'}
                      onBlur={e => e.target.style.borderColor = '#E8E6DF'}
                    />

                    <p style={{
                      fontSize: 11, color: '#888780', marginBottom: 14,
                      fontFamily: 'var(--f-mono, monospace)',
                    }}>
                      Write naturally — AI extracts your skills. Min. 20 characters.
                    </p>

                    <button
                      onClick={handleFreeText}
                      disabled={parseLoading || freeText.trim().length < 20}
                      style={{
                        width: '100%', padding: '12px',
                        background: freeText.trim().length < 20 ? '#B5D4F4' : '#185FA5',
                        border: 'none', borderRadius: 10,
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: freeText.trim().length < 20 || parseLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      {parseLoading ? <><Spinner /> Extracting Skills…</> : 'Extract Skills from Text'}
                    </button>
                  </div>
                )}

                {/* ── Manual mode ── */}
                {mode === 'manual' && (
                  <div>
                    <label style={{
                      display: 'block', fontSize: 11, fontWeight: 600,
                      letterSpacing: '1px', textTransform: 'uppercase',
                      color: '#888780', fontFamily: 'var(--f-mono, monospace)',
                      marginBottom: 10,
                    }}>Type your skills</label>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        onKeyDown={handleManualKey}
                        placeholder="e.g. python, sql, react…"
                        style={{
                          flex: 1, padding: '9px 12px',
                          background: '#F7F6F2', border: '1px solid #E8E6DF',
                          borderRadius: 8, fontSize: 13, color: '#2C2C2A',
                          outline: 'none', fontFamily: 'inherit',
                        }}
                        onFocus={e => e.target.style.borderColor = '#185FA5'}
                        onBlur={e => e.target.style.borderColor = '#E8E6DF'}
                      />
                      <button
                        onClick={addManual}
                        style={{
                          padding: '9px 14px', background: '#E6F1FB',
                          border: '1px solid #B5D4F450', borderRadius: 8,
                          color: '#185FA5', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >+ Add</button>
                    </div>

                    <p style={{
                      fontSize: 11, color: '#888780', marginBottom: 12,
                      fontFamily: 'var(--f-mono, monospace)',
                    }}>
                      Press <strong>Enter</strong> or <strong>,</strong> to add each skill
                    </p>

                    {manualSkills.length > 0 && (
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 6,
                        padding: '10px 12px', background: '#F7F6F2',
                        border: '1px solid #E8E6DF', borderRadius: 10, marginBottom: 14,
                        minHeight: 44,
                      }}>
                        {manualSkills.map(s => <SkillTag key={s} skill={s} onRemove={removeManual} />)}
                      </div>
                    )}

                    <button
                      onClick={() => onSubmit(manualSkills)}
                      disabled={manualSkills.length === 0 || loading}
                      style={{
                        width: '100%', padding: '12px',
                        background: manualSkills.length === 0 ? '#B5D4F4' : '#185FA5',
                        border: 'none', borderRadius: 10,
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: manualSkills.length === 0 || loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {loading ? 'Matching Jobs…'
                        : manualSkills.length === 0 ? 'Add skills above to continue'
                        : `Find Jobs · ${manualSkills.length} Skill${manualSkills.length !== 1 ? 's' : ''} →`}
                    </button>
                  </div>
                )}

                {/* Error state */}
                {(parseError || error) && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: '#FCEBEB', border: '1px solid #F7C1C1',
                    borderRadius: 8, fontSize: 13, color: '#A32D2D',
                  }}>{parseError || error}</div>
                )}

                {/* Loading state */}
                {parseLoading && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                  }}>
                    <Spinner />
                    <span style={{
                      fontSize: 12, color: '#888780',
                      fontFamily: 'var(--f-mono, monospace)',
                    }}>Analysing your profile…</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Market Snapshot ── */}
      <div style={{ maxWidth: 1100, margin: '28px auto', padding: '0 24px' }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '1.5px',
          textTransform: 'uppercase', color: '#888780',
          fontFamily: 'var(--f-mono, monospace)', marginBottom: 14,
        }}>Market Snapshot</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <StatCard value="1,499" label="Live Jobs" color="#185FA5" bg="#E6F1FB" icon="💼" />
          <StatCard value="128" label="Fresh Jobs" color="#3B6D11" bg="#EAF3DE" icon="🆕" />
          <StatCard value="12" label="Domains" color="#534AB7" bg="#EEEDFE" icon="🗂" />
          <StatCard value="59" label="Aging Postings" color="#854F0B" bg="#FAEEDA" icon="📊" />
        </div>

        {/* Progress bar */}
        <div style={{
          background: '#fff', border: '1px solid #E8E6DF',
          borderRadius: 12, padding: '16px 20px', marginTop: 12,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '1px',
            textTransform: 'uppercase', color: '#888780',
            fontFamily: 'var(--f-mono, monospace)', whiteSpace: 'nowrap',
          }}>Market Health</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#3B6D11', fontWeight: 500 }}>● 128 fresh</span>
            <span style={{ fontSize: 12, color: '#854F0B', fontWeight: 500 }}>● 59 aging</span>
            <span style={{ fontSize: 12, color: '#A32D2D', fontWeight: 500 }}>● 1,312 expired</span>
          </div>

          {/* Stacked bar */}
          <div style={{
            flex: '2 1 180px', height: 8, borderRadius: 100,
            background: '#F1EFE8', overflow: 'hidden',
            display: 'flex',
          }}>
            <div style={{ width: '8.5%', background: '#639922', borderRadius: '100px 0 0 100px' }} />
            <div style={{ width: '3.9%', background: '#BA7517' }} />
            <div style={{ flex: 1, background: '#E24B4A', borderRadius: '0 100px 100px 0' }} />
          </div>

          <button
            style={{
              padding: '8px 16px', background: '#185FA5',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >Browse All →</button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}