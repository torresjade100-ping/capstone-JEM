import React from 'react'

const sampleOrders = [
  { id: 'ORD-2001', customer: 'Ana Lopez', date: '2026-08-12', items: 4, total: '₱2,450', status: 'New' },
  { id: 'ORD-2002', customer: 'Ramon Cruz', date: '2026-08-12', items: 2, total: '₱980', status: 'Processing' },
  { id: 'ORD-2003', customer: 'Liza Herrera', date: '2026-08-11', items: 1, total: '₱3,200', status: 'Confirmed' },
]

export default function StaffOrders() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Orders</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" placeholder="Search order or customer" style={{ minWidth: 260 }} />
          <button className="btn-primary">New Order</button>
        </div>
      </div>

      <div className="stat-card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {sampleOrders.map(o => (
              <tr key={o.id}>
                <td className="font-mono">{o.id}</td>
                <td>{o.customer}</td>
                <td style={{ color: '#64748b' }}>{o.date}</td>
                <td style={{ fontWeight: 700 }}>{o.items}</td>
                <td style={{ fontWeight: 700 }}>{o.total}</td>
                <td><span className="badge badge-blue">{o.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary">View</button>
                    <button className="btn-primary">Confirm</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
