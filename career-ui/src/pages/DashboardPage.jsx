// src/pages/DiscoverPage.jsx — Enhanced Dashboard Edition
// Features: stat counters, trending skills, domain cards with top skills,
//           live IT news from Hacker News + Dev.to (free APIs, auto-refresh every 5min)
import { useState, useEffect, useRef, useCallback } from 'react';
import { recommenderAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Badge, ProgressBar, Spinner, Tag, Card } from '../components/ui';

// ── Domain market data ─────────────────────────────────────────────────────
const DOMAINS = [
  {
    name: 'Data Engineering',
    icon: '🗄️',
    color: '#3B82F6',
    dim: 'rgba(59,130,246,.10)',
    border: 'rgba(59,130,246,.28)',
    jobs: 234,
    growth: '+18%',
    topSkills: ['Python', 'Apache Spark', 'dbt', 'Kafka', 'Airflow', 'SQL', 'Hadoop'],
    demand: 87,
  },
  {
    name: 'ML / AI',
    icon: '🤖',
    color: '#a78bfa',
    dim: 'rgba(167,139,250,.10)',
    border: 'rgba(167,139,250,.28)',
    jobs: 145,
    growth: '+34%',
    topSkills: ['PyTorch', 'TensorFlow', 'scikit-learn', 'NLP', 'LLMs', 'MLflow', 'Hugging Face'],
    demand: 94,
  },
  {
    name: 'Backend Dev',
    icon: '⚙️',
    color: '#22C87A',
    dim: 'rgba(34,200,122,.10)',
    border: 'rgba(34,200,122,.28)',
    jobs: 176,
    growth: '+12%',
    topSkills: ['Java', 'Spring Boot', 'Node.js', 'PostgreSQL', 'Docker', 'FastAPI', 'Redis'],
    demand: 78,
  },
  {
    name: 'Frontend Dev',
    icon: '🎨',
    color: '#F5B53F',
    dim: 'rgba(245,181,63,.10)',
    border: 'rgba(245,181,63,.28)',
    jobs: 198,
    growth: '+9%',
    topSkills: ['React', 'TypeScript', 'Vue', 'Tailwind', 'Next.js', 'GraphQL', 'Vite'],
    demand: 72,
  },
  {
    name: 'DevOps',
    icon: '🚀',
    color: '#F06060',
    dim: 'rgba(240,96,96,.10)',
    border: 'rgba(240,96,96,.28)',
    jobs: 98,
    growth: '+22%',
    topSkills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD', 'Linux', 'Ansible', 'Prometheus'],
    demand: 81,
  },
  {
    name: 'Cybersecurity',
    icon: '🔐',
    color: '#2DD4BF',
    dim: 'rgba(45,212,191,.10)',
    border: 'rgba(45,212,191,.28)',
    jobs: 48,
    growth: '+41%',
    topSkills: ['SIEM', 'Pentest', 'SOC', 'Splunk', 'ISO 27001', 'Nmap', 'Burp Suite'],
    demand: 91,
  },
  {
    name: 'Data Science',
    icon: '📊',
    color: '#fb923c',
    dim: 'rgba(251,146,60,.10)',
    border: 'rgba(251,146,60,.28)',
    jobs: 112,
    growth: '+27%',
    topSkills: ['R', 'pandas', 'NumPy', 'Tableau', 'Power BI', 'Jupyter', 'Statistics'],
    demand: 83,
  },
  {
    name: 'Full Stack',
    icon: '💻',
    color: '#f472b6',
    dim: 'rgba(244,114,182,.10)',
    border: 'rgba(244,114,182,.28)',
    jobs: 163,
    growth: '+15%',
    topSkills: ['React', 'Node.js', 'MongoDB', 'Docker', 'TypeScript', 'REST API', 'GraphQL'],
    demand: 76,
  },
];

const TRENDING_SKILLS = [
  { name: 'LLMs / Prompt Engineering', delta: '+127%', hot: true, cat: 'AI' },
  { name: 'Kubernetes', delta: '+44%', hot: true, cat: 'DevOps' },
  { name: 'Apache Kafka', delta: '+38%', hot: false, cat: 'Data' },
  { name: 'dbt', delta: '+35%', hot: false, cat: 'Data' },
  { name: 'Rust', delta: '+31%', hot: false, cat: 'Backend' },
  { name: 'Terraform', delta: '+29%', hot: false, cat: 'DevOps' },
  { name: 'TypeScript', delta: '+26%', hot: false, cat: 'Frontend' },
  { name: 'Ray / MLflow', delta: '+24%', hot: true, cat: 'ML' },
  { name: 'GraphQL', delta: '+19%', hot: false, cat: 'Backend' },
  { name: 'Tailwind CSS', delta: '+17%', hot: false, cat: 'Frontend' },
];

const CAT_COLORS = {
  AI: '#a78bfa', DevOps: '#F06060', Data: '#3B82F6',
  Backend: '#22C87A', Frontend: '#F5B53F', ML: '#a78bfa',
};

const TECH_KW = [
  'ai', 'ml', 'python', 'javascript', 'react', 'kubernetes', 'cloud', 'llm',
  'data', 'software', 'engineer', 'security', 'api', 'devops', 'open source',
  'github', 'typescript', 'rust', 'docker', 'database', 'machine learning',
  'neural', 'gpt', 'programming', 'developer', 'framework', 'backend', 'frontend',
];

const isTechArticle = t => t && TECH_KW.some(k => t.toLowerCase().includes(k));

// ── Animated counter ───────────────────────────────────────────────────────
function useCounter(target, duration = 1400) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const s = performance.now();
    const tick = (now) => {
      const p = Math.min((now - s) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ── Animated bar ───────────────────────────────────────────────────────────
function AnimBar({ value, color, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div style={{ flex: 1, height: 4, background: 'var(--ink4)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 4, transition: 'width 1.1s cubic-bezier(0.16,1,0.3,1)' }} />
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, suffix, color }) {
  const count = useCounter(value);
  return (
    <div style={{
      background: 'var(--ink2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r)', padding: '22px 20px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 36, fontWeight: 900, color, letterSpacing: '-1.5px', lineHeight: 1 }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ivory3)', marginTop: 6, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--f-mono)' }}>
        {label}
      </div>
    </div>
  );
}

// ── Domain card ────────────────────────────────────────────────────────────
function DomainCard({ d, onNavigate }) {
  const [hov, setHov] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => setExpanded(e => !e)}
      style={{
        background: hov ? d.dim : 'var(--ink2)',
        border: `1px solid ${hov ? d.border : 'var(--line)'}`,
        borderRadius: 'var(--r)', padding: '22px 20px', cursor: 'pointer',
        transition: 'all 0.2s', transform: hov ? 'translateY(-3px)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top color accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${d.color},transparent)` }} />
      {/* Growth badge */}
      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(34,200,122,.12)', color: '#22C87A', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, fontFamily: 'var(--f-mono)' }}>
        {d.growth}
      </div>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{d.icon}</div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 700, color: 'var(--ivory)', marginBottom: 4 }}>{d.name}</div>
      <div style={{ fontSize: 12, color: 'var(--ivory3)', marginBottom: 14, fontFamily: 'var(--f-mono)' }}>
        <span style={{ color: d.color, fontWeight: 700 }}>{d.jobs}</span> open positions
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <AnimBar value={d.demand} color={d.color} delay={200} />
        <span style={{ fontSize: 11, color: d.color, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'var(--f-mono)' }}>{d.demand}%</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: expanded ? 12 : 0 }}>
        {d.topSkills.slice(0, expanded ? 7 : 3).map(s => (
          <span key={s} style={{ background: d.dim, color: d.color, border: `1px solid ${d.border}`, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, fontFamily: 'var(--f-mono)' }}>{s}</span>
        ))}
        {!expanded && (
          <span style={{ fontSize: 10, color: 'var(--ivory3)', padding: '2px 0', alignSelf: 'center', fontFamily: 'var(--f-mono)' }}>+{d.topSkills.length - 3} more</span>
        )}
      </div>
      {expanded && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate('jobs', { domain: d.name }); }}
          style={{ width: '100%', padding: '9px 14px', background: d.color, border: 'none', borderRadius: 'var(--r-sm)', color: '#0A0C10', fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
        >
          Browse {d.jobs} Jobs →
        </button>
      )}
    </div>
  );
}

// ── Time helper ────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() / 1000 - ts) / 3600);
  if (diff < 1) return 'just now';
  if (diff < 24) return `${diff}h ago`;
  return `${Math.floor(diff / 24)}d ago`;
}

const SRC_STYLE = {
  HackerNews: { bg: 'rgba(255,102,0,.15)', c: '#FF6600' },
  'Dev.to': { bg: 'rgba(99,102,241,.15)', c: '#818cf8' },
};

// ── News card ──────────────────────────────────────────────────────────────
function NewsCard({ article, idx }) {
  const [hov, setHov] = useState(false);
  const ss = SRC_STYLE[article.source] || { bg: 'rgba(232,160,32,.15)', c: 'var(--gold)' };
  return (
    <a
      href={article.url || article.link || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block',
        background: hov ? 'var(--ink3)' : 'var(--ink2)',
        border: `1px solid ${hov ? 'var(--line2)' : 'var(--line)'}`,
        borderLeft: `3px solid ${hov ? 'var(--gold)' : 'transparent'}`,
        borderRadius: 'var(--r)', padding: '16px 18px',
        textDecoration: 'none', transition: 'all 0.18s',
        transform: hov ? 'translateX(3px)' : 'none',
        animation: `fadeUp 0.4s ease ${idx * 60}ms both`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ background: ss.bg, color: ss.c, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, fontFamily: 'var(--f-mono)' }}>
              {article.source}
            </span>
            {article.time && (
              <span style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>{timeAgo(article.time)}</span>
            )}
            {article.score && (
              <span style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>▲ {article.score}</span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ivory)', lineHeight: 1.5, marginBottom: article.description ? 6 : 0 }}>
            {article.title}
          </div>
          {article.description && (
            <div style={{ fontSize: 11, color: 'var(--ivory3)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {article.description}
            </div>
          )}
        </div>
        <div style={{ color: 'var(--gold)', fontSize: 14, flexShrink: 0, marginTop: 2, opacity: hov ? 1 : 0.4, transition: 'opacity .18s' }}>↗</div>
      </div>
    </a>
  );
}

// ── News fetcher (Hacker News + Dev.to — both free, no API key needed) ─────
async function fetchNews() {
  let articles = [];
  const ONE_WEEK = 7 * 24 * 3600;
  const now = Date.now() / 1000;

  try {
    const [hnRes, devRes] = await Promise.allSettled([
      fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json()),
      fetch('https://dev.to/api/articles?tags=webdev,ai,python,javascript,devops&top=10&per_page=14').then(r => r.json()),
    ]);

    if (hnRes.status === 'fulfilled') {
      const ids = hnRes.value.slice(0, 35);
      const stories = await Promise.allSettled(
        ids.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()).catch(() => null))
      );
      const ok = stories
        .filter(s => s.status === 'fulfilled' && s.value && s.value.type === 'story' && s.value.url && isTechArticle(s.value.title))
        .map(s => s.value)
        .filter(s => !s.time || (now - s.time) < ONE_WEEK)
        .slice(0, 9)
        .map(s => ({ id: s.id, title: s.title, url: s.url, source: 'HackerNews', time: s.time, score: s.score }));
      articles = [...articles, ...ok];
    }

    if (devRes.status === 'fulfilled' && Array.isArray(devRes.value)) {
      const da = devRes.value
        .filter(a => a.published_at && (now - new Date(a.published_at).getTime() / 1000) < ONE_WEEK)
        .slice(0, 7)
        .map(a => ({
          id: 'dev-' + a.id,
          title: a.title,
          url: a.url || `https://dev.to${a.path}`,
          source: 'Dev.to',
          time: Math.floor(new Date(a.published_at).getTime() / 1000),
          score: a.positive_reactions_count,
          description: a.description,
        }));
      articles = [...articles, ...da];
    }

    // Sort by recency, drop anything older than 1 week
    articles = articles
      .filter(a => !a.time || (now - a.time) < ONE_WEEK)
      .sort((a, b) => (b.time || 0) - (a.time || 0));
  } catch (err) {
    console.error('News fetch error:', err);
  }

  return articles;
}

// ── Skill Input Panel ─────────────────────────────────────────────────────
function SkillInputPanel({ onSearch, loading }) {
  const [mode, setMode] = useState('manual');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [paragraph, setParagraph] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [cvDrag, setCvDrag] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const fileRef = useRef();
  const { push } = useToast();

  const addSkill = v => {
    const s = v.trim().toLowerCase().replace(/,/g, '');
    if (s && !skills.includes(s)) setSkills(p => [...p, s]);
    setSkillInput('');
  };

  const parseParagraph = async () => {
    if (paragraph.trim().length < 20) { push('Please write at least 20 characters.', 'error'); return; }
    setParseLoading(true);
    try {
      const res = await recommenderAPI.parseText(paragraph);
      setSkills(res.extracted_skills);
      push(`Extracted ${res.count} skills!`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setParseLoading(false); }
  };

  const parseCV = async file => {
    setParseLoading(true);
    try {
      const res = await recommenderAPI.parseCV(file);
      setSkills(res.extracted_skills);
      push(`Extracted ${res.count} skills from your CV!`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setParseLoading(false); }
  };

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '28px', borderTop: '2px solid var(--gold)' }}>
      {/* Mode tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, background: 'var(--ink3)', borderRadius: 'var(--r-sm)', padding: 3, marginBottom: 20 }}>
        {[['manual', '⌨️', 'Type Skills'], ['paragraph', '✍️', 'Describe Yourself'], ['cv', '📄', 'Upload CV']].map(([id, icon, label]) => (
          <button key={id} onClick={() => setMode(id)} style={{
            padding: '9px 6px', borderRadius: 'calc(var(--r-sm) - 2px)',
            background: mode === id ? 'var(--ink2)' : 'transparent',
            border: mode === id ? '1px solid var(--line)' : '1px solid transparent',
            color: mode === id ? 'var(--gold)' : 'var(--ivory3)',
            fontFamily: 'var(--f-mono)', fontSize: 11, cursor: 'pointer', transition: 'all .18s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>{icon} {label}</button>
        ))}
      </div>

      {/* Manual */}
      {mode === 'manual' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); } }}
              placeholder="e.g. python, react, docker..."
              style={{ flex: 1, background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 13px', color: 'var(--ivory)', fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)' }}
            />
            <button onClick={() => addSkill(skillInput)} style={{ background: 'var(--ink3)', border: '1px solid var(--line2)', borderRadius: 'var(--r-sm)', padding: '10px 16px', color: 'var(--ivory2)', fontFamily: 'var(--f-mono)', fontSize: 11, cursor: 'pointer' }}>
              + Add
            </button>
          </div>
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, padding: 12, background: 'var(--ink3)', borderRadius: 'var(--r-sm)', minHeight: 44 }}>
              {skills.map(s => (
                <span key={s} style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', color: 'var(--gold2)', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--f-mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {s}
                  <button onClick={() => setSkills(p => p.filter(x => x !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => skills.length && onSearch && onSearch(skills)}
            disabled={!skills.length || loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 'var(--r-sm)', border: 'none',
              background: skills.length ? 'linear-gradient(135deg,#E8A020,#F5B53F)' : 'var(--ink4)',
              color: skills.length ? '#0A0C10' : 'var(--ivory3)',
              fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700,
              cursor: skills.length ? 'pointer' : 'not-allowed', transition: 'all .2s',
            }}
          >
            {loading ? 'Matching Jobs…' : skills.length ? `Find Matching Jobs · ${skills.length} skill${skills.length !== 1 ? 's' : ''} →` : 'Add skills above to continue'}
          </button>
        </div>
      )}

      {/* Paragraph */}
      {mode === 'paragraph' && (
        <div>
          <textarea
            rows={5}
            value={paragraph}
            onChange={e => setParagraph(e.target.value)}
            placeholder="I'm a data engineer with 3 years of experience in Python, SQL and Apache Spark. I've built ML pipelines using TensorFlow..."
            style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '13px 15px', color: 'var(--ivory)', fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)', resize: 'vertical', lineHeight: 1.7, marginBottom: 12 }}
          />
          <p style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)', marginBottom: 14 }}>
            ✍️ Your text is used for <strong style={{ color: 'var(--ivory2)' }}>semantic matching</strong> — not just keywords. Minimum 20 characters.
          </p>
          <button
            onClick={parseParagraph}
            disabled={paragraph.trim().length < 20 || parseLoading}
            style={{ width: '100%', padding: '13px', borderRadius: 'var(--r-sm)', border: 'none', background: paragraph.trim().length >= 20 ? 'linear-gradient(135deg,#E8A020,#F5B53F)' : 'var(--ink4)', color: paragraph.trim().length >= 20 ? '#0A0C10' : 'var(--ivory3)', fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, cursor: paragraph.trim().length >= 20 ? 'pointer' : 'not-allowed' }}
          >
            {parseLoading ? 'Extracting Skills…' : 'Extract Skills & Build Profile →'}
          </button>
        </div>
      )}

      {/* CV Upload */}
      {mode === 'cv' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setCvDrag(true); }}
            onDragLeave={() => setCvDrag(false)}
            onDrop={e => { e.preventDefault(); setCvDrag(false); const f = e.dataTransfer.files[0]; if (f) { setCvFile(f); parseCV(f); } }}
            onClick={() => fileRef.current.click()}
            style={{ border: `1.5px dashed ${cvDrag ? 'var(--gold)' : 'var(--line2)'}`, borderRadius: 'var(--r-sm)', background: cvDrag ? 'var(--gold-dim)' : 'var(--ink3)', padding: '36px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{cvFile ? '📄' : '⬆️'}</div>
            <div style={{ fontSize: 14, color: 'var(--ivory2)', marginBottom: 4 }}>
              {cvFile ? <span style={{ color: 'var(--gold2)' }}>{cvFile.name}</span> : <><span>Drop your PDF here</span> or <span style={{ color: 'var(--gold)' }}>browse</span></>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>
              {cvFile ? 'Click to change' : 'PDF only · Skills extracted automatically'}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setCvFile(f); parseCV(f); } }} />
          </div>
          {parseLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, color: 'var(--ivory2)', fontSize: 13 }}>
              <Spinner size={18} /> Extracting skills from CV…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function DiscoverPage({ onNavigate }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [heroSearch, setHeroSearch] = useState('');
  const [newsTab, setNewsTab] = useState('all');
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Initial news load + auto-refresh every 5 minutes
  useEffect(() => {
    const load = () =>
      fetchNews().then(a => {
        setNews(a);
        setNewsLoading(false);
        setLastRefresh(new Date());
      });
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews =
    newsTab === 'all' ? news
    : newsTab === 'hn' ? news.filter(a => a.source === 'HackerNews')
    : news.filter(a => a.source === 'Dev.to');

  const handleSearch = async skills => {
    setLoading(true);
    try {
      const extra = {};
      if (user?.bio) extra.bio = user.bio;
      if (user?.experience?.length) extra.experience = user.experience;
      const res = await recommenderAPI.recommend(skills, 6, extra);
      setResults(res);
      setShowInput(false);
      const msg = res.semantic_enabled ? 'Semantic AI matching active 🧠' : 'Skill-based matching';
      push(`Recommendations ready! ${msg}`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const fmt = n => `${(n * 100).toFixed(0)}%`;
  const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };

  // ── Results view ──
  if (results) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px 80px', animation: 'fadeUp .35s ease' }}>
        <button onClick={() => { setResults(null); setShowInput(false); }} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '8px 16px', color: 'var(--ivory3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--f-ui)', marginBottom: 24 }}>
          ← New Search
        </button>
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
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Top Matching Jobs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.top_jobs.map((job, i) => (
            <div key={i} style={{ background: i === 0 ? 'linear-gradient(135deg,var(--ink2),rgba(232,160,32,.04))' : 'var(--ink2)', border: `1px solid ${i === 0 ? 'var(--gold-border)' : 'var(--line)'}`, borderRadius: 'var(--r)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, marginBottom: 3 }}>{job.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ivory3)' }}>{job.company} · {job.location}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness} · {job.days_old}d</Badge>
                  <Badge color="gray">{job.domain}</Badge>
                  <Button size="sm" onClick={() => onNavigate('jobs')}>View →</Button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {job.matched_skills.map(s => <Badge key={s} color="green">✓ {s}</Badge>)}
                {job.skill_gaps.map(s => <Badge key={s} color="gray">+ {s}</Badge>)}
              </div>
            </div>
          ))}
        </div>
        <Button full variant="ghost" style={{ marginTop: 20 }} onClick={() => onNavigate('jobs')}>Browse All Jobs →</Button>
      </div>
    );
  }

  // ── Dashboard view ──
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 80px', animation: 'fadeUp .5s ease' }}>

      {/* HERO */}
      <section style={{ padding: '64px 0 48px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 100, padding: '5px 14px', marginBottom: 20, fontSize: 11, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--f-mono)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Tunisia's #1 Career Intelligence Platform
          </div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(38px,5vw,58px)', fontWeight: 400, color: 'var(--ivory)', lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 18 }}>
            Navigate Your<br />
            <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Career Path</em>
            <br />
            <span style={{ fontSize: 'clamp(24px,3.5vw,38px)', color: 'var(--ivory2)' }}>in Tunisia</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ivory2)', lineHeight: 1.8, maxWidth: 480, marginBottom: 28 }}>
            AI-powered semantic matching. Real-time job market intelligence. Discover what skills are trending and where you fit.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <button onClick={() => setShowInput(s => !s)} style={{ background: 'linear-gradient(135deg,#E8A020,#F5B53F)', border: 'none', borderRadius: 'var(--r)', padding: '13px 26px', color: '#0A0C10', fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(232,160,32,.3)' }}>
              🎯 Match My Skills
            </button>
            <button onClick={() => onNavigate('jobs')} style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '13px 26px', color: 'var(--ivory2)', fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              📋 Browse All Jobs
            </button>
          </div>
          {/* Quick search */}
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '8px 8px 8px 18px', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 500 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="var(--ivory3)" strokeWidth="1.5"/><path d="M20 20l-3-3" stroke="var(--ivory3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input value={heroSearch} onChange={e => setHeroSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && onNavigate('jobs', { search: heroSearch })} placeholder="Search jobs, skills or companies..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--ivory)', fontSize: 14, fontFamily: 'var(--f-ui)' }} />
            <Button onClick={() => onNavigate('jobs', { search: heroSearch })}>Search</Button>
          </div>
        </div>
        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minWidth: 360 }}>
          {[
            { label: 'Live Jobs', value: 1062, suffix: '+', color: 'var(--gold)' },
            { label: 'Domains', value: 10, suffix: '', color: '#a78bfa' },
            { label: 'Skills Tracked', value: 287, suffix: '', color: 'var(--teal)' },
            { label: 'Companies Hiring', value: 340, suffix: '+', color: 'var(--green)' },
          ].map(s => <StatCard key={s.label} {...s} />)}
          <div style={{ gridColumn: '1/-1', background: 'linear-gradient(135deg,var(--ink2),rgba(167,139,250,.08))', border: '1px solid rgba(167,139,250,.25)', borderRadius: 'var(--r)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 28 }}>🧠</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>Semantic AI Matching Active</div>
              <div style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>Upload your CV — AI understands context, not just keywords</div>
            </div>
          </div>
        </div>
      </section>

      {/* SKILL INPUT PANEL */}
      {showInput && (
        <section style={{ marginBottom: 40, animation: 'fadeUp .3s ease' }}>
          <SkillInputPanel onSearch={handleSearch} loading={loading} />
        </section>
      )}

      {/* TRENDING SKILLS */}
      <section style={{ marginBottom: 52 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>Real-time Market Data</div>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 26, color: 'var(--ivory)', letterSpacing: '-0.5px' }}>Trending Skills This Month</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {TRENDING_SKILLS.map((skill, i) => (
            <div key={skill.name}
              style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all .2s', animation: `fadeUp 0.4s ease ${i * 40}ms both` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.background = 'var(--gold-dim)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--ink2)'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  {skill.hot && <span style={{ fontSize: 11 }}>🔥</span>}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ivory)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{skill.name}</span>
                </div>
                <span style={{ background: (CAT_COLORS[skill.cat] || 'var(--gold)') + '18', color: CAT_COLORS[skill.cat] || 'var(--gold)', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, fontFamily: 'var(--f-mono)' }}>{skill.cat}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--f-mono)', flexShrink: 0, marginLeft: 8 }}>{skill.delta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DOMAIN CARDS */}
      <section style={{ marginBottom: 52 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>Job Market</div>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 26, color: 'var(--ivory)', letterSpacing: '-0.5px' }}>Top Domains in Tunisia</h2>
          </div>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory3)' }}>Click a card to expand</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
          {DOMAINS.map((d, i) => (
            <div key={d.name} style={{ animation: `fadeUp 0.4s ease ${i * 60}ms both` }}>
              <DomainCard d={d} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      </section>

      {/* IT NEWS FEED */}
      <section style={{ marginBottom: 52 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Live Feed
            </div>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 26, color: 'var(--ivory)', letterSpacing: '-0.5px' }}>IT &amp; Tech News</h2>
            {lastRefresh && (
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ivory3)', marginTop: 4 }}>
                Updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every 5 min
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['hn', 'Hacker News'], ['dev', 'Dev.to']].map(([id, label]) => (
              <button key={id} onClick={() => setNewsTab(id)} style={{ padding: '6px 13px', borderRadius: 'var(--r-sm)', border: `1px solid ${newsTab === id ? 'var(--gold-border)' : 'var(--line)'}`, background: newsTab === id ? 'var(--gold-dim)' : 'transparent', color: newsTab === id ? 'var(--gold)' : 'var(--ivory3)', fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .18s' }}>
                {label}
              </button>
            ))}
            <button
              onClick={() => { setNewsLoading(true); fetchNews().then(a => { setNews(a); setNewsLoading(false); setLastRefresh(new Date()); }); }}
              style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'transparent', color: 'var(--ivory3)', fontFamily: 'var(--f-mono)', fontSize: 12, cursor: 'pointer' }}
              title="Refresh news"
            >↺</button>
          </div>
        </div>

        {newsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 100, borderRadius: 'var(--r)', background: 'linear-gradient(90deg,var(--ink3) 25%,var(--ink4) 50%,var(--ink3) 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s infinite' }} />
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ivory3)', fontSize: 13, fontFamily: 'var(--f-mono)' }}>
            No articles found — check connection or click ↺ to retry.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filteredNews.map((article, i) => (
              <NewsCard key={article.id} article={article} idx={i} />
            ))}
          </div>
        )}
      </section>

      {/* CTA BANNER */}
      {!user && (
        <section style={{ background: 'linear-gradient(135deg,var(--ink2) 0%,rgba(232,160,32,.06) 100%)', border: '1px solid var(--gold-border)', borderRadius: 'var(--r)', padding: '44px 40px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 32 }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>AI-Powered · Semantic Matching</div>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 30, color: 'var(--ivory)', letterSpacing: '-1px', marginBottom: 12 }}>Let AI find your perfect role</h2>
            <p style={{ fontSize: 13, color: 'var(--ivory2)', lineHeight: 1.8, maxWidth: 480 }}>
              Upload your CV or describe your experience. Our engine understands context — not just keywords — and matches you with the right opportunities in Tunisia's tech market.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180 }}>
            <button onClick={() => onNavigate('auth-register')} style={{ background: 'linear-gradient(135deg,#E8A020,#F5B53F)', border: 'none', borderRadius: 'var(--r)', padding: '13px 22px', color: '#0A0C10', fontFamily: 'var(--f-ui)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Get Started Free →
            </button>
            <button onClick={() => onNavigate('auth-login')} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--r)', padding: '13px 22px', color: 'var(--ivory2)', fontFamily: 'var(--f-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Sign In
            </button>
          </div>
        </section>
      )}
    </div>
  );
}