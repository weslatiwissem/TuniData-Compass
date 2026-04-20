// src/pages/DashboardPage.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Button, ProgressBar, Avatar } from '../components/ui';

const DOMAIN_JOBS = {
  'Data Engineering': 234, 'ML / AI': 145, 'Frontend Dev': 198,
  'Backend Dev': 176, 'DevOps': 98, 'Design': 76,
};

const AI_RECOS = [
  { title: 'ML Engineer', company: 'InstaDeep', score: .93, logo: 'I', days: 5, freshness: 'fresh', salary: '6,000–9,000 DT' },
  { title: 'Senior Data Engineer', company: 'Vermeg', score: .91, logo: 'V', days: 8, freshness: 'fresh', salary: '4,500–6,000 DT' },
  { title: 'Data Scientist', company: 'BIAT', score: .85, logo: 'B', days: 18, freshness: 'fresh', salary: '3,800–5,200 DT' },
  { title: 'Backend Engineer', company: 'Expensya', score: .82, logo: 'E', days: 35, freshness: 'aging', salary: '3,200–4,500 DT' },
];

const TIPS = [
  '🎯 Add more skills to increase match rates by up to 40%',
  '📄 Upload your CV to unlock automated skill extraction',
  '⭐ Save jobs you like — we\'ll notify you of similar openings',
  '🔔 Complete your profile to appear in recruiter searches',
];

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));

  if (!user) return null;

  const saved = (user.saved_jobs || []).length;
  const applied = (user.applied_jobs || []).length;
  const skills = (user.skills || []).length;
  const initials = (user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase();

  const maxDomainJobs = Math.max(...Object.values(DOMAIN_JOBS));

  const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', animation: 'fadeUp .3s ease' }}>

      {/* ── Page header ─────────────────────────────────────── */}
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

      {/* ── Tip banner ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.04))',
        border: '1px solid var(--gold-border)', borderRadius: 'var(--r)', padding: '14px 20px',
        marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--ivory2)',
      }}>
        <span style={{ fontSize: 18 }}>💡</span>
        {TIPS[tipIdx]}
      </div>

      {/* ── Metric cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Saved Jobs', value: saved, color: 'var(--gold)', suffix: '' },
          { label: 'Applied', value: applied, color: 'var(--green)', suffix: '' },
          { label: 'AI Match', value: 93, color: 'var(--blue)', suffix: '%' },
          { label: 'Skills Listed', value: skills, color: 'var(--teal)', suffix: '' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            padding: 20, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.color }} />
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 38, letterSpacing: '-1px', lineHeight: 1, color: m.color, marginBottom: 4 }}>
              {m.value}{m.suffix}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ivory3)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Two-col grid ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* AI Recommendations */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>AI Recommendations</div>
            <button onClick={() => onNavigate('discover')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--f-mono)' }}>Run new →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AI_RECOS.map((job, i) => (
              <div
                key={i}
                onClick={() => onNavigate('jobs')}
                style={{
                  background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                  padding: '12px 14px', cursor: 'pointer', transition: 'all .18s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'var(--gold2)', fontFamily: 'var(--f-mono)',
                }}>{job.logo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ivory3)' }}>{job.company} · {job.salary}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 500, color: 'var(--gold)' }}>{Math.round(job.score * 100)}%</span>
                  <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Profile summary */}
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
              <span style={{ color: 'var(--gold)' }}>
                {Math.round(([!!user.bio, skills > 0, !!(user.experience||[]).length, !!user.cv_filename].filter(Boolean).length / 4) * 100)}%
              </span>
            </div>
            <ProgressBar value={Math.round(([!!user.bio, skills > 0, !!(user.experience||[]).length, !!user.cv_filename].filter(Boolean).length / 4) * 100)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {[
              ['Skills added', skills > 0, `${skills} skills`],
              ['Bio written', !!user.bio, 'Looking good'],
              ['CV uploaded', !!user.cv_filename, user.cv_filename || 'Not uploaded'],
              ['Experience', (user.experience||[]).length > 0, `${(user.experience||[]).length} entries`],
            ].map(([label, done, detail]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: done ? 'var(--green)' : 'var(--ivory3)', display: 'flex', gap: 6 }}>
                  <span>{done ? '✓' : '○'}</span>{label}
                </span>
                <span style={{ color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>{detail}</span>
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" full onClick={() => onNavigate('profile')}>Edit Profile →</Button>
        </Card>
      </div>

      {/* ── Domain analysis ──────────────────────────────────── */}
      <Card style={{ background: 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.03))', borderColor: 'var(--gold-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Job Market</div>
            <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 20 }}>Active openings by domain</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('jobs')}>Browse All →</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(DOMAIN_JOBS).map(([domain, count]) => (
            <div key={domain}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13 }}>{domain}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gold)' }}>{count} jobs</span>
              </div>
              <ProgressBar value={Math.round(count / maxDomainJobs * 100)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
