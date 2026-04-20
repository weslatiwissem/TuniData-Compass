// src/pages/SavedPage.jsx
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userAPI } from '../utils/api';
import { Badge, Button, EmptyState } from '../components/ui';
import { useState, useEffect } from 'react';

const ALL_JOBS = [
  { id: 1, title: 'Senior Data Engineer', company: 'Vermeg', domain: 'Data Engineering', location: 'Tunis, TN', type: 'Full-time', days_old: 8, freshness: 'fresh', score: .91, salary: '4,500–6,000 DT', logo: 'V' },
  { id: 2, title: 'React Frontend Developer', company: 'Telnet', domain: 'Frontend Dev', location: 'Sfax, TN', type: 'Hybrid', days_old: 14, freshness: 'fresh', score: .87, salary: '2,800–3,800 DT', logo: 'T' },
  { id: 3, title: 'ML Engineer', company: 'InstaDeep', domain: 'ML / AI', location: 'Remote', type: 'Remote', days_old: 5, freshness: 'fresh', score: .93, salary: '6,000–9,000 DT', logo: 'I' },
  { id: 4, title: 'DevOps Engineer', company: 'Sofrecom', domain: 'DevOps', location: 'Tunis, TN', type: 'Full-time', days_old: 22, freshness: 'fresh', score: .79, salary: '3,500–5,000 DT', logo: 'S' },
  { id: 5, title: 'Backend Engineer', company: 'Expensya', domain: 'Backend Dev', location: 'Tunis, TN', type: 'Hybrid', days_old: 35, freshness: 'aging', score: .82, salary: '3,200–4,500 DT', logo: 'E' },
  { id: 6, title: 'Data Scientist', company: 'BIAT', domain: 'ML / AI', location: 'Tunis, TN', type: 'Full-time', days_old: 18, freshness: 'fresh', score: .85, salary: '3,800–5,200 DT', logo: 'B' },
  { id: 7, title: 'UI/UX Designer', company: 'Axe Finance', domain: 'Design', location: 'Ariana, TN', type: 'Full-time', days_old: 10, freshness: 'fresh', score: .76, salary: '2,500–3,500 DT', logo: 'A' },
  { id: 8, title: 'Cloud Architect', company: 'Ooredoo', domain: 'DevOps', location: 'Tunis, TN', type: 'Full-time', days_old: 65, freshness: 'expired', score: .74, salary: '6,500–9,000 DT', logo: 'O' },
];

const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };

export default function SavedPage({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const { push } = useToast();
  const [savedSet, setSavedSet] = useState(new Set(user?.saved_jobs || []));

  useEffect(() => { if (user) setSavedSet(new Set(user.saved_jobs)); }, [user]);

  const savedJobs = ALL_JOBS.filter(j => savedSet.has(j.id));

  const removeSaved = async (jobId) => {
    try {
      await userAPI.unsaveJob(jobId);
      setSavedSet(prev => { const s = new Set(prev); s.delete(jobId); return s; });
      updateUser({ saved_jobs: [...savedSet].filter(id => id !== jobId) });
      push('Job removed from saved', 'info');
    } catch (err) { push(err.message, 'error'); }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px' }}>
        <EmptyState icon="🔒" title="Sign in to see saved jobs" action={<Button onClick={() => onNavigate('auth-login')}>Sign In</Button>} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px', animation: 'fadeUp .3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 26 }}>
          Saved <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Jobs</span>
        </h1>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 12px', borderRadius: 100,
          fontSize: 11, fontFamily: 'var(--f-mono)', background: 'var(--gold-dim)',
          color: 'var(--gold2)', border: '1px solid var(--gold-border)',
        }}>{savedJobs.length} saved</span>
      </div>

      {savedJobs.length === 0 ? (
        <EmptyState
          icon="☆"
          title="No saved jobs yet"
          description="Browse jobs and click ☆ to save your favourites here."
          action={<Button onClick={() => onNavigate('jobs')}>Browse Jobs</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {savedJobs.map(job => (
            <div key={job.id} style={{
              background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
              padding: '20px 24px', transition: 'border-color .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, background: 'var(--gold-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: 'var(--gold2)', fontFamily: 'var(--f-mono)', flexShrink: 0,
                  }}>{job.logo}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, marginBottom: 2 }}>{job.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--ivory3)' }}>{job.company} · {job.location}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="ghost" onClick={() => onNavigate('jobs')}>View Details →</Button>
                  <Button size="sm" onClick={() => onNavigate('jobs')}>Apply Now</Button>
                  <button onClick={() => removeSaved(job.id)} style={{
                    background: 'none', border: '1px solid rgba(240,96,96,.25)',
                    borderRadius: 'var(--r-sm)', padding: '7px 12px', color: 'var(--red)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--f-ui)', transition: 'all .18s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >✕ Remove</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness} · {job.days_old}d ago</Badge>
                <Badge color="gray">{job.type}</Badge>
                <Badge color="gold">{job.domain}</Badge>
                <Badge color="teal">💰 {job.salary}/mo</Badge>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--gold)' }}>
                  {Math.round(job.score * 100)}% match
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
