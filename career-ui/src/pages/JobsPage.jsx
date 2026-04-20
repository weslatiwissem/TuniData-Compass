// src/pages/JobsPage.jsx
import { useState, useEffect } from 'react';
import { userAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Spinner, Modal, Input, Textarea } from '../components/ui';

// ── Static job data (mirrors backend CSV; swap for API call if exposing /jobs endpoint) ──
const STATIC_JOBS = [
  { id: 1, title: 'Senior Data Engineer', company: 'Vermeg', domain: 'Data Engineering', location: 'Tunis, TN', type: 'Full-time', days_old: 8, freshness: 'fresh', score: .91, job_match: .88, salary: '4,500–6,000 DT', logo: 'V', experience: 'Senior (5+ yrs)', desc: 'Architect and maintain large-scale data pipelines using Apache Spark and Kafka. Work closely with ML engineers to productionise models, and mentor junior engineers within a fast-growing data platform team.', requirements: ['5+ years data engineering', 'Python, SQL, Apache Spark', 'Kafka or similar streaming', 'Cloud: AWS or Azure', 'Data warehouse design'], skills: ['python', 'sql', 'apache spark', 'kafka', 'airflow', 'postgresql', 'dbt', 'aws'], matched_skills: ['python', 'sql'], skill_gaps: ['kafka', 'airflow'] },
  { id: 2, title: 'React Frontend Developer', company: 'Telnet', domain: 'Frontend Dev', location: 'Sfax, TN', type: 'Hybrid', days_old: 14, freshness: 'fresh', score: .87, job_match: .85, salary: '2,800–3,800 DT', logo: 'T', experience: 'Mid (3–5 yrs)', desc: 'Build next-generation web applications for enterprise clients across MENA. Work with a modern React/TypeScript stack delivering pixel-perfect, accessible UIs.', requirements: ['3+ years React', 'TypeScript proficiency', 'CSS / Tailwind', 'REST API integration', 'Git workflow'], skills: ['react', 'javascript', 'typescript', 'html', 'css', 'graphql', 'jest'], matched_skills: ['react', 'javascript'], skill_gaps: ['graphql'] },
  { id: 3, title: 'ML Engineer', company: 'InstaDeep', domain: 'ML / AI', location: 'Remote', type: 'Remote', days_old: 5, freshness: 'fresh', score: .93, job_match: .91, salary: '6,000–9,000 DT', logo: 'I', experience: 'Senior (5+ yrs)', desc: 'Advance cutting-edge research into production AI systems. Work on reinforcement learning, protein folding, and logistics optimisation alongside world-class researchers.', requirements: ['MSc/PhD in CS or related', 'PyTorch or JAX', 'Distributed training', 'MLOps experience', 'Research publications a plus'], skills: ['python', 'pytorch', 'tensorflow', 'jax', 'docker', 'kubernetes', 'mlops'], matched_skills: ['python', 'pytorch'], skill_gaps: ['jax', 'kubernetes'] },
  { id: 4, title: 'DevOps Engineer', company: 'Sofrecom', domain: 'DevOps', location: 'Tunis, TN', type: 'Full-time', days_old: 22, freshness: 'fresh', score: .79, job_match: .76, salary: '3,500–5,000 DT', logo: 'S', experience: 'Mid (3–5 yrs)', desc: 'Own CI/CD pipelines, cloud infrastructure as code, and Kubernetes cluster operations for critical telecom systems at Sofrecom Tunisia.', requirements: ['Docker & Kubernetes', 'CI/CD (Jenkins/GitLab)', 'Terraform or Ansible', 'Linux administration', 'Monitoring (Prometheus/Grafana)'], skills: ['docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'linux', 'aws', 'gcp'], matched_skills: ['docker', 'linux'], skill_gaps: ['terraform', 'helm'] },
  { id: 5, title: 'Backend Engineer – Node.js', company: 'Expensya', domain: 'Backend Dev', location: 'Tunis, TN', type: 'Hybrid', days_old: 35, freshness: 'aging', score: .82, job_match: .80, salary: '3,200–4,500 DT', logo: 'E', experience: 'Mid (3–5 yrs)', desc: 'Scale the SaaS expense management platform. Own backend microservices, design RESTful APIs consumed by 1M+ users, and optimise database performance.', requirements: ['Node.js / Express', 'PostgreSQL & Redis', 'REST API design', 'Microservices architecture', 'Cloud deployment'], skills: ['nodejs', 'express', 'postgresql', 'redis', 'docker', 'typescript', 'graphql'], matched_skills: ['nodejs', 'postgresql'], skill_gaps: ['microservices'] },
  { id: 6, title: 'Data Scientist', company: 'BIAT', domain: 'ML / AI', location: 'Tunis, TN', type: 'Full-time', days_old: 18, freshness: 'fresh', score: .85, job_match: .83, salary: '3,800–5,200 DT', logo: 'B', experience: 'Mid (3–5 yrs)', desc: 'Build predictive models for credit scoring, fraud detection, and customer churn using modern ML frameworks in the banking sector.', requirements: ['Python data stack', 'Statistical modelling', 'SQL for data extraction', 'Model deployment', 'Financial domain a plus'], skills: ['python', 'scikit-learn', 'pandas', 'numpy', 'sql', 'tableau', 'xgboost'], matched_skills: ['python', 'pandas', 'sql'], skill_gaps: ['xgboost', 'tableau'] },
  { id: 7, title: 'UI/UX Designer', company: 'Axe Finance', domain: 'Design', location: 'Ariana, TN', type: 'Full-time', days_old: 10, freshness: 'fresh', score: .76, job_match: .74, salary: '2,500–3,500 DT', logo: 'A', experience: 'Junior (1–3 yrs)', desc: 'Create intuitive financial application interfaces. Run user research, build high-fidelity Figma prototypes, and collaborate with frontend teams.', requirements: ['Figma proficiency', 'User research', 'Design systems', 'Responsive design', 'B2B SaaS experience'], skills: ['figma', 'sketch', 'prototyping', 'user research', 'css', 'photoshop'], matched_skills: ['figma'], skill_gaps: ['motion design'] },
  { id: 8, title: 'Cloud Architect', company: 'Ooredoo', domain: 'DevOps', location: 'Tunis, TN', type: 'Full-time', days_old: 65, freshness: 'expired', score: .74, job_match: .72, salary: '6,500–9,000 DT', logo: 'O', experience: 'Lead (8+ yrs)', desc: 'Design multi-cloud strategies, drive cost optimisation, and lead cloud migration projects across North Africa at a leading telecom.', requirements: ['AWS/Azure/GCP certifications', 'Infrastructure as Code', 'FinOps practices', 'Security architecture', '5+ years cloud'], skills: ['aws', 'azure', 'gcp', 'terraform', 'kubernetes', 'docker'], matched_skills: ['aws'], skill_gaps: ['cost optimisation'] },
  { id: 9, title: 'Full Stack Developer', company: 'Inetum', domain: 'Frontend Dev', location: 'Tunis, TN', type: 'Full-time', days_old: 3, freshness: 'fresh', score: .84, job_match: .82, salary: '3,000–4,200 DT', logo: 'N', experience: 'Mid (3–5 yrs)', desc: 'Work on a wide variety of client projects across web and mobile, from banking portals to logistics dashboards. Full-stack with React + Node.', requirements: ['React + Node.js', 'PostgreSQL or MongoDB', 'REST API design', 'Agile/Scrum', 'Git'], skills: ['react', 'nodejs', 'javascript', 'postgresql', 'mongodb', 'docker', 'git'], matched_skills: ['react', 'nodejs', 'javascript'], skill_gaps: ['mongodb'] },
  { id: 10, title: 'Cybersecurity Analyst', company: 'Tunisie Telecom', domain: 'Cybersecurity', location: 'Tunis, TN', type: 'Full-time', days_old: 12, freshness: 'fresh', score: .71, job_match: .69, salary: '3,500–5,000 DT', logo: 'TT', experience: 'Mid (3–5 yrs)', desc: 'Protect critical national telecom infrastructure. Conduct penetration testing, incident response, and security audits for one of Tunisia\'s largest operators.', requirements: ['SIEM tools', 'Penetration testing', 'Network security', 'CISSP / CEH a plus', 'Linux administration'], skills: ['linux', 'python', 'wireshark', 'nmap', 'splunk', 'security'], matched_skills: ['linux', 'python'], skill_gaps: ['splunk', 'nmap'] },
];

const FRESHNESS_COLOR = { fresh: 'green', aging: 'gold', expired: 'red', unknown: 'gray' };
const LOGO_COLORS = ['#E8A020', '#22C87A', '#3B82F6', '#2DD4BF', '#a78bfa', '#fb923c', '#f472b6', '#f87171'];

export default function JobsPage({ initialSearch = '', initialDomain = '' }) {
  const { user, updateUser } = useAuth();
  const { push } = useToast();

  const [search, setSearch] = useState(initialSearch);
  const [filterDomain, setFilterDomain] = useState(initialDomain);
  const [filterType, setFilterType] = useState('');
  const [filterExp, setFilterExp] = useState('');
  const [filterFresh, setFilterFresh] = useState('');
  const [selectedJob, setSelectedJob] = useState(STATIC_JOBS[0]);
  const [applyModal, setApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [savedSet, setSavedSet] = useState(new Set(user?.saved_jobs || []));
  const [appliedSet, setAppliedSet] = useState(new Set(user?.applied_jobs || []));

  useEffect(() => {
    if (user) {
      setSavedSet(new Set(user.saved_jobs));
      setAppliedSet(new Set(user.applied_jobs));
    }
  }, [user]);

  const filtered = STATIC_JOBS.filter(j => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.company.toLowerCase().includes(search.toLowerCase()) && !j.skills.join(' ').includes(search.toLowerCase())) return false;
    if (filterDomain && j.domain !== filterDomain) return false;
    if (filterType && j.type !== filterType) return false;
    if (filterExp && j.experience !== filterExp) return false;
    if (filterFresh && j.freshness !== filterFresh) return false;
    return true;
  });

  const toggleSave = async (jobId) => {
    if (!user) { push('Sign in to save jobs', 'error'); return; }
    const isSaved = savedSet.has(jobId);
    try {
      if (isSaved) {
        await userAPI.unsaveJob(jobId);
        setSavedSet(prev => { const s = new Set(prev); s.delete(jobId); return s; });
        push('Job removed from saved', 'info');
      } else {
        await userAPI.saveJob(jobId);
        setSavedSet(prev => new Set([...prev, jobId]));
        push('Job saved! ⭐', 'success');
      }
    } catch (err) { push(err.message, 'error'); }
  };

  const handleApply = async () => {
    if (!user) { push('Sign in to apply', 'error'); return; }
    setApplying(true);
    try {
      await userAPI.applyJob(selectedJob.id, coverLetter);
      setAppliedSet(prev => new Set([...prev, selectedJob.id]));
      updateUser({ applied_jobs: [...(user.applied_jobs || []), selectedJob.id] });
      setApplyModal(false);
      setCoverLetter('');
      push(`Application sent to ${selectedJob.company}! 🚀`, 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setApplying(false); }
  };

  const domains = [...new Set(STATIC_JOBS.map(j => j.domain))];
  const types = [...new Set(STATIC_JOBS.map(j => j.type))];
  const experiences = [...new Set(STATIC_JOBS.map(j => j.experience))];
  const fmt = n => `${(n * 100).toFixed(0)}%`;

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>
      {/* Search bar */}
      <div style={{ background: 'var(--ink2)', borderBottom: '1px solid var(--line)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="var(--ivory3)" strokeWidth="1.5" /><path d="M20 20l-3-3" stroke="var(--ivory3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Job title, skill, or company..."
              style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px 10px 40px', color: 'var(--ivory)', fontSize: 14, outline: 'none', fontFamily: 'var(--f-ui)' }}
            />
          </div>
          {[
            { value: filterDomain, setter: setFilterDomain, placeholder: 'All Domains', options: domains },
            { value: filterType, setter: setFilterType, placeholder: 'All Types', options: types },
            { value: filterExp, setter: setFilterExp, placeholder: 'Experience', options: experiences },
            { value: filterFresh, setter: setFilterFresh, placeholder: 'Freshness', options: [['fresh', 'Fresh (≤30d)'], ['aging', 'Recent (≤60d)'], ['expired', 'Expired']] },
          ].map((f, i) => (
            <select key={i} value={f.value} onChange={e => f.setter(e.target.value)} style={{
              background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
              padding: '10px 12px', color: f.value ? 'var(--ivory)' : 'var(--ivory3)',
              fontSize: 13, outline: 'none', fontFamily: 'var(--f-ui)', appearance: 'none', cursor: 'pointer',
            }}>
              <option value="">{f.placeholder}</option>
              {f.options.map(o => Array.isArray(o)
                ? <option key={o[0]} value={o[0]}>{o[1]}</option>
                : <option key={o} value={o}>{o}</option>
              )}
            </select>
          ))}
          {(search || filterDomain || filterType || filterExp || filterFresh) && (
            <button onClick={() => { setSearch(''); setFilterDomain(''); setFilterType(''); setFilterExp(''); setFilterFresh(''); }} style={{ background: 'var(--red-dim)', border: '1px solid rgba(240,96,96,.25)', borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--f-mono)' }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Layout: sidebar list + main detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', maxWidth: 1200, margin: '0 auto', minHeight: 'calc(100vh - 130px)' }}>

        {/* Job list */}
        <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', height: 'calc(100vh - 130px)', position: 'sticky', top: 60 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ivory3)', letterSpacing: 1 }}>
            {filtered.length} JOBS FOUND
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ivory3)', fontSize: 13 }}>No jobs match your filters.</div>
          ) : (
            filtered.map((job, idx) => {
              const isSel = selectedJob?.id === job.id;
              const isSaved = savedSet.has(job.id);
              const logoColor = LOGO_COLORS[idx % LOGO_COLORS.length];
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    padding: '16px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                    background: isSel ? 'linear-gradient(90deg, rgba(232,160,32,.06), transparent)' : 'transparent',
                    borderLeft: `3px solid ${isSel ? 'var(--gold)' : 'transparent'}`,
                    transition: 'all .18s', position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--ink3)'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleSave(job.id); }}
                    style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: isSaved ? 'var(--gold)' : 'var(--ivory3)', fontSize: 16, transition: 'color .18s' }}
                  >
                    {isSaved ? '★' : '☆'}
                  </button>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10, paddingRight: 24 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: `${logoColor}20`, border: `1px solid ${logoColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: logoColor, flexShrink: 0, fontFamily: 'var(--f-mono)' }}>{job.logo}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ivory3)' }}>{job.company} · {job.location}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge color={FRESHNESS_COLOR[job.freshness]}>{job.freshness} · {job.days_old}d</Badge>
                    <Badge color="gray">{job.type}</Badge>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gold)' }}>{fmt(job.score)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Job detail */}
        <div style={{ overflowY: 'auto', height: 'calc(100vh - 130px)', padding: 24 }}>
          {!selectedJob ? (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--ivory3)' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: .3 }}>💼</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 20 }}>Select a job</div>
            </div>
          ) : (
            <div style={{ animation: 'fadeUp .25s ease' }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, var(--ink2), rgba(232,160,32,.04))',
                border: '1px solid var(--gold-border)', borderRadius: 'var(--r)',
                padding: 28, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                      background: `${LOGO_COLORS[0]}20`, border: `1px solid ${LOGO_COLORS[0]}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: LOGO_COLORS[0], fontFamily: 'var(--f-mono)',
                    }}>{selectedJob.logo}</div>
                    <div>
                      <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 24, letterSpacing: '-.5px', marginBottom: 4 }}>{selectedJob.title}</h2>
                      <div style={{ color: 'var(--ivory2)', fontSize: 14 }}>{selectedJob.company} · {selectedJob.location}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleSave(selectedJob.id)} style={{
                      background: savedSet.has(selectedJob.id) ? 'var(--gold-dim)' : 'transparent',
                      border: `1px solid ${savedSet.has(selectedJob.id) ? 'var(--gold-border)' : 'var(--line)'}`,
                      borderRadius: 'var(--r-sm)', padding: '9px 16px', fontSize: 13,
                      color: savedSet.has(selectedJob.id) ? 'var(--gold)' : 'var(--ivory2)',
                      cursor: 'pointer', fontFamily: 'var(--f-ui)', transition: 'all .18s',
                    }}>
                      {savedSet.has(selectedJob.id) ? '★ Saved' : '☆ Save'}
                    </button>
                    {appliedSet.has(selectedJob.id) ? (
                      <button style={{ background: 'var(--green-dim)', border: '1px solid rgba(34,200,122,.25)', borderRadius: 'var(--r-sm)', padding: '9px 16px', fontSize: 13, color: 'var(--green)', fontFamily: 'var(--f-ui)', cursor: 'default' }}>
                        ✓ Applied
                      </button>
                    ) : (
                      <Button onClick={() => user ? setApplyModal(true) : push('Sign in to apply', 'error')}>Apply Now →</Button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge color={FRESHNESS_COLOR[selectedJob.freshness]}>{selectedJob.freshness} · {selectedJob.days_old}d ago</Badge>
                  <Badge color="gold">{selectedJob.domain}</Badge>
                  <Badge color="gray">{selectedJob.type}</Badge>
                  <Badge color="teal">💰 {selectedJob.salary}/mo</Badge>
                  <Badge color="gray">{selectedJob.experience}</Badge>
                </div>
              </div>

              {/* Match scores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[['Overall Match', fmt(selectedJob.score), 'var(--gold)'], ['Skill Match', fmt(selectedJob.job_match), 'var(--green)'], ['Matched Skills', selectedJob.matched_skills.length, 'var(--blue)']].map(([label, val, color]) => (
                  <div key={label} style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, color, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ivory3)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* About */}
              <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 24, marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>About the Role</div>
                <p style={{ color: 'var(--ivory2)', fontSize: 14, lineHeight: 1.8 }}>{selectedJob.desc}</p>
              </div>

              {/* Requirements */}
              <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 24, marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Requirements</div>
                <ul style={{ paddingLeft: 16, color: 'var(--ivory2)', fontSize: 14, lineHeight: 2.2 }}>
                  {selectedJob.requirements.map(r => <li key={r}>{r}</li>)}
                </ul>
              </div>

              {/* Skills */}
              <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 24, marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Skills Required</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedJob.skills.map(s => (
                    <span key={s} style={{
                      padding: '4px 12px', borderRadius: 100, fontSize: 12, fontFamily: 'var(--f-mono)',
                      background: selectedJob.matched_skills.includes(s) ? 'var(--green-dim)' : 'var(--ink3)',
                      border: `1px solid ${selectedJob.matched_skills.includes(s) ? 'rgba(34,200,122,.2)' : 'var(--line)'}`,
                      color: selectedJob.matched_skills.includes(s) ? 'var(--green)' : 'var(--ivory2)',
                    }}>
                      {selectedJob.matched_skills.includes(s) ? '✓ ' : ''}{s}
                    </span>
                  ))}
                </div>
                {selectedJob.skill_gaps.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)' }}>
                    Skills to learn: {selectedJob.skill_gaps.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      <Modal open={applyModal} onClose={() => setApplyModal(false)} title={`Apply — ${selectedJob?.title}`} width={520}>
        {selectedJob && (
          <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px', background: 'var(--ink3)', borderRadius: 'var(--r-sm)', marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, width: 38, height: 38, borderRadius: 8, background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold2)', fontFamily: 'var(--f-mono)' }}>{selectedJob.logo}</div>
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{selectedJob.title}</div><div style={{ fontSize: 12, color: 'var(--ivory3)' }}>{selectedJob.company} · {selectedJob.salary}/mo</div></div>
              <Badge color={FRESHNESS_COLOR[selectedJob.freshness]} style={{ marginLeft: 'auto' }}>{selectedJob.freshness}</Badge>
            </div>
            <Textarea
              label="Cover Letter (optional)"
              rows={5}
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              placeholder={`Dear ${selectedJob.company} team,\n\nI'm excited to apply for the ${selectedJob.title} position...`}
              style={{ marginBottom: 16 }}
            />
            <div style={{ background: 'var(--ink3)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)', marginBottom: 8 }}>
                MATCH SCORE: <span style={{ color: 'var(--gold)' }}>{fmt(selectedJob.score)}</span>
                {user?.cv_filename && <span style={{ color: 'var(--green)', marginLeft: 16 }}>✓ CV attached</span>}
              </div>
              <div style={{ height: 4, background: 'var(--ink4)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--gold)', width: `${(selectedJob.score * 100).toFixed(0)}%`, borderRadius: 4, transition: 'width 1s' }} />
              </div>
            </div>
            <Button full size="lg" loading={applying} onClick={handleApply}>Submit Application →</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
