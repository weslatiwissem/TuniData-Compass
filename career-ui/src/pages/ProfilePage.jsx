// src/pages/ProfilePage.jsx
import { useState, useRef } from 'react';
import { userAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Avatar, Modal, Input, Textarea, Select, Tag, ProgressBar } from '../components/ui';

const ROLE_OPTIONS = ['Data Engineer','Frontend Developer','Backend Developer','ML Engineer','DevOps Engineer','Full Stack Developer','Data Scientist','Product Manager','UI/UX Designer','Cybersecurity Engineer'];
const COVER_COLORS = [
  'linear-gradient(135deg,#1A1E28,#222838)',
  'linear-gradient(135deg,rgba(232,160,32,.25),rgba(232,160,32,.06))',
  'linear-gradient(135deg,rgba(34,200,122,.2),rgba(34,200,122,.04))',
  'linear-gradient(135deg,rgba(59,130,246,.2),rgba(59,130,246,.04))',
  'linear-gradient(135deg,rgba(167,139,250,.2),rgba(167,139,250,.04))',
];

export default function ProfilePage({ onNavigate }) {
  const { user, updateUser, logout } = useAuth();
  const { push } = useToast();
  const fileRef = useRef();

  const [editModal,   setEditModal]   = useState(false);
  const [skillsModal, setSkillsModal] = useState(false);
  const [expModal,    setExpModal]    = useState(false);
  const [prefModal,   setPrefModal]   = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [coverIdx,    setCoverIdx]    = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [cvLoading,   setCvLoading]   = useState(false);

  // Edit profile form — initialised from user each time modal opens
  const [editForm, setEditForm] = useState({});
  const openEditModal = () => {
    setEditForm({
      first_name: user.first_name || '',
      last_name:  user.last_name  || '',
      role:       user.role       || ROLE_OPTIONS[0],
      bio:        user.bio        || '',
    });
    setEditModal(true);
  };

  // Skills
  const [tmpSkills,   setTmpSkills]   = useState([]);
  const [skillInput,  setSkillInput]  = useState('');
  const openSkillsModal = () => {
    setTmpSkills([...(user.skills || [])]);
    setSkillInput('');
    setSkillsModal(true);
  };
  const addTmpSkill = () => {
    const s = skillInput.trim().toLowerCase().replace(/,/g,'');
    if (s && !tmpSkills.includes(s)) setTmpSkills(p => [...p, s]);
    setSkillInput('');
  };
  const saveSkills = async () => {
    setSaving(true);
    try {
      const updated = await userAPI.updateProfile({ skills: tmpSkills });
      updateUser(updated);
      setSkillsModal(false);
      push('Skills saved!', 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setSaving(false); }
  };

  // Experience
  const [expForm, setExpForm] = useState({ title:'', company:'', period:'', desc:'' });
  const openExpModal = () => {
    setExpForm({ title:'', company:'', period:'', desc:'' });
    setExpModal(true);
  };
  const addExperience = async () => {
    if (!expForm.title || !expForm.company) { push('Title and company required.','error'); return; }
    const newExp = [...(user.experience||[]), expForm];
    setSaving(true);
    try {
      const updated = await userAPI.updateProfile({ experience: newExp });
      updateUser(updated);
      setExpModal(false);
      push('Experience added!','success');
    } catch (err) { push(err.message,'error'); }
    finally { setSaving(false); }
  };
  const removeExp = async (idx) => {
    const newExp = (user.experience||[]).filter((_,i) => i !== idx);
    try {
      const updated = await userAPI.updateProfile({ experience: newExp });
      updateUser(updated);
      push('Experience removed.','info');
    } catch (err) { push(err.message,'error'); }
  };

  // Preferences — pre-fill from user
  const [prefForm, setPrefForm] = useState({});
  const openPrefModal = () => {
    const p = user.preferences || {};
    setPrefForm({
      type:     p.type     || 'Full-time',
      location: p.location || 'Tunis',
      domain:   p.domain   || 'Any',
      salary:   p.salary   || 'Any',
    });
    setPrefModal(true);
  };
  const savePrefs = async () => {
    setSaving(true);
    try {
      const updated = await userAPI.updateProfile({ preferences: prefForm });
      updateUser(updated);
      setPrefModal(false);
      push('Preferences saved!','success');
    } catch (err) { push(err.message,'error'); }
    finally { setSaving(false); }
  };

  // Profile save
  const saveProfile = async () => {
    if (!editForm.first_name) { push('First name required.','error'); return; }
    setSaving(true);
    try {
      const updated = await userAPI.updateProfile(editForm);
      updateUser(updated);
      setEditModal(false);
      push('Profile updated!','success');
    } catch (err) { push(err.message,'error'); }
    finally { setSaving(false); }
  };

  // CV upload
  const handleCv = async (file) => {
    if (!file?.name.endsWith('.pdf')) { push('Only PDF files accepted.','error'); return; }
    setCvLoading(true);
    try {
      const updated = await userAPI.uploadCV(file);
      updateUser(updated);
      push('CV uploaded!','success');
    } catch (err) { push(err.message,'error'); }
    finally { setCvLoading(false); }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
      logout();
      push('Account deleted.','info');
      onNavigate('discover');
    } catch (err) { push(err.message,'error'); }
  };

  if (!user) return null;

  const skills     = user.skills     || [];
  const experience = user.experience || [];
  const prefs      = user.preferences || {};
  const initials   = (user.first_name[0] + (user.last_name?.[0]||'')).toUpperCase();

  // Profile strength
  const strengthItems = [
    { label:'Name & role',   done: !!(user.first_name && user.role) },
    { label:'Bio written',   done: !!user.bio },
    { label:'Skills added',  done: skills.length > 0 },
    { label:'Experience',    done: experience.length > 0 },
    { label:'CV uploaded',   done: !!user.cv_filename },
    { label:'Preferences',   done: !!(prefs.type) },
  ];
  const strength = Math.round((strengthItems.filter(x=>x.done).length / strengthItems.length) * 100);

  const SectionLabel = ({ children }) => (
    <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', marginBottom:14 }}>
      {children}
    </div>
  );

  const EditBtn = ({ onClick }) => (
    <button onClick={onClick} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--r-sm)', padding:'5px 12px', fontSize:11, color:'var(--ivory3)', cursor:'pointer', fontFamily:'var(--f-mono)', transition:'all .18s' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--gold)'; e.currentTarget.style.color='var(--gold)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color='var(--ivory3)'; }}
    >Edit</button>
  );

  return (
    <div style={{ maxWidth:1020, margin:'0 auto', padding:'28px 24px', display:'grid', gridTemplateColumns:'280px 1fr', gap:24, animation:'fadeUp .3s ease' }}>

      {/* ── Sidebar ── */}
      <div style={{ position:'sticky', top:80, height:'fit-content' }}>

        {/* Cover + avatar */}
        <div style={{ position:'relative', marginBottom:16 }}>
          <div
            style={{ height:100, borderRadius:'var(--r) var(--r) 0 0', background:COVER_COLORS[coverIdx], cursor:'pointer' }}
            onClick={() => setCoverIdx((coverIdx+1)%COVER_COLORS.length)}
            title="Click to change cover colour"
          >
            <span style={{ position:'absolute', bottom:8, right:10, fontSize:10, color:'rgba(255,255,255,.4)', fontFamily:'var(--f-mono)' }}>Click to change</span>
          </div>
          <div style={{ position:'absolute', bottom:-36, left:20 }}>
            <Avatar initials={initials} size={72} color={user.avatar_color||'var(--gold-dim)'} />
          </div>
        </div>

        {/* Info */}
        <div style={{ background:'var(--ink2)', border:'1px solid var(--line)', borderRadius:'0 0 var(--r) var(--r)', borderTop:'none', padding:'48px 18px 18px', marginBottom:14 }}>
          <div style={{ fontFamily:'var(--f-display)', fontSize:20, marginBottom:2 }}>{user.first_name} {user.last_name}</div>
          <div style={{ color:'var(--ivory3)', fontSize:13, marginBottom:10 }}>{user.role}</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            <Badge color="gold">{user.role}</Badge>
            <Badge color="green">Open to work</Badge>
          </div>
          {user.bio
            ? <p style={{ fontSize:13, color:'var(--ivory2)', lineHeight:1.6, marginBottom:14 }}>{user.bio}</p>
            : <p style={{ fontSize:13, color:'var(--ivory3)', lineHeight:1.6, marginBottom:14, fontStyle:'italic' }}>No bio yet — edit your profile to add one.</p>
          }
          <Button variant="ghost" size="sm" full onClick={openEditModal}>✏ Edit Profile</Button>
        </div>

        {/* Profile strength */}
        <Card style={{ marginBottom:14, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:12, color:'var(--ivory3)', fontFamily:'var(--f-mono)', textTransform:'uppercase', letterSpacing:1 }}>Profile Strength</span>
            <span style={{ fontFamily:'var(--f-mono)', fontSize:13, color: strength>=80 ? 'var(--green)':'var(--gold)' }}>{strength}%</span>
          </div>
          <ProgressBar value={strength} color={strength>=80?'var(--green)':'var(--gold)'} />
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:5 }}>
            {strengthItems.map(item => (
              <div key={item.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:item.done?'var(--green)':'var(--ivory3)' }}>
                <span>{item.done?'✓':'○'}</span>{item.label}
              </div>
            ))}
          </div>
        </Card>

        {/* Quick stats */}
        <Card style={{ padding:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, textAlign:'center' }}>
            {[
              [(user.saved_jobs||[]).length, 'Saved'],
              [(user.applied_jobs||[]).length,'Applied'],
              [skills.length, 'Skills'],
              [experience.length,'Roles'],
            ].map(([n,l]) => (
              <div key={l}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:22 }}>{n}</div>
                <div style={{ fontSize:11, color:'var(--ivory3)' }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Main ── */}
      <div>

        {/* Skills */}
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <SectionLabel>Skills</SectionLabel>
            <EditBtn onClick={openSkillsModal} />
          </div>
          {skills.length === 0
            ? <div style={{ color:'var(--ivory3)', fontSize:13 }}>No skills yet. Click <strong>Edit</strong> to add your technical skills.</div>
            : <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {skills.map(s => (
                  <span key={s} style={{ padding:'4px 12px', borderRadius:100, fontSize:12, fontFamily:'var(--f-mono)', background:'var(--green-dim)', border:'1px solid rgba(34,200,122,.2)', color:'var(--green)' }}>✓ {s}</span>
                ))}
              </div>
          }
        </Card>

        {/* Experience */}
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <SectionLabel>Experience</SectionLabel>
            <button onClick={openExpModal} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--r-sm)', padding:'5px 12px', fontSize:11, color:'var(--ivory3)', cursor:'pointer', fontFamily:'var(--f-mono)', transition:'all .18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--gold)'; e.currentTarget.style.color='var(--gold)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color='var(--ivory3)'; }}
            >+ Add</button>
          </div>
          {experience.length === 0
            ? <div style={{ color:'var(--ivory3)', fontSize:13 }}>No experience added. Click <strong>+ Add</strong> to add your work history.</div>
            : experience.map((exp,i) => (
              <div key={i} style={{ paddingBottom:16, borderBottom: i<experience.length-1 ? '1px solid var(--line)':'none', marginBottom: i<experience.length-1 ? 16:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:500, marginBottom:2 }}>{exp.title}</div>
                    <div style={{ fontFamily:'var(--f-mono)', fontSize:12, color:'var(--gold)', marginBottom:6 }}>{exp.company} · {exp.period}</div>
                    {exp.desc && <div style={{ fontSize:13, color:'var(--ivory2)', lineHeight:1.6 }}>{exp.desc}</div>}
                  </div>
                  <button onClick={() => removeExp(i)} style={{ background:'none', border:'none', color:'var(--ivory3)', cursor:'pointer', fontSize:13, padding:'2px 8px', borderRadius:4, transition:'all .18s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='var(--red-dim)'; e.currentTarget.style.color='var(--red)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--ivory3)'; }}
                  >✕</button>
                </div>
              </div>
            ))
          }
        </Card>

        {/* CV Upload */}
        <Card style={{ marginBottom:16, border: user.cv_filename ? '1px solid rgba(34,200,122,.25)':'1.5px dashed var(--line)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <SectionLabel>CV / Resume</SectionLabel>
            <Badge color={user.cv_filename?'green':'gray'}>{user.cv_filename ? '✓ Uploaded':'Not uploaded'}</Badge>
          </div>
          {user.cv_filename ? (
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:14, background:'var(--green-dim)', border:'1px solid rgba(34,200,122,.2)', borderRadius:'var(--r-sm)' }}>
              <span style={{ fontSize:28 }}>📄</span>
              <div>
                <div style={{ fontSize:14, color:'var(--green)' }}>{user.cv_filename}</div>
                <div style={{ fontSize:11, color:'var(--ivory3)', fontFamily:'var(--f-mono)' }}>Successfully uploaded</div>
              </div>
              <Button variant="ghost" size="sm" style={{ marginLeft:'auto' }} onClick={() => fileRef.current.click()}>Replace</Button>
            </div>
          ) : (
            <div onClick={() => fileRef.current.click()} style={{ background:'var(--ink3)', borderRadius:'var(--r-sm)', padding:28, textAlign:'center', cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='var(--gold-dim)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='var(--ink3)'; }}
            >
              {cvLoading
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:'var(--ivory2)' }}><div style={{ width:20, height:20, border:'2px solid var(--line)', borderTop:'2px solid var(--gold)', borderRadius:'50%', animation:'spin .75s linear infinite' }} />Uploading...</div>
                : <>
                    <div style={{ fontSize:32, marginBottom:8 }}>⬆️</div>
                    <div style={{ fontSize:14, color:'var(--ivory2)', marginBottom:4 }}>Drop your <span style={{ color:'var(--gold)' }}>PDF CV</span> or click to browse</div>
                    <div style={{ fontSize:11, color:'var(--ivory3)', fontFamily:'var(--f-mono)' }}>PDF only · Max 10MB</div>
                  </>
              }
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e => handleCv(e.target.files[0])} />
        </Card>

        {/* Preferences */}
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <SectionLabel>Job Preferences</SectionLabel>
            <EditBtn onClick={openPrefModal} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:14 }}>
            {[
              ['Job Type',     prefs.type     || '—'],
              ['Location',     prefs.location || '—'],
              ['Domain',       prefs.domain   || '—'],
              ['Min Salary',   prefs.salary   || '—'],
            ].map(([label,val]) => (
              <div key={label}>
                <div style={{ fontSize:11, color:'var(--ivory3)', fontFamily:'var(--f-mono)', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:14 }}>{val}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Danger zone */}
        <Card style={{ borderColor:'rgba(240,96,96,.2)' }}>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--red)', marginBottom:12 }}>Danger Zone</div>
          <p style={{ color:'var(--ivory3)', fontSize:13, marginBottom:14 }}>Permanently delete your account and all associated data. This cannot be undone.</p>
          <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>Delete Account</Button>
        </Card>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* Edit Profile — pre-filled */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Profile">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="First Name" value={editForm.first_name||''} onChange={e => setEditForm(p=>({...p, first_name:e.target.value}))} placeholder="Amira" />
            <Input label="Last Name"  value={editForm.last_name||''}  onChange={e => setEditForm(p=>({...p, last_name:e.target.value}))}  placeholder="Ben Ali" />
          </div>
          <Select label="Role / Title" options={ROLE_OPTIONS} value={editForm.role||ROLE_OPTIONS[0]} onChange={e => setEditForm(p=>({...p, role:e.target.value}))} />
          <Textarea label="Bio" rows={3} value={editForm.bio||''} onChange={e => setEditForm(p=>({...p, bio:e.target.value}))} placeholder="Tell employers about yourself..." />
          <Button full loading={saving} onClick={saveProfile}>Save Changes</Button>
        </div>
      </Modal>

      {/* Skills — pre-filled */}
      <Modal open={skillsModal} onClose={() => setSkillsModal(false)} title="Manage Skills">
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'||e.key===','){e.preventDefault();addTmpSkill();} }}
            placeholder="Add skill and press Enter..."
            style={{ flex:1, background:'var(--ink3)', border:'1px solid var(--line)', borderRadius:'var(--r-sm)', padding:'10px 13px', color:'var(--ivory)', fontSize:13, outline:'none', fontFamily:'var(--f-ui)' }} />
          <Button size="sm" onClick={addTmpSkill}>+ Add</Button>
        </div>
        <div style={{ minHeight:50, display:'flex', flexWrap:'wrap', gap:6, marginBottom:18, padding:12, background:'var(--ink3)', borderRadius:'var(--r-sm)' }}>
          {tmpSkills.length === 0
            ? <span style={{ fontSize:12, color:'var(--ivory3)', fontFamily:'var(--f-mono)' }}>No skills yet — type one above and press Enter</span>
            : tmpSkills.map(s => <Tag key={s} onRemove={() => setTmpSkills(p => p.filter(x=>x!==s))}>{s}</Tag>)
          }
        </div>
        <Button full loading={saving} onClick={saveSkills}>Save {tmpSkills.length} Skill{tmpSkills.length!==1?'s':''}</Button>
      </Modal>

      {/* Add Experience */}
      <Modal open={expModal} onClose={() => setExpModal(false)} title="Add Experience">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Job Title"   value={expForm.title}   onChange={e => setExpForm(p=>({...p,title:e.target.value}))}   placeholder="Senior Data Engineer" />
          <Input label="Company"     value={expForm.company} onChange={e => setExpForm(p=>({...p,company:e.target.value}))} placeholder="Vermeg" />
          <Input label="Period"      value={expForm.period}  onChange={e => setExpForm(p=>({...p,period:e.target.value}))}  placeholder="2022 – Present" />
          <Textarea label="Description" rows={3} value={expForm.desc} onChange={e => setExpForm(p=>({...p,desc:e.target.value}))} placeholder="Describe your role and achievements..." />
          <Button full loading={saving} onClick={addExperience}>Add Experience</Button>
        </div>
      </Modal>

      {/* Preferences — pre-filled */}
      <Modal open={prefModal} onClose={() => setPrefModal(false)} title="Job Preferences">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Select label="Job Type" options={['Full-time','Part-time','Remote','Hybrid']} value={prefForm.type||'Full-time'} onChange={e => setPrefForm(p=>({...p,type:e.target.value}))} />
            <Input  label="Location"  value={prefForm.location||''} onChange={e => setPrefForm(p=>({...p,location:e.target.value}))} placeholder="Tunis" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Select label="Domain" options={['Any','Data Engineering','Frontend Dev','Backend Dev','ML / AI','DevOps','Design','Cybersecurity']} value={prefForm.domain||'Any'} onChange={e => setPrefForm(p=>({...p,domain:e.target.value}))} />
            <Select label="Min Salary" options={['Any','2,000+ DT','3,000+ DT','4,000+ DT','5,000+ DT','6,000+ DT']} value={prefForm.salary||'Any'} onChange={e => setPrefForm(p=>({...p,salary:e.target.value}))} />
          </div>
          <Button full loading={saving} onClick={savePrefs}>Save Preferences</Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account" width={420}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
          <p style={{ color:'var(--ivory2)', fontSize:14, marginBottom:20, lineHeight:1.7 }}>
            This will permanently delete your account, profile, saved jobs, and all data. This cannot be undone.
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <Button variant="ghost" full onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" full onClick={deleteAccount}>Yes, Delete Account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
