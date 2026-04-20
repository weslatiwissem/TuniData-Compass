import { useState } from 'react';
import SkillInput from './components/SkillInput.jsx';
import Results from './components/Results.jsx';
import DomainExplorer from './components/DomainExplorer.jsx';
import SkillGapAnalyzer from './components/SkillGapAnalyzer.jsx';
import MarketStats from './components/MarketStats.jsx';
import CareerComparison from './components/CareerComparison.jsx';
import './App.css';

// Compass Icon Component
function CompassIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="#f5a623" strokeWidth="1" strokeOpacity="0.4"/>
      <circle cx="16" cy="16" r="9" stroke="#f5a623" strokeWidth="0.5" strokeOpacity="0.25"/>
      <path d="M16 4 L18 16 L16 14 L14 16 Z" fill="#f5a623"/>
      <path d="M16 28 L18 16 L16 18 L14 16 Z" fill="#444a60"/>
      <line x1="16" y1="2" x2="16" y2="5" stroke="#f5a623" strokeWidth="1.5" strokeOpacity="0.6"/>
      <line x1="30" y1="16" x2="27" y2="16" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="2"  y1="16" x2="5"  y2="16" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="16" y1="30" x2="16" y2="27" stroke="#444a60" strokeWidth="1" strokeOpacity="0.4"/>
      <circle cx="16" cy="16" r="2" fill="#f5a623"/>
    </svg>
  );
}

const NAV = [
  { id: 'recommend', label: '◈ Recommend' },
  { id: 'explorer',  label: '⬡ Explore'   },
  { id: 'gap',       label: '◆ Gap Analysis' },
  { id: 'stats',     label: '▦ Market Stats' },
  { id: 'compare',   label: '⇌ Compare'   },
];

export default function App() {
  const [page, setPage] = useState('recommend');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock API call (replace with your actual API)
  const mockRecommend = async (skills) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          skills_used: skills,
          domains: [
            { name: "Data Engineering & AI", score: 94, best: true },
            { name: "Cloud & DevOps", score: 78, best: false },
            { name: "Full Stack Development", score: 65, best: false },
            { name: "Product Management", score: 42, best: false }
          ],
          jobs: [
            { title: "Data Engineer (AI Pipeline)", company: "Vermeg · Tunis", posted: "2 days ago", match: 94, skills_match: ["python", "sql", "etl"] },
            { title: "Cloud Data Architect", company: "Talend · Remote TN", posted: "1 week ago", match: 87, skills_match: ["aws", "python", "spark"] },
            { title: "Analytics Engineer", company: "Oreedo · Sousse", posted: "3 days ago", match: 79, skills_match: ["sql", "dbt", "powerbi"] }
          ],
          gaps: [
            { skill: "Apache Spark", level: "critical", importance: 92 },
            { skill: "Kubernetes", level: "important", importance: 78 },
            { skill: "Terraform", level: "useful", importance: 55 }
          ]
        });
      }, 800);
    });
  };

  const handleSubmit = async (skills) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // Replace with your actual API endpoint
      // const res = await fetch(`${API}/recommend`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ skills, top_n: 3 }),
      // });
      // const data = await res.json();
      
      // Using mock data for demo
      const data = await mockRecommend(skills);
      setResults(data);
    } catch (e) { 
      setError(e.message);
    } finally { 
      setLoading(false);
    }
  };

  const handleReset = () => { 
    setResults(null); 
    setError(null);
  };

  const handleNavClick = (id) => {
    setPage(id);
    if (id === 'recommend') handleReset();
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon"><CompassIcon /></div>
            <div className="logo-text-group">
              <span className="logo-name">Tuni<span>Data</span> Compass</span>
              <span className="logo-sub">Career Intelligence</span>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {NAV.map(n => (
              <button
                key={n.id}
                onClick={() => handleNavClick(n.id)}
                className={`nav-btn ${page === n.id ? 'active' : ''}`}
                style={{
                  background: page === n.id ? 'var(--amber-glow)' : 'transparent',
                  border: `1px solid ${page === n.id ? 'rgba(245,166,35,0.4)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  color: page === n.id ? 'var(--amber)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="header-right">
            <div className="header-stat">
              <span className="header-stat-dot" />
              API Online
            </div>
            <div className="header-divider" />
            <div className="header-stat">Tunisian Job Market</div>
          </div>
        </div>
      </header>

      <main className="main">
        {page === 'recommend' && (
          !results
            ? <SkillInput onSubmit={handleSubmit} loading={loading} error={error} />
            : <Results data={results} onReset={handleReset} />
        )}
        {page === 'explorer' && <DomainExplorer />}
        {page === 'gap'      && <SkillGapAnalyzer />}
        {page === 'stats'    && <MarketStats />}
        {page === 'compare'  && <CareerComparison />}
      </main>

      <footer className="footer">
        <div className="footer-left">
          <span>TF-IDF · Cosine Similarity</span>
          <span className="footer-sep">·</span>
          <span>FastAPI · React</span>
        </div>
        <div className="footer-right">TuniData Compass © 2025</div>
      </footer>
    </div>
  );
}