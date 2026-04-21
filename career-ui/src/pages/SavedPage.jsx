// src/pages/SavedPage.jsx — live saved jobs from API
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userAPI, jobsAPI } from '../utils/api';
import { Badge, Button, Spinner, EmptyState } from '../components/ui';

const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };

export default function SavedPage({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const { push }             = useToast();

  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setSavedIds(new Set((user.saved_jobs || []).map(String)));
    loadSavedJobs();
  }, [user]);

  const loadSavedJobs = async () => {
    if (!user?.saved_jobs?.length) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch each saved job by ID
      const fetched = await Promise.allSettled(
        (user.saved_jobs || []).map(id => jobsAPI.get(String(id)))
      );
      const valid = fetched
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      setJobs(valid);
    } catch (err) {
      push('Failed to load saved jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeSaved = async (jobId) => {
    try {
      const res = await userAPI.unsaveJob(String(jobId));
      const newSavedIds = new Set(res.saved_jobs.map(String));
      setSavedIds(newSavedIds);
      setJobs(prev => prev.filter(j => newSavedIds.has(String(j.id))));
      updateUser({ saved_jobs: res.saved_jobs });
      push('Job removed from saved', 'info');
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px' }}>
        <EmptyState icon="🔒" title="Sign in to see saved jobs"
          action={<Button onClick={() => onNavigate('auth-login')}>Sign In</Button>} />
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
        }}>{jobs.length} saved</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : jobs.length === 0 ? (
        <EmptyState icon="☆" title="No saved jobs yet"
          description="Browse jobs and click ☆ to save your favourites here."
          action={<Button onClick={() => onNavigate('jobs')}>Browse Jobs</Button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => (
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
                    fontSize: 18, fontWeight: 700, color: 'var(--gold2)', fontFamily: 'var(--f-mono)', flexShrink: 0,
                  }}>{(job.company || 'J').charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, marginBottom: 2 }}>{job.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--ivory3)' }}>{job.company} · {job.location}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="ghost" onClick={() => onNavigate('jobs')}>View Details →</Button>
                  {job.apply_url && (
                    <a href={job.apply_url} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', padding: '7px 14px',
                      background: 'var(--gold)', border: 'none', borderRadius: 'var(--r-sm)',
                      color: '#0A0C10', fontSize: 12, cursor: 'pointer',
                      fontFamily: 'var(--f-ui)', fontWeight: 600, textDecoration: 'none',
                    }}>Apply Now ↗</a>
                  )}
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
                <Badge color="gold">{job.domain}</Badge>
                {job.days_old > 60 && <Badge color="red">⚠ May be closed</Badge>}
              </div>

              {/* Show matched skills if user has skills */}
              {user?.skills?.length > 0 && job.skills?.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {job.skills.slice(0, 8).map(s => {
                    const matched = (user.skills || []).map(x => x.toLowerCase()).includes(s.toLowerCase());
                    return (
                      <span key={s} style={{
                        padding: '3px 9px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--f-mono)',
                        background: matched ? 'var(--green-dim)' : 'var(--ink4)',
                        border: `1px solid ${matched ? 'rgba(34,200,122,.2)' : 'var(--line)'}`,
                        color: matched ? 'var(--green)' : 'var(--ivory2)',
                      }}>{matched ? '✓ ' : ''}{s}</span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
