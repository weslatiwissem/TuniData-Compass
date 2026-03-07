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
      </div>
    </div>
  )
}
