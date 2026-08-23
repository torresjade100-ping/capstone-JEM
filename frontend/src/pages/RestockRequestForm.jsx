import { useEffect, useState } from 'react'
import { API_BASE_URL, getStoredUser } from '../api'
import '../styles/management.css'

export default function RestockRequestForm() {
  const [products, setProducts] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    quantity_requested: '',
    notes: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const token = localStorage.getItem('jem_api_token')
  const user = getStoredUser()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch products
      const productsRes = await fetch(
        `${API_BASE_URL}/products`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.data || [])
      }

      // Fetch my restock requests
      const requestsRes = await fetch(
        `${API_BASE_URL}/restock-requests`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json()
        setRequests(requestsData.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.product_id || !formData.quantity_requested) {
      alert('Product and quantity are required')
      return
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/restock-requests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: parseInt(formData.product_id),
            requested_quantity: parseInt(formData.quantity_requested),
            notes: formData.notes
          })
        }
      )

      if (!response.ok) throw new Error('Failed to submit request')
      
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
      
      setShowForm(false)
      setFormData({ product_id: '', quantity_requested: '', notes: '' })
      fetchData()
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Failed to submit request')
    }
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: '#ff9800',
      approved: '#4caf50',
      rejected: '#d32f2f',
      fulfilled: '#2196f3'
    }
    return colors[status] || '#666'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      fulfilled: 'Fulfilled'
    }
    return labels[status] || status
  }

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id))

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Restock Requests</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true)
            setFormData({ product_id: '', quantity_requested: '', notes: '' })
          }}
        >
          + New Request
        </button>
      </div>

      {/* Success Message */}
      {submitted && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#4caf50',
          color: 'white',
          borderRadius: '6px',
          animation: 'fadeOut 3s ease-in-out'
        }}>
          ✓ Restock request submitted successfully!
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Submit Restock Request</h2>
            <form onSubmit={handleSubmit}>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                required
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (SKU: {product.sku})
                  </option>
                ))}
              </select>

              {selectedProduct && (
                <div style={{
                  padding: '0.75rem',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  <div><strong>Current Stock:</strong> {selectedProduct.stock_quantity || 0} units</div>
                  <div><strong>Low Stock Threshold:</strong> {selectedProduct.low_stock_threshold || 'N/A'} units</div>
                  <div><strong>Unit Price:</strong> ₱{selectedProduct.base_price?.toFixed(2)}</div>
                </div>
              )}

              <input
                type="number"
                min="1"
                placeholder="Requested Quantity"
                value={formData.quantity_requested}
                onChange={(e) => setFormData({ ...formData, quantity_requested: e.target.value })}
                required
              />

              <textarea
                placeholder="Additional Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
              />

              {selectedProduct && formData.quantity_requested && (
                <div style={{
                  padding: '0.75rem',
                  background: '#e3f2fd',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  <strong>Estimated Cost:</strong> ₱{(selectedProduct.base_price * parseInt(formData.quantity_requested) || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-success">Submit Request</button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My Requests */}
      <div style={{ marginTop: '2rem' }}>
        <h3>My Restock Requests</h3>
        
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">You haven't submitted any restock requests yet</div>
        ) : (
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Requested Qty</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Admin Notes</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id}>
                    <td>{request.product_name}</td>
                    <td>{request.quantity_requested}</td>
                    <td>{request.current_quantity}</td>
                    <td>
                      <span 
                        className="badge"
                        style={{ backgroundColor: getStatusBadgeColor(request.status) }}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                    <td>{request.admin_notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
