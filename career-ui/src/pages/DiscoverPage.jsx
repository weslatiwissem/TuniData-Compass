// src/pages/DiscoverPage.jsx — Redesigned to match UserDashboard design system
// White/blue theme, card-first layout, no emojis, professional SVG icons,
// all live data fetching (HN + Dev.to + API) preserved intact.
import { useState, useEffect, useRef } from 'react';
import { recommenderAPI, statsAPI, jobsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Badge, ProgressBar, Spinner } from '../components/ui';

// ── Design-system colour palette for domains ─────────────────────────────────
const DOMAIN_PALETTE = [
  { color: '#2557f0', dim: 'rgba(37,87,240,.08)',   border: 'rgba(37,87,240,.22)'   },
  { color: '#7c3aed', dim: 'rgba(124,58,237,.08)',  border: 'rgba(124,58,237,.22)'  },
  { color: '#0ea572', dim: 'rgba(14,165,114,.08)',  border: 'rgba(14,165,114,.22)'  },
  { color: '#f59e0b', dim: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.22)'  },
  { color: '#f0416c', dim: 'rgba(240,65,108,.08)',  border: 'rgba(240,65,108,.22)'  },
  { color: '#0891b2', dim: 'rgba(8,145,178,.08)',   border: 'rgba(8,145,178,.22)'   },
  { color: '#ea7c1e', dim: 'rgba(234,124,30,.08)',  border: 'rgba(234,124,30,.22)'  },
  { color: '#db2777', dim: 'rgba(219,39,119,.08)',  border: 'rgba(219,39,119,.22)'  },
  { color: '#0284c7', dim: 'rgba(2,132,199,.08)',   border: 'rgba(2,132,199,.22)'   },
  { color: '#059669', dim: 'rgba(5,150,105,.08)',   border: 'rgba(5,150,105,.22)'   },
];

// ── Professional SVG domain icons (no emojis) ─────────────────────────────────
function IconDatabase()   { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke="currentColor" strokeWidth="1.5"/><path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function IconBrain()      { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 4C8 4 5 7 5 10c0 1.5.5 2.8 1.4 3.8C5.5 14.5 5 15.7 5 17c0 2.2 1.8 4 4 4h6c2.2 0 4-1.8 4-4 0-1.3-.5-2.5-1.4-3.2C18.5 12.8 19 11.5 19 10c0-3-3-6-7-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 4v16M8 10h2M14 10h2M8 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconChartBar()   { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="7" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="17" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function IconTrendUp()    { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M3 17l5-5 4 4 9-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 7h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconLayers()     { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>; }
function IconServer()     { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="14" width="20" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="6.5" r="1" fill="currentColor"/><circle cx="6" cy="17.5" r="1" fill="currentColor"/></svg>; }
function IconCode()       { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M8 6L2 12l6 6M16 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 4l-2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconCloud()      { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M17.5 19H6a4 4 0 01-.5-7.96A5 5 0 1117 11h.5a3.5 3.5 0 010 8z" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function IconShield()     { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6l-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconSmartphone() { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>; }
function IconPen()        { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconClipboard()  { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconBriefcase()  { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconSearch()     { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconRefresh()    { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L4 10M3.51 15a9 9 0 0014.85 3.36L20 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconArrowRight() { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconStar()       { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>; }
function IconUpload()     { return <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconFile()       { return <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>; }
function IconKeyboard()   { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8M6 14h.01M18 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconEdit()       { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconSparkle()    { return <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconNews()       { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M4 10h10M4 14h8M4 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>; }

// ── Domain icon mapper ────────────────────────────────────────────────────────
function getDomainIcon(name) {
  const lower = name.toLowerCase();
  if (lower.includes('data eng'))                           return <IconDatabase />;
  if (lower.includes('machine learning') || lower.includes('ml') || lower.includes('ai')) return <IconBrain />;
  if (lower.includes('data sci') || lower.includes('analyt') || lower.includes('bi '))   return <IconChartBar />;
  if (lower.includes('frontend') || lower.includes('front-end'))  return <IconLayers />;
  if (lower.includes('backend') || lower.includes('back-end'))    return <IconServer />;
  if (lower.includes('full stack') || lower.includes('fullstack')) return <IconCode />;
  if (lower.includes('devops') || lower.includes('cloud'))        return <IconCloud />;
  if (lower.includes('cyber') || lower.includes('security'))      return <IconShield />;
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios')) return <IconSmartphone />;
  if (lower.includes('design') || lower.includes('ux'))           return <IconPen />;
  if (lower.includes('qa') || lower.includes('test'))             return <IconClipboard />;
  return <IconBriefcase />;
}

// ── News helpers ──────────────────────────────────────────────────────────────
const TECH_KW = ['ai','ml','python','javascript','react','kubernetes','cloud','llm','data','software','engineer','security','api','devops','open source','github','typescript','rust','docker','database','machine learning','neural','gpt','programming','developer','framework','backend','frontend'];
const isTechArticle = t => t && TECH_KW.some(k => t.toLowerCase().includes(k));

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() / 1000 - ts) / 3600);
  if (diff < 1) return 'just now';
  if (diff < 24) return `${diff}h ago`;
  return `${Math.floor(diff / 24)}d ago`;
}

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
        .filter(s => s.status === 'fulfilled' && s.value?.type === 'story' && s.value?.url && isTechArticle(s.value?.title))
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
        .map(a => ({ id: 'dev-' + a.id, title: a.title, url: a.url || `https://dev.to${a.path}`, source: 'Dev.to', time: Math.floor(new Date(a.published_at).getTime() / 1000), score: a.positive_reactions_count, description: a.description }));
      articles = [...articles, ...da];
    }
    articles = articles.filter(a => !a.time || (now - a.time) < ONE_WEEK).sort((a, b) => (b.time || 0) - (a.time || 0));
  } catch (err) { console.error('News fetch error:', err); }
  return articles;
}

// ── Animated counter ──────────────────────────────────────────────────────────
function useCounter(target, duration = 1400) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => { started.current = false; setVal(0); }, [target]);
  useEffect(() => {
    if (target === 0 || started.current) return;
    started.current = true;
    const s = performance.now();
    const tick = now => {
      const p = Math.min((now - s) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

// ── Section wrapper (matches UserDashboard Section) ────────────────────────────
function Section({ label, title, action, children, style = {} }) {
  return (
    <div style={{ marginBottom: 36, ...style }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)',
      }}>
        <div>
          {label && (
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>{label}</div>
          )}
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 22, letterSpacing: '-0.3px', color: 'var(--text-primary)', fontWeight: 400 }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  const count = useCounter(typeof value === 'number' ? value : 0);
  return (
    <div style={{
      background: 'var(--surface-0)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '20px 22px',
      boxShadow: 'var(--shadow-xs)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 34, color, letterSpacing: '-1px', lineHeight: 1, marginTop: 4 }}>
            {typeof value === 'number' ? count.toLocaleString() : value}
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 9 }}>{label}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: color + '14', border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Animated bar ──────────────────────────────────────────────────────────────
function AnimBar({ value, color, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return (
    <div style={{ flex: 1, height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 4, transition: 'width 1.1s cubic-bezier(.16,1,.3,1)' }} />
    </div>
  );
}

// ── Domain card ───────────────────────────────────────────────────────────────
function DomainCard({ d, onNavigate, index }) {
  const [hov, setHov] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pct = d.jobs && d.maxJobs ? Math.round((d.jobs / d.maxJobs) * 100) : 0;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => setExpanded(e => !e)}
      style={{
        background: hov ? d.dim : 'var(--surface-0)',
        border: `1px solid ${hov ? d.border : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)', padding: '20px',
        cursor: 'pointer', transition: 'all .2s',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        position: 'relative', overflow: 'hidden',
        animation: `fadeUp .4s ease ${index * 55}ms both`,
      }}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${d.color}, transparent)` }} />

      {/* Freshness chip */}
      {d.freshCount > 0 && (
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <span style={{
            background: 'rgba(14,165,114,.1)', color: '#0ea572',
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
            fontFamily: 'var(--f-mono)', border: '1px solid rgba(14,165,114,.2)',
          }}>{d.freshCount} fresh</span>
        </div>
      )}

      {/* Icon + title */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--r-sm)',
          background: d.dim, border: `1px solid ${d.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: d.color, flexShrink: 0,
        }}>
          {getDomainIcon(d.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{d.name}</div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ color: d.color, fontWeight: 700 }}>{d.jobs}</span> open positions
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AnimBar value={pct} color={d.color} delay={200} />
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: d.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{pct}%</span>
      </div>

      {/* Top skills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: expanded ? 12 : 0 }}>
        {(d.topSkills || []).slice(0, expanded ? 8 : 3).map(s => (
          <span key={s} style={{
            background: d.dim, color: d.color, border: `1px solid ${d.border}`,
            fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
            fontFamily: 'var(--f-mono)',
          }}>{s}</span>
        ))}
        {!expanded && d.topSkills?.length > 3 && (
          <span style={{ fontSize: 10, color: 'var(--text-faint)', padding: '2px 0', alignSelf: 'center', fontFamily: 'var(--f-mono)' }}>
            +{d.topSkills.length - 3} more
          </span>
        )}
      </div>

      {/* Expanded CTA */}
      {expanded && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate('jobs', { domain: d.name }); }}
          style={{
            width: '100%', padding: '9px', background: d.color, border: 'none',
            borderRadius: 'var(--r-sm)', color: '#fff', fontFamily: 'var(--f-ui)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4,
            transition: 'opacity .18s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Browse {d.jobs} Jobs
        </button>
      )}
    </div>
  );
}

// ── News card ─────────────────────────────────────────────────────────────────
const SRC_CFG = {
  HackerNews: { label: 'Hacker News', color: '#f97316', bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.25)' },
  'Dev.to':   { label: 'Dev.to',      color: '#6366f1', bg: 'rgba(99,102,241,.1)', border: 'rgba(99,102,241,.25)' },
};

function NewsCard({ article, idx }) {
  const [hov, setHov] = useState(false);
  const cfg = SRC_CFG[article.source] || SRC_CFG['Dev.to'];
  return (
    <a
      href={article.url || '#'} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'block',
        background: hov ? 'var(--surface-1)' : 'var(--surface-0)',
        border: `1px solid ${hov ? 'var(--border-med)' : 'var(--border)'}`,
        borderLeft: `3px solid ${hov ? cfg.color : 'var(--border)'}`,
        borderRadius: 'var(--r-sm)', padding: '14px 16px',
        textDecoration: 'none', transition: 'all .18s',
        animation: `fadeUp .4s ease ${idx * 55}ms both`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ background: cfg.bg, color: cfg.color, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, fontFamily: 'var(--f-mono)', letterSpacing: '1px', textTransform: 'uppercase', border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
            {article.time && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--f-mono)' }}>{timeAgo(article.time)}</span>}
            {article.score && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--f-mono)' }}>{article.score} pts</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: article.description ? 5 : 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</div>
          {article.description && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.description}</div>
          )}
        </div>
        <div style={{ color: 'var(--blue-400)', fontSize: 14, flexShrink: 0, opacity: hov ? 1 : 0.3, transition: 'opacity .18s' }}>&#8599;</div>
      </div>
    </a>
  );
}

// ── Skill Input Panel ─────────────────────────────────────────────────────────
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
      push(`Extracted ${res.count} skills`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setParseLoading(false); }
  };

  const parseCV = async file => {
    setParseLoading(true);
    try {
      const res = await recommenderAPI.parseCV(file);
      setSkills(res.extracted_skills);
      push(`Extracted ${res.count} skills from your CV`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setParseLoading(false); }
  };

  const MODES = [
    { id: 'manual',    icon: <IconKeyboard />, label: 'Type Skills'       },
    { id: 'paragraph', icon: <IconEdit />,     label: 'Describe Yourself' },
    { id: 'cv',        icon: <IconFile />,     label: 'Upload CV'         },
  ];

  return (
    <div style={{
      background: 'var(--surface-0)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Accent top */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, var(--blue-500), var(--blue-400), transparent)' }} />

      <div style={{ padding: '24px 28px' }}>
        {/* Mode switcher */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3,
          background: 'var(--surface-2)', borderRadius: 'var(--r-sm)',
          padding: 3, marginBottom: 22,
        }}>
          {MODES.map(({ id, icon, label }) => (
            <button key={id} onClick={() => setMode(id)} style={{
              padding: '9px 6px', borderRadius: 'calc(var(--r-sm) - 2px)',
              background: mode === id ? 'var(--surface-0)' : 'transparent',
              border: mode === id ? '1px solid var(--border)' : '1px solid transparent',
              color: mode === id ? 'var(--blue-600)' : 'var(--text-muted)',
              fontFamily: 'var(--f-mono)', fontSize: 11, cursor: 'pointer',
              transition: 'all .18s', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, fontWeight: mode === id ? 500 : 400,
              boxShadow: mode === id ? 'var(--shadow-xs)' : 'none',
            }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Manual mode */}
        {mode === 'manual' && (
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>Your Skills</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); } }}
                placeholder="e.g. python, react, docker..."
                style={{
                  flex: 1, background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', padding: '10px 13px', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)', transition: 'all .18s',
                }}
              />
              <button onClick={() => addSkill(skillInput)} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', padding: '10px 16px',
                color: 'var(--text-secondary)', fontFamily: 'var(--f-mono)',
                fontSize: 11, cursor: 'pointer', transition: 'all .18s', fontWeight: 500,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-50)'; e.currentTarget.style.color = 'var(--blue-600)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >+ Add</button>
            </div>
            {skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, padding: 12, background: 'var(--surface-1)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', minHeight: 44 }}>
                {skills.map(s => (
                  <span key={s} style={{
                    background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
                    color: 'var(--blue-700)', padding: '4px 10px', borderRadius: 100,
                    fontSize: 11, fontFamily: 'var(--f-mono)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500,
                  }}>
                    {s}
                    <button onClick={() => setSkills(p => p.filter(x => x !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue-400)', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => skills.length && onSearch(skills)}
              disabled={!skills.length || loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--r-sm)', border: 'none',
                background: skills.length ? 'var(--blue-500)' : 'var(--surface-3)',
                color: skills.length ? '#fff' : 'var(--text-faint)',
                fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600,
                cursor: skills.length ? 'pointer' : 'not-allowed', transition: 'all .2s',
              }}
              onMouseEnter={e => { if (skills.length) e.currentTarget.style.background = 'var(--blue-600)'; }}
              onMouseLeave={e => { if (skills.length) e.currentTarget.style.background = 'var(--blue-500)'; }}
            >
              {loading ? 'Matching Jobs...' : skills.length ? `Find Matching Jobs · ${skills.length} skill${skills.length !== 1 ? 's' : ''}` : 'Add skills above to continue'}
            </button>
          </div>
        )}

        {/* Paragraph mode */}
        {mode === 'paragraph' && (
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>Describe Your Experience</div>
            <textarea
              rows={5} value={paragraph} onChange={e => setParagraph(e.target.value)}
              placeholder="I'm a data engineer with 3 years of experience in Python, SQL and Apache Spark..."
              style={{
                width: '100%', background: 'var(--surface-1)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', padding: '12px 14px', color: 'var(--text-primary)',
                fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)', resize: 'vertical',
                lineHeight: 1.7, marginBottom: 10,
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--f-mono)', marginBottom: 14, lineHeight: 1.6 }}>
              Uses semantic matching — understands context, not just keywords. Minimum 20 characters.
            </p>
            <button
              onClick={parseParagraph}
              disabled={paragraph.trim().length < 20 || parseLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--r-sm)', border: 'none',
                background: paragraph.trim().length >= 20 ? 'var(--blue-500)' : 'var(--surface-3)',
                color: paragraph.trim().length >= 20 ? '#fff' : 'var(--text-faint)',
                fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600,
                cursor: paragraph.trim().length >= 20 ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => { if (paragraph.trim().length >= 20) e.currentTarget.style.background = 'var(--blue-600)'; }}
              onMouseLeave={e => { if (paragraph.trim().length >= 20) e.currentTarget.style.background = 'var(--blue-500)'; }}
            >
              {parseLoading ? 'Extracting Skills...' : 'Extract Skills & Build Profile'}
            </button>
          </div>
        )}

        {/* CV mode */}
        {mode === 'cv' && (
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>Upload Your CV</div>
            <div
              onDragOver={e => { e.preventDefault(); setCvDrag(true); }}
              onDragLeave={() => setCvDrag(false)}
              onDrop={e => { e.preventDefault(); setCvDrag(false); const f = e.dataTransfer.files[0]; if (f) { setCvFile(f); parseCV(f); } }}
              onClick={() => fileRef.current.click()}
              style={{
                border: `1.5px dashed ${cvDrag ? 'var(--blue-500)' : 'var(--border-med)'}`,
                borderRadius: 'var(--r-sm)',
                background: cvDrag ? 'var(--blue-50)' : 'var(--surface-1)',
                padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all .2s', marginBottom: 12,
              }}
            >
              <div style={{ color: cvFile ? 'var(--blue-500)' : 'var(--text-faint)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                {cvFile ? <IconFile /> : <IconUpload />}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500 }}>
                {cvFile
                  ? <span style={{ color: 'var(--blue-600)' }}>{cvFile.name}</span>
                  : <><span>Drop your PDF here</span> or <span style={{ color: 'var(--blue-500)' }}>browse</span></>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--f-mono)' }}>
                {cvFile ? 'Click to change' : 'PDF only · Skills extracted automatically'}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setCvFile(f); parseCV(f); } }} />
            </div>
            {parseLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
                <Spinner size={16} /> Extracting skills from CV...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function DiscoverPage({ onNavigate }) {
  const { user } = useAuth();
  const { push } = useToast();

  const [marketStats,    setMarketStats]    = useState(null);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [domainCards,    setDomainCards]    = useState([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [showInput,      setShowInput]      = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [results,        setResults]        = useState(null);
  const [heroSearch,     setHeroSearch]     = useState('');
  const [newsTab,        setNewsTab]        = useState('all');
  const [news,           setNews]           = useState([]);
  const [newsLoading,    setNewsLoading]    = useState(true);
  const [lastRefresh,    setLastRefresh]    = useState(null);

  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // ── Fetch market stats ─────────────────────────────────────────────────
  useEffect(() => {
    statsAPI.market()
      .then(data => { setMarketStats(data); setStatsLoading(false); buildDomainCards(data); })
      .catch(() => setStatsLoading(false));
  }, []);

  // ── Build domain cards ─────────────────────────────────────────────────
  const buildDomainCards = async stats => {
    if (!stats?.domain_counts) { setDomainsLoading(false); return; }
    const sorted = Object.entries(stats.domain_counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxJobs = sorted[0]?.[1] || 1;
    const freshRatio = stats.total_jobs > 0 ? (stats.fresh_jobs || 0) / stats.total_jobs : 0;

    const cards = await Promise.all(sorted.map(async ([name, count], i) => {
      const palette = DOMAIN_PALETTE[i % DOMAIN_PALETTE.length];
      let topSkills = [];
      try {
        const res = await fetch(`${BASE}/missing-skills`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills: [], domain: name, top_n: 8 }),
        });
        if (res.ok) {
          const data = await res.json();
          topSkills = (data.missing_skills || []).sort((a, b) => b.importance - a.importance).slice(0, 8).map(s => s.skill);
        }
      } catch (_) {}
      return { name, jobs: count, maxJobs, freshCount: Math.round(count * freshRatio), topSkills, ...palette };
    }));

    setDomainCards(cards);
    setDomainsLoading(false);
  };

  // ── News fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => fetchNews().then(a => { setNews(a); setNewsLoading(false); setLastRefresh(new Date()); });
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews = newsTab === 'all' ? news : newsTab === 'hn' ? news.filter(a => a.source === 'HackerNews') : news.filter(a => a.source === 'Dev.to');

  // ── Skill matching ─────────────────────────────────────────────────────
  const handleSearch = async skills => {
    setLoading(true);
    try {
      const extra = {};
      if (user?.bio) extra.bio = user.bio;
      if (user?.experience?.length) extra.experience = user.experience;
      const res = await recommenderAPI.recommend(skills, 6, extra);
      setResults(res);
      setShowInput(false);
      push(`Recommendations ready`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const fmt = n => `${(n * 100).toFixed(0)}%`;
  const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };

  // ── Results view ───────────────────────────────────────────────────────
  if (results) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px 80px', animation: 'fadeUp .35s ease' }}>
        <button
          onClick={() => { setResults(null); setShowInput(false); }}
          style={{
            background: 'var(--surface-0)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '8px 16px', color: 'var(--text-secondary)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'var(--f-ui)', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          New Search
        </button>

        {/* Domain compatibility card */}
        <div style={{
          background: 'var(--surface-0)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '24px', boxShadow: 'var(--shadow-xs)', marginBottom: 20,
          borderTop: '3px solid var(--blue-500)',
        }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 16, fontWeight: 500 }}>Domain Compatibility</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.domain_ranking.slice(0, 6).map((d, i) => (
              <div key={d.domain}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                    {d.domain}
                    {i === 0 && <Badge color="blue">Best Fit</Badge>}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: i === 0 ? 'var(--blue-600)' : 'var(--text-muted)' }}>{fmt(d.score)}</span>
                </div>
                <ProgressBar value={d.score * 100} color={i === 0 ? 'var(--blue-500)' : 'var(--surface-3)'} />
              </div>
            ))}
          </div>
        </div>

        {/* Top matching jobs */}
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14, fontWeight: 500 }}>Top Matching Jobs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.top_jobs.map((job, i) => (
            <div key={i} style={{
              background: 'var(--surface-0)',
              border: `1px solid ${i === 0 ? 'var(--blue-200)' : 'var(--border)'}`,
              borderTop: i === 0 ? '3px solid var(--blue-500)' : '1px solid var(--border)',
              borderRadius: 'var(--r-lg)', padding: 20, boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, color: 'var(--text-primary)', marginBottom: 3 }}>{job.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{job.company} · {job.location}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness} · {job.days_old}d</Badge>
                  <Badge color="gray">{job.domain}</Badge>
                  <Button size="sm" onClick={() => onNavigate('jobs')}>View</Button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
                {[['Overall', job.score, 'var(--blue-500)'], ['Skill Match', job.job_match, 'var(--emerald)'], ['Semantic', job.semantic_score || 0, '#7c3aed'], ['Domain Fit', job.domain_fit, '#0891b2']].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>{label}</span>
                    <ProgressBar value={val * 100} color={color} />
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color, width: 36, textAlign: 'right' }}>{fmt(val)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {job.matched_skills.map(s => <Badge key={s} color="green">{s}</Badge>)}
                {job.skill_gaps.map(s => <Badge key={s} color="gray">{s}</Badge>)}
              </div>
            </div>
          ))}
        </div>
        <Button full variant="ghost" style={{ marginTop: 20 }} onClick={() => onNavigate('jobs')}>Browse All Jobs</Button>
      </div>
    );
  }

  // ── Main landing view ──────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px 80px', animation: 'fadeUp .4s ease' }}>

      {/* ── HERO CARD ── */}
      <div style={{
        background: 'var(--surface-0)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)', marginBottom: 24,
      }}>
        {/* Blue gradient header band */}
        <div style={{
          background: 'linear-gradient(135deg, var(--blue-700) 0%, var(--blue-500) 100%)',
          padding: '40px 40px 36px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: 200, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
            <div>
              {/* Eyebrow */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.22)',
                borderRadius: 100, padding: '4px 12px', marginBottom: 16,
                fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
                color: '#fff', letterSpacing: '1.5px', textTransform: 'uppercase',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Tunisia's Career Intelligence Platform
              </div>

              <h1 style={{
                fontFamily: 'var(--f-display)', fontSize: 'clamp(28px, 3.5vw, 42px)',
                fontWeight: 400, color: '#fff', lineHeight: 1.15,
                letterSpacing: '-1px', marginBottom: 12,
              }}>
                Navigate Your <em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,.82)' }}>Career Path</em>
                <br />
                <span style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', color: 'rgba(255,255,255,.65)' }}>in Tunisia</span>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.72)', lineHeight: 1.8, maxWidth: 440, marginBottom: 20 }}>
                AI-powered semantic matching. Real-time job market intelligence. Discover what skills are in demand and where you fit best.
              </p>

              {/* CTA buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowInput(s => !s)}
                  style={{
                    background: '#fff', border: 'none', borderRadius: 'var(--r-sm)',
                    padding: '10px 22px', color: 'var(--blue-700)',
                    fontFamily: 'var(--f-ui)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,.15)', transition: 'all .18s',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <IconSparkle />
                  Match My Skills
                </button>
                <button
                  onClick={() => onNavigate('jobs')}
                  style={{
                    background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)',
                    borderRadius: 'var(--r-sm)', padding: '10px 22px',
                    color: '#fff', fontFamily: 'var(--f-ui)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all .18s',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}
                >
                  <IconBriefcase />
                  Browse All Jobs
                </button>
              </div>
            </div>

            {/* Stat mini-grid in hero */}
            {!statsLoading && marketStats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
                {[
                  { label: 'Live Jobs',      value: marketStats.total_jobs,   color: '#fff'          },
                  { label: 'Fresh this month', value: marketStats.fresh_jobs, color: '#4ade80'       },
                  { label: 'Domains',         value: marketStats.total_domains, color: '#93c5fd'     },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 'var(--r-sm)', padding: '10px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</span>
                    <span style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: s.color, letterSpacing: '-0.5px' }}>{s.value?.toLocaleString()}</span>
                  </div>
                ))}
                {marketStats.semantic_enabled && (
                  <div style={{
                    background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 'var(--r-sm)', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ color: '#93c5fd' }}><IconSparkle /></div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 1 }}>Semantic AI Active</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'rgba(255,255,255,.55)' }}>Context-aware matching</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hero search bar */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 600 }}>
            <div style={{ color: 'var(--text-faint)', flexShrink: 0 }}><IconSearch /></div>
            <input
              value={heroSearch}
              onChange={e => setHeroSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onNavigate('jobs', { search: heroSearch })}
              placeholder="Search jobs, skills or companies..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--f-ui)',
              }}
            />
            <Button size="sm" onClick={() => onNavigate('jobs', { search: heroSearch })}>Search</Button>
          </div>
        </div>
      </div>

      {/* ── SKILL INPUT PANEL ── */}
      {showInput && (
        <div style={{ marginBottom: 24, animation: 'fadeUp .3s ease' }}>
          <SkillInputPanel onSearch={handleSearch} loading={loading} />
        </div>
      )}

      {/* ── STAT STRIP ── */}
      {!statsLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard label="Live Jobs"     value={marketStats?.total_jobs || 0}    color="var(--blue-500)" icon={<IconBriefcase />} />
          <StatCard label="Fresh Jobs"    value={marketStats?.fresh_jobs || 0}    color="var(--emerald)"  icon={<IconTrendUp />}  />
          <StatCard label="Domains"       value={marketStats?.total_domains || 0} color="#7c3aed"         icon={<IconLayers />}   />
          <StatCard label="Aging Postings" value={marketStats?.aging_jobs || 0}   color="var(--amber)"    icon={<IconChartBar />} />
        </div>
      )}
      {statsLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 22px', height: 96 }}>
              <Skeleton h={36} w="60%" r={4} style={{ marginBottom: 10 }} />
              <Skeleton h={10} w="70%" r={4} />
            </div>
          ))}
        </div>
      )}

      {/* ── MARKET FRESHNESS SNAPSHOT ── */}
      {marketStats && !statsLoading && (
        <div style={{
          background: 'var(--surface-0)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '16px 24px', marginBottom: 28,
          boxShadow: 'var(--shadow-xs)', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--blue-600)', fontWeight: 500, whiteSpace: 'nowrap' }}>Market Snapshot</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
            {[
              { label: `${marketStats.fresh_jobs} fresh`, color: 'var(--emerald)', dot: true },
              { label: `${marketStats.aging_jobs} aging`, color: 'var(--amber)', dot: true },
              { label: `${marketStats.expired_jobs} expired`, color: 'var(--rose)', dot: true },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: item.color, fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
          {/* Freshness bar */}
          <div style={{ flex: 1, maxWidth: 260, height: 6, borderRadius: 6, overflow: 'hidden', display: 'flex', gap: 1 }}>
            {[[marketStats.fresh_jobs, 'var(--emerald)'], [marketStats.aging_jobs, 'var(--amber)'], [marketStats.expired_jobs, 'var(--rose)']].map(([count, color], i) => (
              <div key={i} style={{ background: color, flex: count, borderRadius: i === 0 ? '6px 0 0 6px' : i === 2 ? '0 6px 6px 0' : 0 }} />
            ))}
          </div>
          <button
            onClick={() => onNavigate('jobs')}
            style={{
              background: 'transparent', border: '1px solid var(--border-med)',
              borderRadius: 'var(--r-sm)', padding: '6px 14px', color: 'var(--text-muted)',
              fontFamily: 'var(--f-mono)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 5, transition: 'all .18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-med)'; }}
          >
            Browse All <IconArrowRight />
          </button>
        </div>
      )}

      {/* ── TOP DOMAINS ── */}
      <Section
        label="Job Market"
        title="Top Domains in Tunisia"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {domainsLoading && <Spinner size={14} />}
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Click a card to expand</span>
          </div>
        }
      >
        {domainsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px', height: 176 }}>
                <Skeleton h={40} w="40px" r={8} style={{ marginBottom: 14 }} />
                <Skeleton h={16} w="70%" r={4} style={{ marginBottom: 8 }} />
                <Skeleton h={12} w="45%" r={4} style={{ marginBottom: 16 }} />
                <Skeleton h={4} r={4} style={{ marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 5 }}>
                  <Skeleton h={20} w="60px" r={100} />
                  <Skeleton h={20} w="50px" r={100} />
                  <Skeleton h={20} w="70px" r={100} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {domainCards.map((d, i) => (
              <DomainCard key={d.name} d={d} onNavigate={onNavigate} index={i} />
            ))}
          </div>
        )}
      </Section>

      {/* ── TOP SKILLS TABLE ── */}
      {!domainsLoading && domainCards.length > 0 && (
        <Section label="Extracted from job data" title="Most In-Demand Skills">
          <div style={{
            background: 'var(--surface-0)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)',
          }}>
            {domainCards.slice(0, 6).map((d, i) => (
              <div
                key={d.name}
                onClick={() => onNavigate('jobs', { domain: d.name })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
                  borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background .18s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 3, height: 36, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <div style={{ minWidth: 180, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{d.name}</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{d.jobs} open roles</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(d.topSkills || []).slice(0, 6).map(s => (
                    <span key={s} style={{
                      background: d.dim, color: d.color, border: `1px solid ${d.border}`,
                      fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
                      fontFamily: 'var(--f-mono)',
                    }}>{s}</span>
                  ))}
                </div>
                <div style={{ color: 'var(--text-faint)', flexShrink: 0 }}><IconArrowRight /></div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── FRESHNESS BREAKDOWN ── */}
      {marketStats && !statsLoading && (
        <Section label="Posting Quality" title="Job Freshness Overview">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              { label: 'Fresh Jobs',      sub: 'Posted within 30 days', value: marketStats.fresh_jobs,   pct: Math.round(marketStats.fresh_jobs / marketStats.total_jobs * 100),   color: 'var(--emerald)', barColor: 'rgba(14,165,114,.12)',  borderColor: 'rgba(14,165,114,.25)' },
              { label: 'Recent Jobs',     sub: 'Posted within 60 days', value: marketStats.aging_jobs,   pct: Math.round(marketStats.aging_jobs / marketStats.total_jobs * 100),   color: 'var(--amber)',   barColor: 'rgba(245,158,11,.12)', borderColor: 'rgba(245,158,11,.25)' },
              { label: 'Older Postings',  sub: 'Over 60 days old',      value: marketStats.expired_jobs, pct: Math.round(marketStats.expired_jobs / marketStats.total_jobs * 100), color: 'var(--rose)',    barColor: 'rgba(240,65,108,.12)', borderColor: 'rgba(240,65,108,.25)' },
            ].map(c => (
              <div key={c.label} style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '22px 20px',
                boxShadow: 'var(--shadow-xs)', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color }} />
                {/* Icon circle */}
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--r-sm)',
                  background: c.barColor, border: `1px solid ${c.borderColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.color, marginBottom: 12,
                }}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 32, color: c.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{c.value.toLocaleString()}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--f-mono)', marginBottom: 14 }}>{c.sub}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AnimBar value={c.pct} color={c.color} delay={300} />
                  <span style={{ fontSize: 12, color: c.color, fontFamily: 'var(--f-mono)', fontWeight: 700 }}>{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── IT & TECH NEWS ── */}
      <Section
        label="Live Feed — auto-refreshes every 5 min"
        title="IT & Tech News"
        action={
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {lastRefresh && (
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-faint)', marginRight: 6 }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            {[['all', 'All'], ['hn', 'Hacker News'], ['dev', 'Dev.to']].map(([id, label]) => (
              <button key={id} onClick={() => setNewsTab(id)} style={{
                padding: '5px 12px', borderRadius: 'var(--r-sm)',
                border: `1px solid ${newsTab === id ? 'var(--blue-200)' : 'var(--border)'}`,
                background: newsTab === id ? 'var(--blue-50)' : 'transparent',
                color: newsTab === id ? 'var(--blue-600)' : 'var(--text-muted)',
                fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: newsTab === id ? 600 : 400,
                cursor: 'pointer', transition: 'all .18s',
              }}>{label}</button>
            ))}
            <button
              onClick={() => { setNewsLoading(true); fetchNews().then(a => { setNews(a); setNewsLoading(false); setLastRefresh(new Date()); }); }}
              style={{
                padding: '5px 9px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Refresh"
            >
              <IconRefresh />
            </button>
          </div>
        }
      >
        {newsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '14px 16px', height: 96 }}>
                <Skeleton h={12} w="80px" r={100} style={{ marginBottom: 10 }} />
                <Skeleton h={14} r={4} style={{ marginBottom: 6 }} />
                <Skeleton h={12} w="80%" r={4} />
              </div>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div style={{
            background: 'var(--surface-0)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '40px 24px', textAlign: 'center',
            color: 'var(--text-muted)', fontFamily: 'var(--f-mono)', fontSize: 13,
          }}>
            No articles found — check connection or click refresh to retry.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {filteredNews.map((article, i) => (
              <NewsCard key={article.id} article={article} idx={i} />
            ))}
          </div>
        )}
      </Section>

      {/* ── CTA BANNER (unauthenticated) ── */}
      {!user && (
        <div style={{
          background: 'var(--surface-0)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, var(--blue-500), var(--blue-400), transparent)' }} />
          <div style={{
            padding: '40px 40px', display: 'grid',
            gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 32,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--blue-600)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>
                AI-Powered · Semantic Matching
              </div>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 28, color: 'var(--text-primary)', letterSpacing: '-0.8px', marginBottom: 10, fontWeight: 400 }}>
                Let AI find your perfect role
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, maxWidth: 500 }}>
                Upload your CV or describe your experience. Our engine understands context — not just keywords — and matches you with the right opportunities in Tunisia's tech market.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180 }}>
              <Button size="lg" onClick={() => onNavigate('auth-register')} full>
                Get Started Free
              </Button>
              <Button variant="ghost" size="lg" onClick={() => onNavigate('auth-login')} full>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}