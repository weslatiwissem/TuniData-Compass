import { useState } from 'react';

export default function CareerComparison() {
  const [role1, setRole1] = useState('Data Engineer');
  const [role2, setRole2] = useState('DevOps Engineer');

  const comparisonData = {
    'Data Engineer': {
      salary: '2,800-3,500 TND',
      demand: 'Very High',
      skills: ['Python', 'SQL', 'Spark', 'Airflow'],
      remote: '65%',
    },
    'DevOps Engineer': {
      salary: '3,000-3,800 TND',
      demand: 'Very High',
      skills: ['Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
      remote: '70%',
    },
    'Full Stack Developer': {
      salary: '2,500-3,200 TND',
      demand: 'High',
      skills: ['React', 'Node.js', 'MongoDB', 'Express'],
      remote: '55%',
    },
    'Product Manager': {
      salary: '3,200-4,500 TND',
      demand: 'Medium-High',
      skills: ['Agile', 'Roadmapping', 'Analytics', 'Leadership'],
      remote: '40%',
    },
  };

  const roles = Object.keys(comparisonData);

  return (
    <div className="results-page">
      <div className="results-title">
        <span>⇌ Compare</span> Career Paths
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        Side-by-side comparison of roles in the Tunisian market
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <select
          value={role1}
          onChange={e => setRole1(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
          }}
        >
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
        <select
          value={role2}
          onChange={e => setRole2(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
          }}
        >
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="job-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>{role1}</h3>
          <div style={{ marginBottom: 12 }}><strong>💰 Salary:</strong> {comparisonData[role1].salary}</div>
          <div style={{ marginBottom: 12 }}><strong>📈 Demand:</strong> {comparisonData[role1].demand}</div>
          <div style={{ marginBottom: 12 }}><strong>🏠 Remote:</strong> {comparisonData[role1].remote}</div>
          <div><strong>🔧 Key Skills:</strong></div>
          <div className="tags-container" style={{ marginTop: 8 }}>
            {comparisonData[role1].skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
          </div>
        </div>
        <div className="job-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>{role2}</h3>
          <div style={{ marginBottom: 12 }}><strong>💰 Salary:</strong> {comparisonData[role2].salary}</div>
          <div style={{ marginBottom: 12 }}><strong>📈 Demand:</strong> {comparisonData[role2].demand}</div>
          <div style={{ marginBottom: 12 }}><strong>🏠 Remote:</strong> {comparisonData[role2].remote}</div>
          <div><strong>🔧 Key Skills:</strong></div>
          <div className="tags-container" style={{ marginTop: 8 }}>
            {comparisonData[role2].skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}