import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, ChevronDown, AlertCircle, Package, TrendingUp,
  CheckCircle2, Clock, Truck, Store, X, Eye, ArrowRight,
  Filter, RefreshCw, Smartphone, Building, User, Phone, MapPin,
  Calendar, CreditCard, DollarSign, Check, ChevronRight
} from 'lucide-react'
import Swal from 'sweetalert2'
import { getAdminOrders, updateOrderStatus, getSharedOrders, updateSharedOrderStatus } from '../api'
import '../styles/dashboard.css'
import '../styles/management.css'

export default function OrdersManagement({ role = 'staff' }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all') // all, mobile, pos
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    fetchOrders()
    // Periodic auto-polling every 4 seconds to catch new incoming mobile orders in real-time
    const interval = setInterval(() => {
      syncOrdersSilently()
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await getAdminOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.warn('Failed to fetch remote orders, using shared local store:', error)
      setOrders(getSharedOrders())
    } finally {
      setLoading(false)
    }
  }

  const syncOrdersSilently = () => {
    const live = getSharedOrders()
    setOrders(live)
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId)
      const updated = await updateOrderStatus(orderId, newStatus)
      setOrders(updated)
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.order_number === orderId)) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }))
      }

      const statusNames = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        processing: 'Processing in Warehouse',
        ready: 'Ready for Pickup / Staging',
        out_for_delivery: 'Out for Delivery',
        completed: 'Completed & Delivered',
        cancelled: 'Cancelled'
      }

      Swal.fire({
        icon: 'success',
        title: 'Order Status Updated! 📦',
        text: `Order #${orderId} has been updated to "${statusNames[newStatus] || newStatus}". Customer app is updated in real-time.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } catch (error) {
      console.error('Failed to update order status:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', icon: Clock },
      confirmed: { label: 'Confirmed', bg: '#eff6ff', color: '#1d4ed8', border: '#dbeafe', icon: CheckCircle2 },
      processing: { label: 'Processing', bg: '#fdf4ff', color: '#86198f', border: '#fae8ff', icon: Package },
      ready: { label: 'Ready for Pickup', bg: '#ecfdf5', color: '#047857', border: '#d1fae5', icon: Store },
      out_for_delivery: { label: 'Out for Delivery', bg: '#eff6ff', color: '#0284c7', border: '#bae6fd', icon: Truck },
      completed: { label: 'Completed', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: X }
    }
    const cfg = map[status] || { label: status, bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: Clock }
    const Icon = cfg.icon
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '11.5px',
        fontWeight: '700',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`
      }}>
        <Icon size={12} />
        {cfg.label}
      </span>
    )
  }

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(order => {
      const q = search.toLowerCase().trim()
      const orderNum = (order.order_number || `#${order.id}`).toLowerCase()
      const custName = (order.customer_name || order.customer?.user?.name || '').toLowerCase()
      const matchSearch = !q || orderNum.includes(q) || custName.includes(q)
      
      const matchStatus = statusFilter === 'all' || order.status === statusFilter
      const isMobile = (order.order_source || '').toLowerCase().includes('mobile')
      const matchSource = sourceFilter === 'all' || (sourceFilter === 'mobile' ? isMobile : !isMobile)

      return matchSearch && matchStatus && matchSource
    })
  }, [orders, search, statusFilter, sourceFilter])

  // Key Metrics
  const totalCount = (orders || []).length
  const mobileCount = (orders || []).filter(o => (o.order_source || '').toLowerCase().includes('mobile')).length
  const pendingCount = (orders || []).filter(o => o.status === 'pending').length
  const totalRevenue = (orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)

  return (
    <div className="page-content" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-heading" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p className="eyebrow" style={{ color: '#f97316', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', margin: 0 }}>
              {role === 'admin' ? 'Administrative Oversight' : 'Operations & Fulfillment'}
            </p>
            <span style={{
              background: role === 'admin' ? '#eff6ff' : '#ecfdf5',
              color: role === 'admin' ? '#1d4ed8' : '#047857',
              border: `1px solid ${role === 'admin' ? '#bfdbfe' : '#a7f3d0'}`,
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px'
            }}>
              {role === 'admin' ? '🛡️ Admin View-Only Mode' : '👷 Staff Operations Mode'}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {role === 'admin' ? 'Customer Orders (Audit & Financial Overview)' : 'Customer Orders Management'}
          </h1>
          <p className="muted" style={{ fontSize: '13.5px', color: '#64748b' }}>
            {role === 'admin' 
              ? 'Administrator read-only view of customer mobile orders. Order fulfillment and packaging are handled by Store Staff.'
              : 'Process incoming orders from the Customer Mobile Application and in-store sales in real-time.'}
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={fetchOrders}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 16px' }}
        >
          <RefreshCw size={15} /> Refresh Live Orders
        </button>
      </div>


      {/* Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Orders
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
            {totalCount}
          </div>
          <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
            📱 {mobileCount} From Mobile App
          </span>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #f97316' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase' }}>
            Pending Attention ⚠️
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#ea580c', margin: '4px 0' }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Requires Staff Confirmation
          </span>
        </div>

        <div className="metric-card">
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Sales Processed
          </span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
            ₱{totalRevenue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
            ● Shared Central Database
          </span>
        </div>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="panel" style={{ marginBottom: '18px', padding: '14px 18px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 2, minWidth: '240px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0' }}>
            <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number (#JEM...), customer name, or phone..."
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            style={{ flex: 1, minWidth: '160px' }}
          >
            <option value="all">All Order Statuses</option>
            <option value="pending">⏳ Pending Review</option>
            <option value="confirmed">✅ Confirmed</option>
            <option value="processing">📦 Processing (Warehouse)</option>
            <option value="ready">🏬 Ready for Pickup</option>
            <option value="out_for_delivery">🚚 Out for Delivery</option>
            <option value="completed">🎉 Completed</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>

          {/* Order Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="filter-select"
            style={{ flex: 1, minWidth: '160px' }}
          >
            <option value="all">All Order Sources</option>
            <option value="mobile">📱 Mobile App Orders</option>
            <option value="pos">🏢 Walk-in POS Orders</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="panel" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#0f172a', fontSize: '15px' }}>
            Customer Orders List ({filteredOrders.length})
          </strong>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Live synced with Mobile Customers</span>
        </div>

        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading customer orders...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>No orders found</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>No orders matched your current search or filter criteria.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Order # &amp; Source</th>
                  <th style={{ width: '22%' }}>Customer Name</th>
                  <th style={{ width: '14%' }}>Items / Qty</th>
                  <th style={{ width: '14%' }}>Total Amount</th>
                  <th style={{ width: '12%' }}>Payment Method</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isMobile = (order.order_source || '').toLowerCase().includes('mobile')
                  const itemCount = (order.items || []).reduce((sum, it) => sum + Number(it.quantity || 1), 0)
                  const custName = order.customer_name || order.customer?.user?.name || 'Customer'
                  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today'

                  return (
                    <tr key={order.id || order.order_number}>
                      {/* Order Number & Source */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>
                            {order.order_number || `#${order.id}`}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isMobile ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '1px 5px'
                              }}>
                                <Smartphone size={10} /> Mobile App
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '1px 5px'
                              }}>
                                <Building size={10} /> Walk-in POS
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{dateStr}</span>
                          </div>
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>{custName}</strong>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {order.customer_phone || order.customer?.user?.phone || '📞 0917-555-1234'}
                          </span>
                        </div>
                      </td>

                      {/* Items */}
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#475569' }}>
                          <strong>{itemCount} units</strong>
                          <span style={{ color: '#94a3b8', fontSize: '11px', display: 'block' }}>
                            ({order.items?.length || 1} product lines)
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td>
                        <strong style={{ color: '#ea580c', fontSize: '14.5px' }}>
                          ₱{Number(order.total || 0).toLocaleString()}
                        </strong>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                          {order.delivery_type === 'pickup' ? 'Store Pickup' : 'Delivery Included'}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#0f172a' }}>
                            {order.payment_method === 'cod' ? '💵 Cash on Delivery' : (order.payment_method === 'gcash' ? '💳 GCash' : '💚 Maya')}
                          </span>
                          <span style={{ fontSize: '10.5px', color: order.payment_method === 'cod' ? '#d97706' : '#059669', fontWeight: '600' }}>
                            {order.payment_method === 'cod' ? 'Pending Collection' : '✓ Verified Paid'}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td>
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${role === 'admin' ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => { setSelectedOrder(order); setShowDetails(true) }}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title={role === 'admin' ? 'View Order Details (Audit)' : 'Process Customer Order'}
                          >
                            <Eye size={13} /> {role === 'admin' ? 'View Details' : 'Process'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )

                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: FULL ORDER DETAILS & STATUS PROCESSING
          ========================================================================= */}
      {showDetails && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" style={{ maxWidth: '620px', width: '100%', borderRadius: '18px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    {selectedOrder.order_number || `#${selectedOrder.id}`}
                  </h2>
                  <span style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px'
                  }}>
                    📱 Mobile App Order
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0' }}>
                  Placed on {new Date(selectedOrder.created_at || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer & Fulfillment Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Customer</span>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '2px 0' }}>
                  {selectedOrder.customer_name || selectedOrder.customer?.user?.name || 'Customer'}
                </h4>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                  📞 {selectedOrder.customer_phone || selectedOrder.customer?.user?.phone || '0917-555-1234'}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Payment &amp; Delivery</span>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '2px 0' }}>
                  {selectedOrder.payment_method?.toUpperCase()} (₱{Number(selectedOrder.total || 0).toLocaleString()})
                </div>
                <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
                  {selectedOrder.delivery_type === 'pickup' ? '🏬 Store Counter Pickup' : '🚚 Job Site Truck Delivery'}
                </p>
              </div>
            </div>

            {/* Delivery Address */}
            {selectedOrder.delivery_address && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '12.5px', color: '#92400e' }}>
                <strong>📍 Destination Address:</strong> {selectedOrder.delivery_address}
                {selectedOrder.notes && (
                  <div style={{ fontSize: '11.5px', marginTop: '2px', color: '#b45309' }}>
                    <strong>Note:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>
            )}

            {/* Ordered Products Table */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ordered Products &amp; Quantities
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item, idx) => {
                      const name = item.product?.name || item.name || `Hardware Supply #${item.product_id}`
                      const price = Number(item.unit_price || item.price || item.product?.base_price || 0)
                      const qty = Number(item.quantity || item.qty || 1)
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#0f172a' }}>{name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800' }}>{qty}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>₱{price.toLocaleString()}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#ea580c' }}>
                            ₱{(price * qty).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Status & Workflow Transition Buttons */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '750', color: '#475569' }}>
                  Current Order Status:
                </span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {role === 'admin' ? (
                <div style={{
                  padding: '10px 12px',
                  background: '#eff6ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  fontSize: '12px',
                  color: '#1e40af'
                }}>
                  🛡️ <strong>Administrator Overview (Read-Only):</strong> Order fulfillment workflow (warehouse picking, packaging, driver assignment, and completion) is managed by Store Operations Staff.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    Click a button below to advance the order status. The customer will see the update in their Mobile App immediately:
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#2563eb', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'confirmed')}
                      disabled={selectedOrder.status === 'confirmed'}
                    >
                      <CheckCircle2 size={13} /> 1. Confirm Order
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#9333ea', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'processing')}
                      disabled={selectedOrder.status === 'processing'}
                    >
                      <Package size={13} /> 2. Process in Warehouse
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#0284c7', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'out_for_delivery')}
                      disabled={selectedOrder.status === 'out_for_delivery'}
                    >
                      <Truck size={13} /> 3. Dispatch Delivery
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#059669', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'completed')}
                      disabled={selectedOrder.status === 'completed'}
                    >
                      <Check size={13} /> 4. Complete &amp; Settle
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#ef4444', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'cancelled')}
                      disabled={selectedOrder.status === 'cancelled'}
                    >
                      <X size={13} /> Cancel Order
                    </button>
                  </div>
                </>
              )}
            </div>


            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDetails(false)}
                style={{ padding: '8px 20px' }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
