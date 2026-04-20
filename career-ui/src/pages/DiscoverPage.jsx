// src/pages/DiscoverPage.jsx
import { useState, useRef } from 'react';
import { recommenderAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Badge, ProgressBar, Spinner, Tag, Card } from '../components/ui';

const DOMAINS = [
  { name: 'Data Engineering', icon: '🗄️', count: 234 },
  { name: 'Frontend Dev', icon: '🎨', count: 198 },
  { name: 'Backend Dev', icon: '⚙️', count: 176 },
  { name: 'ML / AI', icon: '🤖', count: 145 },
  { name: 'DevOps', icon: '🚀', count: 98 },
  { name: 'Product', icon: '📦', count: 87 },
  { name: 'Design', icon: '✏️', count: 76 },
  { name: 'Cybersecurity', icon: '🔐', count: 48 },
];

export default function DiscoverPage({ onNavigate }) {
  const { user } = useAuth();
  const { push } = useToast();

  const [inputMode, setInputMode] = useState('text');   // 'text' | 'paragraph' | 'cv'
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [paragraph, setParagraph] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [cvDrag, setCvDrag] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [heroSearch, setHeroSearch] = useState('');
  const fileRef = useRef();

  // Add skill from tag input
  const addSkill = (val) => {
    const s = val.trim().toLowerCase().replace(/,/g, '');
    if (s && !skills.includes(s)) setSkills(p => [...p, s]);
    setSkillInput('');
  };

  const removeSkill = (s) => setSkills(p => p.filter(x => x !== s));

  // Parse paragraph via API
  const parseParagraph = async () => {
    if (paragraph.trim().length < 20) { push('Please write at least 20 characters.', 'error'); return; }
    setParseLoading(true);
    try {
      const res = await recommenderAPI.parseText(paragraph);
      setSkills(res.extracted_skills);
      push(`Extracted ${res.count} skills!`, 'success');
      setConfirming(true);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setParseLoading(false);
    }
  };

  // Parse CV via API
  const parseCV = async (file) => {
    setParseLoading(true);
    try {
      const res = await recommenderAPI.parseCV(file);
      setSkills(res.extracted_skills);
      push(`Extracted ${res.count} skills from your CV!`, 'success');
      setConfirming(true);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setParseLoading(false);
    }
  };

  const handleCvDrop = (e) => {
    e.preventDefault(); setCvDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) { setCvFile(f); parseCV(f); }
  };

  const handleCvSelect = (e) => {
    const f = e.target.files[0];
    if (f) { setCvFile(f); parseCV(f); }
  };

  // Get recommendations
  const getRecommendations = async () => {
    if (!skills.length) { push('Please add at least one skill.', 'error'); return; }
    setLoading(true);
    try {
      const res = await recommenderAPI.recommend(skills, 6);
      setResults(res);
      setConfirming(false);
      push('Recommendations ready!', 'success');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `${(n * 100).toFixed(0)}%`;

  const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };

  return (
    <div style={{ animation: 'fadeUp .35s ease' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      {!results && (
        <div style={{
          padding: '80px 28px 60px', maxWidth: 900, margin: '0 auto', textAlign: 'center',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(232,160,32,.07) 0%, transparent 65%)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
            fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '2.5px',
            textTransform: 'uppercase', color: 'var(--gold)', padding: '5px 14px',
            border: '1px solid var(--gold-border)', borderRadius: 100, background: 'var(--gold-dim)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
            Tunisia's #1 Career Intelligence Platform
          </div>

          <h1 style={{
            fontFamily: 'var(--f-display)', fontSize: 'clamp(36px, 6vw, 62px)',
            lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 20,
          }}>
            Find Your Next<br />
            <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Career Chapter</em>
          </h1>

          <p style={{ color: 'var(--ivory2)', fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px' }}>
            AI-powered matching connects your skills with the right opportunities in the Tunisian job market. Upload your CV, describe yourself, or type skills — get matched in seconds.
          </p>

          {/* Quick job search */}
          <div style={{
            background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
            padding: '8px 8px 8px 20px', display: 'flex', alignItems: 'center', gap: 10,
            maxWidth: 640, margin: '0 auto 48px', transition: 'border-color .18s, box-shadow .18s',
          }}
            onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 4px var(--gold-dim)'}
            onBlur={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="var(--ivory3)" strokeWidth="1.5" /><path d="M20 20l-3-3" stroke="var(--ivory3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <input
              value={heroSearch}
              onChange={e => setHeroSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onNavigate('jobs', { search: heroSearch })}
              placeholder="Job title, skills, or company..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--ivory)', fontSize: 15, fontFamily: 'var(--f-ui)' }}
            />
            <Button onClick={() => onNavigate('jobs', { search: heroSearch })}>Search Jobs</Button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginBottom: 60, flexWrap: 'wrap' }}>
            {[['1,062+', 'Live Jobs'], ['10', 'Domains'], ['287', 'Skills Tracked'], ['94%', 'Match Accuracy']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 30, color: 'var(--ivory)' }}>{n}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ivory3)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Skill Matcher ──────────────────────────────────── */}
      <div style={{
        maxWidth: 860, margin: '0 auto', padding: '0 28px 60px',
        ...(results ? { paddingTop: 40 } : {}),
      }}>
        {results && (
          <button onClick={() => { setResults(null); setSkills([]); setConfirming(false); }} style={{
            background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
            padding: '8px 16px', color: 'var(--ivory3)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--f-ui)', marginBottom: 24, transition: 'all .18s',
          }}>← New Search</button>
        )}

        {!results && (
          <Card style={{ marginBottom: 0, borderTop: '3px solid var(--gold)' }}>
            {/* Mode selector */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3,
              background: 'var(--ink3)', borderRadius: 'var(--r-sm)', padding: 3, marginBottom: 24,
            }}>
              {[['text', '⌨️', 'Type Skills'], ['paragraph', '✍️', 'Describe Yourself'], ['cv', '📄', 'Upload CV']].map(([id, icon, label]) => (
                <button key={id} onClick={() => { setInputMode(id); setConfirming(false); }} style={{
                  padding: '10px 6px', borderRadius: 'calc(var(--r-sm) - 2px)',
                  background: inputMode === id ? 'var(--ink2)' : 'transparent',
                  border: inputMode === id ? '1px solid var(--line)' : '1px solid transparent',
                  color: inputMode === id ? 'var(--gold)' : 'var(--ivory3)',
                  fontFamily: 'var(--f-mono)', fontSize: 12, cursor: 'pointer',
                  transition: 'all .18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>

            {/* ── Type Skills ── */}
            {inputMode === 'text' && !confirming && (
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
                  Add Your Skills
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); } }}
                    placeholder="e.g. python, react, docker..."
                    style={{
                      flex: 1, background: 'var(--ink3)', border: '1px solid var(--line)',
                      borderRadius: 'var(--r-sm)', padding: '11px 14px', color: 'var(--ivory)',
                      fontSize: 14, outline: 'none', fontFamily: 'var(--f-ui)',
                    }}
                  />
                  <Button onClick={() => addSkill(skillInput)}>+ Add</Button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)', marginBottom: 14 }}>
                  Press <strong>Enter</strong> or <strong>,</strong> to add each skill
                </p>
                {skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {skills.map(s => <Tag key={s} onRemove={() => removeSkill(s)}>{s}</Tag>)}
                  </div>
                )}
                <Button full size="lg" disabled={!skills.length} loading={loading} onClick={getRecommendations}>
                  {skills.length === 0 ? 'Add skills to continue' : `Find Matching Jobs · ${skills.length} skill${skills.length !== 1 ? 's' : ''} →`}
                </Button>
              </div>
            )}

            {/* ── Describe Yourself ── */}
            {inputMode === 'paragraph' && !confirming && (
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
                  Describe Yourself
                </label>
                <textarea
                  rows={5}
                  value={paragraph}
                  onChange={e => setParagraph(e.target.value)}
                  placeholder={"Example: I'm a data engineer with 3 years of experience in Python, SQL, and Apache Spark. I've also worked with AWS, dbt, and built machine learning pipelines using scikit-learn and TensorFlow. Experienced with Docker and CI/CD workflows..."}
                  style={{
                    width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)',
                    borderRadius: 'var(--r-sm)', padding: '14px 16px', color: 'var(--ivory)',
                    fontSize: 14, outline: 'none', fontFamily: 'var(--f-ui)', resize: 'vertical',
                    lineHeight: 1.7, marginBottom: 10, minHeight: 130,
                  }}
                />
                <p style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)', marginBottom: 16 }}>
                  Write naturally — our AI extracts your skills automatically. <strong>Minimum 20 characters.</strong>
                </p>
                <Button full size="lg" disabled={paragraph.trim().length < 20} loading={parseLoading} onClick={parseParagraph}>
                  Extract Skills from Paragraph →
                </Button>
              </div>
            )}

            {/* ── Upload CV ── */}
            {inputMode === 'cv' && !confirming && (
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
                  Upload Your CV
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setCvDrag(true); }}
                  onDragLeave={() => setCvDrag(false)}
                  onDrop={handleCvDrop}
                  onClick={() => fileRef.current.click()}
                  style={{
                    border: `1.5px dashed ${cvDrag ? 'var(--gold)' : 'var(--line)'}`,
                    borderRadius: 'var(--r-sm)', background: cvDrag ? 'var(--gold-dim)' : 'var(--ink3)',
                    padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                    transition: 'all .2s', marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{cvFile ? '📄' : '⬆️'}</div>
                  <div style={{ fontSize: 14, color: 'var(--ivory2)', marginBottom: 4 }}>
                    {cvFile
                      ? <span style={{ color: 'var(--gold2)' }}>{cvFile.name}</span>
                      : <><span>Drop your PDF here</span> or <span style={{ color: 'var(--gold)' }}>browse</span></>
                    }
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>
                    {cvFile ? 'Click to change file' : 'PDF files only · Max 10MB'}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleCvSelect} />
                </div>
                {parseLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, color: 'var(--ivory2)', fontSize: 13 }}>
                    <Spinner size={18} /> Extracting skills from CV...
                  </div>
                )}
              </div>
            )}

            {/* ── Confirm extracted skills ── */}
            {confirming && (
              <div style={{ animation: 'fadeUp .25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 18 }}>Skills Extracted</div>
                    <div style={{ fontSize: 12, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>
                      {skills.length} skills found — remove false positives or add missing ones
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                  padding: 14, minHeight: 60, display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14,
                }}>
                  {skills.length === 0
                    ? <span style={{ fontSize: 12, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>No skills — add some below</span>
                    : skills.map(s => <Tag key={s} onRemove={() => removeSkill(s)}>{s}</Tag>)
                  }
                </div>

                {/* Add missing skill */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); } }}
                    placeholder="Add a missing skill..."
                    style={{
                      flex: 1, background: 'var(--ink3)', border: '1px solid var(--line)',
                      borderRadius: 'var(--r-sm)', padding: '9px 13px', color: 'var(--ivory)',
                      fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)',
                    }}
                  />
                  <Button onClick={() => addSkill(skillInput)}>+ Add</Button>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="ghost" onClick={() => setConfirming(false)} style={{ flex: 1 }}>← Try Again</Button>
                  <Button full loading={loading} disabled={!skills.length} onClick={getRecommendations} style={{ flex: 2 }}>
                    Find Jobs · {skills.length} Skills →
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Results ────────────────────────────────────────── */}
        {results && (
          <div style={{ animation: 'fadeUp .35s ease' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                — Career Analysis · {results.input_skills.length} skills
              </div>
              <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(24px, 4vw, 36px)', letterSpacing: '-1px', marginBottom: 10 }}>
                Best match: <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>{results.domain_ranking[0]?.domain}</em>
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {results.input_skills.map(s => <Badge key={s} color="gold">{s}</Badge>)}
              </div>
              {results.unknown_skills.length > 0 && (
                <div style={{ marginTop: 12, background: 'rgba(245,200,66,.06)', border: '1px solid rgba(245,200,66,.2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--ivory2)', fontFamily: 'var(--f-mono)' }}>
                  <span style={{ color: 'var(--yellow)' }}>⚠ Skipped:</span> {results.unknown_skills.join(', ')} — not in job data
                </div>
              )}
            </div>

            {/* Domain ranking */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Domain Compatibility</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.domain_ranking.slice(0, 6).map((d, i) => (
                  <div key={d.domain}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {d.domain}
                        {i === 0 && <Badge color="gold">BEST FIT</Badge>}
                      </span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: i === 0 ? 'var(--gold)' : 'var(--ivory2)' }}>{fmt(d.score)}</span>
                    </div>
                    <ProgressBar value={d.score * 100} color={i === 0 ? 'var(--gold)' : 'var(--line2)'} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Top jobs */}
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>
              Top Matching Jobs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.top_jobs.map((job, i) => (
                <div key={i} style={{
                  background: 'var(--ink2)', border: `1px solid ${i === 0 ? 'var(--gold-border)' : 'var(--line)'}`,
                  borderRadius: 'var(--r)', padding: 20,
                  background: i === 0 ? 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.04))' : 'var(--ink2)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, marginBottom: 3 }}>{job.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--ivory3)' }}>{job.company} · {job.location}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness} · {job.days_old}d</Badge>
                      <Badge color="gray">{job.domain}</Badge>
                      <Button size="sm" onClick={() => onNavigate('jobs', { jobId: job.title })}>View →</Button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
                    {[['Overall', job.score, 'var(--gold)'], ['Skill Match', job.job_match, 'var(--green)'], ['Domain Fit', job.domain_fit, 'var(--blue)']].map(([label, val, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory3)', width: 80, flexShrink: 0 }}>{label}</span>
                        <ProgressBar value={val * 100} color={color} />
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color, width: 36, textAlign: 'right' }}>{fmt(val)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {job.matched_skills.map(s => <Badge key={s} color="green">✓ {s}</Badge>)}
                    {job.skill_gaps.map(s => <Badge key={s} color="gray">+ {s}</Badge>)}
                  </div>
                </div>
              ))}
            </div>

            <Button full variant="ghost" style={{ marginTop: 20 }} onClick={() => onNavigate('jobs')}>
              Browse All Jobs →
            </Button>
          </div>
        )}
      </div>

      {/* ── Domain tiles ─────────────────────────────────────── */}
      {!results && (
        <>
          <div style={{ background: 'var(--ink2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '40px 28px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 24 }}>Top Domains</h2>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('jobs')}>Explore All →</Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {DOMAINS.map(d => (
                  <div key={d.name} onClick={() => onNavigate('jobs', { domain: d.name })} style={{
                    background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                    padding: '20px 14px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{d.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{d.name}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory3)' }}>{d.count} jobs</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          {!user && (
            <div style={{ background: 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.05))', borderTop: '1px solid var(--gold-border)', padding: '60px 28px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>AI-Powered Matching</div>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 30, marginBottom: 12 }}>Let AI find your perfect role</h2>
              <p style={{ color: 'var(--ivory2)', marginBottom: 28, maxWidth: 460, margin: '0 auto 28px' }}>
                Create a free account to save jobs, track applications, and get personalised AI recommendations.
              </p>
              <Button size="lg" onClick={() => onNavigate('auth-register')}>Get Started Free →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
