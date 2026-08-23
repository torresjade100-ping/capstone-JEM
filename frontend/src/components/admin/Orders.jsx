import { orders } from '../../data/mockData'

export default function Orders() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Orders</h2>
          <p style={{ color: '#64748b', marginTop: 6 }}>Track open orders, shipping status, and payments.</p>
        </div>
        <button type="button" className="btn-primary">Create order</button>
      </div>

      <div className="stat-card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600 }}>{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.items}</td>
                <td>{order.total}</td>
                <td><span className={`badge ${order.status === 'Completed' ? 'badge-green' : order.status === 'Pending' ? 'badge-yellow' : 'badge-red'}`}>{order.status}</span></td>
                <td>{order.payment}</td>
                <td>{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
