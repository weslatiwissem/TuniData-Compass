import { useState, useRef } from 'react';

const MODES = [
  { id: 'cv',     icon: '📄', label: 'Upload CV'   },
  { id: 'text',   icon: '✍️',  label: 'Write Text'  },
  { id: 'manual', icon: '⌨️',  label: 'Type Skills' },
];

function SkillTag({ skill, onRemove }) {
  return (
    <span className="skill-tag">
      {skill}
      {onRemove && (
        <button className="skill-tag-remove" onClick={() => onRemove(skill)}>×</button>
      )}
    </span>
  );
}

function ConfirmSkills({ skills, onConfirm, onBack, loading }) {
  const [confirmed, setConfirmed] = useState(skills);
  const [input, setInput] = useState('');

  const remove = s => setConfirmed(p => p.filter(x => x !== s));
  const add = () => {
    const t = input.trim().toLowerCase();
    if (t && !confirmed.includes(t)) setConfirmed(p => [...p, t]);
    setInput('');
  };
  const handleKey = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } };

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Skills Extracted</span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {confirmed.length} skill{confirmed.length !== 1 ? 's' : ''} found — remove false positives or add missing ones
        </p>
      </div>

      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 16,
        minHeight: 72,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 14,
      }}>
        {confirmed.length === 0
          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>No skills — add some below</span>
          : confirmed.map(s => <SkillTag key={s} skill={s} onRemove={remove} />)
        }
      </div>

      <div className="add-row" style={{ marginBottom: 20 }}>
        <input className="add-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} placeholder="Add a missing skill..." />
        <button className="add-btn" onClick={add}>+ Add</button>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{
          flex: 1, padding: '13px', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12,
          cursor: 'pointer',
        }}>
          ← Try Again
        </button>
        <button onClick={() => onConfirm(confirmed)}
          disabled={confirmed.length === 0 || loading}
          className="cta-btn" style={{ flex: 2, marginTop: 0 }}
        >
          {loading ? 'Matching Jobs…' : `Find Jobs · ${confirmed.length} Skills →`}
        </button>
      </div>
    </div>
  );
}

export default function SkillInput({ onSubmit, loading, error }) {
  const [mode, setMode] = useState('cv');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [manualSkills, setManualSkills] = useState([]);
  const fileRef = useRef();

  const reset = () => {
    setExtracted(null); setParseError(null); setFileName(null);
    setSelectedFile(null); setFreeText(''); setManualInput(''); setManualSkills([]);
  };

  const selectFile = f => {
    if (!f) return;
    if (!f.name.endsWith('.pdf')) { setParseError('Please upload a PDF file.'); return; }
    setParseError(null); setFileName(f.name); setSelectedFile(f);
  };

  const handleFile = async () => {
    if (!selectedFile) { setParseError('Please select a PDF file first.'); return; }
    setParseLoading(true); setParseError(null);
    // Simulate extraction (replace with actual API call)
    setTimeout(() => {
      setParseLoading(false);
      setExtracted(['python', 'sql', 'data visualization', 'machine learning']);
    }, 800);
  };

  const handleFreeText = async () => {
    if (freeText.trim().length < 20) { setParseError('Please write at least 20 characters.'); return; }
    setParseLoading(true); setParseError(null);
    setTimeout(() => {
      setParseLoading(false);
      setExtracted(['react', 'node.js', 'mongodb', 'express', 'javascript']);
    }, 800);
  };

  const addManual = () => {
    const t = manualInput.trim().toLowerCase();
    if (t && !manualSkills.includes(t)) setManualSkills(p => [...p, t]);
    setManualInput('');
  };
  const removeManual = s => setManualSkills(p => p.filter(x => x !== s));
  const handleManualKey = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addManual(); } };

  if (extracted) {
    return (
      <div className="input-page">
        <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
          <div className="input-card">
            <div className="card-body">
              <ConfirmSkills skills={extracted} onConfirm={onSubmit} onBack={reset} loading={loading} />
              {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="input-page">
      <div className="input-layout">
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
          <div className="stats-row">
            <div className="stat-item"><span className="stat-number">1,062+</span> Job Listings</div>
            <div className="stat-item"><span className="stat-number">10+</span> Career Domains</div>
            <div className="stat-item"><span className="stat-number">287+</span> Tracked Skills</div>
          </div>
        </div>

        <div className="input-card">
          <div className="card-body">
            <div className="mode-tabs">
              {MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`mode-tab ${mode === m.id ? 'active' : ''}`}
                  onClick={() => { setMode(m.id); setParseError(null); }}
                >
                  <span className="mode-tab-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {mode === 'cv' && (
              <div>
                <span className="field-label">Upload your CV (PDF)</span>
                <div
                  className={`drop-zone${dragOver ? ' over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileRef.current.click()}
                >
                  <div className="drop-icon">{fileName ? '📄' : '⬆️'}</div>
                  <div className="drop-primary">
                    {fileName
                      ? <span style={{ color: 'var(--amber)' }}>{fileName}</span>
                      : <><span>Drop your PDF</span> or <span style={{ color: 'var(--amber)' }}>click to browse</span></>
                    }
                  </div>
                  <div className="drop-secondary">
                    {fileName ? 'Click to change' : 'PDF files only · Max 10MB'}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf"
                    style={{ display: 'none' }} onChange={e => selectFile(e.target.files[0])} />
                </div>
                <button onClick={handleFile} disabled={parseLoading || !selectedFile} className="cta-btn">
                  {parseLoading ? 'Extracting Skills…' : 'Extract Skills from CV'}
                </button>
              </div>
            )}

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
                <button onClick={handleFreeText} disabled={parseLoading || freeText.trim().length < 20} className="cta-btn">
                  {parseLoading ? 'Extracting Skills…' : 'Extract Skills from Text'}
                </button>
              </div>
            )}

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

            {(parseError || error) && (
              <div className="error-box" style={{ marginTop: 14 }}>{parseError || error}</div>
            )}

            {parseLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <div className="spinner" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  Analysing your profile…
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}