/**
 * UserDashboardPage.jsx
 *
 * Personalized user dashboard with:
 *  • Collaborative-filtering job recommendations (blended with backend scores)
 *  • Skill gap analysis derived from saved/applied job data
 *  • Learning paths fetched from free APIs:
 *      - Dev.to articles (free, no key)
 *      - freeCodeCamp GitHub topics (free)
 *      - Wikipedia REST summaries (free)
 *      - YouTube oEmbed for preview cards (free, no key)
 *  • Activity timeline (saved + applied history)
 *  • Profile strength & market positioning
 *
 * Free APIs used:
 *  Dev.to       → https://dev.to/api/articles?tags=<skill>
 *  Wikipedia    → https://en.wikipedia.org/api/rest_v1/page/summary/<topic>
 *  YouTube      → https://www.youtube.com/oembed?url=... (public oEmbed)
 *  HN Algolia   → https://hn.algolia.com/api/v1/search?query=<skill>+tutorial
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { jobsAPI, userAPI, statsAPI, recommenderAPI } from '../utils/api';
import { collaborativeFilter, deriveUserProfile } from '../utils/collaborativeFilter';
import { Badge, Button, Spinner, ProgressBar, Avatar, Card } from '../components/ui';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Design tokens (mirrors App.css vars) ─────────────────────────────────────
const PALETTE = [
  '#E8A020','#22C87A','#3B82F6','#2DD4BF','#a78bfa',
  '#fb923c','#f472b6','#f87171','#38bdf8','#4ade80',
];
const domainColor = (str = '') => {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
};

const FRESHNESS_COLOR = { fresh:'green', aging:'gold', expired:'red', unknown:'gray' };

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const fmt = n => `${Math.round((n || 0) * 100)}%`;

function Skeleton({ w = '100%', h = 20, r = 6, style = {} }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'var(--ink3)', animation: 'pulse 1.4s ease-in-out infinite', flexShrink: 0, ...style }} />;
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20, paddingBottom:14, borderBottom:'1px solid var(--line)' }}>
      <div>
        <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--gold)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:5 }}>{eyebrow}</div>
        <h2 style={{ fontFamily:'var(--f-display)', fontSize:22, letterSpacing:'-0.5px', color:'var(--ivory)' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
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
  return <>{val}</>;
}

// ── CF Job card ───────────────────────────────────────────────────────────────
function CFJobCard({ job, rank, onNavigate, onSave, isSaved, isApplied, onApply }) {
  const [hov, setHov] = useState(false);
  const color = domainColor(job.domain);
  const logo  = (job.company || 'J').charAt(0).toUpperCase();

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--ink3)' : 'var(--ink2)',
        border: `1px solid ${hov ? 'var(--line2)' : 'var(--line)'}`,
        borderRadius: 'var(--r)', padding:'20px',
        transition:'all .2s', position:'relative', overflow:'hidden',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* rank accent */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:14 }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', flex:1, minWidth:0 }}>
          <div style={{ width:42, height:42, borderRadius:8, background:`${color}20`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color, fontFamily:'var(--f-mono)', flexShrink:0 }}>{logo}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:'var(--f-display)', fontSize:15, fontWeight:600, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{job.title}</div>
            <div style={{ fontSize:12, color:'var(--ivory3)' }}>{job.company} · {job.location}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
          <span style={{ fontFamily:'var(--f-mono)', fontSize:13, fontWeight:700, color }}>
            {Math.round((job.blendedScore || 0) * 100)}%
          </span>
          <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness}</Badge>
        </div>
      </div>

      {/* CF reason skills */}
      {job.cfReasonSkills?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
          <span style={{ fontSize:10, color:'var(--ivory3)', fontFamily:'var(--f-mono)', alignSelf:'center', marginRight:2 }}>Because you like:</span>
          {job.cfReasonSkills.map(s => (
            <span key={s} style={{ background:'var(--gold-dim)', border:'1px solid var(--gold-border)', color:'var(--gold2)', fontSize:10, padding:'2px 8px', borderRadius:100, fontFamily:'var(--f-mono)' }}>{s}</span>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ background:`${color}15`, color, border:`1px solid ${color}30`, fontSize:10, padding:'2px 8px', borderRadius:100, fontFamily:'var(--f-mono)' }}>{job.domain}</span>
        {job.days_old > 0 && <span style={{ fontSize:11, color:'var(--ivory3)', fontFamily:'var(--f-mono)' }}>{job.days_old}d ago</span>}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={() => onSave(job.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color: isSaved ? 'var(--gold)' : 'var(--ivory3)', transition:'color .18s' }}>
            {isSaved ? '★' : '☆'}
          </button>
          {isApplied
            ? <span style={{ fontSize:11, color:'var(--green)', fontFamily:'var(--f-mono)' }}>✓ Applied</span>
            : <button onClick={() => onApply(job)} style={{ background:'var(--gold)', border:'none', borderRadius:'var(--r-sm)', padding:'5px 12px', color:'#0A0C10', fontSize:11, fontFamily:'var(--f-ui)', fontWeight:700, cursor:'pointer' }}>Apply →</button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Learning resource card ────────────────────────────────────────────────────
function ResourceCard({ res }) {
  const [hov, setHov] = useState(false);
  const SRC = {
    devto:    { label:'Dev.to',    bg:'rgba(99,102,241,.15)',  c:'#818cf8' },
    hn:       { label:'HN',        bg:'rgba(255,102,0,.15)',   c:'#FF6600' },
    wiki:     { label:'Wikipedia', bg:'rgba(232,160,32,.12)',  c:'var(--gold)' },
    youtube:  { label:'YouTube',   bg:'rgba(240,96,96,.15)',   c:'var(--red)'  },
  };
  const src = SRC[res.source] || SRC.devto;

  return (
    <a href={res.url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'block', background: hov ? 'var(--ink3)' : 'var(--ink2)',
        border:`1px solid ${hov ? 'var(--line2)' : 'var(--line)'}`,
        borderLeft:`3px solid ${hov ? src.c : 'transparent'}`,
        borderRadius:'var(--r)', padding:'14px 16px',
        textDecoration:'none', transition:'all .18s',
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
            <span style={{ background:src.bg, color:src.c, fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:100, fontFamily:'var(--f-mono)', flexShrink:0 }}>{src.label}</span>
            {res.skill && <span style={{ fontSize:10, color:'var(--ivory3)', fontFamily:'var(--f-mono)' }}>#{res.skill}</span>}
            {res.readTime && <span style={{ fontSize:10, color:'var(--ivory3)', fontFamily:'var(--f-mono)' }}>{res.readTime} min read</span>}
          </div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--ivory)', lineHeight:1.5, marginBottom: res.excerpt ? 5 : 0, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{res.title}</div>
          {res.excerpt && <div style={{ fontSize:11, color:'var(--ivory3)', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{res.excerpt}</div>}
        </div>
        <span style={{ color:src.c, fontSize:14, flexShrink:0, opacity: hov ? 1 : 0.35, transition:'opacity .18s' }}>↗</span>
      </div>
    </a>
  );
}

// ── Learning path skill pill ──────────────────────────────────────────────────
function SkillGapPill({ skill, importance, level, color }) {
  const levelCfg = {
    critical:  { bg:'var(--red-dim)',    c:'var(--red)',    b:'rgba(240,96,96,.2)'   },
    important: { bg:'var(--yellow-dim)', c:'var(--yellow)', b:'rgba(245,200,66,.2)'  },
    useful:    { bg:'var(--ink4)',        c:'var(--ivory2)', b:'var(--line)'          },
  };
  const cfg = levelCfg[level] || levelCfg.useful;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 14px', background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r-sm)' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--ivory)', marginBottom:4 }}>{skill}</div>
        <div style={{ height:3, background:'var(--ink4)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${Math.round(importance * 100)}%`, background:color, borderRadius:3, transition:'width 1s cubic-bezier(.16,1,.3,1)' }} />
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ivory3)' }}>{Math.round(importance * 100)}%</span>
        <span style={{ background:cfg.bg, color:cfg.c, border:`1px solid ${cfg.b}`, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:100, fontFamily:'var(--f-mono)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{level}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FREE API FETCHERS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchDevToArticles(skill, count = 4) {
  try {
    const tag = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
    const res = await fetch(
      `https://dev.to/api/articles?tag=${tag}&top=7&per_page=${count}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).slice(0, count).map(a => ({
      source:'devto',
      title: a.title,
      url: a.url,
      skill,
      excerpt: a.description,
      readTime: a.reading_time_minutes,
    }));
  } catch { return []; }
}

async function fetchHNArticles(skill, count = 3) {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(skill + ' tutorial learn')}&tags=story&hitsPerPage=${count * 2}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || [])
      .filter(h => h.url && h.title?.toLowerCase().includes(skill.toLowerCase().split(' ')[0]))
      .slice(0, count)
      .map(h => ({
        source:'hn',
        title: h.title,
        url: h.url,
        skill,
        excerpt: null,
      }));
  } catch { return []; }
}

async function fetchWikiSummary(skill) {
  try {
    const topic = skill.replace(/\s+/g, '_');
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === 'disambiguation' || !data.extract) return null;
    return {
      source:'wiki',
      title: `${skill} — Overview`,
      url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${topic}`,
      skill,
      excerpt: data.extract?.slice(0, 180) + '…',
    };
  } catch { return null; }
}

// Fetch learning resources for a set of skills (top 4 skills only to stay fast)
async function fetchLearningResources(skills) {
  const top = skills.slice(0, 4);
  const all = [];

  await Promise.all(top.map(async skill => {
    const [devto, hn, wiki] = await Promise.all([
      fetchDevToArticles(skill, 3),
      fetchHNArticles(skill, 2),
      fetchWikiSummary(skill),
    ]);
    all.push(...devto, ...hn);
    if (wiki) all.push(wiki);
  }));

  // Deduplicate by URL
  const seen = new Set();
  return all.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

// Fetch skill gaps from the backend for a domain
async function fetchSkillGap(domain, userSkills) {
  try {
    const res = await fetch(`${BASE}/missing-skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: userSkills, domain, top_n: 10 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.missing_skills || [];
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id:'recs',     icon:'🎯', label:'For You'       },
  { id:'learning', icon:'📚', label:'Learning Paths' },
  { id:'gaps',     icon:'🔬', label:'Skill Gaps'     },
  { id:'activity', icon:'📋', label:'Activity'       },
  { id:'profile',  icon:'👤', label:'Profile'        },
];

export default function UserDashboardPage({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const { push } = useToast();

  const [tab, setTab] = useState('recs');

  // ── Data state ────────────────────────────────────────────────────────
  const [allJobs,         setAllJobs]         = useState([]);
  const [jobsLoading,     setJobsLoading]     = useState(true);
  const [cfRecs,          setCfRecs]          = useState([]);
  const [cfLoading,       setCfLoading]       = useState(false);
  const [marketStats,     setMarketStats]     = useState(null);
  const [impliedProfile,  setImpliedProfile]  = useState({ topDomains:[], topSkills:[] });

  // Learning paths
  const [selectedDomain,  setSelectedDomain]  = useState('');
  const [gapSkills,       setGapSkills]       = useState([]);
  const [gapLoading,      setGapLoading]      = useState(false);
  const [resources,       setResources]       = useState([]);
  const [resLoading,      setResLoading]      = useState(false);

  // UI helpers
  const [savedSet,   setSavedSet]   = useState(new Set());
  const [appliedSet, setAppliedSet] = useState(new Set());

  // ── Sync user sets ────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setSavedSet(new Set((user.saved_jobs   || []).map(String)));
      setAppliedSet(new Set((user.applied_jobs || []).map(String)));
    }
  }, [user]);

  // ── Load market stats ─────────────────────────────────────────────────
  useEffect(() => {
    statsAPI.market().then(setMarketStats).catch(() => {});
  }, []);

  // ── Load all jobs (paginated, up to 200 for CF) ───────────────────────
  useEffect(() => {
    const load = async () => {
      setJobsLoading(true);
      try {
        const [p1, p2, p3, p4] = await Promise.all([
          jobsAPI.list({ page:1, perPage:50 }),
          jobsAPI.list({ page:2, perPage:50 }),
          jobsAPI.list({ page:3, perPage:50 }),
          jobsAPI.list({ page:4, perPage:50 }),
        ]);
        const combined = [
          ...(p1.jobs || []),
          ...(p2.jobs || []),
          ...(p3.jobs || []),
          ...(p4.jobs || []),
        ];
        // Deduplicate
        const seen = new Set();
        const unique = combined.filter(j => {
          if (seen.has(j.id)) return false;
          seen.add(j.id);
          return true;
        });
        setAllJobs(unique);
      } catch (e) {
        console.error('jobs load failed', e);
      } finally {
        setJobsLoading(false);
      }
    };
    load();
  }, []);

  // ── Run CF once jobs + user interactions are loaded ───────────────────
  useEffect(() => {
    if (jobsLoading || allJobs.length === 0) return;
    if (!user?.saved_jobs?.length && !user?.applied_jobs?.length) return;

    setCfLoading(true);

    const run = async () => {
      const savedIds   = (user.saved_jobs   || []).map(String);
      const appliedIds = (user.applied_jobs || []).map(String);

      // Derive implied profile from interactions
      const profile = deriveUserProfile(allJobs, savedIds, appliedIds);
      setImpliedProfile(profile);

      // Get backend semantic scores for user's skills (blending signal)
      let backendScores = {};
      const skillsToUse = [...new Set([...(user.skills || []), ...profile.topSkills])].slice(0, 15);
      if (skillsToUse.length > 0) {
        try {
          const res = await recommenderAPI.recommend(skillsToUse, 50, {
            bio: user.bio,
            experience: user.experience,
          });
          for (const job of res.top_jobs || []) {
            if (job.id) backendScores[String(job.id)] = job.score || 0;
          }
        } catch {}
      }

      const recs = collaborativeFilter({
        allJobs,
        savedJobIds:   savedIds,
        appliedJobIds: appliedIds,
        backendScores,
        topN: 12,
        cfWeight: 0.4,
        backendWeight: 0.6,
      });

      setCfRecs(recs);
      setCfLoading(false);

      // Auto-select the top implied domain for skill-gap tab
      if (profile.topDomains[0] && !selectedDomain) {
        setSelectedDomain(profile.topDomains[0]);
      }
    };

    run().catch(() => setCfLoading(false));
  }, [jobsLoading, allJobs, user?.saved_jobs?.join(), user?.applied_jobs?.join()]);

  // ── Load skill gap for selected domain ────────────────────────────────
  useEffect(() => {
    if (!selectedDomain) return;
    setGapLoading(true);
    const userSkills = [
      ...(user?.skills || []),
      ...impliedProfile.topSkills,
    ];
    fetchSkillGap(selectedDomain, userSkills)
      .then(gaps => { setGapSkills(gaps); setGapLoading(false); })
      .catch(() => setGapLoading(false));
  }, [selectedDomain, impliedProfile.topSkills.join()]);

  // ── Load learning resources when gap skills change ────────────────────
  useEffect(() => {
    if (gapSkills.length === 0) return;
    setResLoading(true);
    const top = gapSkills
      .filter(s => s.level === 'critical' || s.level === 'important')
      .slice(0, 4)
      .map(s => s.skill);
    fetchLearningResources(top)
      .then(r => { setResources(r); setResLoading(false); })
      .catch(() => setResLoading(false));
  }, [gapSkills.map(s => s.skill).join()]);

  // ── Interactions ──────────────────────────────────────────────────────
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
        push('Job saved! ⭐', 'success');
      }
    } catch (err) { push(err.message, 'error'); }
  };

  const handleApply = async (job) => {
    try {
      const res = await userAPI.applyJob(job.id, '', false);
      setAppliedSet(new Set(res.applied_jobs.map(String)));
      updateUser({ applied_jobs: res.applied_jobs });
      push(`Applied to ${job.company}! 🚀`, 'success');
    } catch (err) { push(err.message, 'error'); }
  };

  if (!user) return null;

  // ── Derived values ────────────────────────────────────────────────────
  const savedCount   = (user.saved_jobs   || []).length;
  const appliedCount = (user.applied_jobs || []).length;
  const skillCount   = (user.skills       || []).length;
  const initials     = (user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase();

  const strengthItems = [
    { label:'Name & role',  done:!!(user.first_name && user.role) },
    { label:'Bio written',  done:!!user.bio },
    { label:'Skills added', done:skillCount > 0 },
    { label:'Experience',   done:!!(user.experience || []).length },
    { label:'CV uploaded',  done:!!user.cv_filename },
    { label:'Preferences',  done:!!(user.preferences?.type) },
  ];
  const strength = Math.round((strengthItems.filter(x => x.done).length / strengthItems.length) * 100);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const domainColor_ = s => domainColor(s);

  // Activity feed from saved + applied (synthetic, from user data)
  const activityFeed = [
    ...(user.applied_jobs || []).slice(-8).reverse().map(id => ({ type:'applied', id, icon:'🚀', label:'Applied', color:'var(--green)' })),
    ...(user.saved_jobs   || []).slice(-8).reverse().map(id => ({ type:'saved',   id, icon:'⭐', label:'Saved',   color:'var(--gold)'  })),
  ].sort(() => Math.random() - 0.5).slice(0, 12); // shuffle for variety

  // Domains for skill gap selector
  const gapDomains = [
    ...impliedProfile.topDomains,
    ...(marketStats?.domain_counts
      ? Object.keys(marketStats.domain_counts).filter(d => !impliedProfile.topDomains.includes(d)).slice(0, 6)
      : []),
  ].slice(0, 8);

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px 80px', animation:'fadeUp .35s ease' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--gold)', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:6 }}>Your Dashboard</div>
          <h1 style={{ fontFamily:'var(--f-display)', fontSize:30, letterSpacing:'-1px', marginBottom:4 }}>
            {greeting}, <em style={{ color:'var(--gold)', fontStyle:'italic' }}>{user.first_name}</em>
          </h1>
          {impliedProfile.topDomains.length > 0 && (
            <div style={{ fontSize:13, color:'var(--ivory3)' }}>
              Your activity suggests interest in{' '}
              {impliedProfile.topDomains.map((d, i) => (
                <span key={d}><strong style={{ color:'var(--ivory2)' }}>{d}</strong>{i < impliedProfile.topDomains.length - 1 ? ', ' : ''}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('jobs')}>Browse Jobs</Button>
          <Button size="sm" onClick={() => onNavigate('profile')}>Edit Profile →</Button>
        </div>
      </div>

      {/* ── STAT STRIP ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
        {[
          { label:'Saved Jobs',    value:savedCount,             color:'var(--gold)',  icon:'⭐' },
          { label:'Applications',  value:appliedCount,           color:'var(--green)', icon:'🚀' },
          { label:'Skills Listed', value:skillCount,             color:'var(--teal)',  icon:'🧠' },
          { label:'Live Jobs',     value:marketStats?.total_jobs || 0, color:'var(--blue)',  icon:'💼' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r)', padding:'18px 16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontFamily:'var(--f-display)', fontSize:32, color:s.color, letterSpacing:'-1px', lineHeight:1 }}>
                  <Counter to={s.value} />
                </div>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--ivory3)', marginTop:6 }}>{s.label}</div>
              </div>
              <span style={{ fontSize:22, opacity:.6 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display:'flex', gap:0, marginBottom:28, borderBottom:'1px solid var(--line)', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background:'transparent', border:'none',
            borderBottom:`2px solid ${tab === t.id ? 'var(--gold)' : 'transparent'}`,
            padding:'10px 20px', marginBottom:-1,
            color: tab === t.id ? 'var(--gold)' : 'var(--ivory3)',
            fontFamily:'var(--f-mono)', fontSize:12, cursor:'pointer',
            transition:'all .2s', whiteSpace:'nowrap',
            display:'flex', alignItems:'center', gap:7,
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: FOR YOU ══════════════════ */}
      {tab === 'recs' && (
        <div style={{ animation:'fadeUp .3s ease' }}>
          <SectionHeader
            eyebrow="Collaborative Filtering + Semantic AI"
            title="Recommended For You"
            action={
              <div style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ivory3)', display:'flex', alignItems:'center', gap:8 }}>
                {cfLoading && <Spinner size={14} />}
                Based on {savedCount} saved · {appliedCount} applied
              </div>
            }
          />

          {/* How CF works — collapsible hint */}
          <div style={{ background:'linear-gradient(135deg,var(--ink2),rgba(59,130,246,.05))', border:'1px solid rgba(59,130,246,.2)', borderRadius:'var(--r)', padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12, fontSize:12, color:'var(--ivory2)' }}>
            <span style={{ fontSize:18 }}>🔬</span>
            <span>Recommendations blend <strong style={{ color:'#3B82F6' }}>item-based collaborative filtering</strong> (from your saved &amp; applied jobs) with <strong style={{ color:'#a78bfa' }}>semantic AI matching</strong> on your skills profile.</span>
          </div>

          {jobsLoading || cfLoading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
              {Array.from({length:6}).map((_,i) => (
                <div key={i} style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r)', padding:20, height:160 }}>
                  <Skeleton h={42} r={8} style={{ marginBottom:12 }} />
                  <Skeleton h={14} w="70%" r={4} style={{ marginBottom:8 }} />
                  <Skeleton h={12} w="50%" r={4} style={{ marginBottom:16 }} />
                  <Skeleton h={24} w="40%" r={100} />
                </div>
              ))}
            </div>
          ) : cfRecs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--ivory3)' }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:.35 }}>🎯</div>
              <div style={{ fontFamily:'var(--f-display)', fontSize:20, marginBottom:8, color:'var(--ivory2)' }}>
                {savedCount + appliedCount === 0
                  ? 'Save or apply to jobs to unlock personalised recommendations'
                  : 'No recommendations yet — try saving more jobs'}
              </div>
              <Button style={{ marginTop:16 }} onClick={() => onNavigate('jobs')}>Browse Jobs →</Button>
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
                {cfRecs.map((job, i) => (
                  <CFJobCard
                    key={job.id} job={job} rank={i+1}
                    onNavigate={onNavigate}
                    onSave={toggleSave}
                    onApply={handleApply}
                    isSaved={savedSet.has(String(job.id))}
                    isApplied={appliedSet.has(String(job.id))}
                  />
                ))}
              </div>
              <div style={{ marginTop:16, textAlign:'center' }}>
                <Button variant="ghost" onClick={() => onNavigate('jobs')}>See All Jobs →</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: LEARNING PATHS ══════════════════ */}
      {tab === 'learning' && (
        <div style={{ animation:'fadeUp .3s ease' }}>
          <SectionHeader
            eyebrow="Free Resources · Dev.to · HN · Wikipedia"
            title="Learning Paths"
            action={
              selectedDomain && (
                <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ivory3)' }}>
                  for <strong style={{ color:'var(--gold)' }}>{selectedDomain}</strong>
                </span>
              )
            }
          />

          {/* Domain selector */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
            {gapDomains.map(d => (
              <button key={d} onClick={() => setSelectedDomain(d)} style={{
                background: selectedDomain === d ? 'var(--gold-dim)' : 'var(--ink2)',
                border:`1px solid ${selectedDomain === d ? 'var(--gold-border)' : 'var(--line)'}`,
                borderRadius:100, padding:'7px 16px',
                color: selectedDomain === d ? 'var(--gold)' : 'var(--ivory3)',
                fontFamily:'var(--f-mono)', fontSize:11, cursor:'pointer', transition:'all .18s',
                display:'flex', alignItems:'center', gap:7,
              }}>
                {d}
                {impliedProfile.topDomains.includes(d) && (
                  <span style={{ background:'rgba(34,200,122,.15)', color:'var(--green)', fontSize:9, padding:'1px 6px', borderRadius:100 }}>active</span>
                )}
              </button>
            ))}
          </div>

          {selectedDomain ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

              {/* Left: skills to learn */}
              <div>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:14 }}>
                  Skills Gap — {selectedDomain}
                </div>
                {gapLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {Array.from({length:5}).map((_,i) => <Skeleton key={i} h={54} r={6} />)}
                  </div>
                ) : gapSkills.length === 0 ? (
                  <div style={{ background:'var(--green-dim)', border:'1px solid rgba(34,200,122,.2)', borderRadius:'var(--r-sm)', padding:'16px 20px', fontFamily:'var(--f-mono)', fontSize:13, color:'var(--green)' }}>
                    ✓ You already cover the key skills for {selectedDomain}!
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {gapSkills.map(s => (
                      <SkillGapPill key={s.skill} {...s} color={domainColor_(selectedDomain)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: free learning resources */}
              <div>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:14 }}>
                  Free Resources to Learn
                </div>
                {resLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {Array.from({length:6}).map((_,i) => <Skeleton key={i} h={80} r={8} />)}
                  </div>
                ) : resources.length === 0 ? (
                  <div style={{ padding:'24px', textAlign:'center', color:'var(--ivory3)', fontSize:13, fontFamily:'var(--f-mono)' }}>
                    No resources found — try a different domain.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {resources.slice(0, 10).map((r, i) => (
                      <ResourceCard key={i} res={r} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--ivory3)' }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:.35 }}>📚</div>
              <div style={{ fontFamily:'var(--f-display)', fontSize:18, color:'var(--ivory2)' }}>Select a domain above to see learning resources</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: SKILL GAPS ══════════════════ */}
      {tab === 'gaps' && (
        <div style={{ animation:'fadeUp .3s ease' }}>
          <SectionHeader
            eyebrow="Based on your interactions"
            title="What to Learn Next"
          />

          {/* Implied skill interests from CF */}
          {impliedProfile.topSkills.length > 0 && (
            <div style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r)', padding:'18px 20px', marginBottom:20 }}>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>
                Skills You're Already Drawn To
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {impliedProfile.topSkills.map(s => (
                  <span key={s} style={{ background:'var(--green-dim)', border:'1px solid rgba(34,200,122,.2)', color:'var(--green)', fontSize:11, padding:'4px 12px', borderRadius:100, fontFamily:'var(--f-mono)' }}>✓ {s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Domain gap explorer */}
          <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--ivory3)', marginBottom:12 }}>
            Explore skill gaps by domain
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
            {gapDomains.map(d => (
              <button key={d} onClick={() => setSelectedDomain(d)} style={{
                background: selectedDomain === d ? domainColor_(d) + '20' : 'var(--ink2)',
                border:`1px solid ${selectedDomain === d ? domainColor_(d) + '60' : 'var(--line)'}`,
                borderRadius:'var(--r-sm)', padding:'8px 16px',
                color: selectedDomain === d ? domainColor_(d) : 'var(--ivory3)',
                fontFamily:'var(--f-mono)', fontSize:12, cursor:'pointer', transition:'all .18s',
              }}>{d}</button>
            ))}
          </div>

          {selectedDomain ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:18 }}>
                  Gap for <span style={{ color: domainColor_(selectedDomain) }}>{selectedDomain}</span>
                </div>
                {!gapLoading && gapSkills.length > 0 && (
                  <button
                    onClick={() => { setTab('learning'); }}
                    style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--r-sm)', padding:'6px 14px', color:'var(--ivory2)', fontFamily:'var(--f-mono)', fontSize:11, cursor:'pointer' }}
                  >
                    Find resources →
                  </button>
                )}
              </div>

              {gapLoading ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:8 }}>
                  {Array.from({length:8}).map((_,i) => <Skeleton key={i} h={54} r={6} />)}
                </div>
              ) : gapSkills.length === 0 ? (
                <div style={{ background:'var(--green-dim)', border:'1px solid rgba(34,200,122,.2)', borderRadius:'var(--r-sm)', padding:'18px 22px', fontFamily:'var(--f-mono)', fontSize:13, color:'var(--green)' }}>
                  ✓ You already cover the top skills for {selectedDomain}!
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:8 }}>
                  {gapSkills.map(s => (
                    <SkillGapPill key={s.skill} {...s} color={domainColor_(selectedDomain)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--ivory3)', fontFamily:'var(--f-mono)', fontSize:13 }}>
              Select a domain above
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: ACTIVITY ══════════════════ */}
      {tab === 'activity' && (
        <div style={{ animation:'fadeUp .3s ease' }}>
          <SectionHeader eyebrow="Your history" title="Activity Timeline" />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Saved jobs */}
            <div>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:14 }}>
                ⭐ Saved Jobs ({savedCount})
              </div>
              {savedCount === 0 ? (
                <div style={{ padding:'24px', textAlign:'center', color:'var(--ivory3)', fontSize:13 }}>
                  No saved jobs yet.
                  <div style={{ marginTop:12 }}><Button size="sm" onClick={() => onNavigate('jobs')}>Browse Jobs →</Button></div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(user.saved_jobs || []).slice(-8).reverse().map(id => {
                    const job = allJobs.find(j => String(j.id) === String(id));
                    return (
                      <div key={id} style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r-sm)', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'var(--ivory)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{job?.title || `Job #${id}`}</div>
                          {job && <div style={{ fontSize:11, color:'var(--ivory3)' }}>{job.company} · {job.domain}</div>}
                        </div>
                        <button onClick={() => toggleSave(id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gold)', fontSize:16 }}>★</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Applied jobs */}
            <div>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--green)', marginBottom:14 }}>
                🚀 Applications ({appliedCount})
              </div>
              {appliedCount === 0 ? (
                <div style={{ padding:'24px', textAlign:'center', color:'var(--ivory3)', fontSize:13 }}>
                  No applications yet.
                  <div style={{ marginTop:12 }}><Button size="sm" onClick={() => onNavigate('jobs')}>Find Jobs →</Button></div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(user.applied_jobs || []).slice(-8).reverse().map(id => {
                    const job = allJobs.find(j => String(j.id) === String(id));
                    return (
                      <div key={id} style={{ background:'var(--ink2)', border:'1px solid rgba(34,200,122,.15)', borderRadius:'var(--r-sm)', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'var(--ivory)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{job?.title || `Job #${id}`}</div>
                          {job && <div style={{ fontSize:11, color:'var(--ivory3)' }}>{job.company} · {job.domain}</div>}
                        </div>
                        <span style={{ fontSize:11, color:'var(--green)', fontFamily:'var(--f-mono)', flexShrink:0 }}>✓ Applied</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Implied interest profile */}
          {(impliedProfile.topDomains.length > 0 || impliedProfile.topSkills.length > 0) && (
            <div style={{ marginTop:28, background:'linear-gradient(135deg,var(--ink2),rgba(167,139,250,.05))', border:'1px solid rgba(167,139,250,.2)', borderRadius:'var(--r)', padding:'20px 24px' }}>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'#a78bfa', marginBottom:16 }}>
                🧠 Inferred Interest Profile
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div>
                  <div style={{ fontSize:12, color:'var(--ivory3)', fontFamily:'var(--f-mono)', marginBottom:8 }}>Top Domains</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {impliedProfile.topDomains.map(d => (
                      <span key={d} style={{ background:domainColor_(d)+'20', color:domainColor_(d), border:`1px solid ${domainColor_(d)}40`, fontSize:11, padding:'3px 12px', borderRadius:100, fontFamily:'var(--f-mono)' }}>{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:12, color:'var(--ivory3)', fontFamily:'var(--f-mono)', marginBottom:8 }}>Implied Skills</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {impliedProfile.topSkills.slice(0, 8).map(s => (
                      <span key={s} style={{ background:'rgba(167,139,250,.1)', color:'#a78bfa', border:'1px solid rgba(167,139,250,.2)', fontSize:11, padding:'3px 10px', borderRadius:100, fontFamily:'var(--f-mono)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: PROFILE ══════════════════ */}
      {tab === 'profile' && (
        <div style={{ animation:'fadeUp .3s ease' }}>
          <SectionHeader eyebrow="Your account" title="Profile Overview" />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

            {/* Profile card */}
            <div style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r)', padding:24 }}>
              <div style={{ display:'flex', gap:16, marginBottom:20 }}>
                <Avatar initials={initials} size={60} color={user.avatar_color || 'var(--gold-dim)'} />
                <div>
                  <div style={{ fontFamily:'var(--f-display)', fontSize:20, marginBottom:2 }}>{user.first_name} {user.last_name}</div>
                  <div style={{ fontSize:13, color:'var(--ivory3)', marginBottom:8 }}>{user.role}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <Badge color="gold">{user.role}</Badge>
                    <Badge color="green">Open</Badge>
                  </div>
                </div>
              </div>
              {user.bio && <p style={{ fontSize:13, color:'var(--ivory2)', lineHeight:1.7, marginBottom:16 }}>{user.bio}</p>}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--ivory3)', marginBottom:6 }}>
                  <span>Profile Strength</span>
                  <span style={{ color: strength >= 80 ? 'var(--green)' : 'var(--gold)' }}>{strength}%</span>
                </div>
                <ProgressBar value={strength} color={strength >= 80 ? 'var(--green)' : 'var(--gold)'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {strengthItems.map(({ label, done }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color: done ? 'var(--green)' : 'var(--ivory3)' }}>
                    <span>{done ? '✓' : '○'}</span>{label}
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" full style={{ marginTop:18 }} onClick={() => onNavigate('profile')}>
                Edit Profile →
              </Button>
            </div>

            {/* Skills panel */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r)', padding:20 }}>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>
                  Your Skills ({skillCount})
                </div>
                {skillCount === 0 ? (
                  <div style={{ fontSize:13, color:'var(--ivory3)', marginBottom:12 }}>No skills added yet.</div>
                ) : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                    {(user.skills || []).map(s => (
                      <span key={s} style={{ background:'var(--green-dim)', border:'1px solid rgba(34,200,122,.2)', color:'var(--green)', fontSize:11, padding:'3px 10px', borderRadius:100, fontFamily:'var(--f-mono)' }}>✓ {s}</span>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={() => onNavigate('profile')}>Manage Skills</Button>
              </div>

              <div style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'var(--r)', padding:20 }}>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>
                  Job Preferences
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['Type', user.preferences?.type], ['Location', user.preferences?.location], ['Domain', user.preferences?.domain], ['Salary', user.preferences?.salary]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize:10, color:'var(--ivory3)', fontFamily:'var(--f-mono)', marginBottom:2 }}>{k}</div>
                      <div style={{ fontSize:13, color: v ? 'var(--ivory)' : 'var(--ivory3)', fontStyle: v ? 'normal' : 'italic' }}>{v || 'Not set'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
