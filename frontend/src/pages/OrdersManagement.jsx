import { useState, useEffect } from 'react'
import { Search, ChevronDown, AlertCircle, Package, TrendingUp } from 'lucide-react'
import { API_BASE_URL } from '../api'
import '../styles/dashboard.css'

export default function OrdersManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(filter !== 'all' && { status: filter }),
        ...(search && { search }),
      })
      const res = await fetch(`${API_BASE_URL}/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('jem_api_token')}` },
      })
      const data = await res.json()
      if (data.success) {
        setOrders(Array.isArray(data.data) ? data.data : data.data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
    setLoading(false)
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jem_api_token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchOrders()
        setSelectedOrder(null)
      }
    } catch (error) {
      console.error('Failed to update order:', error)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      confirmed: '#2196f3',
      processing: '#9c27b0',
      ready: '#4caf50',
      out_for_delivery: '#2196f3',
      completed: '#4caf50',
      cancelled: '#f44336',
    }
    return colors[status] || '#999'
  }

  const getNextStatus = (currentStatus) => {
    const workflow = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'completed',
    }
    return workflow[currentStatus]
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Order Management</p>
          <h1>Orders</h1>
          <p className="muted">Track and manage customer and walk-in orders</p>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="metric-icon blue"><Package size={18} /></div>
          <div>
            <span>Total Orders</span>
            <strong>{orders.length}</strong>
          </div>
        </div>
        <div className="metric">
          <div className="metric-icon orange"><AlertCircle size={18} /></div>
          <div>
            <span>Pending</span>
            <strong>{orders.filter(o => o.status === 'pending').length}</strong>
          </div>
        </div>
        <div className="metric">
          <div className="metric-icon green"><TrendingUp size={18} /></div>
          <div>
            <span>Revenue</span>
            <strong>₱{orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="search-box">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number..." />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <p style={{ padding: '16px' }}>Loading...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={24} />
            <p>No orders found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} onClick={() => { setSelectedOrder(order); setShowDetails(true) }} style={{ cursor: 'pointer' }}>
                    <td><strong>{order.order_number}</strong></td>
                    <td>{order.customer?.user?.name || 'Walk-in'}</td>
                    <td><small>{new Date(order.created_at).toLocaleDateString()}</small></td>
                    <td>{order.items?.length || 0} items</td>
                    <td><strong>₱{order.total?.toLocaleString()}</strong></td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        backgroundColor: getStatusColor(order.status),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.payments?.[0]?.method || 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetails && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowDetails(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '16px' }}>{selectedOrder.order_number}</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <p><strong>Customer:</strong> {selectedOrder.customer?.user?.name || 'Walk-in'}</p>
              <p><strong>Status:</strong> <span style={{ color: getStatusColor(selectedOrder.status) }}>{selectedOrder.status}</span></p>
              <p><strong>Total:</strong> ₱{selectedOrder.total?.toLocaleString()}</p>
              <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
            </div>

            <h3>Items</h3>
            <div style={{ marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                  <p><strong>{item.product?.name}</strong></p>
                  <p style={{ fontSize: '12px', color: '#666' }}>{item.quantity} × ₱{item.unit_price?.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {getNextStatus(selectedOrder.status) && (
                <button
                  className="button button-dark"
                  onClick={() => updateOrderStatus(selectedOrder.id, getNextStatus(selectedOrder.status))}
                  style={{ flex: 1 }}
                >
                  Move to {getNextStatus(selectedOrder.status)}
                </button>
              )}
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
