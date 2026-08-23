import { inventoryAdjustments } from '../../data/mockData'

export default function Inventory() {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 24 }}>
      <div className="stat-card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Inventory adjustments</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Review recent changes to stock levels and count corrections.</div>
          </div>
          <button type="button" className="btn-primary">New adjustment</button>
        </div>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Warehouse</th>
              <th>Updated by</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {inventoryAdjustments.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.item}</td>
                <td>{item.type}</td>
                <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                <td>{item.location}</td>
                <td>{item.user}</td>
                <td>{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stat-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Stock availability</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
          {[
            { label: 'Critical items', value: 9, tone: 'badge-red' },
            { label: 'Low stock', value: 14, tone: 'badge-yellow' },
            { label: 'On hand', value: 184, tone: 'badge-blue' },
            { label: 'Warehouse locations', value: 5, tone: 'badge-gray' },
          ].map((tag) => (
            <div key={tag.label} style={{ background: '#f8fafc', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>{tag.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{tag.value}</div>
              <span className={`badge ${tag.tone}`} style={{ marginTop: 12 }}>{tag.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
