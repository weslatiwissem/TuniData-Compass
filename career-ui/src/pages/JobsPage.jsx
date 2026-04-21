// src/pages/JobsPage.jsx — fully connected to real /jobs API
import { useState, useEffect, useCallback, useRef } from 'react';
import { jobsAPI, userAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Spinner, Modal, Textarea } from '../components/ui';

const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };
const LOGO_COLORS = ['#E8A020', '#22C87A', '#3B82F6', '#2DD4BF', '#a78bfa', '#fb923c', '#f472b6', '#f87171'];
const fmt = n => `${(n * 100).toFixed(0)}%`;

function SkillBadge({ skill, matched }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--f-mono)',
      background: matched ? 'var(--green-dim)' : 'var(--ink4)',
      border: `1px solid ${matched ? 'rgba(34,200,122,.2)' : 'var(--line)'}`,
      color: matched ? 'var(--green)' : 'var(--ivory2)',
    }}>
      {matched ? '✓ ' : ''}{skill}
    </span>
  );
}

export default function JobsPage({ initialSearch = '', initialDomain = '' }) {
  const { user, updateUser } = useAuth();
  const { push } = useToast();

  // ── Filter state ──
  const [search,       setSearch]       = useState(initialSearch);
  const [filterDomain, setFilterDomain] = useState(initialDomain);
  const [filterFresh,  setFilterFresh]  = useState('');
  const [page,         setPage]         = useState(1);

  // ── Data state ──
  const [jobs,      setJobs]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [domains,   setDomains]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── User interaction state ──
  const [savedSet,   setSavedSet]   = useState(new Set());
  const [appliedSet, setAppliedSet] = useState(new Set());
  const [applyModal, setApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying,   setApplying]   = useState(false);

  const searchTimeout = useRef(null);

  // Sync user sets
  useEffect(() => {
    if (user) {
      setSavedSet(new Set((user.saved_jobs || []).map(String)));
      setAppliedSet(new Set((user.applied_jobs || []).map(String)));
    }
  }, [user]);

  // Load jobs from API
  const loadJobs = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const res = await jobsAPI.list({
        search:    opts.search    ?? search,
        domain:    opts.domain    ?? filterDomain,
        freshness: opts.freshness ?? filterFresh,
        page:      opts.page      ?? page,
        perPage:   20,
      });
      setJobs(res.jobs);
      setTotal(res.total);
      setPages(res.pages);
      setDomains(res.domains);
      // Auto-select first job
      if (res.jobs.length && !selected) {
        setSelected(res.jobs[0]);
      }
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterDomain, filterFresh, page]);

  useEffect(() => { loadJobs(); }, []);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadJobs({ search: val, page: 1 });
    }, 350);
  };

  const handleFilter = (key, val) => {
    const updates = { page: 1 };
    if (key === 'domain')    { setFilterDomain(val);  updates.domain    = val; }
    if (key === 'freshness') { setFilterFresh(val);   updates.freshness = val; }
    setPage(1);
    loadJobs(updates);
  };

  const clearFilters = () => {
    setSearch(''); setFilterDomain(''); setFilterFresh(''); setPage(1);
    loadJobs({ search: '', domain: '', freshness: '', page: 1 });
  };

  // Load full job detail when selected
  const selectJob = async (job) => {
    setSelected(job);
    if (!job.skills) {
      setDetailLoading(true);
      try {
        const full = await jobsAPI.get(job.id);
        setSelected(full);
      } catch {}
      setDetailLoading(false);
    }
  };

  const toggleSave = async (jobId) => {
    if (!user) { push('Sign in to save jobs', 'error'); return; }
    const isSaved = savedSet.has(String(jobId));
    try {
      if (isSaved) {
        const res = await userAPI.unsaveJob(jobId);
        setSavedSet(new Set(res.saved_jobs.map(String)));
        updateUser({ saved_jobs: res.saved_jobs });
        push('Removed from saved', 'info');
      } else {
        const res = await userAPI.saveJob(jobId);
        setSavedSet(new Set(res.saved_jobs.map(String)));
        updateUser({ saved_jobs: res.saved_jobs });
        push('Job saved! ⭐', 'success');
      }
    } catch (err) { push(err.message, 'error'); }
  };

  const handleApply = async () => {
    if (!user) { push('Sign in to apply', 'error'); return; }
    setApplying(true);
    try {
      const res = await userAPI.applyJob(selected.id, coverLetter);
      setAppliedSet(new Set(res.applied_jobs.map(String)));
      updateUser({ applied_jobs: res.applied_jobs });
      setApplyModal(false);
      setCoverLetter('');
      push(`Application sent to ${selected.company}! 🚀`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setApplying(false); }
  };

  const hasFilters = search || filterDomain || filterFresh;

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>
      {/* ── Search bar ── */}
      <div style={{ background: 'var(--ink2)', borderBottom: '1px solid var(--line)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" stroke="var(--ivory3)" strokeWidth="1.5" />
              <path d="M20 20l-3-3" stroke="var(--ivory3)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Job title, skill, or company..."
              style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px 10px 40px', color: 'var(--ivory)', fontSize: 14, outline: 'none', fontFamily: 'var(--f-ui)' }} />
          </div>

          <select value={filterDomain} onChange={e => handleFilter('domain', e.target.value)} style={{
            background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
            padding: '10px 12px', color: filterDomain ? 'var(--ivory)' : 'var(--ivory3)',
            fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)', appearance: 'none', cursor: 'pointer',
          }}>
            <option value="">All Domains</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={filterFresh} onChange={e => handleFilter('freshness', e.target.value)} style={{
            background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
            padding: '10px 12px', color: filterFresh ? 'var(--ivory)' : 'var(--ivory3)',
            fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)', appearance: 'none', cursor: 'pointer',
          }}>
            <option value="">All Freshness</option>
            <option value="fresh">Fresh (≤30d)</option>
            <option value="aging">Recent (≤60d)</option>
            <option value="expired">Expired</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} style={{
              background: 'var(--red-dim)', border: '1px solid rgba(240,96,96,.25)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--red)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--f-mono)',
            }}>✕ Clear</button>
          )}

          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory3)', whiteSpace: 'nowrap' }}>
            {total.toLocaleString()} jobs
          </span>
        </div>
      </div>

      {/* ── Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', maxWidth: 1200, margin: '0 auto', minHeight: 'calc(100vh - 130px)' }}>

        {/* Job list sidebar */}
        <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', height: 'calc(100vh - 130px)', position: 'sticky', top: 60 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spinner />
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ivory3)', fontSize: 13 }}>
              No jobs match your filters.
            </div>
          ) : (
            <>
              {jobs.map((job, idx) => {
                const isSel   = selected?.id === job.id;
                const isSaved = savedSet.has(String(job.id));
                const logoColor = LOGO_COLORS[idx % LOGO_COLORS.length];
                const logo = (job.company || 'J').charAt(0).toUpperCase();

                return (
                  <div key={job.id} onClick={() => selectJob(job)} style={{
                    padding: '16px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                    background: isSel ? 'linear-gradient(90deg, rgba(232,160,32,.06), transparent)' : 'transparent',
                    borderLeft: `3px solid ${isSel ? 'var(--gold)' : 'transparent'}`,
                    transition: 'all .18s', position: 'relative',
                  }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--ink3)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <button onClick={e => { e.stopPropagation(); toggleSave(job.id); }} style={{
                      position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                      cursor: 'pointer', color: isSaved ? 'var(--gold)' : 'var(--ivory3)', fontSize: 16, transition: 'color .18s',
                    }}>{isSaved ? '★' : '☆'}</button>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 10, paddingRight: 24 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 8, background: `${logoColor}20`,
                        border: `1px solid ${logoColor}40`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, fontWeight: 700, color: logoColor,
                        flexShrink: 0, fontFamily: 'var(--f-mono)',
                      }}>{logo}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--ivory3)' }}>{job.company} · {job.location}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness} · {job.days_old}d</Badge>
                      <Badge color="gray">{job.domain}</Badge>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 12px', borderTop: '1px solid var(--line)' }}>
                  <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); loadJobs({ page: p }); }}
                    style={{ background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 4, padding: '5px 10px', color: 'var(--ivory2)', cursor: 'pointer', fontSize: 12 }}>←</button>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory3)', alignSelf: 'center' }}>{page} / {pages}</span>
                  <button disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); loadJobs({ page: p }); }}
                    style={{ background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 4, padding: '5px 10px', color: 'var(--ivory2)', cursor: 'pointer', fontSize: 12 }}>→</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Job detail */}
        <div style={{ overflowY: 'auto', height: 'calc(100vh - 130px)', padding: 24 }}>
          {detailLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : !selected ? (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--ivory3)' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: .3 }}>💼</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 20 }}>Select a job to view details</div>
            </div>
          ) : (
            <div style={{ animation: 'fadeUp .25s ease' }}>
              {/* Header card */}
              <div style={{
                background: 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.04))',
                border: '1px solid var(--gold-border)', borderRadius: 'var(--r)', padding: 28, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                      background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--f-mono)',
                    }}>{(selected.company || 'J').charAt(0).toUpperCase()}</div>
                    <div>
                      <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 24, letterSpacing: '-.5px', marginBottom: 4 }}>{selected.title}</h2>
                      <div style={{ color: 'var(--ivory2)', fontSize: 14 }}>{selected.company} · {selected.location}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleSave(selected.id)} style={{
                      background: savedSet.has(String(selected.id)) ? 'var(--gold-dim)' : 'transparent',
                      border: `1px solid ${savedSet.has(String(selected.id)) ? 'var(--gold-border)' : 'var(--line)'}`,
                      borderRadius: 'var(--r-sm)', padding: '9px 16px', fontSize: 13,
                      color: savedSet.has(String(selected.id)) ? 'var(--gold)' : 'var(--ivory2)',
                      cursor: 'pointer', fontFamily: 'var(--f-ui)', transition: 'all .18s',
                    }}>
                      {savedSet.has(String(selected.id)) ? '★ Saved' : '☆ Save'}
                    </button>
                    {appliedSet.has(String(selected.id)) ? (
                      <button style={{
                        background: 'var(--green-dim)', border: '1px solid rgba(34,200,122,.25)',
                        borderRadius: 'var(--r-sm)', padding: '9px 16px', fontSize: 13,
                        color: 'var(--green)', fontFamily: 'var(--f-ui)', cursor: 'default',
                      }}>✓ Applied</button>
                    ) : (
                      <Button onClick={() => user ? setApplyModal(true) : push('Sign in to apply', 'error')}>
                        Apply Now →
                      </Button>
                    )}
                    {selected.apply_url && (
                      <a href={selected.apply_url} target="_blank" rel="noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', padding: '9px 16px',
                        background: 'transparent', border: '1px solid var(--line)',
                        borderRadius: 'var(--r-sm)', color: 'var(--ivory2)', fontSize: 13,
                        textDecoration: 'none', fontFamily: 'var(--f-ui)',
                      }}>↗ Original Post</a>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge color={FRESHNESS_COLOR[selected.freshness]}>{selected.freshness} · {selected.days_old}d ago</Badge>
                  <Badge color="gold">{selected.domain}</Badge>
                  {selected.days_old > 60 && (
                    <Badge color="red">⚠ Posting may be closed</Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 24, marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>About the Role</div>
                  <p style={{ color: 'var(--ivory2)', fontSize: 14, lineHeight: 1.8 }}>{selected.description}</p>
                </div>
              )}

              {/* Skills */}
              {(selected.skills?.length > 0) && (
                <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 24 }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Required Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.skills.map(s => {
                      const userSkills = new Set((user?.skills || []).map(x => x.toLowerCase()));
                      return <SkillBadge key={s} skill={s} matched={userSkills.has(s.toLowerCase())} />;
                    })}
                  </div>
                  {user?.skills?.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>
                      ✓ = skills you already have
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      <Modal open={applyModal} onClose={() => setApplyModal(false)} title={`Apply — ${selected?.title}`} width={520}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 12, padding: 14, background: 'var(--ink3)', borderRadius: 'var(--r-sm)', marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, width: 38, height: 38, borderRadius: 8, background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold2)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
                {(selected.company || 'J').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selected.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ivory3)' }}>{selected.company} · {selected.location}</div>
              </div>
              <Badge color={FRESHNESS_COLOR[selected.freshness]} style={{ marginLeft: 'auto' }}>{selected.freshness}</Badge>
            </div>
            <Textarea label="Cover Letter (optional)" rows={5} value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              placeholder={`Dear ${selected.company} team,\n\nI'm excited to apply for the ${selected.title} position...`}
              style={{ marginBottom: 16 }} />
            {user?.cv_filename && (
              <div style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--f-mono)', marginBottom: 12 }}>
                ✓ Your CV will be attached: {user.cv_filename}
              </div>
            )}
            <Button full size="lg" loading={applying} onClick={handleApply}>Submit Application →</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
