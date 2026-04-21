// src/pages/DashboardPage.jsx — live data from API
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { statsAPI, recommenderAPI } from '../utils/api';
import { Card, Badge, Button, ProgressBar, Avatar, Spinner } from '../components/ui';

const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };

const TIPS = [
  '🎯 Add more skills to increase match rates by up to 40%',
  '📄 Upload your CV to unlock automated skill extraction and profile fill',
  '⭐ Save jobs you like to track them in your saved jobs list',
  '🔔 Complete your profile to get better AI recommendations',
];

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [tipIdx]    = useState(() => Math.floor(Math.random() * TIPS.length));
  const [stats,     setStats]     = useState(null);
  const [recos,     setRecos]     = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recosLoading, setRecosLoading] = useState(false);

  useEffect(() => {
    // Load market stats
    statsAPI.market()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    // Load AI recommendations if user has skills
    if (user?.skills?.length > 0) {
      setRecosLoading(true);
      recommenderAPI.recommend(user.skills, 4)
        .then(res => setRecos(res.top_jobs || []))
        .catch(() => {})
        .finally(() => setRecosLoading(false));
    }
  }, []);

  if (!user) return null;

  const saved    = (user.saved_jobs   || []).length;
  const applied  = (user.applied_jobs || []).length;
  const skills   = (user.skills       || []).length;
  const initials = (user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase();

  const strengthItems = [
    { label: 'Name & role',  done: !!(user.first_name && user.role) },
    { label: 'Bio written',  done: !!user.bio },
    { label: 'Skills added', done: skills > 0 },
    { label: 'Experience',   done: !!(user.experience || []).length },
    { label: 'CV uploaded',  done: !!user.cv_filename },
    { label: 'Preferences',  done: !!(user.preferences?.type) },
  ];
  const strength = Math.round((strengthItems.filter(x => x.done).length / strengthItems.length) * 100);

  // Build domain chart data from real stats
  const domainData = stats?.domain_counts
    ? Object.entries(stats.domain_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];
  const maxDomainJobs = domainData.length ? domainData[0][1] : 1;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', animation: 'fadeUp .3s ease' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Overview</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 28, letterSpacing: '-1px' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>{user.first_name}</span>
          </h1>
        </div>
        <Button onClick={() => onNavigate('discover')}>Find New Jobs →</Button>
      </div>

      {/* ── Tip ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.04))',
        border: '1px solid var(--gold-border)', borderRadius: 'var(--r)', padding: '14px 20px',
        marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--ivory2)',
      }}>
        <span style={{ fontSize: 18 }}>💡</span>
        {TIPS[tipIdx]}
      </div>

      {/* ── Metric cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Saved Jobs',   value: saved,    color: 'var(--gold)',  suffix: '' },
          { label: 'Applied',      value: applied,  color: 'var(--green)', suffix: '' },
          { label: 'Skills Listed',value: skills,   color: 'var(--teal)',  suffix: '' },
          { label: 'Live Jobs',    value: stats?.total_jobs || '…', color: 'var(--blue)', suffix: '' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            padding: 20, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.color }} />
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 38, letterSpacing: '-1px', lineHeight: 1, color: m.color, marginBottom: 4 }}>
              {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}{m.suffix}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ivory3)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* ── AI Recommendations ── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>
              AI Recommendations
            </div>
            <button onClick={() => onNavigate('discover')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--f-mono)' }}>
              Run new →
            </button>
          </div>

          {recosLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          ) : recos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--ivory3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: .4 }}>🤖</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                {user.skills?.length > 0 ? 'No matches found' : 'Add skills to get AI recommendations'}
              </div>
              <Button size="sm" onClick={() => onNavigate(user.skills?.length > 0 ? 'discover' : 'profile')}>
                {user.skills?.length > 0 ? 'Try again' : 'Add Skills'}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recos.map((job, i) => (
                <div key={i} onClick={() => onNavigate('jobs')} style={{
                  background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                  padding: '12px 14px', cursor: 'pointer', transition: 'all .18s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-border)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: 'var(--gold-dim)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, fontWeight: 700,
                    color: 'var(--gold2)', fontFamily: 'var(--f-mono)',
                  }}>{(job.company || 'J').charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ivory3)' }}>{job.company} · {job.domain}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 500, color: 'var(--gold)' }}>
                      {Math.round(job.score * 100)}%
                    </span>
                    <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Profile summary ── */}
        <Card>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Your Profile</div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <Avatar initials={initials} size={52} color={user.avatar_color || 'var(--gold-dim)'} />
            <div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 18 }}>{user.first_name} {user.last_name}</div>
              <div style={{ color: 'var(--ivory3)', fontSize: 13 }}>{user.role}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <Badge color="gold">{user.role}</Badge>
                <Badge color="green">Open</Badge>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ivory3)', marginBottom: 6 }}>
              <span>Profile Strength</span>
              <span style={{ color: strength >= 80 ? 'var(--green)' : 'var(--gold)' }}>{strength}%</span>
            </div>
            <ProgressBar value={strength} color={strength >= 80 ? 'var(--green)' : 'var(--gold)'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {strengthItems.map(({ label, done }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: done ? 'var(--green)' : 'var(--ivory3)', display: 'flex', gap: 6 }}>
                  <span>{done ? '✓' : '○'}</span>{label}
                </span>
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" full onClick={() => onNavigate('profile')}>Edit Profile →</Button>
        </Card>
      </div>

      {/* ── Domain market analysis (real data) ── */}
      <Card style={{ background: 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.03))', borderColor: 'var(--gold-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Live Job Market</div>
            <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 20 }}>Active openings by domain</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {stats && (
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge color="green">🟢 {stats.fresh_jobs} fresh</Badge>
                <Badge color="gold">🟡 {stats.aging_jobs} aging</Badge>
                <Badge color="red">🔴 {stats.expired_jobs} expired</Badge>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => onNavigate('jobs')}>Browse All →</Button>
          </div>
        </div>

        {statsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {domainData.map(([domain, count]) => (
              <div key={domain} onClick={() => onNavigate('jobs', { domain })} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13 }}>{domain}</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gold)' }}>{count} jobs</span>
                </div>
                <ProgressBar value={Math.round(count / maxDomainJobs * 100)} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
