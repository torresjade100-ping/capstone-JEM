import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../api'
import '../styles/management.css'

export default function RestockRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')

  const token = localStorage.getItem('jem_api_token')

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)
      
      const response = await fetch(
        `${API_BASE_URL}/restock-requests?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!response.ok) throw new Error('Failed to fetch restock requests')
      const data = await response.json()
      const payload = data.data || []
      setRequests(Array.isArray(payload) ? payload : payload.data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
      alert('Failed to load restock requests')
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(request =>
    request.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    request.requested_by?.toLowerCase().includes(search.toLowerCase()) ||
    request.id.toString().includes(search)
  )

  const handleApprove = async () => {
    if (!selectedRequest) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/restock-requests/${selectedRequest.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'approved',
            notes: reviewNotes
          })
        }
      )

      if (!response.ok) throw new Error('Failed to approve request')
      
      alert('Restock request approved')
      setShowDetails(false)
      setSelectedRequest(null)
      setReviewNotes('')
      fetchRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Failed to approve request')
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/restock-requests/${selectedRequest.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'rejected',
            notes: reviewNotes
          })
        }
      )

      if (!response.ok) throw new Error('Failed to reject request')
      
      alert('Restock request rejected')
      setShowDetails(false)
      setSelectedRequest(null)
      setReviewNotes('')
      fetchRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request')
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

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Restock Requests</h1>
      </div>

      {/* Search and Filter */}
      <div className="management-controls">
        <input
          type="text"
          placeholder="Search by product, staff, or request ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="fulfilled">Fulfilled</option>
        </select>
      </div>

      {/* Details Modal */}
      {showDetails && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Restock Request Details</h2>
            
            <div className="request-details">
              <div className="detail-row">
                <label>Request ID:</label>
                <span>#{selectedRequest.id}</span>
              </div>
              <div className="detail-row">
                <label>Product:</label>
                <span>{selectedRequest.product_name}</span>
              </div>
              <div className="detail-row">
                <label>SKU:</label>
                <span>{selectedRequest.sku}</span>
              </div>
              <div className="detail-row">
                <label>Requested Quantity:</label>
                <span>{selectedRequest.quantity_requested} units</span>
              </div>
              <div className="detail-row">
                <label>Current Stock:</label>
                <span>{selectedRequest.current_quantity} units</span>
              </div>
              <div className="detail-row">
                <label>Requested By:</label>
                <span>{selectedRequest.requested_by}</span>
              </div>
              <div className="detail-row">
                <label>Requested Date:</label>
                <span>{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span>
                  <badge style={{ backgroundColor: getStatusBadgeColor(selectedRequest.status) }}>
                    {getStatusLabel(selectedRequest.status)}
                  </badge>
                </span>
              </div>
              <div className="detail-row">
                <label>Staff Notes:</label>
                <span>{selectedRequest.staff_notes || '—'}</span>
              </div>
              <div className="detail-row">
                <label>Admin Notes:</label>
                <span>{selectedRequest.admin_notes || '—'}</span>
              </div>
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="review-section">
                <textarea
                  placeholder="Add review notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows="4"
                />
                <div className="form-actions">
                  <button className="btn btn-success" onClick={handleApprove}>
                    ✓ Approve
                  </button>
                  <button className="btn btn-danger" onClick={handleReject}>
                    ✗ Reject
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowDetails(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {selectedRequest.status !== 'pending' && (
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

      {/* Requests Table */}
      {loading ? (
        <div className="loading">Loading restock requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">No restock requests found</div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Product</th>
                <th>Requested Qty</th>
                <th>Current Stock</th>
                <th>Requested By</th>
                <th>Date Requested</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(request => (
                <tr key={request.id}>
                  <td>#{request.id}</td>
                  <td>{request.product_name}</td>
                  <td>{request.quantity_requested}</td>
                  <td>{request.current_quantity}</td>
                  <td>{request.requested_by}</td>
                  <td>{new Date(request.created_at).toLocaleDateString()}</td>
                  <td>
                    <span 
                      className="badge"
                      style={{ backgroundColor: getStatusBadgeColor(request.status) }}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => {
                        setSelectedRequest(request)
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
