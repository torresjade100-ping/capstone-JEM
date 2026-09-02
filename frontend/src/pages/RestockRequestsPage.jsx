import { useEffect, useState } from 'react'
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  X,
  Check,
  Eye
} from 'lucide-react'
import {
  API_BASE_URL,
  getStoredUser,
  getProducts,
  getRestockRequests,
  createRestockRequest,
  updateRestockRequest,
  getSharedStockRequests
} from '../api'
import '../styles/management.css'

export default function RestockRequestsPage({ role: propRole }) {
  const currentUser = getStoredUser()
  const currentRole = propRole || currentUser?.role || 'staff'
  const isStaff = currentRole === 'staff'
  const isAdmin = currentRole === 'admin'

  const [requests, setRequests] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // Review / View Modal State
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // New Request Form Modal State (Staff only)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formProductId, setFormProductId] = useState('')
  const [formQuantity, setFormQuantity] = useState(10)
  const [formUrgency, setFormUrgency] = useState('normal')
  const [formNotes, setFormNotes] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState('')

  // Fetch Requests & Products
  const fetchRequestsData = async () => {
    try {
      const data = await getRestockRequests()
      const list = Array.isArray(data) ? data : data?.data || []
      const uniqueMap = new Map()
      list.forEach((item) => {
        if (item && item.id) {
          uniqueMap.set(String(item.id), item)
        }
      })
      setRequests(Array.from(uniqueMap.values()))
    } catch (error) {
      console.warn('Error fetching stock requests:', error)
      setRequests(getSharedStockRequests())
    } finally {
      setLoading(false)
    }
  }

  const fetchProductsList = async () => {
    try {
      const data = await getProducts({ per_page: 100 })
      const list = Array.isArray(data) ? data : data?.data || []
      setProducts(list)
    } catch (e) {
      setProducts([])
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchRequestsData()
    fetchProductsList()

    // 2-second background sync for cross-dashboard real-time updates
    const pollInterval = setInterval(() => {
      fetchRequestsData()
    }, 2500)

    // Listen to real-time custom events
    const handleSync = () => {
      fetchRequestsData()
    }

    window.addEventListener('jem_stock_request_created', handleSync)
    window.addEventListener('jem_notification_update', handleSync)
    window.addEventListener('jem_inventory_update', handleSync)
    window.addEventListener('storage', handleSync)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('jem_stock_request_created', handleSync)
      window.removeEventListener('jem_notification_update', handleSync)
      window.removeEventListener('jem_inventory_update', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  // Filter requests with guaranteed uniqueness by ID
  const filteredRequests = (Array.isArray(requests) ? requests : []).filter((request) => {
    if (!request || !request.id) return false
    const status = request.status || 'pending'
    if (filter !== 'all') {
      if (filter === 'approved' && (status === 'approved' || status === 'confirmed')) {
        // match
      } else if (filter === 'pending' && status === 'pending') {
        // match
      } else if (filter !== status) {
        return false
      }
    }
    const q = (search || '').toLowerCase().trim()
    if (!q) return true
    const product = String(request.product_name || request.product?.name || '').toLowerCase()
    const by = String(request.requested_by || request.requester?.name || '').toLowerCase()
    const id = String(request.id || '')
    const sku = String(request.sku || request.product?.sku || '').toLowerCase()
    return product.includes(q) || by.includes(q) || id.includes(q) || sku.includes(q)
  })

  // Selected product helper for staff create modal
  const selectedProductObj = products.find((p) => String(p.id) === String(formProductId))

  // Submit Stock Request (Staff only)
  const handleCreateRequest = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setFormError('')
    setFormSuccess('')

    if (!formProductId) {
      setFormError('Please select a product from the catalog.')
      return
    }

    if (!formQuantity || Number(formQuantity) < 1) {
      setFormError('Please enter a valid requested quantity (minimum 1).')
      return
    }

    try {
      setActionLoading(true)
      const product = selectedProductObj || { name: 'Product', sku: 'SKU-REQ', stock_quantity: 0 }
      
      const payload = {
        product_id: Number(formProductId),
        product_variant_id: null,
        requested_quantity: Number(formQuantity),
        quantity_requested: Number(formQuantity),
        quantity: Number(formQuantity),
        product_name: product.name,
        sku: product.sku || `SKU-${product.id}`,
        current_quantity: Number(product.stock_quantity ?? product.quantity ?? 0),
        urgency: formUrgency,
        notes: formNotes,
        staff_notes: formNotes,
        requested_by: currentUser?.name || 'Staff Member',
      }

      await createRestockRequest(payload, currentUser)

      setFormSuccess('Stock request submitted! A notification has been sent to Admin for review.')
      setTimeout(() => {
        setShowCreateModal(false)
        setFormProductId('')
        setFormQuantity(10)
        setFormUrgency('normal')
        setFormNotes('')
        setFormSuccess('')
        setActionLoading(false)
        fetchRequestsData()
      }, 1000)
    } catch (err) {
      setFormError(err.message || 'Failed to submit stock request.')
      setActionLoading(false)
    }
  }

  // Admin Approve Stock Request
  const handleApproveRequest = async (requestToApprove, customNotes = '') => {
    const target = requestToApprove || selectedRequest
    if (!target) return

    try {
      setActionLoading(true)
      await updateRestockRequest(
        target.id,
        {
          status: 'approved',
          notes: customNotes || reviewNotes || 'Approved by Admin',
        },
        currentUser
      )

      setToastMessage(`Stock request #${target.id} approved! Inventory stock replenished & staff notified.`)
      setTimeout(() => setToastMessage(''), 4500)

      setShowDetails(false)
      setSelectedRequest(null)
      setReviewNotes('')
      fetchRequestsData()
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Failed to approve request')
    } finally {
      setActionLoading(false)
    }
  }

  // Admin Reject Request
  const handleRejectRequest = async (requestToReject, customNotes = '') => {
    const target = requestToReject || selectedRequest
    if (!target) return

    try {
      setActionLoading(true)
      await updateRestockRequest(
        target.id,
        {
          status: 'rejected',
          notes: customNotes || reviewNotes || 'Rejected by Admin',
        },
        currentUser
      )

      setToastMessage(`Stock request #${target.id} marked as rejected.`)
      setTimeout(() => setToastMessage(''), 4500)

      setShowDetails(false)
      setSelectedRequest(null)
      setReviewNotes('')
      fetchRequestsData()
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request')
    } finally {
      setActionLoading(false)
    }
  }

  const formatRequestedBy = (request) => {
    if (request.requester?.name) return request.requester.name
    if (typeof request.requested_by === 'string' && isNaN(request.requested_by) && request.requested_by.trim()) {
      return request.requested_by
    }
    if (request.requested_by) {
      return `Staff #${request.requested_by}`
    }
    return 'Store Staff'
  }

  const getStatusBadge = (status) => {
    const s = String(status || 'pending').toLowerCase().trim()
    if (!s || s === 'pending') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            height: '28px',
            padding: '0 12px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '12px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}
        >
          <Clock size={14} color="#d97706" style={{ flexShrink: 0 }} />
          <span style={{ lineHeight: 1 }}>Pending</span>
        </span>
      )
    }
    if (s === 'approved' || s === 'confirmed') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            height: '28px',
            padding: '0 12px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '12px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}
        >
          <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
          <span style={{ lineHeight: 1 }}>Approved</span>
        </span>
      )
    }
    if (s === 'rejected') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            height: '28px',
            padding: '0 12px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '12px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}
        >
          <XCircle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
          <span style={{ lineHeight: 1 }}>Rejected</span>
        </span>
      )
    }
    if (s === 'fulfilled') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: '#e0f2fe',
            color: '#0369a1',
            border: '1px solid #bae6fd',
            height: '28px',
            padding: '0 12px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '12px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}
        >
          <ShieldCheck size={14} color="#0284c7" style={{ flexShrink: 0 }} />
          <span style={{ lineHeight: 1 }}>Fulfilled</span>
        </span>
      )
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          background: '#fef3c7',
          color: '#b45309',
          border: '1px solid #fde68a',
          height: '28px',
          padding: '0 12px',
          borderRadius: '14px',
          fontWeight: 800,
          fontSize: '12px',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box'
        }}
      >
        <Clock size={14} color="#d97706" style={{ flexShrink: 0 }} />
        <span style={{ lineHeight: 1 }}>Pending</span>
      </span>
    )
  }

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return (
          <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
            <AlertTriangle size={12} color="#dc2626" /> Urgent
          </span>
        )
      case 'high':
        return (
          <span style={{ color: '#ea580c', fontWeight: 700, fontSize: '11.5px', background: '#ffedd5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fdba74' }}>
            High
          </span>
        )
      default:
        return (
          <span style={{ color: '#64748b', fontSize: '11.5px', fontWeight: 600 }}>
            Normal
          </span>
        )
    }
  }

  // Calculate Metrics Counts
  const pendingCount = requests.filter(r => !r.status || r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'confirmed').length
  const rejectedCount = requests.filter(r => r.status === 'rejected').length
  const totalCount = requests.length

  return (
    <div className="management-container">
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          color: '#15803d',
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '13.5px',
          fontWeight: 700,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p className="eyebrow" style={{ color: '#f97316', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>
            Inventory Replenishment
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
            Stock Requests
          </h1>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '4px' }}>
            {isStaff
              ? 'Request additional inventory from management for low or out-of-stock items.'
              : 'Review, approve, and track stock replenishment requests submitted by store staff.'}
          </p>
        </div>

        {/* Staff Only: New Stock Request Button */}
        {isStaff && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13.5px',
              background: '#f97316',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>Request Stock</span>
          </button>
        )}
      </div>

      {/* Status KPI Overview Cards */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        {/* Pending Requests KPI */}
        <div
          className="metric-card"
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
          style={{
            borderLeft: '4px solid #f59e0b',
            cursor: 'pointer',
            background: filter === 'pending' ? '#fffbeb' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter pending requests"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#d97706" /> Pending Review
            </span>
            <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '10px', fontWeight: '700' }}>
              Requires Action
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', margin: '6px 0 2px' }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Awaiting Admin approval
          </span>
        </div>

        {/* Approved Requests KPI */}
        <div
          className="metric-card"
          onClick={() => setFilter(filter === 'approved' ? 'all' : 'approved')}
          style={{
            borderLeft: '4px solid #10b981',
            cursor: 'pointer',
            background: filter === 'approved' ? '#f0fdf4' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter approved requests"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#047857', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#16a34a" /> Approved &amp; Restocked
            </span>
            <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: '10px', fontWeight: '700' }}>
              Completed
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', margin: '6px 0 2px' }}>
            {approvedCount}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Added to warehouse inventory
          </span>
        </div>

        {/* Rejected Requests KPI */}
        <div
          className="metric-card"
          onClick={() => setFilter(filter === 'rejected' ? 'all' : 'rejected')}
          style={{
            borderLeft: '4px solid #ef4444',
            cursor: 'pointer',
            background: filter === 'rejected' ? '#fef2f2' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter rejected requests"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#b91c1c', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={15} color="#dc2626" /> Rejected Requests
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', margin: '6px 0 2px' }}>
            {rejectedCount}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Declined by management
          </span>
        </div>

        {/* Total Requests KPI */}
        <div
          className="metric-card"
          onClick={() => setFilter('all')}
          style={{
            cursor: 'pointer',
            background: filter === 'all' ? '#f8fafc' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to show all requests"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Package size={15} color="#64748b" /> Total Requests
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '6px 0 2px' }}>
            {totalCount}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            All lifetime submissions
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="management-controls" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', display: 'flex', alignItems: 'center' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by product name, SKU, staff member, or request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', fontSize: '13.5px' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', paddingRight: '8px' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs / Dropdown */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
          style={{ width: 'auto', minWidth: '190px' }}
        >
          <option value="all">📦 All Statuses ({totalCount})</option>
          <option value="pending">⏳ Pending Review ({pendingCount})</option>
          <option value="approved">✅ Approved ({approvedCount})</option>
          <option value="rejected">❌ Rejected ({rejectedCount})</option>
          <option value="fulfilled">🛡️ Fulfilled ({requests.filter(r => r.status === 'fulfilled').length})</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading stock requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <Package size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '1.1rem' }}>No Stock Requests Found</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            {isStaff
              ? 'You have not submitted any stock requests matching this filter.'
              : 'There are no stock requests matching this filter criteria.'}
          </p>
          {isStaff && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Create First Stock Request
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Product Information</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Requested Qty</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Current Stock</th>
                <th style={{ width: '90px' }}>Priority</th>
                <th>Requested By</th>
                <th style={{ width: '95px' }}>Date</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Status</th>
                <th style={{ textAlign: 'center', width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const productName = request.product_name || request.product?.name || 'Product'
                const sku = request.sku || request.product?.sku || '-'
                const requestedBy = formatRequestedBy(request)
                const requestedQty = request.quantity_requested ?? request.requested_quantity ?? 0
                const currentStock = request.current_quantity ?? request.product?.stock_quantity ?? 0
                const statusStr = String(request.status || 'pending').toLowerCase().trim()
                const isPending = !statusStr || statusStr === 'pending'
                const isApproved = statusStr === 'approved' || statusStr === 'confirmed'
                const isRejected = statusStr === 'rejected'
                const dateStr = request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Today'

                return (
                  <tr key={request.id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>#{request.id}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13.5px' }}>{productName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {sku}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#ea580c', fontSize: '14px', background: '#fff7ed', padding: '3px 8px', borderRadius: '6px', border: '1px solid #ffedd5' }}>
                        +{requestedQty}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: currentStock === 0 ? '#dc2626' : '#475569', fontSize: '13px' }}>
                        {currentStock}
                      </span>
                    </td>
                    <td>{getUrgencyBadge(request.urgency)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} style={{ color: '#94a3b8' }} />
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '12.5px' }}>{requestedBy}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>{dateStr}</td>
                    
                    {/* Status Column with Clear Centered Icons */}
                    <td style={{ textAlign: 'center' }}>
                      {getStatusBadge(request.status)}
                    </td>

                    {/* Actions Column */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        {/* Eye Icon Button for View */}
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => {
                            setSelectedRequest(request)
                            setReviewNotes(request.admin_notes || '')
                            setShowDetails(true)
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxSizing: 'border-box'
                          }}
                          title="View Request Details"
                          aria-label="View Details"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Admin Side: Approve Icon Button */}
                        {isAdmin && isPending && (
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(request)}
                            disabled={actionLoading}
                            style={{
                              height: '32px',
                              padding: '0 11px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                            title="Approve stock request and replenish inventory"
                            aria-label="Approve Request"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Admin Side: Reject Icon Button */}
                        {isAdmin && isPending && (
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(request)}
                            disabled={actionLoading}
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                            title="Reject this stock request"
                            aria-label="Reject Request"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Staff Create Stock Request Modal */}
      {showCreateModal && isStaff && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Create Stock Request</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Submit request to Admin for review and inventory restock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateRequest}>
              {/* Product Selection */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                  Select Product to Restock *
                </label>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="form-input"
                  required
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', background: '#fff' }}
                >
                  <option value="">-- Choose a product from catalog --</option>
                  {products.map((p) => {
                    const currentStock = p.stock_quantity ?? p.quantity ?? 0
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} (Current Stock: {currentStock} {p.unit || 'units'})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Live Product Info Box */}
              {selectedProductObj && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '12.5px', color: '#475569' }}>
                  <div><strong>SKU:</strong> {selectedProductObj.sku || `SKU-${selectedProductObj.id}`}</div>
                  <div><strong>Category:</strong> {selectedProductObj.category?.name || selectedProductObj.category || 'General'}</div>
                  <div><strong>Current Available Stock:</strong> {selectedProductObj.stock_quantity ?? 0} {selectedProductObj.unit || 'units'}</div>
                </div>
              )}

              {/* Quantity and Urgency */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                    Requested Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                    Priority / Urgency
                  </label>
                  <select
                    value={formUrgency}
                    onChange={(e) => setFormUrgency(e.target.value)}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', background: '#fff' }}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Staff Notes */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                  Reason / Notes for Management (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Low physical stock on showroom shelf, bulk customer inquiry coming up..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '13px' }}
                />

              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{ background: '#f97316', color: '#fff', border: 'none', fontWeight: 700 }}
                >
                  {actionLoading ? 'Submitting...' : 'Send Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View / Review Stock Request Modal (Admin & Staff) */}
      {showDetails && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                  Stock Request #{selectedRequest.id}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {isAdmin && (!selectedRequest.status || selectedRequest.status === 'pending')
                    ? 'Review staff request and take action.'
                    : 'Stock request record details.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Request Summary Info */}
            <div className="request-details" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Product:</span>
                <strong style={{ color: '#1e293b' }}>{selectedRequest.product_name || selectedRequest.product?.name}</strong>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>SKU:</span>
                <span style={{ color: '#334155', fontFamily: 'monospace' }}>{selectedRequest.sku || selectedRequest.product?.sku || '-'}</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Requested Quantity:</span>
                <strong style={{ color: '#ea580c', fontSize: '15px' }}>{selectedRequest.quantity_requested ?? selectedRequest.requested_quantity} units</strong>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Current Stock Level:</span>
                <span>{selectedRequest.current_quantity ?? selectedRequest.product?.stock_quantity ?? 0} units</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Requested By:</span>
                <strong>{formatRequestedBy(selectedRequest)}</strong>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Priority:</span>
                <span>{getUrgencyBadge(selectedRequest.urgency)}</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Status:</span>
                <span>{getStatusBadge(selectedRequest.status)}</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Date Submitted:</span>
                <span style={{ color: '#64748b', fontSize: '13px' }}>
                  {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'Today'}
                </span>
              </div>
            </div>

            {/* Staff Notes */}
            {selectedRequest.staff_notes && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Staff Reason / Notes:
                </label>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#334155' }}>
                  {selectedRequest.staff_notes}
                </div>
              </div>
            )}

            {/* Historical Admin Notes */}
            {selectedRequest.admin_notes && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Admin Review Notes:
                </label>
                <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1e293b' }}>
                  {selectedRequest.admin_notes}
                </div>
              </div>
            )}

            {/* Admin Action Section (When Pending) */}
            {isAdmin && (!selectedRequest.status || selectedRequest.status === 'pending') ? (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                  Add Admin Review Notes:
                </label>
                <textarea
                  placeholder="Approved. Added to active store inventory..."
                  value={reviewNotes}

                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows="3"
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '13px', marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDetails(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleRejectRequest()}
                    disabled={actionLoading}
                    style={{ background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleApproveRequest()}
                    disabled={actionLoading}
                    style={{ background: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)' }}
                  >
                    <CheckCircle2 size={16} /> Approve Stock Request
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
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
    </div>
  )
}
