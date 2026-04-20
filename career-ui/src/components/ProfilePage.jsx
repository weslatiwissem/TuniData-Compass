// src/components/ProfilePage.jsx
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import API from '../api.js'

export default function ProfilePage() {
  const { user, saveCV, getCV, deleteCV } = useAuth()
  const [cvData, setCvData]   = useState(null)
  const [dragging, setDrag]   = useState(false)
  const [uploading, setUpl]   = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)
  const fileRef               = useRef()

  // Load saved CV on mount
  useEffect(() => { setCvData(getCV()) }, [user])

  // ── Process file ──────────────────────────────────────────
  const processFile = async (file) => {
    if (!file) return
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) return setError('Only PDF or Word files are accepted')
    if (file.size > 5 * 1024 * 1024) return setError('File must be under 5 MB')

    setError(null); setUpl(true); setSuccess(false)
    try {
      /* ── REAL API (uncomment when backend ready) ───────────
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/profile/cv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail) }
      const data = await res.json()   // { skills: [], filename, uploaded_at }
      ── END REAL API ──────────────────────────────────── */

      // ── Mock: extract skills via existing /extract-skills endpoint ──
      const fd = new FormData()
      fd.append('file', file)
      let skills = []
      try {
        const res = await fetch(`${API}/extract-skills`, { method: 'POST', body: fd })
        if (res.ok) {
          const json = await res.json()
          skills = json.skills ?? json.extracted_skills ?? []
        }
      } catch {
        // endpoint may not exist yet — store with empty skills
      }

      const data = {
        filename    : file.name,
        size        : file.size,
        uploaded_at : new Date().toISOString(),
        skills,
      }
      saveCV(data)
      setCvData(data)
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setUpl(false)
    }
  }

  const handleFile = (e) => processFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleDelete = () => {
    deleteCV()
    setCvData(null)
    setSuccess(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const fmtSize  = (b) => b < 1024 * 1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/1024/1024).toFixed(1)} MB`
  const fmtDate  = (s) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div style={{ width: '100%', maxWidth: 740, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.2)', padding: '2px 8px', borderRadius: 4 }}>06</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
            My <span style={{ color: 'var(--amber)' }}>Profile</span>
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
          Manage your account and CV
        </p>
      </div>

      {/* User card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 24, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--amber-glow)', border: '2px solid rgba(245,166,35,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--amber)',
          flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{user?.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{user?.email}</div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1,
          textTransform: 'uppercase', padding: '4px 10px', borderRadius: 4,
          background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.2)',
          color: 'var(--green)',
        }}>● Active</div>
      </div>

      {/* CV section */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 28,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
          CV / Résumé
        </div>

        {/* Saved CV info */}
        {cvData && (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: 18, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>📄</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{cvData.filename}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {fmtSize(cvData.size)} · Uploaded {fmtDate(cvData.uploaded_at)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDelete}
                style={{
                  background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.25)',
                  borderRadius: 'var(--radius-sm)', padding: '6px 12px',
                  color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11,
                  cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--red-dim)'}
              >Remove</button>
            </div>

            {/* Extracted skills */}
            {cvData.skills?.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Extracted Skills ({cvData.skills.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {cvData.skills.map(s => (
                    <span key={s} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px',
                      borderRadius: 100, background: 'var(--amber-glow)',
                      border: '1px solid rgba(245,166,35,0.3)', color: 'var(--amber)',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {cvData.skills?.length === 0 && (
              <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                No skills were auto-extracted. You can still use the Recommend tab manually.
              </div>
            )}
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--amber)' : 'var(--border-light)'}`,
            borderRadius: 'var(--radius)', padding: '36px 24px',
            textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'var(--amber-glow)' : 'var(--bg-elevated)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.background = 'var(--amber-glow2)' }}
          onMouseLeave={e => { if (!dragging) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}}
        >
          <input
            ref={fileRef} type="file" accept=".pdf,.doc,.docx"
            onChange={handleFile} style={{ display: 'none' }}
          />
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="spinner" />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                Uploading &amp; extracting skills…
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                {cvData ? 'Replace your CV' : 'Upload your CV'}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                Drag &amp; drop or click · PDF, DOC, DOCX · Max 5 MB
              </p>
            </>
          )}
        </div>

        {/* Feedback */}
        {success && !error && (
          <div style={{
            marginTop: 14, background: 'var(--green-dim)',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 13,
          }}>✓ CV saved to your profile successfully</div>
        )}
        {error && (
          <div style={{
            marginTop: 14, background: 'var(--red-dim)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 13,
          }}>⚠ {error}</div>
        )}
      </div>
    </div>
  )
}