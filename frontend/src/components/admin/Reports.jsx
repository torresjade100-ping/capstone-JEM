import { auditTrail } from '../../data/mockData'

export default function Reports() {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {[
          { title: 'Sales report', description: 'Revenue by product category.' },
          { title: 'Inventory report', description: 'Stock availability and restock insights.' },
          { title: 'Customer report', description: 'Most active customers and orders.' },
          { title: 'Audit log', description: 'Recent activity across the app.' },
        ].map((card) => (
          <div key={card.title} className="stat-card" style={{ minHeight: 130 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{card.title}</div>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>{card.description}</div>
            <button type="button" className="btn-secondary" style={{ marginTop: 16 }}>View report</button>
          </div>
        ))}
      </div>

      <div className="stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Audit trail</div>
            <div style={{ color: '#64748b', marginTop: 6 }}>Recent admin and system activity.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {auditTrail.slice(0, 5).map((entry) => (
            <div key={entry.id} style={{ padding: 16, borderRadius: 14, background: '#f8fafc', display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{entry.action}</div>
              <div style={{ color: '#475569', fontSize: 13 }}>{entry.detail}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 12 }}>
                <span>{entry.user}</span>
                <span>{entry.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
