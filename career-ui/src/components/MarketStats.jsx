// src/components/MarketStats.jsx
// Requires: recharts (npm install recharts)
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const API = 'http://localhost:8000'

const AMBER  = '#f5a623'
const GREEN  = '#34d399'
const RED    = '#f87171'
const YELLOW = '#fbbf24'
const MUTED  = '#555c72'

const PALETTE = [
  '#f5a623','#34d399','#60a5fa','#f472b6','#a78bfa',
  '#fb923c','#4ade80','#38bdf8','#e879f9','#facc15',
  '#f87171','#2dd4bf','#818cf8','#fb7185','#a3e635',
]

// Custom dark tooltip
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1e2a', border: '1px solid #252836',
      borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill || AMBER }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

export default function MarketStats() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('domains')

  useEffect(() => {
    // Fetch health to get total counts
    Promise.all([
      fetch(`${API}/health`).then(r => r.json()),
      fetch(`${API}/domains`).then(r => r.json()),
    ])
      .then(async ([health, domainList]) => {
        // Simulate domain distribution by probing each domain's skill count
        // We'll fetch missing-skills with empty skills for each domain to get profile sizes
        const sample = domainList.slice(0, 18) // limit for perf
        const profiles = await Promise.all(
          sample.map(d =>
            fetch(`${API}/missing-skills`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ skills: [], domain: d, top_n: 25 }),
            })
              .then(r => r.json())
              .catch(() => ({ domain: d, missing_skills: [] }))
          )
        )

        const domainData = profiles
          .map(p => ({ name: p.domain, skills: p.missing_skills?.length || 0 }))
          .filter(d => d.skills > 0)
          .sort((a, b) => b.skills - a.skills)

        // Freshness breakdown from skill levels across all domains
        const levelCounts = profiles.reduce(
          (acc, p) => {
            p.missing_skills?.forEach(s => { acc[s.level] = (acc[s.level] || 0) + 1 })
            return acc
          },
          { critical: 0, important: 0, useful: 0 }
        )

        const freshData = [
          { name: 'Critical',  value: levelCounts.critical,  color: RED },
          { name: 'Important', value: levelCounts.important, color: YELLOW },
          { name: 'Useful',    value: levelCounts.useful,    color: GREEN },
        ]

        // Top skills across all domains (flatten and deduplicate by importance)
        const skillMap = {}
        profiles.forEach(p => {
          p.missing_skills?.forEach(s => {
            skillMap[s.skill] = (skillMap[s.skill] || 0) + s.importance
          })
        })
        const topSkills = Object.entries(skillMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([skill, score]) => ({ skill, score: Math.round(score * 10) / 10 }))

        setStats({ health, domainList, domainData, freshData, topSkills })
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 80 }}>
      <div className="spinner" />
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>Analyzing market data…</p>
    </div>
  )

  if (error) return (
    <div className="error-box">Failed to load stats: {error}</div>
  )

  const tabs = [
    { id: 'domains', label: 'Domain Skills Depth' },
    { id: 'levels',  label: 'Skill Urgency Split' },
    { id: 'topskills', label: 'Most In-Demand Skills' },
  ]

  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.2)', padding: '2px 8px', borderRadius: 4 }}>04</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
            Market <span style={{ color: 'var(--amber)' }}>Insights</span>
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
          Tunisian job market at a glance
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Jobs',  value: stats.health?.jobs || '—',    icon: '◈', color: AMBER },
          { label: 'Domains',     value: stats.health?.domains || '—', icon: '⬡', color: GREEN },
          { label: 'Skills Indexed', value: stats.topSkills?.length ? `${stats.topSkills.length}+` : '—', icon: '◆', color: '#60a5fa' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '22px 24px' }}>
            <div style={{ fontSize: 20, color, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, color, letterSpacing: -2, marginBottom: 4 }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '13px 16px', background: activeTab === t.id ? 'var(--amber-glow)' : 'transparent',
              border: 'none', borderRight: i < tabs.length - 1 ? '1px solid var(--border)' : 'none',
              color: activeTab === t.id ? AMBER : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Charts */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>

        {activeTab === 'domains' && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>Required skills depth per domain</div>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={stats.domainData} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#8b92a8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="skills" name="Skills" radius={[0, 4, 4, 0]}>
                  {stats.domainData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'levels' && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>Skill urgency distribution across all domains</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={stats.freshData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={130} innerRadius={70}
                    paddingAngle={3}
                  >
                    {stats.freshData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    formatter={(value) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8b92a8' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'topskills' && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>Most in-demand skills (by cumulative importance score)</div>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={stats.topSkills} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis dataKey="skill" type="category" width={140} tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#8b92a8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="score" name="Score" fill={AMBER} radius={[0, 4, 4, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}