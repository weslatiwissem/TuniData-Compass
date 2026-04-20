export default function Results({ data, onReset }) {
  return (
    <div className="results-page">
      <div className="results-top">
        <div className="results-title">
          Top <span>Opportunities</span> for You
        </div>
        <button onClick={onReset} className="reset-btn">⟳ New Search</button>
      </div>

      <div className="skills-used">
        <div className="section-header">
          <span className="section-number">SKILLS</span>
          <span className="section-title">Extracted profile</span>
        </div>
        <div className="tags-container">
          {data.skills_used.map(skill => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">01</span>
          <span className="section-title">Domain relevance</span>
        </div>
        <div className="domain-list">
          {data.domains.map(domain => (
            <div key={domain.name} className={`domain-row ${domain.best ? 'best' : ''}`}>
              <div className="domain-info">
                <div className="domain-name">
                  {domain.name}
                  {domain.best && <span className="best-badge">BEST MATCH</span>}
                </div>
                <div className="domain-bar-wrap">
                  <div className="domain-bar" style={{ width: `${domain.score}%` }} />
                </div>
              </div>
              <div className="domain-score">{domain.score}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">02</span>
          <span className="section-title">Recommended jobs</span>
        </div>
        <div className="jobs-grid">
          {data.jobs.map((job, idx) => (
            <div key={idx} className="job-card">
              <div className="job-title">{job.title}</div>
              <div className="job-meta">
                <span>{job.company}</span>
                <span className="freshness">✨ {job.posted}</span>
              </div>
              <div className="score-row">
                <span style={{ fontSize: 11 }}>Match</span>
                <div className="score-bar-wrap">
                  <div className="score-bar" style={{ width: `${job.match}%` }} />
                </div>
                <span>{job.match}%</span>
              </div>
              <div className="chips">
                {job.skills_match.map(skill => (
                  <span key={skill} className="chip">{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">03</span>
          <span className="section-title">Skill gaps to prioritize</span>
        </div>
        <div className="gap-grid">
          {data.gaps.map(gap => (
            <div key={gap.skill} className="gap-card">
              <span>{gap.skill}</span>
              <span className={`level-badge ${gap.level}`}>{gap.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}