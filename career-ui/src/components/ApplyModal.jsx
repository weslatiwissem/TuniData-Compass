// src/components/ApplyModal.jsx
// Real application flow with AI-generated tailored cover letter (streaming)
import { useState, useEffect, useRef } from 'react';
import { coverLetterAPI, userAPI } from '../utils/api';
import { useToast } from '../context/ToastContext';

const T = {
  ink2:        '#0e1119',
  ink3:        '#151924',
  ink4:        '#1c2232',
  line:        '#222840',
  lineLight:   '#2d3554',
  gold:        '#e8a020',
  goldBright:  '#f5b53f',
  goldDim:     'rgba(232,160,32,0.10)',
  goldBorder:  'rgba(232,160,32,0.28)',
  ivory:       '#f0ede6',
  ivoryDim:    '#b8b4aa',
  ivoryMuted:  '#666a7a',
  green:       '#3ecf8e',
  greenDim:    'rgba(62,207,142,0.10)',
  red:         '#f06060',
  redDim:      'rgba(240,96,96,0.10)',
  blue:        '#3b82f6',
  blueDim:     'rgba(59,130,246,0.10)',
  fDisplay:    "'Playfair Display', Georgia, serif",
  fUi:         "'Cabinet Grotesk', sans-serif",
  fMono:       "'JetBrains Mono', monospace",
  r:           '10px',
  rSm:         '6px',
};

function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${T.line}`,
      borderTop: `2px solid ${T.gold}`,
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

// Streaming text cursor blink
function Cursor() {
  return (
    <span style={{
      display: 'inline-block', width: 2, height: '1em',
      background: T.gold, marginLeft: 2, verticalAlign: 'text-bottom',
      animation: 'blink 1s step-end infinite',
    }} />
  );
}

export default function ApplyModal({ open, onClose, job, user, onApplied }) {
  const { push } = useToast();

  const [step, setStep] = useState('options'); // 'options' | 'generating' | 'review' | 'submitting' | 'done'
  const [coverLetter, setCoverLetter] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStep('options');
      setCoverLetter('');
      setStreamText('');
      setStreaming(false);
      setEditMode(false);
      setResult(null);
    }
  }, [open]);

  if (!open || !job) return null;

  const jobLogo = (job.company || 'J').charAt(0).toUpperCase();

  // ── Generate cover letter via streaming ───────────────────
  const handleGenerate = async () => {
    setStep('generating');
    setStreaming(true);
    setStreamText('');

    try {
      const res = await coverLetterAPI.stream(job.id, user?.skills || []);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Generation failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      abortRef.current = reader;
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const text = line.slice(6);
          if (text === '[DONE]') break;
          if (text.startsWith('[ERROR]')) {
            throw new Error(text.slice(8));
          }
          full += text;
          setStreamText(full);
        }
      }

      setCoverLetter(full);
      setStreaming(false);
      setStep('review');
    } catch (err) {
      if (err.name !== 'AbortError') {
        push(err.message || 'Failed to generate cover letter', 'error');
        setStep('options');
      }
      setStreaming(false);
    }
  };

  // ── Apply with cover letter ───────────────────────────────
  const handleApply = async () => {
    setApplying(true);
    setStep('submitting');
    try {
      const res = await userAPI.applyJob(job.id, coverLetter, false);
      setResult(res);
      setStep('done');
      onApplied?.(res);
      push(`Application sent to ${job.company}! 🚀`, 'success');
    } catch (err) {
      push(err.message, 'error');
      setStep('review');
    } finally {
      setApplying(false);
    }
  };

  // ── Apply without cover letter ────────────────────────────
  const handleApplyDirect = async () => {
    setApplying(true);
    setStep('submitting');
    try {
      const res = await userAPI.applyJob(job.id, '', false);
      setResult(res);
      setStep('done');
      onApplied?.(res);
      push(`Application sent to ${job.company}! 🚀`, 'success');
    } catch (err) {
      push(err.message, 'error');
      setStep('options');
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => step !== 'submitting' && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn .2s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 201, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        background: T.ink2, border: `1px solid ${T.lineLight}`,
        borderRadius: T.r, animation: 'fadeUp .25s ease',
        padding: 0,
      }}>
        {/* Header bar */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${T.gold}, rgba(232,160,32,0.3), transparent)`,
          borderRadius: `${T.r} ${T.r} 0 0`,
        }} />

        <div style={{ padding: '24px 28px 28px' }}>
          {/* Job info row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
            paddingBottom: 20, borderBottom: `1px solid ${T.line}`,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10, flexShrink: 0,
              background: T.goldDim, border: `1px solid ${T.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: T.goldBright, fontFamily: T.fMono,
            }}>{jobLogo}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.fDisplay, fontSize: 16, fontWeight: 700,
                color: T.ivory, letterSpacing: '-0.3px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{job.title}</div>
              <div style={{ fontFamily: T.fMono, fontSize: 11, color: T.ivoryMuted, marginTop: 2 }}>
                {job.company} · {job.location}
              </div>
            </div>
            {step !== 'submitting' && (
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', color: T.ivoryMuted,
                  fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
                  flexShrink: 0, transition: 'color .18s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = T.ivory}
                onMouseLeave={e => e.currentTarget.style.color = T.ivoryMuted}
              >×</button>
            )}
          </div>

          {/* ── STEP: OPTIONS ── */}
          {step === 'options' && (
            <div style={{ animation: 'fadeUp .2s ease' }}>
              <div style={{
                fontFamily: T.fMono, fontSize: 10, letterSpacing: '2px',
                textTransform: 'uppercase', color: T.gold, marginBottom: 16,
              }}>How would you like to apply?</div>

              {/* AI generate option */}
              <button
                onClick={handleGenerate}
                style={{
                  width: '100%', background: T.goldDim,
                  border: `1px solid ${T.goldBorder}`,
                  borderRadius: T.r, padding: '18px 20px',
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'all .2s', marginBottom: 10,
                  display: 'block',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(232,160,32,0.16)';
                  e.currentTarget.style.borderColor = T.gold;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = T.goldDim;
                  e.currentTarget.style.borderColor = T.goldBorder;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>✨</span>
                  <span style={{
                    fontFamily: T.fUi, fontSize: 14, fontWeight: 600, color: T.gold,
                  }}>Generate AI Cover Letter</span>
                </div>
                <div style={{
                  fontFamily: T.fMono, fontSize: 11, color: T.ivoryMuted, paddingLeft: 30,
                }}>
                  Tailored to your profile &amp; this specific role · Powered by Claude AI
                </div>
              </button>

              {/* Direct apply option */}
              <button
                onClick={handleApplyDirect}
                style={{
                  width: '100%', background: 'transparent',
                  border: `1px solid ${T.line}`,
                  borderRadius: T.r, padding: '18px 20px',
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'all .2s', display: 'block',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.lineLight}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span style={{ fontFamily: T.fUi, fontSize: 14, fontWeight: 600, color: T.ivory }}>
                    Apply Without Cover Letter
                  </span>
                </div>
                <div style={{ fontFamily: T.fMono, fontSize: 11, color: T.ivoryMuted, paddingLeft: 30 }}>
                  Submit your profile directly · Fastest option
                </div>
              </button>

              {user?.cv_filename && (
                <div style={{
                  marginTop: 16, fontFamily: T.fMono, fontSize: 11,
                  color: T.green, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>✓</span> Your CV will be included: {user.cv_filename}
                </div>
              )}

              {job.apply_url && (
                <a
                  href={job.apply_url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'block', marginTop: 12, textAlign: 'center',
                    fontFamily: T.fMono, fontSize: 11, color: T.ivoryMuted,
                    textDecoration: 'none', padding: '8px',
                  }}
                >
                  Or apply directly on the company site →
                </a>
              )}
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === 'generating' && (
            <div style={{ animation: 'fadeUp .2s ease' }}>
              <div style={{
                fontFamily: T.fMono, fontSize: 10, letterSpacing: '2px',
                textTransform: 'uppercase', color: T.gold, marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Spinner size={14} />
                Crafting your cover letter…
              </div>

              {/* Live streaming preview */}
              <div style={{
                background: T.ink3, border: `1px solid ${T.line}`,
                borderRadius: T.rSm, padding: 18, minHeight: 200,
                maxHeight: 320, overflowY: 'auto',
                fontFamily: T.fUi, fontSize: 13, lineHeight: 1.8,
                color: T.ivory, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {streamText || (
                  <span style={{ color: T.ivoryMuted, fontFamily: T.fMono, fontSize: 11 }}>
                    Analyzing your profile and the job requirements…
                  </span>
                )}
                {streaming && <Cursor />}
              </div>

              <button
                onClick={() => { abortRef.current?.cancel(); setStep('options'); }}
                style={{
                  marginTop: 12, background: 'none',
                  border: `1px solid ${T.line}`, borderRadius: T.rSm,
                  padding: '8px 16px', color: T.ivoryMuted,
                  fontFamily: T.fMono, fontSize: 11, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          )}

          {/* ── STEP: REVIEW ── */}
          {step === 'review' && (
            <div style={{ animation: 'fadeUp .2s ease' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: T.fMono, fontSize: 10, letterSpacing: '2px',
                  textTransform: 'uppercase', color: T.green,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>✓</span> Cover letter ready
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setEditMode(!editMode); }}
                    style={{
                      background: 'none', border: `1px solid ${editMode ? T.gold : T.line}`,
                      borderRadius: T.rSm, padding: '4px 12px',
                      color: editMode ? T.gold : T.ivoryMuted,
                      fontFamily: T.fMono, fontSize: 10, cursor: 'pointer',
                      transition: 'all .18s',
                    }}
                  >{editMode ? '👁 Preview' : '✏ Edit'}</button>
                  <button
                    onClick={handleGenerate}
                    style={{
                      background: 'none', border: `1px solid ${T.line}`,
                      borderRadius: T.rSm, padding: '4px 12px',
                      color: T.ivoryMuted,
                      fontFamily: T.fMono, fontSize: 10, cursor: 'pointer',
                    }}
                  >↺ Regenerate</button>
                </div>
              </div>

              {editMode ? (
                <textarea
                  ref={textareaRef}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  style={{
                    width: '100%', minHeight: 280, background: T.ink3,
                    border: `1px solid ${T.gold}`,
                    borderRadius: T.rSm, padding: 16,
                    fontFamily: T.fUi, fontSize: 13, lineHeight: 1.8,
                    color: T.ivory, resize: 'vertical', outline: 'none',
                    boxShadow: `0 0 0 3px ${T.goldDim}`,
                  }}
                />
              ) : (
                <div style={{
                  background: T.ink3, border: `1px solid ${T.line}`,
                  borderRadius: T.rSm, padding: 18, maxHeight: 300, overflowY: 'auto',
                  fontFamily: T.fUi, fontSize: 13, lineHeight: 1.8,
                  color: T.ivory, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {coverLetter}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => setStep('options')}
                  style={{
                    flex: 1, background: 'transparent', border: `1px solid ${T.line}`,
                    borderRadius: T.rSm, padding: '11px',
                    color: T.ivoryMuted, fontFamily: T.fMono, fontSize: 12,
                    cursor: 'pointer', transition: 'all .18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.lineLight}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
                >← Back</button>

                <button
                  onClick={handleApply}
                  style={{
                    flex: 2, background: T.gold, border: 'none',
                    borderRadius: T.rSm, padding: '11px',
                    color: '#0A0C10', fontFamily: T.fUi, fontSize: 14,
                    fontWeight: 600, cursor: 'pointer',
                    transition: 'all .18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.goldBright}
                  onMouseLeave={e => e.currentTarget.style.background = T.gold}
                >
                  Submit Application →
                </button>
              </div>

              {job.apply_url && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                    style={{
                      fontFamily: T.fMono, fontSize: 11,
                      color: T.ivoryMuted, textDecoration: 'none',
                    }}>
                    Also apply on company website ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: SUBMITTING ── */}
          {step === 'submitting' && (
            <div style={{
              animation: 'fadeUp .2s ease', textAlign: 'center', padding: '32px 0',
            }}>
              <Spinner size={36} />
              <div style={{
                marginTop: 16, fontFamily: T.fDisplay, fontSize: 18, color: T.ivory,
              }}>Submitting your application…</div>
              <div style={{ marginTop: 6, fontFamily: T.fMono, fontSize: 11, color: T.ivoryMuted }}>
                Sending to {job.company}
              </div>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <div style={{
              animation: 'fadeUp .3s ease', textAlign: 'center', padding: '20px 0',
            }}>
              {/* Success animation */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: T.greenDim, border: `2px solid ${T.green}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 32,
              }}>🚀</div>

              <div style={{
                fontFamily: T.fDisplay, fontSize: 22, color: T.ivory,
                letterSpacing: '-0.5px', marginBottom: 8,
              }}>Application Sent!</div>

              <div style={{
                fontFamily: T.fMono, fontSize: 12, color: T.ivoryMuted,
                lineHeight: 1.7, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px',
              }}>
                Your application for <strong style={{ color: T.ivory }}>{job.title}</strong> at{' '}
                <strong style={{ color: T.gold }}>{job.company}</strong> has been submitted.
              </div>

              {result?.apply_url && (
                <div style={{
                  background: T.ink3, border: `1px solid ${T.line}`,
                  borderRadius: T.rSm, padding: '14px 18px', marginBottom: 20,
                  fontFamily: T.fMono, fontSize: 12, color: T.ivoryDim,
                }}>
                  <div style={{ color: T.gold, marginBottom: 6 }}>💡 Additional step</div>
                  Also complete your application on the company website:
                  <a href={result.apply_url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'block', marginTop: 8, color: T.gold,
                      textDecoration: 'none', fontWeight: 500,
                    }}>
                    {result.apply_url.slice(0, 55)}{result.apply_url.length > 55 ? '…' : ''} ↗
                  </a>
                </div>
              )}

              <button
                onClick={onClose}
                style={{
                  background: T.gold, border: 'none',
                  borderRadius: T.rSm, padding: '11px 32px',
                  color: '#0A0C10', fontFamily: T.fUi, fontSize: 14,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >Done</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </>
  );
}
