import React from 'react'

export default function StaffDashboard() {
  const stats = [
    { label: "Today's Orders", value: 12 },
    { label: 'To Process', value: 7 },
    { label: 'Low Stock', value: 9 },
    { label: "Today's Sales", value: '₱24,880' },
  ]

  const recent = [
    { id: 'ORD-1001', customer: 'Juan Dela Cruz', items: 3, total: '₱1,250', status: 'New' },
    { id: 'ORD-1002', customer: 'Maria Santos', items: 1, total: '₱3,200', status: 'Processing' },
    { id: 'ORD-1003', customer: 'Pedro Reyes', items: 2, total: '₱780', status: 'Confirmed' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="stat-card" style={{ padding: 0 }}>
          <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Orders Needing Action</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Quick actions: Verify / Confirm / Process</div>
          </div>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.id}>
                  <td className="font-mono" style={{ fontSize: 13 }}>{r.id}</td>
                  <td style={{ fontSize: 13 }}>{r.customer}</td>
                  <td style={{ fontWeight: 600 }}>{r.items}</td>
                  <td style={{ fontWeight: 700 }}>{r.total}</td>
                  <td><span className="badge badge-blue">{r.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 13 }}>View</button>
                      <button className="btn-primary" style={{ padding: '6px 10px', fontSize: 13 }}>Confirm</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="stat-card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Low Stock Items</div>
            <ul style={{ margin: 0, paddingLeft: 14 }}>
              <li>2x4 Lumber (A) — 3 left</li>
              <li>Cement 40kg — 6 left</li>
              <li>Galvanized Nails 2" — 12 left</li>
            </ul>
          </div>

          <div className="stat-card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary">Create Restock Request</button>
              <button className="btn-secondary">Open POS</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
