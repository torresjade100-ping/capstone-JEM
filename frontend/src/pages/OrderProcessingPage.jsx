import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../api'
import '../styles/management.css'

export default function OrderProcessingPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('pending')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const token = localStorage.getItem('jem_api_token')

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)
      
      const response = await fetch(
        `${API_BASE_URL}/admin/orders?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      const payload = data.data || []
      setOrders(Array.isArray(payload) ? payload : payload.data || [])
    } catch (error) {
      console.warn('Error fetching orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(order => {
    if (!order) return false
    const q = (search || '').toLowerCase().trim()
    if (!q) return true
    const num = String(order.order_number || order.id || '').toLowerCase()
    const name = String(order.customer_name || order.customer?.user?.name || '').toLowerCase()
    return num.includes(q) || name.includes(q)
  })

  const handleStatusTransition = async (nextStatus) => {
    if (!selectedOrder) return

    try {
      const actionByStatus = { confirmed: 'receive', processing: 'process', ready: 'ready', out_for_delivery: 'out-for-delivery', completed: 'complete' }
      const response = await fetch(
        `${API_BASE_URL}/staff/orders/${selectedOrder.id}/${actionByStatus[nextStatus]}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notes: '' })
        }
      )

      if (!response.ok) throw new Error('Failed to transition order')
      
      alert('Order status updated successfully')
      setShowDetails(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error) {
      console.error('Error transitioning order:', error)
      alert('Failed to update order status')
    }
  }

  const getNextStatus = (currentStatus) => {
    const workflow = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'completed'
    }
    return workflow[currentStatus]
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: '#ff9800',
      confirmed: '#2196f3',
      processing: '#9c27b0',
      ready: '#4caf50',
      out_for_delivery: '#00bcd4',
      completed: '#4caf50',
      cancelled: '#d32f2f'
    }
    return colors[status] || '#666'
  }

  const getPaymentBadgeColor = (status) => {
    return status === 'paid' ? '#4caf50' : '#ff9800'
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Order Processing</h1>
      </div>

      {/* Search and Filter */}
      <div className="management-controls">
        <input
          type="text"
          placeholder="Search by order number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready for Pickup</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Order: {selectedOrder.order_number}</h2>
            
            <div className="request-details">
              <div className="detail-row">
                <label>Order Number:</label>
                <span>{selectedOrder.order_number}</span>
              </div>
              <div className="detail-row">
                <label>Customer:</label>
                <span>{selectedOrder.customer_name || 'Walk-in'}</span>
              </div>
              <div className="detail-row">
                <label>Phone:</label>
                <span>{selectedOrder.customer_phone || '—'}</span>
              </div>
              <div className="detail-row">
                <label>Total Amount:</label>
                <span>₱{selectedOrder.total?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span>
                  <badge style={{ backgroundColor: getStatusBadgeColor(selectedOrder.status) }}>
                    {selectedOrder.status.replace('_', ' ')}
                  </badge>
                </span>
              </div>
              <div className="detail-row">
                <label>Payment Status:</label>
                <span>
                  <badge style={{ backgroundColor: getPaymentBadgeColor(selectedOrder.payment_status) }}>
                    {selectedOrder.payment_status}
                  </badge>
                </span>
              </div>
              <div className="detail-row">
                <label>Delivery Address:</label>
                <span>{selectedOrder.delivery_address || '—'}</span>
              </div>
              <div className="detail-row">
                <label>Order Date:</label>
                <span>{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Order Items */}
            <div className="review-section">
              <h4>Order Items</h4>
              <div className="report-table">
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Product</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '0.5rem' }}>{item.product_name}</td>
                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem' }}>₱{item.price?.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem' }}>₱{(item.quantity * item.price)?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Transition */}
            {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
              <div className="form-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handleStatusTransition(getNextStatus(selectedOrder.status))}
                >
                  ✓ Move to {getNextStatus(selectedOrder.status)?.replace('_', ' ')}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDetails(false)}
                >
                  Close
                </button>
              </div>
            )}

            {(selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled') && (
              <div className="form-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDetails(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">No orders found</div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Items</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>{order.customer_name || 'Walk-in'}</td>
                  <td>₱{order.total?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                  <td>{order.items?.length || 0}</td>
                  <td>
                    <span 
                      className="badge"
                      style={{ backgroundColor: getStatusBadgeColor(order.status) }}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span 
                      className="badge"
                      style={{ backgroundColor: getPaymentBadgeColor(order.payment_status) }}
                    >
                      {order.payment_status}
                    </span>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowDetails(true)
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
