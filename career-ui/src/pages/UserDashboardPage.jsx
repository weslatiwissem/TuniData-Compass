/**
 * UserDashboardPage.jsx — refined design: card-first layout,
 * no emojis, clean typography, removed CF info banner,
 * recommendation section fully redesigned.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { jobsAPI, userAPI, statsAPI, recommenderAPI } from '../utils/api';
import { collaborativeFilter, deriveUserProfile } from '../utils/collaborativeFilter';
import { Badge, Button, Spinner, ProgressBar, Avatar } from '../components/ui';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Color helpers ─────────────────────────────────────────────
const PALETTE = [
  '#2557f0','#0891b2','#059669','#7c3aed',
  '#dc2626','#d97706','#db2777','#0284c7',
];
const domainColor = (str = '') => {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
};

const FRESHNESS = {
  fresh:   { color: 'green',  label: 'Fresh'   },
  aging:   { color: 'gold',   label: 'Aging'   },
  expired: { color: 'red',    label: 'Expired' },
  unknown: { color: 'gray',   label: 'Unknown' },
};

// ── Skeleton loader ───────────────────────────────────────────
function Skeleton({ w = '100%', h = 20, r = 6, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)',
      backgroundSize: '400px 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
      flexShrink: 0, ...style,
    }} />
  );
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ label, title, action, children, style = {} }) {
  return (
    <div style={{ marginBottom: 36, ...style }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 18, paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          {label && (
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
              letterSpacing: '2px', textTransform: 'uppercase',
              fontWeight: 500, marginBottom: 4,
            }}>{label}</div>
          )}
          <h2 style={{
            fontFamily: 'var(--f-display)', fontSize: 22,
            letterSpacing: '-0.3px', color: 'var(--text-primary)', fontWeight: 400,
          }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────
function Counter({ to, duration = 1200 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current || to === 0) return;
    ref.current = true;
    const start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{val.toLocaleString()}</>;
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'var(--surface-0)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '20px 22px',
      boxShadow: 'var(--shadow-xs)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color, borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontFamily: 'var(--f-display)', fontSize: 34, color,
            letterSpacing: '-1px', lineHeight: 1, marginTop: 4,
          }}>
            <Counter to={typeof value === 'number' ? value : 0} />
          </div>
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '2px',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 9,
          }}>{label}</div>
        </div>
        {/* Icon badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--r-sm)',
          background: color + '14', border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── SVG icons for stat cards (no emojis) ─────────────────────
function IconStar() {
  return <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
}
function IconCheck() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconSkill() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="3" rx="1.5" fill="currentColor" opacity=".4"/><rect x="3" y="12" width="12" height="3" rx="1.5" fill="currentColor" opacity=".7"/><rect x="3" y="17" width="7" height="3" rx="1.5" fill="currentColor"/></svg>;
}
function IconBriefcase() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

// ── Recommendation card ───────────────────────────────────────
function RecCard({ job, onSave, onApply, isSaved, isApplied }) {
  const [hov, setHov] = useState(false);
  const color = domainColor(job.domain);
  const logo  = (job.company || 'J').charAt(0).toUpperCase();
  const freshCfg = FRESHNESS[job.freshness] || FRESHNESS.unknown;
  const score = Math.round((job.blendedScore || 0) * 100);

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface-0)',
        border: `1px solid ${hov ? 'var(--border-med)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)', padding: '20px',
        transition: 'all .2s', position: 'relative', overflow: 'hidden',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: hov ? 'translateY(-2px)' : 'none',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* Color accent top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Logo */}
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--r-sm)',
          background: color + '14', border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700, color,
          fontFamily: 'var(--f-mono)', flexShrink: 0,
        }}>{logo}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{job.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {job.company} &middot; {job.location}
          </div>
        </div>

        {/* Score + freshness */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 700, color,
            background: color + '10', border: `1px solid ${color}28`,
            borderRadius: 'var(--r-xs)', padding: '2px 8px',
          }}>{score}%</div>
          <Badge color={freshCfg.color}>{freshCfg.label}</Badge>
        </div>
      </div>

      {/* Match skills */}
      {job.cfReasonSkills?.length > 0 && (
        <div style={{
          background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
          borderRadius: 'var(--r-sm)', padding: '8px 12px',
          display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
        }}>
          <span style={{
            fontSize: 10, color: 'var(--blue-600)', fontFamily: 'var(--f-mono)',
            letterSpacing: '1px', textTransform: 'uppercase', marginRight: 4,
            fontWeight: 500,
          }}>Matched on</span>
          {job.cfReasonSkills.map(s => (
            <span key={s} style={{
              background: '#fff', border: '1px solid var(--blue-200)',
              color: 'var(--blue-700)', fontSize: 10, padding: '2px 8px',
              borderRadius: 100, fontFamily: 'var(--f-mono)', fontWeight: 500,
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* Domain + age */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          background: color + '10', color, border: `1px solid ${color}28`,
          fontSize: 10, padding: '2px 9px', borderRadius: 100,
          fontFamily: 'var(--f-mono)', fontWeight: 500,
        }}>{job.domain}</span>
        {job.days_old > 0 && (
          <span style={{
            fontSize: 11, color: 'var(--text-faint)',
            fontFamily: 'var(--f-mono)',
          }}>{job.days_old}d ago</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button
          onClick={() => onSave(job.id)}
          style={{
            background: isSaved ? 'var(--blue-50)' : 'transparent',
            border: `1px solid ${isSaved ? 'var(--blue-200)' : 'var(--border)'}`,
            borderRadius: 'var(--r-sm)', padding: '7px 14px',
            color: isSaved ? 'var(--blue-600)' : 'var(--text-muted)',
            fontFamily: 'var(--f-mono)', fontSize: 11, cursor: 'pointer',
            transition: 'all .18s', fontWeight: 500,
          }}
        >{isSaved ? 'Saved' : 'Save'}</button>
        {isApplied ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, background: 'var(--emerald-dim)', border: '1px solid rgba(14,165,114,.25)',
            borderRadius: 'var(--r-sm)', padding: '7px',
            color: 'var(--emerald)', fontSize: 12, fontFamily: 'var(--f-mono)', fontWeight: 600,
          }}>Applied</div>
        ) : (
          <button
            onClick={() => onApply(job)}
            style={{
              flex: 1, background: 'var(--blue-500)', border: 'none',
              borderRadius: 'var(--r-sm)', padding: '7px',
              color: '#fff', fontSize: 12, fontFamily: 'var(--f-ui)',
              fontWeight: 600, cursor: 'pointer', transition: 'all .18s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-600)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--blue-500)'}
          >Apply Now</button>
        )}
      </div>
    </div>
  );
}

// ── Skill gap row ─────────────────────────────────────────────
function GapRow({ skill, importance, level, color, index }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), index * 40);
    return () => clearTimeout(t);
  }, [index]);

  const levelCfg = {
    critical:  { color: '#be123c', bg: 'rgba(244,63,94,.07)',  border: 'rgba(244,63,94,.2)'   },
    important: { color: '#b45309', bg: 'rgba(245,158,11,.07)', border: 'rgba(245,158,11,.2)'  },
    useful:    { color: 'var(--text-muted)', bg: 'var(--surface-1)', border: 'var(--border)' },
  };
  const lc = levelCfg[level] || levelCfg.useful;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: 'var(--surface-0)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      transition: 'opacity .4s, transform .4s',
      opacity: ready ? 1 : 0,
      transform: ready ? 'translateX(0)' : 'translateX(-8px)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{skill}</div>
        <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, background: color,
            width: ready ? `${Math.round(importance * 100)}%` : '0%',
            transition: 'width 1s cubic-bezier(.16,1,.3,1)',
          }} />
        </div>
      </div>
      <span style={{
        fontFamily: 'var(--f-mono)', fontSize: 11,
        color: 'var(--text-muted)', width: 32, textAlign: 'right', flexShrink: 0,
      }}>{Math.round(importance * 100)}%</span>
      <span style={{
        padding: '2px 9px', borderRadius: 100,
        fontFamily: 'var(--f-mono)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.5px', textTransform: 'uppercase',
        background: lc.bg, color: lc.color, border: `1px solid ${lc.border}`,
        flexShrink: 0,
      }}>{level}</span>
    </div>
  );
}

// ── Learning resource card ────────────────────────────────────
function ResourceCard({ res, idx }) {
  const [hov, setHov] = useState(false);
  const SRC = {
    devto:   { label: 'Dev.to',       color: '#6366f1' },
    hn:      { label: 'Hacker News',  color: '#f97316' },
    wiki:    { label: 'Wikipedia',    color: '#b45309'  },
    youtube: { label: 'YouTube',      color: '#dc2626'  },
  };
  const src = SRC[res.source] || SRC.devto;

  return (
    <a
      href={res.url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'block',
        background: hov ? 'var(--surface-1)' : 'var(--surface-0)',
        border: `1px solid ${hov ? 'var(--border-med)' : 'var(--border)'}`,
        borderLeft: `3px solid ${hov ? src.color : 'var(--border)'}`,
        borderRadius: 'var(--r-sm)',
        padding: '14px 16px',
        textDecoration: 'none',
        transition: 'all .18s',
        animation: `fadeUp .35s ease ${idx * 50}ms both`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <span style={{
              background: src.color + '16', color: src.color,
              fontSize: 9, fontWeight: 700, padding: '2px 7px',
              borderRadius: 100, fontFamily: 'var(--f-mono)',
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>{src.label}</span>
            {res.skill && (
              <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--f-mono)' }}>
                {res.skill}
              </span>
            )}
            {res.readTime && (
              <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--f-mono)' }}>
                {res.readTime} min
              </span>
            )}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            lineHeight: 1.5, marginBottom: res.excerpt ? 5 : 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{res.title}</div>
          {res.excerpt && (
            <div style={{
              fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{res.excerpt}</div>
          )}
        </div>
        <div style={{
          color: 'var(--blue-400)', fontSize: 14, flexShrink: 0,
          opacity: hov ? 1 : 0.3, transition: 'opacity .18s',
        }}>&#8599;</div>
      </div>
    </a>
  );
}

// ── Domain pill ───────────────────────────────────────────────
function DomainPill({ domain, active, implied, onClick }) {
  const [hov, setHov] = useState(false);
  const color = domainColor(domain);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active ? color + '12' : hov ? 'var(--surface-2)' : 'var(--surface-0)',
        border: `1px solid ${active ? color + '45' : 'var(--border)'}`,
        borderRadius: 100, padding: '7px 16px',
        color: active ? color : 'var(--text-secondary)',
        fontFamily: 'var(--f-mono)', fontSize: 11, cursor: 'pointer',
        transition: 'all .18s', display: 'flex', alignItems: 'center', gap: 7,
        fontWeight: active ? 600 : 400,
      }}
    >
      {domain}
      {implied && (
        <span style={{
          background: 'rgba(14,165,114,.12)', color: '#059669',
          fontSize: 9, padding: '1px 6px', borderRadius: 100,
          fontFamily: 'var(--f-mono)', fontWeight: 700,
        }}>active</span>
      )}
    </button>
  );
}

// ── Activity item ─────────────────────────────────────────────
function ActivityItem({ type, job, id }) {
  const cfg = {
    applied: { label: 'Applied', color: 'var(--emerald)', bg: 'var(--emerald-dim)', border: 'rgba(14,165,114,.2)' },
    saved:   { label: 'Saved',   color: 'var(--amber)',   bg: 'var(--amber-dim)',   border: 'rgba(245,158,11,.2)' },
  };
  const c = cfg[type] || cfg.saved;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px', background: 'var(--surface-0)',
      border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: c.color,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{job?.title || `Job #${id}`}</div>
        {job && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            {job.company} &middot; {job.domain}
          </div>
        )}
      </div>
      <span style={{
        fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
        color: c.color, letterSpacing: '1px', textTransform: 'uppercase',
        background: c.bg, border: `1px solid ${c.border}`,
        padding: '2px 8px', borderRadius: 100, flexShrink: 0,
      }}>{c.label}</span>
    </div>
  );
}

// ── Free API fetchers ─────────────────────────────────────────
async function fetchDevToArticles(skill, count = 3) {
  try {
    const tag = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
    const res = await fetch(`https://dev.to/api/articles?tag=${tag}&top=7&per_page=${count}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).slice(0, count).map(a => ({ source: 'devto', title: a.title, url: a.url, skill, excerpt: a.description, readTime: a.reading_time_minutes }));
  } catch { return []; }
}
async function fetchHNArticles(skill, count = 2) {
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(skill + ' tutorial learn')}&tags=story&hitsPerPage=${count * 2}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).filter(h => h.url && h.title?.toLowerCase().includes(skill.toLowerCase().split(' ')[0])).slice(0, count).map(h => ({ source: 'hn', title: h.title, url: h.url, skill }));
  } catch { return []; }
}
async function fetchWikiSummary(skill) {
  try {
    const topic = skill.replace(/\s+/g, '_');
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === 'disambiguation' || !data.extract) return null;
    return { source: 'wiki', title: `${skill} — Overview`, url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${topic}`, skill, excerpt: data.extract?.slice(0, 180) + '…' };
  } catch { return null; }
}
async function fetchLearningResources(skills) {
  const top = skills.slice(0, 4);
  const all = [];
  await Promise.all(top.map(async skill => {
    const [devto, hn, wiki] = await Promise.all([fetchDevToArticles(skill, 3), fetchHNArticles(skill, 2), fetchWikiSummary(skill)]);
    all.push(...devto, ...hn);
    if (wiki) all.push(wiki);
  }));
  const seen = new Set();
  return all.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
}
async function fetchSkillGap(domain, userSkills) {
  try {
    const res = await fetch(`${BASE}/missing-skills`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: userSkills, domain, top_n: 10 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.missing_skills || [];
  } catch { return []; }
}

// ── Tab config ────────────────────────────────────────────────
const TABS = [
  { id: 'recs',     label: 'For You'        },
  { id: 'learning', label: 'Learning Paths' },
  { id: 'gaps',     label: 'Skill Gaps'     },
  { id: 'activity', label: 'Activity'       },
  { id: 'profile',  label: 'Profile'        },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function UserDashboardPage({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const { push } = useToast();

  const [tab, setTab] = useState('recs');

  const [allJobs,        setAllJobs]        = useState([]);
  const [jobsLoading,    setJobsLoading]    = useState(true);
  const [cfRecs,         setCfRecs]         = useState([]);
  const [cfLoading,      setCfLoading]      = useState(false);
  const [marketStats,    setMarketStats]    = useState(null);
  const [impliedProfile, setImpliedProfile] = useState({ topDomains: [], topSkills: [] });

  const [selectedDomain, setSelectedDomain] = useState('');
  const [gapSkills,      setGapSkills]      = useState([]);
  const [gapLoading,     setGapLoading]     = useState(false);
  const [resources,      setResources]      = useState([]);
  const [resLoading,     setResLoading]     = useState(false);

  const [savedSet,   setSavedSet]   = useState(new Set());
  const [appliedSet, setAppliedSet] = useState(new Set());

  useEffect(() => {
    if (user) {
      setSavedSet(new Set((user.saved_jobs   || []).map(String)));
      setAppliedSet(new Set((user.applied_jobs || []).map(String)));
    }
  }, [user]);

  useEffect(() => { statsAPI.market().then(setMarketStats).catch(() => {}); }, []);

  useEffect(() => {
    const load = async () => {
      setJobsLoading(true);
      try {
        const [p1, p2, p3, p4] = await Promise.all([
          jobsAPI.list({ page: 1, perPage: 50 }),
          jobsAPI.list({ page: 2, perPage: 50 }),
          jobsAPI.list({ page: 3, perPage: 50 }),
          jobsAPI.list({ page: 4, perPage: 50 }),
        ]);
        const combined = [...(p1.jobs||[]), ...(p2.jobs||[]), ...(p3.jobs||[]), ...(p4.jobs||[])];
        const seen = new Set();
        setAllJobs(combined.filter(j => { if (seen.has(j.id)) return false; seen.add(j.id); return true; }));
      } catch (e) { console.error(e); }
      finally { setJobsLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (jobsLoading || allJobs.length === 0) return;
    if (!user?.saved_jobs?.length && !user?.applied_jobs?.length) return;
    setCfLoading(true);
    const run = async () => {
      const savedIds   = (user.saved_jobs   || []).map(String);
      const appliedIds = (user.applied_jobs || []).map(String);
      const profile = deriveUserProfile(allJobs, savedIds, appliedIds);
      setImpliedProfile(profile);
      let backendScores = {};
      const skillsToUse = [...new Set([...(user.skills || []), ...profile.topSkills])].slice(0, 15);
      if (skillsToUse.length > 0) {
        try {
          const res = await recommenderAPI.recommend(skillsToUse, 50, { bio: user.bio, experience: user.experience });
          for (const job of res.top_jobs || []) { if (job.id) backendScores[String(job.id)] = job.score || 0; }
        } catch {}
      }
      const recs = collaborativeFilter({ allJobs, savedJobIds: savedIds, appliedJobIds: appliedIds, backendScores, topN: 12, cfWeight: 0.4, backendWeight: 0.6 });
      setCfRecs(recs);
      setCfLoading(false);
      if (profile.topDomains[0] && !selectedDomain) setSelectedDomain(profile.topDomains[0]);
    };
    run().catch(() => setCfLoading(false));
  }, [jobsLoading, allJobs, user?.saved_jobs?.join(), user?.applied_jobs?.join()]);

  useEffect(() => {
    if (!selectedDomain) return;
    setGapLoading(true);
    const userSkills = [...(user?.skills || []), ...impliedProfile.topSkills];
    fetchSkillGap(selectedDomain, userSkills)
      .then(gaps => { setGapSkills(gaps); setGapLoading(false); })
      .catch(() => setGapLoading(false));
  }, [selectedDomain, impliedProfile.topSkills.join()]);

  useEffect(() => {
    if (gapSkills.length === 0) return;
    setResLoading(true);
    const top = gapSkills.filter(s => s.level === 'critical' || s.level === 'important').slice(0, 4).map(s => s.skill);
    fetchLearningResources(top).then(r => { setResources(r); setResLoading(false); }).catch(() => setResLoading(false));
  }, [gapSkills.map(s => s.skill).join()]);

  const toggleSave = async (jobId) => {
    if (!user) { push('Sign in to save jobs', 'error'); return; }
    const id = String(jobId);
    const isSaved = savedSet.has(id);
    try {
      if (isSaved) {
        const res = await userAPI.unsaveJob(id);
        setSavedSet(new Set(res.saved_jobs.map(String)));
        updateUser({ saved_jobs: res.saved_jobs });
        push('Removed from saved', 'info');
      } else {
        const res = await userAPI.saveJob(id);
        setSavedSet(new Set(res.saved_jobs.map(String)));
        updateUser({ saved_jobs: res.saved_jobs });
        push('Job saved', 'success');
      }
    } catch (err) { push(err.message, 'error'); }
  };

  const handleApply = async (job) => {
    try {
      const res = await userAPI.applyJob(job.id, '', false);
      setAppliedSet(new Set(res.applied_jobs.map(String)));
      updateUser({ applied_jobs: res.applied_jobs });
      push(`Application submitted to ${job.company}`, 'success');
    } catch (err) { push(err.message, 'error'); }
  };

  if (!user) return null;

  const savedCount   = (user.saved_jobs   || []).length;
  const appliedCount = (user.applied_jobs || []).length;
  const skillCount   = (user.skills       || []).length;
  const initials     = (user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase();

  const strengthItems = [
    { label: 'Name & role',  done: !!(user.first_name && user.role) },
    { label: 'Bio written',  done: !!user.bio },
    { label: 'Skills added', done: skillCount > 0 },
    { label: 'Experience',   done: !!(user.experience || []).length },
    { label: 'CV uploaded',  done: !!user.cv_filename },
    { label: 'Preferences',  done: !!(user.preferences?.type) },
  ];
  const strength = Math.round((strengthItems.filter(x => x.done).length / strengthItems.length) * 100);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const gapDomains = [
    ...impliedProfile.topDomains,
    ...(marketStats?.domain_counts
      ? Object.keys(marketStats.domain_counts).filter(d => !impliedProfile.topDomains.includes(d)).slice(0, 6)
      : []),
  ].slice(0, 8);

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px 80px', animation: 'fadeUp .35s ease' }}>

      {/* ── PAGE HEADER CARD ── */}
      <div style={{
        background: 'var(--surface-0)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '28px 32px',
        boxShadow: 'var(--shadow-sm)', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
        borderTop: '3px solid var(--blue-500)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar initials={initials} size={52} />
          <div>
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
              letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500,
            }}>Your Dashboard</div>
            <h1 style={{
              fontFamily: 'var(--f-display)', fontSize: 26, letterSpacing: '-0.6px',
              color: 'var(--text-primary)', fontWeight: 400, lineHeight: 1.2,
            }}>
              {greeting},{' '}
              <em style={{ color: 'var(--blue-500)', fontStyle: 'italic' }}>{user.first_name}</em>
            </h1>
            {impliedProfile.topDomains.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Your activity reflects interest in{' '}
                {impliedProfile.topDomains.slice(0, 2).map((d, i) => (
                  <span key={d}>
                    <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{d}</strong>
                    {i < Math.min(impliedProfile.topDomains.length, 2) - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('jobs')}>Browse Jobs</Button>
          <Button size="sm" onClick={() => onNavigate('profile')}>Edit Profile</Button>
        </div>
      </div>

      {/* ── STAT STRIP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Saved Jobs"    value={savedCount}                   color="var(--blue-500)" icon={<IconStar />} />
        <StatCard label="Applications"  value={appliedCount}                 color="var(--emerald)"  icon={<IconCheck />} />
        <StatCard label="Skills Listed" value={skillCount}                   color="#7c3aed"         icon={<IconSkill />} />
        <StatCard label="Live Jobs"     value={marketStats?.total_jobs || 0} color="var(--amber)"    icon={<IconBriefcase />} />
      </div>

      {/* ── TAB BAR ── */}
      <div style={{
        background: 'var(--surface-0)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '4px',
        display: 'flex', gap: 2, marginBottom: 24,
        boxShadow: 'var(--shadow-xs)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1,
            background: tab === t.id ? 'var(--blue-500)' : 'transparent',
            border: 'none',
            borderRadius: 'calc(var(--r-lg) - 4px)',
            padding: '10px 8px',
            color: tab === t.id ? '#fff' : 'var(--text-muted)',
            fontFamily: 'var(--f-mono)', fontSize: 12,
            fontWeight: tab === t.id ? 600 : 400,
            cursor: 'pointer', transition: 'all .2s',
            letterSpacing: '0.2px',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: FOR YOU ══════════ */}
      {tab === 'recs' && (
        <div style={{ animation: 'fadeUp .3s ease' }}>
          <Section
            label="Personalised recommendations"
            title="Matched For You"
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {cfLoading && <Spinner size={14} />}
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {savedCount} saved &middot; {appliedCount} applied
                </span>
              </div>
            }
          >
            {jobsLoading || cfLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    background: 'var(--surface-0)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)', padding: 20, height: 180,
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <Skeleton h={44} r={8} />
                    <Skeleton h={14} w="70%" r={4} />
                    <Skeleton h={12} w="50%" r={4} />
                    <Skeleton h={32} r={6} style={{ marginTop: 'auto' }} />
                  </div>
                ))}
              </div>
            ) : cfRecs.length === 0 ? (
              /* ── EMPTY STATE (replaces old CF info banner) ── */
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-xs)',
                overflow: 'hidden',
              }}>
                {/* Top accent */}
                <div style={{ height: 3, background: 'linear-gradient(90deg, var(--blue-500), var(--blue-200), transparent)' }} />
                <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {/* Icon */}
                  <div style={{
                    width: 60, height: 60, borderRadius: 'var(--r-lg)',
                    background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="var(--blue-500)" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--f-display)', fontSize: 20,
                    color: 'var(--text-primary)', marginBottom: 8, fontWeight: 400,
                  }}>
                    {savedCount + appliedCount === 0
                      ? 'Start exploring to get recommendations'
                      : 'Building your recommendations'}
                  </h3>
                  <p style={{
                    fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75,
                    maxWidth: 420, marginBottom: 28,
                  }}>
                    {savedCount + appliedCount === 0
                      ? 'Save or apply to jobs to train your personal recommendation engine. The more you interact, the more accurate your matches become.'
                      : 'Your activity is being analysed. Try saving or applying to a few more jobs to generate personalised matches.'}
                  </p>

                  {/* How it works — card row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                    width: '100%', maxWidth: 560, marginBottom: 28,
                  }}>
                    {[
                      { step: '01', label: 'Browse jobs', desc: 'Explore the job board' },
                      { step: '02', label: 'Save & apply', desc: 'Interact with roles you like' },
                      { step: '03', label: 'Get matched', desc: 'Receive personalised picks' },
                    ].map(item => (
                      <div key={item.step} style={{
                        background: 'var(--surface-1)', border: '1px solid var(--border)',
                        borderRadius: 'var(--r-sm)', padding: '14px 12px', textAlign: 'center',
                      }}>
                        <div style={{
                          fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                          fontWeight: 600, marginBottom: 6, letterSpacing: '1px',
                        }}>{item.step}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => onNavigate('jobs')}>Browse Jobs</Button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                  {cfRecs.map((job) => (
                    <RecCard
                      key={job.id} job={job}
                      onSave={toggleSave} onApply={handleApply}
                      isSaved={savedSet.has(String(job.id))}
                      isApplied={appliedSet.has(String(job.id))}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <Button variant="ghost" onClick={() => onNavigate('jobs')}>See All Jobs</Button>
                </div>
              </>
            )}
          </Section>
        </div>
      )}

      {/* ══════════ TAB: LEARNING PATHS ══════════ */}
      {tab === 'learning' && (
        <div style={{ animation: 'fadeUp .3s ease' }}>
          <Section label="Free resources — Dev.to · Hacker News · Wikipedia" title="Learning Paths">

            {/* Domain selector */}
            <div style={{
              background: 'var(--surface-0)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)', padding: '20px 24px',
              boxShadow: 'var(--shadow-xs)', marginBottom: 20,
            }}>
              <div style={{
                fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-muted)',
                letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12,
              }}>Select a domain</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {gapDomains.map(d => (
                  <DomainPill key={d} domain={d} active={selectedDomain === d} implied={impliedProfile.topDomains.includes(d)} onClick={() => setSelectedDomain(d)} />
                ))}
              </div>
            </div>

            {selectedDomain ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Skill gaps card */}
                <div style={{
                  background: 'var(--surface-0)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '20px 24px',
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                    letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500,
                  }}>Skill gap — {selectedDomain}</div>
                  {gapLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={54} r={6} />)}
                    </div>
                  ) : gapSkills.length === 0 ? (
                    <div style={{
                      background: 'var(--emerald-dim)', border: '1px solid rgba(14,165,114,.2)',
                      borderRadius: 'var(--r-sm)', padding: '16px 20px',
                      fontSize: 13, color: '#065f46', fontFamily: 'var(--f-mono)',
                    }}>
                      You already cover the key skills for {selectedDomain}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {gapSkills.map((s, i) => (
                        <GapRow key={s.skill} {...s} color={domainColor(selectedDomain)} index={i} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Resources card */}
                <div style={{
                  background: 'var(--surface-0)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '20px 24px',
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                    letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500,
                  }}>Free learning resources</div>
                  {resLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={80} r={8} />)}
                    </div>
                  ) : resources.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--f-mono)' }}>
                      No resources found. Try selecting another domain.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {resources.slice(0, 10).map((r, i) => <ResourceCard key={i} res={r} idx={i} />)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '48px 24px',
                textAlign: 'center', boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{
                  fontFamily: 'var(--f-display)', fontSize: 18,
                  color: 'var(--text-secondary)', marginBottom: 6,
                }}>Select a domain above to see learning resources</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  We will surface free articles and tutorials tailored to your skill gaps.
                </p>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ══════════ TAB: SKILL GAPS ══════════ */}
      {tab === 'gaps' && (
        <div style={{ animation: 'fadeUp .3s ease' }}>
          <Section label="Based on your saved and applied jobs" title="What to Learn Next">

            {impliedProfile.topSkills.length > 0 && (
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '20px 24px',
                boxShadow: 'var(--shadow-xs)', marginBottom: 20,
              }}>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                  letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500,
                }}>Skills you are already drawn to</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {impliedProfile.topSkills.map(s => (
                    <span key={s} style={{
                      background: 'var(--emerald-dim)', border: '1px solid rgba(14,165,114,.2)',
                      color: '#059669', fontSize: 11, padding: '4px 12px',
                      borderRadius: 100, fontFamily: 'var(--f-mono)', fontWeight: 500,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              background: 'var(--surface-0)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)', padding: '20px 24px',
              boxShadow: 'var(--shadow-xs)', marginBottom: 20,
            }}>
              <div style={{
                fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-muted)',
                letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12,
              }}>Explore by domain</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {gapDomains.map(d => (
                  <DomainPill key={d} domain={d} active={selectedDomain === d} implied={impliedProfile.topDomains.includes(d)} onClick={() => setSelectedDomain(d)} />
                ))}
              </div>
            </div>

            {selectedDomain ? (
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '20px 24px',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                      letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500,
                    }}>Skill gap</div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--text-primary)' }}>
                      {selectedDomain}
                    </div>
                  </div>
                  {!gapLoading && gapSkills.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setTab('learning')}>Find resources</Button>
                  )}
                </div>
                {gapLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 8 }}>
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={54} r={6} />)}
                  </div>
                ) : gapSkills.length === 0 ? (
                  <div style={{
                    background: 'var(--emerald-dim)', border: '1px solid rgba(14,165,114,.2)',
                    borderRadius: 'var(--r-sm)', padding: '16px 20px',
                    fontSize: 13, color: '#065f46', fontFamily: 'var(--f-mono)',
                  }}>
                    You already cover the top skills for {selectedDomain}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 8 }}>
                    {gapSkills.map((s, i) => (
                      <GapRow key={s.skill} {...s} color={domainColor(selectedDomain)} index={i} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '40px 24px',
                textAlign: 'center', color: 'var(--text-muted)',
                fontFamily: 'var(--f-mono)', fontSize: 13, boxShadow: 'var(--shadow-xs)',
              }}>
                Select a domain above to analyse your skill gap
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ══════════ TAB: ACTIVITY ══════════ */}
      {tab === 'activity' && (
        <div style={{ animation: 'fadeUp .3s ease' }}>
          <Section label="Your history" title="Activity Timeline">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Saved jobs card */}
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '20px 24px',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                    letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500,
                  }}>Saved Jobs</div>
                  <span style={{
                    background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
                    color: 'var(--blue-700)', fontSize: 11, padding: '2px 10px',
                    borderRadius: 100, fontFamily: 'var(--f-mono)', fontWeight: 600,
                  }}>{savedCount}</span>
                </div>
                {savedCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <p style={{ marginBottom: 12 }}>No saved jobs yet.</p>
                    <Button size="sm" onClick={() => onNavigate('jobs')}>Browse Jobs</Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(user.saved_jobs || []).slice(-8).reverse().map(id => (
                      <ActivityItem key={id} type="saved" id={id} job={allJobs.find(j => String(j.id) === String(id))} />
                    ))}
                  </div>
                )}
              </div>

              {/* Applied jobs card */}
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '20px 24px',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                    letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500,
                  }}>Applications</div>
                  <span style={{
                    background: 'var(--emerald-dim)', border: '1px solid rgba(14,165,114,.25)',
                    color: '#059669', fontSize: 11, padding: '2px 10px',
                    borderRadius: 100, fontFamily: 'var(--f-mono)', fontWeight: 600,
                  }}>{appliedCount}</span>
                </div>
                {appliedCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <p style={{ marginBottom: 12 }}>No applications yet.</p>
                    <Button size="sm" onClick={() => onNavigate('jobs')}>Find Jobs</Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(user.applied_jobs || []).slice(-8).reverse().map(id => (
                      <ActivityItem key={id} type="applied" id={id} job={allJobs.find(j => String(j.id) === String(id))} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inferred interests */}
            {(impliedProfile.topDomains.length > 0 || impliedProfile.topSkills.length > 0) && (
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '20px 24px',
                boxShadow: 'var(--shadow-xs)', marginTop: 20,
              }}>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                  letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16, fontWeight: 500,
                }}>Inferred interest profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--f-mono)', marginBottom: 8 }}>Top domains</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {impliedProfile.topDomains.map(d => (
                        <span key={d} style={{
                          background: domainColor(d) + '12', color: domainColor(d),
                          border: `1px solid ${domainColor(d)}30`,
                          fontSize: 11, padding: '4px 12px', borderRadius: 100,
                          fontFamily: 'var(--f-mono)', fontWeight: 500,
                        }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--f-mono)', marginBottom: 8 }}>Implied skills</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {impliedProfile.topSkills.slice(0, 8).map(s => (
                        <span key={s} style={{
                          background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
                          color: 'var(--blue-700)', fontSize: 11, padding: '3px 10px',
                          borderRadius: 100, fontFamily: 'var(--f-mono)', fontWeight: 500,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ══════════ TAB: PROFILE ══════════ */}
      {tab === 'profile' && (
        <div style={{ animation: 'fadeUp .3s ease' }}>
          <Section label="Your account" title="Profile Overview">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Identity card */}
              <div style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '24px',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'center' }}>
                  <Avatar initials={initials} size={56} />
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.role}</div>
                  </div>
                </div>

                {user.bio && (
                  <p style={{
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75,
                    marginBottom: 16, padding: '12px 14px',
                    background: 'var(--surface-1)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                  }}>{user.bio}</p>
                )}

                {/* Profile strength */}
                <div style={{
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--f-mono)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Profile strength
                    </span>
                    <span style={{
                      fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 700,
                      color: strength >= 80 ? '#059669' : 'var(--blue-600)',
                    }}>{strength}%</span>
                  </div>
                  <ProgressBar value={strength} color={strength >= 80 ? 'var(--emerald)' : 'var(--blue-500)'} />
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {strengthItems.map(item => (
                      <div key={item.label} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 12, color: item.done ? '#059669' : 'var(--text-muted)',
                      }}>
                        {/* Check indicator */}
                        <span style={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                          background: item.done ? 'var(--emerald-dim)' : 'var(--surface-3)',
                          border: `1px solid ${item.done ? 'rgba(14,165,114,.3)' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, fontWeight: 700, color: item.done ? '#059669' : 'transparent',
                        }}>&#10003;</span>
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" full onClick={() => onNavigate('profile')}>
                  Edit Profile
                </Button>
              </div>

              {/* Skills + preferences */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: 'var(--surface-0)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '20px 24px',
                  boxShadow: 'var(--shadow-xs)', flex: 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{
                      fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                      letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500,
                    }}>Your Skills</div>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {skillCount} skills
                    </span>
                  </div>
                  {skillCount === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>No skills added yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {(user.skills || []).map(s => (
                        <span key={s} style={{
                          background: 'var(--emerald-dim)', border: '1px solid rgba(14,165,114,.2)',
                          color: '#059669', fontSize: 11, padding: '3px 10px',
                          borderRadius: 100, fontFamily: 'var(--f-mono)', fontWeight: 500,
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('profile')}>Manage Skills</Button>
                </div>

                {/* Preferences */}
                <div style={{
                  background: 'var(--surface-0)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '20px 24px',
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)',
                    letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, marginBottom: 14,
                  }}>Job Preferences</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Type', user.preferences?.type],
                      ['Location', user.preferences?.location],
                      ['Domain', user.preferences?.domain],
                      ['Salary', user.preferences?.salary],
                    ].map(([k, v]) => (
                      <div key={k} style={{
                        padding: '10px 12px', background: 'var(--surface-1)',
                        border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 13, color: v ? 'var(--text-primary)' : 'var(--text-faint)', fontStyle: v ? 'normal' : 'italic', fontWeight: v ? 500 : 400 }}>
                          {v || 'Not set'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}