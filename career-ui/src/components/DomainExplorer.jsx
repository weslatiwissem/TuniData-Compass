export default function DomainExplorer() {
  const domains = [
    { name: "Data & AI", trend: "+42%", jobs: 284 },
    { name: "Cloud & DevOps", trend: "+38%", jobs: 196 },
    { name: "Cybersecurity", trend: "+31%", jobs: 143 },
    { name: "Product Management", trend: "+27%", jobs: 98 },
    { name: "Full Stack Development", trend: "+24%", jobs: 212 },
  ];

  return (
    <div className="results-page">
      <div className="results-title">
        <span>⬡ Explore</span> Career Domains
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        Discover in-demand sectors in the Tunisian job market
      </p>
      <div className="domain-list">
        {domains.map(domain => (
          <div key={domain.name} className="domain-row">
            <div className="domain-info">
              <div className="domain-name">{domain.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{domain.jobs} open positions</div>
            </div>
            <div className="domain-score" style={{ color: 'var(--green)' }}>↑ {domain.trend}</div>
          </div>
        ))}
      </div>
    </div>
  );
}