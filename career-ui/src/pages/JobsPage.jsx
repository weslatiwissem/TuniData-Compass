// src/pages/JobsPage.jsx — Redesigned with professional dashboard card style
// FIXED: jobs sorted fresh→aging→expired, supports initialJobId for direct navigation
import { useState, useEffect, useCallback, useRef } from 'react';
import { jobsAPI, userAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ApplyModal from '../components/ApplyModal';

const FRESHNESS_ORDER = { fresh: 0, aging: 1, expired: 2, unknown: 3 };

const FRESHNESS = {
  fresh:   { bg: '#EAF3DE', color: '#3B6D11', dot: '#639922', label: 'Fresh' },
  aging:   { bg: '#FAEEDA', color: '#854F0B', dot: '#BA7517', label: 'Aging' },
  expired: { bg: '#FCEBEB', color: '#A32D2D', dot: '#E24B4A', label: 'Expired' },
  unknown: { bg: '#F1EFE8', color: '#5F5E5A', dot: '#888780', label: 'Unknown' },
};

const LOGO_PALETTE = [
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#EAF3DE', color: '#3B6D11' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#FBEAF0', color: '#993556' },
  { bg: '#FAECE7', color: '#993C1D' },
];

function FreshnessBadge({ freshness, daysOld }) {
  const f = FRESHNESS[freshness] || FRESHNESS.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
      background: f.bg, color: f.color, fontFamily: 'var(--f-mono, monospace)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.dot, flexShrink: 0 }} />
      {f.label} · {daysOld}d
    </span>
  );
}

function DomainBadge({ domain }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
      background: '#EEEDFE', color: '#534AB7', fontFamily: 'var(--f-mono, monospace)',
    }}>{domain}</span>
  );
}

function SkillPill({ skill, matched }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 100, fontSize: 11,
      background: matched ? '#EAF3DE' : '#F1EFE8',
      color: matched ? '#3B6D11' : '#5F5E5A',
      border: `1px solid ${matched ? '#C0DD97' : '#D3D1C7'}`,
      fontFamily: 'var(--f-mono, monospace)',
    }}>
      {matched && <span style={{ fontSize: 10 }}>✓</span>}
      {skill}
    </span>
  );
}

function LogoAvatar({ name, idx }) {
  const p = LOGO_PALETTE[idx % LOGO_PALETTE.length];
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: p.bg, border: `1px solid ${p.color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 700, color: p.color,
      fontFamily: 'var(--f-mono, monospace)', letterSpacing: '-0.5px',
    }}>{(name || 'J').charAt(0).toUpperCase()}</div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '2.5px solid #E6F1FB', borderTop: '2.5px solid #185FA5',
      animation: 'spin .7s linear infinite',
    }} />
  );
}

// Sort jobs: fresh first, then aging, then expired, then unknown
function sortByFreshness(jobs) {
  return [...jobs].sort((a, b) => {
    const fa = FRESHNESS_ORDER[(a.freshness || '').toLowerCase()] ?? 3;
    const fb = FRESHNESS_ORDER[(b.freshness || '').toLowerCase()] ?? 3;
    if (fa !== fb) return fa - fb;
    return (a.days_old ?? 0) - (b.days_old ?? 0); // newer = smaller days_old = first
  });
}

export default function JobsPage({ initialSearch = '', initialDomain = '', initialJobId = null }) {
  const { user, updateUser } = useAuth();
  const { push } = useToast();

  const [search, setSearch] = useState(initialSearch);
  const [filterDomain, setFilterDomain] = useState(initialDomain);
  const [filterFresh, setFilterFresh] = useState('');
  const [page, setPage] = useState(1);

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [savedSet, setSavedSet] = useState(new Set());
  const [appliedSet, setAppliedSet] = useState(new Set());
  const [applyModal, setApplyModal] = useState(false);

  // Track whether we've done the initial load so we can auto-select initialJobId
  const didInitialLoad = useRef(false);

  const searchTimeout = useRef(null);

  useEffect(() => {
    if (user) {
      setSavedSet(new Set((user.saved_jobs || []).map(String)));
      setAppliedSet(new Set((user.applied_jobs || []).map(String)));
    }
  }, [user]);

  const loadJobs = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const res = await jobsAPI.list({
        search: opts.search ?? search,
        domain: opts.domain ?? filterDomain,
        freshness: opts.freshness ?? filterFresh,
        page: opts.page ?? page,
        perPage: 20,
      });
      console.log('freshness values:', res.jobs.slice(0, 5).map(j => j.freshness));

      const sorted = sortByFreshness(res.jobs);
      setJobs(sorted);
      setTotal(res.total);
      setPages(res.pages);
      setDomains(res.domains);

      // On first load, if initialJobId provided, find and select that job;
      // otherwise select the first job in the sorted list.
      if (!didInitialLoad.current) {
        didInitialLoad.current = true;
        if (initialJobId !== null) {
          const target = sorted.find(j => String(j.id) === String(initialJobId));
          if (target) {
            selectJob(target);
          } else if (sorted.length) {
            setSelected(sorted[0]);
          }
        } else if (sorted.length && !selected) {
          setSelected(sorted[0]);
        }
      }
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterDomain, filterFresh, page]);

  useEffect(() => { loadJobs(); }, []);

  // If initialJobId changes after mount (e.g. navigating from dashboard to a specific job)
  useEffect(() => {
    if (initialJobId !== null && jobs.length > 0) {
      const target = jobs.find(j => String(j.id) === String(initialJobId));
      if (target) selectJob(target);
    }
  }, [initialJobId]);

  const handleSearch = val => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadJobs({ search: val, page: 1 }), 350);
  };

  const handleFilter = (key, val) => {
    const updates = { page: 1 };
    if (key === 'domain') { setFilterDomain(val); updates.domain = val; }
    if (key === 'freshness') { setFilterFresh(val); updates.freshness = val; }
    setPage(1);
    loadJobs(updates);
  };

  const clearFilters = () => {
    setSearch(''); setFilterDomain(''); setFilterFresh(''); setPage(1);
    loadJobs({ search: '', domain: '', freshness: '', page: 1 });
  };

  const selectJob = async job => {
    setSelected(job);
    setDetailLoading(true);
    try {
      const full = await jobsAPI.get(job.id);
      setSelected(full);
    } catch {}
    setDetailLoading(false);
  };

  const toggleSave = async jobId => {
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
        push('Job saved!', 'success');
      }
    } catch (err) { push(err.message, 'error'); }
  };

  const handleApplied = res => {
    if (res?.applied_jobs) {
      setAppliedSet(new Set(res.applied_jobs.map(String)));
      updateUser({ applied_jobs: res.applied_jobs });
    }
    setApplyModal(false);
  };

  const hasFilters = search || filterDomain || filterFresh;

  // ── Section dividers in the list ──
  const groupedJobs = (() => {
    const groups = { fresh: [], aging: [], expired: [], unknown: [] };
    jobs.forEach(j => {
      const freshness = (j.freshness || 'unknown').toLowerCase();
const key = groups[freshness] ? freshness : 'unknown';
      groups[key].push(j);
    });
    return groups;
  })();

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F2', animation: 'fadeUp .3s ease' }}>

      {/* ── Top search bar ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E8E6DF',
        padding: '14px 24px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {/* Search input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
              width="15" height="15" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" stroke="#2C2C2A" strokeWidth="1.8" />
              <path d="M20 20l-3-3" stroke="#2C2C2A" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search jobs, skills, or companies…"
              style={{
                width: '100%', padding: '9px 14px 9px 38px',
                background: '#F7F6F2', border: '1px solid #E8E6DF',
                borderRadius: 8, fontSize: 13, color: '#2C2C2A',
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = '#185FA5'}
              onBlur={e => e.target.style.borderColor = '#E8E6DF'}
            />
          </div>

          {/* Domain filter */}
          <select
            value={filterDomain}
            onChange={e => handleFilter('domain', e.target.value)}
            style={{
              padding: '9px 12px', background: '#F7F6F2',
              border: '1px solid #E8E6DF', borderRadius: 8,
              fontSize: 13, color: filterDomain ? '#2C2C2A' : '#888780',
              outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <option value="">All Domains</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Freshness filter */}
          <select
            value={filterFresh}
            onChange={e => handleFilter('freshness', e.target.value)}
            style={{
              padding: '9px 12px', background: '#F7F6F2',
              border: '1px solid #E8E6DF', borderRadius: 8,
              fontSize: 13, color: filterFresh ? '#2C2C2A' : '#888780',
              outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <option value="">All Freshness</option>
            <option value="fresh">Fresh (≤30d)</option>
            <option value="aging">Recent (≤60d)</option>
            <option value="expired">Expired</option>
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '9px 14px', background: '#FCEBEB',
                border: '1px solid #F7C1C1', borderRadius: 8,
                fontSize: 12, color: '#A32D2D', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background .15s',
              }}
            >✕ Clear filters</button>
          )}

          <span style={{
            marginLeft: 'auto', fontSize: 12, color: '#888780',
            fontFamily: 'var(--f-mono, monospace)', whiteSpace: 'nowrap',
          }}>
            {total.toLocaleString()} jobs
          </span>
        </div>
      </div>

      {/* ── Layout grid ── */}
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '360px 1fr',
        height: 'calc(100vh - 117px)',
      }}>

        {/* ── Left: Job list ── */}
        <div style={{
          background: '#fff', borderRight: '1px solid #E8E6DF',
          overflowY: 'auto', height: '100%',
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <Spinner />
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#888780', fontSize: 13 }}>
              No jobs match your filters.
            </div>
          ) : (
            <>
              {/* Render jobs grouped by freshness with section headers */}
              {['fresh', 'aging', 'expired', 'unknown'].map(group => {
                const groupJobs = groupedJobs[group];
                if (!groupJobs || groupJobs.length === 0) return null;
                const f = FRESHNESS[group];
                const groupLabels = {
                  fresh: `Fresh — posted within 30 days (${groupJobs.length})`,
                  aging: `Recent — posted within 60 days (${groupJobs.length})`,
                  expired: `Older — over 60 days ago (${groupJobs.length})`,
                  unknown: `Unknown date (${groupJobs.length})`,
                };
                return (
                  <div key={group}>
                    {/* Section divider */}
                    <div style={{
                      padding: '8px 16px 6px',
                      background: f.bg,
                      borderBottom: `1px solid ${f.dot}30`,
                      borderTop: group !== 'fresh' ? '1px solid #E8E6DF' : undefined,
                      display: 'flex', alignItems: 'center', gap: 6,
                      position: 'sticky', top: 0, zIndex: 2,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.dot, flexShrink: 0 }} />
                      <span style={{
                        fontFamily: 'var(--f-mono, monospace)', fontSize: 10,
                        fontWeight: 600, color: f.color, letterSpacing: '0.5px',
                      }}>
                        {groupLabels[group]}
                      </span>
                    </div>

                    {groupJobs.map((job, idx) => {
                      const isSel = selected?.id === job.id;
                      const isSaved = savedSet.has(String(job.id));
                      // Use global idx for palette
                      const globalIdx = jobs.indexOf(job);
                      return (
                        <div
                          key={job.id}
                          onClick={() => selectJob(job)}
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #F1EFE8',
                            borderLeft: `3px solid ${isSel ? '#185FA5' : 'transparent'}`,
                            background: isSel ? '#F0F5FC' : 'transparent',
                            cursor: 'pointer', transition: 'all .15s', position: 'relative',
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#FAFAF8'; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {/* Save star */}
                          <button
                            onClick={e => { e.stopPropagation(); toggleSave(job.id); }}
                            style={{
                              position: 'absolute', top: 12, right: 12,
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 15, color: isSaved ? '#BA7517' : '#B4B2A9',
                              transition: 'color .15s', padding: 2,
                            }}
                          >{isSaved ? '★' : '☆'}</button>

                          <div style={{ display: 'flex', gap: 10, marginBottom: 8, paddingRight: 22 }}>
                            <LogoAvatar name={job.company} idx={globalIdx} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: 13, fontWeight: 600, color: '#2C2C2A',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                marginBottom: 2,
                              }}>{job.title}</div>
                              <div style={{ fontSize: 11, color: '#888780' }}>
                                {job.company} · {job.location}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <FreshnessBadge freshness={job.freshness} daysOld={job.days_old} />
                            <DomainBadge domain={job.domain} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Pagination */}
              {pages > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  gap: 8, padding: '14px 12px', borderTop: '1px solid #F1EFE8',
                }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => { const p = page - 1; setPage(p); loadJobs({ page: p }); }}
                    style={{
                      width: 30, height: 30, borderRadius: 6,
                      background: '#F7F6F2', border: '1px solid #E8E6DF',
                      color: '#2C2C2A', cursor: 'pointer', fontSize: 13,
                      opacity: page <= 1 ? 0.4 : 1,
                    }}
                  >←</button>
                  <span style={{ fontSize: 11, color: '#888780', fontFamily: 'var(--f-mono, monospace)' }}>
                    {page} / {pages}
                  </span>
                  <button
                    disabled={page >= pages}
                    onClick={() => { const p = page + 1; setPage(p); loadJobs({ page: p }); }}
                    style={{
                      width: 30, height: 30, borderRadius: 6,
                      background: '#F7F6F2', border: '1px solid #E8E6DF',
                      color: '#2C2C2A', cursor: 'pointer', fontSize: 13,
                      opacity: page >= pages ? 0.4 : 1,
                    }}
                  >→</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: Job detail ── */}
        <div style={{ overflowY: 'auto', height: '100%', padding: 24, background: '#F7F6F2' }}>
          {detailLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : !selected ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', color: '#B4B2A9',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>💼</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#888780' }}>Select a job to view details</div>
            </div>
          ) : (
            <div style={{ animation: 'fadeUp .2s ease', maxWidth: 780 }}>

              {/* ── Header card ── */}
              <div style={{
                background: '#fff', border: '1px solid #E8E6DF',
                borderRadius: 14, padding: 24, marginBottom: 16,
                borderTop: '3px solid #185FA5',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap',
                }}>
                  {/* Title + company */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                      background: '#E6F1FB', border: '1px solid #B5D4F430',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 700, color: '#185FA5',
                      fontFamily: 'var(--f-mono, monospace)',
                    }}>{(selected.company || 'J').charAt(0).toUpperCase()}</div>
                    <div>
                      <h2 style={{
                        fontSize: 20, fontWeight: 700, color: '#2C2C2A',
                        marginBottom: 4, lineHeight: 1.2,
                      }}>{selected.title}</h2>
                      <div style={{ fontSize: 13, color: '#888780' }}>
                        {selected.company} · {selected.location}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      onClick={() => toggleSave(selected.id)}
                      style={{
                        padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                        background: savedSet.has(String(selected.id)) ? '#FAEEDA' : '#F7F6F2',
                        border: `1px solid ${savedSet.has(String(selected.id)) ? '#FAC77550' : '#E8E6DF'}`,
                        color: savedSet.has(String(selected.id)) ? '#854F0B' : '#5F5E5A',
                        fontFamily: 'inherit', fontWeight: 500, transition: 'all .15s',
                      }}
                    >{savedSet.has(String(selected.id)) ? '★ Saved' : '☆ Save'}</button>

                    {appliedSet.has(String(selected.id)) ? (
                      <span style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 12,
                        background: '#EAF3DE', color: '#3B6D11',
                        border: '1px solid #C0DD9750', fontWeight: 600,
                      }}>✓ Applied</span>
                    ) : (
                      <button
                        onClick={() => user ? setApplyModal(true) : push('Sign in to apply', 'error')}
                        style={{
                          padding: '8px 18px', borderRadius: 8, fontSize: 13,
                          background: '#185FA5', border: 'none',
                          color: '#fff', cursor: 'pointer', fontWeight: 600,
                          fontFamily: 'inherit', transition: 'background .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#0C447C'}
                        onMouseLeave={e => e.currentTarget.style.background = '#185FA5'}
                      >Apply Now →</button>
                    )}

                    {selected.apply_url && (
                      <a
                        href={selected.apply_url} target="_blank" rel="noreferrer"
                        style={{
                          padding: '8px 14px', borderRadius: 8, fontSize: 12,
                          background: '#F7F6F2', border: '1px solid #E8E6DF',
                          color: '#5F5E5A', textDecoration: 'none',
                          fontFamily: 'inherit', fontWeight: 500,
                        }}
                      >↗ Original Post</a>
                    )}
                  </div>
                </div>

                {/* Badges row */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <FreshnessBadge freshness={selected.freshness} daysOld={selected.days_old} />
                  <DomainBadge domain={selected.domain} />
                  {selected.days_old > 60 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 100, fontSize: 11,
                      background: '#FCEBEB', color: '#A32D2D',
                      fontFamily: 'var(--f-mono, monospace)',
                    }}>⚠ Posting may be closed</span>
                  )}
                </div>
              </div>

              {/* ── About the Role ── */}
              <div style={{
                background: '#fff', border: '1px solid #E8E6DF',
                borderRadius: 14, padding: 24, marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '1.5px',
                  textTransform: 'uppercase', color: '#185FA5',
                  fontFamily: 'var(--f-mono, monospace)', marginBottom: 14,
                }}>About the Role</div>

                {(!selected.description || selected.description.trim() === '' ||
                  selected.description === 'None' || selected.description === 'nan') ? (
                  <p style={{ color: '#888780', fontSize: 13, fontStyle: 'italic' }}>
                    No description available for this position.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selected.description
                      .replace(/\r\n/g, '\n')
                      .split(/\n{2,}/)
                      .map(p => p.trim())
                      .filter(p => p.length > 0)
                      .map((para, i) => (
                        <p key={i} style={{
                          color: '#444441', fontSize: 14, lineHeight: 1.8,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                        }}>{para}</p>
                      ))}
                  </div>
                )}
              </div>

              {/* ── Required Skills ── */}
              {selected.skills?.length > 0 && (
                <div style={{
                  background: '#fff', border: '1px solid #E8E6DF',
                  borderRadius: 14, padding: 24,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '1.5px',
                    textTransform: 'uppercase', color: '#185FA5',
                    fontFamily: 'var(--f-mono, monospace)', marginBottom: 14,
                  }}>Required Skills</div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.skills.map(s => {
                      const userSkills = new Set((user?.skills || []).map(x => x.toLowerCase()));
                      return <SkillPill key={s} skill={s} matched={userSkills.has(s.toLowerCase())} />;
                    })}
                  </div>

                  {user?.skills?.length > 0 && (
                    <div style={{
                      marginTop: 12, fontSize: 11, color: '#888780',
                      fontFamily: 'var(--f-mono, monospace)',
                    }}>✓ = skills you already have</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Apply modal */}
      <ApplyModal
        open={applyModal}
        onClose={() => setApplyModal(false)}
        job={selected}
        user={user}
        onApplied={handleApplied}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}