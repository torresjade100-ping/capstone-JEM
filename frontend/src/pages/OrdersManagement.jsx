import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, ChevronDown, AlertCircle, Package, TrendingUp,
  CheckCircle2, Clock, Truck, Store, X, Eye, ArrowRight,
  Filter, RefreshCw, Smartphone, Building, User, Phone, MapPin,
  Calendar, CreditCard, DollarSign, Check, ChevronRight,
  AlertTriangle, ShieldAlert, CheckSquare, Layers, HelpCircle
} from 'lucide-react'
import Swal from 'sweetalert2'
import {
  getAdminOrders,
  updateOrderStatus,
  getSharedOrders,
  updateSharedOrderStatus,
  getBackorders,
  fulfillBackorder,
  cancelBackorder
} from '../api'
import { formatQuantityWithUnit, getUnitBadgeText } from '../utils/uom'
import '../styles/dashboard.css'
import '../styles/management.css'

export default function OrdersManagement({ role = 'staff', defaultTab = 'orders' }) {
  const [activeTab, setActiveTab] = useState(defaultTab) // 'orders' or 'backorders'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all') // all, mobile, pos
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  // Backorders Queue state
  const [backordersList, setBackordersList] = useState([])
  const [backordersLoading, setBackordersLoading] = useState(false)
  const [backordersMetrics, setBackordersMetrics] = useState({
    active_backorders_count: 0,
    active_backorder_units: 0,
    affected_orders_count: 0,
    fulfilled_backorders_count: 0,
    total_backorders_count: 0,
  })
  const [backorderStatusFilter, setBackorderStatusFilter] = useState('all') // all, active, partially_fulfilled, fulfilled, cancelled
  const [backorderSearch, setBackorderSearch] = useState('')
  const [allocateModalBo, setAllocateModalBo] = useState(null)
  const [allocateQty, setAllocateQty] = useState(1)
  const [deductPhysicalStock, setDeductPhysicalStock] = useState(true)
  const [allocatingLoading, setAllocatingLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchBackordersData()

    // Periodic auto-polling every 3 seconds to catch live orders & restock allocations
    const interval = setInterval(() => {
      syncOrdersSilently()
      syncBackordersSilently()
    }, 3000)

    const handleEventUpdate = () => {
      syncOrdersSilently()
      syncBackordersSilently()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('jem_orders_update', handleEventUpdate)
      window.addEventListener('jem_notification_update', handleEventUpdate)
    }

    return () => {
      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('jem_orders_update', handleEventUpdate)
        window.removeEventListener('jem_notification_update', handleEventUpdate)
      }
    }
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

  // Handle Deep Linking from Global Search
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const targetOrderId = urlParams.get('orderId')
      const targetSearch = urlParams.get('search')
      if (targetSearch && !search) {
        setSearch(targetSearch)
      }
      if (targetOrderId && orders.length > 0) {
        const cleanTarget = targetOrderId.replace(/^#/, '').toLowerCase().trim()
        const matched = orders.find(o => 
          String(o.id) === cleanTarget || 
          String(o.order_number || '').toLowerCase().replace(/^#/, '').trim() === cleanTarget
        )
        if (matched) {
          setSelectedOrder(matched)
          setShowDetails(true)
        }
      }
    } catch (e) {}
  }, [orders])

  const syncOrdersSilently = async () => {
    try {
      const data = await getAdminOrders()
      if (Array.isArray(data)) {
        setOrders(data)
      }
    } catch (e) {
      setOrders(getSharedOrders())
    }
  }

  const fetchBackordersData = async (status = backorderStatusFilter, s = backorderSearch) => {
    setBackordersLoading(true)
    try {
      const params = {}
      if (status && status !== 'all') params.status = status
      if (s) params.search = s
      const res = await getBackorders(params)
      if (res) {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || []
        setBackordersList(list)
        if (res.metrics) {
          setBackordersMetrics(res.metrics)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch backorders queue:', err)
    } finally {
      setBackordersLoading(false)
    }
  }

  const syncBackordersSilently = async () => {
    try {
      const params = {}
      if (backorderStatusFilter && backorderStatusFilter !== 'all') params.status = backorderStatusFilter
      if (backorderSearch) params.search = backorderSearch
      const res = await getBackorders(params)
      if (res) {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || []
        setBackordersList(list)
        if (res.metrics) {
          setBackordersMetrics(res.metrics)
        }
      }
    } catch (e) {}
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
        pending: 'Pending Review',
        confirmed: 'Confirmed',
        backordered: 'Backordered (Waiting for Stock)',
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

      fetchBackordersData()
    } catch (error) {
      console.error('Failed to update order status:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle Manual Backorder Allocation
  const handleOpenAllocateModal = (bo) => {
    setAllocateModalBo(bo)
    setAllocateQty(bo.remaining_quantity || 1)
    setDeductPhysicalStock(true)
  }

  const handleConfirmAllocation = async () => {
    if (!allocateModalBo) return
    const qty = parseInt(allocateQty, 10)
    if (isNaN(qty) || qty <= 0 || qty > allocateModalBo.remaining_quantity) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Quantity',
        text: `Please enter a quantity between 1 and ${allocateModalBo.remaining_quantity}.`
      })
      return
    }

    setAllocatingLoading(true)
    try {
      const res = await fulfillBackorder(allocateModalBo.id, {
        quantity: qty,
        deduct_physical_stock: deductPhysicalStock
      })

      Swal.fire({
        icon: 'success',
        title: 'Stock Allocated!',
        text: `Successfully allocated ${qty} units to Backorder #${allocateModalBo.id}.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })

      setAllocateModalBo(null)
      fetchBackordersData()
      fetchOrders()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Allocation Failed',
        text: err.message || 'Failed to allocate stock. Please check available physical inventory.'
      })
    } finally {
      setAllocatingLoading(false)
    }
  }

  const handleCancelBackorder = async (bo) => {
    const confirm = await Swal.fire({
      title: 'Cancel Backorder?',
      text: `Are you sure you want to cancel Backorder #${bo.id} (${bo.product?.name || 'Item'} - ${bo.remaining_quantity} pcs)? The customer shortage will be marked cancelled.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Cancel Backorder'
    })

    if (confirm.isConfirmed) {
      try {
        await cancelBackorder(bo.id, 'Cancelled by operator')
        Swal.fire({
          icon: 'success',
          title: 'Backorder Cancelled',
          text: `Backorder #${bo.id} has been cancelled.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
        fetchBackordersData()
        fetchOrders()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Cancellation Failed',
          text: err.message || 'Failed to cancel backorder.'
        })
      }
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending Review', bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', icon: Clock },
      confirmed: { label: 'Confirmed', bg: '#eff6ff', color: '#1d4ed8', border: '#dbeafe', icon: CheckCircle2 },
      backordered: { label: 'Backordered', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: AlertTriangle },
      processing: { label: 'Processing (Warehouse)', bg: '#fdf4ff', color: '#86198f', border: '#fae8ff', icon: Package },
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

  const getFulfillmentBadge = (item) => {
    const ordered = Number(item.ordered_quantity ?? item.quantity ?? 1)
    const fulfilled = Number(item.fulfilled_quantity ?? (item.backordered_quantity ? ordered - item.backordered_quantity : ordered))
    const backordered = Number(item.backordered_quantity ?? 0)

    if (backordered > 0 && fulfilled > 0) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          background: '#fffbeb',
          color: '#b45309',
          border: '1px solid #fde68a',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: '700'
        }}>
          ⚠️ Partial: {fulfilled} fulfilled, {backordered} backorder
        </span>
      )
    }
    if (backordered > 0 && fulfilled === 0) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          background: '#fff7ed',
          color: '#c2410c',
          border: '1px solid #fed7aa',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: '700'
        }}>
          ⏳ Backordered: {backordered} pcs shortage
        </span>
      )
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        background: '#ecfdf5',
        color: '#047857',
        border: '1px solid #a7f3d0',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: '700'
      }}>
        ✓ Fulfilled ({fulfilled} pcs)
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

  // Key Metrics for Orders
  const totalCount = (orders || []).length
  const mobileCount = (orders || []).filter(o => (o.order_source || '').toLowerCase().includes('mobile')).length
  const pendingCount = (orders || []).filter(o => o.status === 'pending').length
  const backorderedOrdersCount = (orders || []).filter(o => o.status === 'backordered').length
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
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {role === 'admin' ? 'Customer Orders & Backorders Overview' : 'Customer Orders & Backorders Management'}
          </h1>
          <p className="muted" style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            {role === 'admin'
              ? 'Administrator overview of customer mobile orders, inventory backorders, and fulfillment lifecycle.'
              : 'Process incoming customer mobile orders, manage backorder queues, and fulfill stock arrivals in real-time.'}
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => { fetchOrders(); fetchBackordersData(); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 16px' }}
        >
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {/* Navigation Tabs: All Orders vs Backorders Queue */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid var(--border-color)',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '700',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '3px solid #f97316' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'orders' ? '#f97316' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={17} /> All Customer Orders ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('backorders'); fetchBackordersData(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '700',
            border: 'none',
            borderBottom: activeTab === 'backorders' ? '3px solid #ea580c' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'backorders' ? '#ea580c' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <AlertTriangle size={17} />
          Backorders Queue
          <span style={{
            background: (backordersMetrics.active_backorders_count > 0 || backorderedOrdersCount > 0) ? '#ea580c' : '#64748b',
            color: '#fff',
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '9999px',
            fontWeight: '800'
          }}>
            {backordersMetrics.active_backorders_count ?? backorderedOrdersCount}
          </span>
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: ALL CUSTOMER ORDERS
          ========================================================================= */}
      {activeTab === 'orders' && (
        <>
          {/* Metrics Row */}
          <div className="metrics-grid" style={{ marginBottom: '20px' }}>
            <div className="metric-card">
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Orders
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
                {totalCount}
              </div>
              <span style={{ fontSize: '12px', color: '#f97316', fontWeight: '600' }}>
                📱 {mobileCount} From Mobile App
              </span>
            </div>

            <div className="metric-card" style={{ borderLeft: '4px solid #f97316' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase' }}>
                Pending Attention ⚠️
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#ea580c', margin: '4px 0' }}>
                {pendingCount}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Requires Staff Review
              </span>
            </div>

            <div className="metric-card" style={{ borderLeft: '4px solid #ea580c' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#ea580c', textTransform: 'uppercase' }}>
                Backordered Orders ⏳
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#c2410c', margin: '4px 0' }}>
                {backorderedOrdersCount}
              </div>
              <span style={{ fontSize: '12px', color: '#ea580c', fontWeight: '600' }}>
                Waiting for Restock Inflow
              </span>
            </div>

            <div className="metric-card">
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Sales Processed
              </span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
                ₱{totalRevenue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
              </div>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                ● Shared Central Database
              </span>
            </div>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="management-controls" style={{ marginBottom: '18px', padding: '14px 18px', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-box" style={{ flex: 2, minWidth: '240px', background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by order number (#JEM...), customer name, or phone..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px', color: 'var(--text-primary)' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Requirement 1: Complete All Order Statuses Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
                style={{ flex: 1, minWidth: '170px' }}
              >
                <option value="all">All Order Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="confirmed">Confirmed</option>
                <option value="backordered">Backordered</option>
                <option value="processing">Processing (Warehouse)</option>
                <option value="ready">Ready for Pickup</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
          <div className="panel" style={{ background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                Customer Orders List ({filteredOrders.length})
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live synced with Mobile Customers</span>
            </div>

            {loading ? (
              <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customer orders...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No orders found</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No orders matched your current search or filter criteria.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>Order # &amp; Source</th>
                      <th>Customer Name</th>
                      <th>Items / Qty</th>
                      <th>Total Amount</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => {
                      const isMobile = (order.order_source || '').toLowerCase().includes('mobile')
                      const itemCount = (order.items || []).reduce((sum, it) => sum + Number(it.quantity || 1), 0)
                      const custName = order.customer_name || order.customer?.user?.name || 'Customer'
                      const dateStr = order.created_at ? new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today'
                      const hasBackorders = order.status === 'backordered' || (order.items || []).some(i => Number(i.backordered_quantity || 0) > 0)

                      return (
                        <tr key={order.id || order.order_number}>
                          {/* Order Number & Source */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>
                                  {order.order_number || `#${order.id}`}
                                </strong>
                                {hasBackorders && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    background: '#fff7ed',
                                    color: '#c2410c',
                                    border: '1px solid #fed7aa',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    padding: '1px 5px'
                                  }}>
                                    ⏳ Backordered
                                  </span>
                                )}
                              </div>
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
                                    background: 'var(--bg-hover)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    padding: '1px 5px'
                                  }}>
                                    <Building size={10} /> Walk-in POS
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dateStr}</span>
                              </div>
                            </div>
                          </td>

                          {/* Customer Name */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{custName}</strong>
                              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {order.customer_phone || order.customer?.user?.phone || '📞 0917-555-1234'}
                              </span>
                            </div>
                          </td>

                          {/* Items */}
                          <td>
                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                              {order.items && order.items.length === 1 ? (
                                <strong>{formatQuantityWithUnit(order.items[0].quantity || order.items[0].qty || 1, order.items[0].product?.unit || order.items[0].unit)}</strong>
                              ) : (
                                <strong>{itemCount} total units</strong>
                              )}
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>
                                ({order.items?.length || 1} product lines)
                              </span>
                            </div>
                          </td>

                          {/* Total Amount */}
                          <td>
                            <strong style={{ color: '#ea580c', fontSize: '14.5px' }}>
                              ₱{Number(order.total || 0).toLocaleString()}
                            </strong>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                              {order.delivery_type === 'pickup' ? 'Store Pickup' : 'Delivery Included'}
                            </span>
                          </td>

                          {/* Payment Method */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
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
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {role !== 'admin' && order.status === 'pending' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: '#16a34a', color: '#fff', padding: '5px 10px', fontSize: '11.5px', fontWeight: '700', borderRadius: '6px' }}
                                  onClick={() => handleUpdateStatus(order.id || order.order_number, 'confirmed')}
                                  title="Accept and Confirm Customer Order"
                                >
                                  <CheckCircle2 size={12} /> Confirm
                                </button>
                              )}
                              {role !== 'admin' && order.status === 'confirmed' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: '#9333ea', color: '#fff', padding: '5px 10px', fontSize: '11.5px', fontWeight: '700', borderRadius: '6px' }}
                                  onClick={() => handleUpdateStatus(order.id || order.order_number, 'processing')}
                                  title="Process Materials in Warehouse"
                                >
                                  <Package size={12} /> Process
                                </button>
                              )}
                              {role !== 'admin' && order.status === 'backordered' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: '#ea580c', color: '#fff', padding: '5px 10px', fontSize: '11.5px', fontWeight: '700', borderRadius: '6px' }}
                                  onClick={() => { setSelectedOrder(order); setShowDetails(true); }}
                                  title="View Shortages and Allocation Details"
                                >
                                  <AlertTriangle size={12} /> View Backorder
                                </button>
                              )}
                              {role !== 'admin' && order.status === 'processing' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: '#0284c7', color: '#fff', padding: '5px 10px', fontSize: '11.5px', fontWeight: '700', borderRadius: '6px' }}
                                  onClick={() => handleUpdateStatus(order.id || order.order_number, 'out_for_delivery')}
                                  title="Dispatch Delivery Truck"
                                >
                                  <Truck size={12} /> Dispatch
                                </button>
                              )}
                              {role !== 'admin' && order.status === 'out_for_delivery' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: '#059669', color: '#fff', padding: '5px 10px', fontSize: '11.5px', fontWeight: '700', borderRadius: '6px' }}
                                  onClick={() => handleUpdateStatus(order.id || order.order_number, 'completed')}
                                  title="Mark as Completed & Settle"
                                >
                                  <Check size={12} /> Complete
                                </button>
                              )}
                              <button
                                type="button"
                                className={`btn btn-sm ${role === 'admin' ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={() => { setSelectedOrder(order); setShowDetails(true) }}
                                style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                                title={role === 'admin' ? 'View Order Details (Audit)' : 'Open Full Order Details'}
                              >
                                <Eye size={12} /> {role === 'admin' ? 'View' : 'Details'}
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
        </>
      )}

      {/* =========================================================================
          VIEW 2: DEDICATED BACKORDERS QUEUE (Requirement 4)
          ========================================================================= */}
      {activeTab === 'backorders' && (
        <>
          {/* Backorders Metrics Row */}
          <div className="metrics-grid" style={{ marginBottom: '20px' }}>
            <div className="metric-card" style={{ borderLeft: '4px solid #ea580c' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#ea580c', textTransform: 'uppercase' }}>
                Active Shortages ⏳
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#c2410c', margin: '4px 0' }}>
                {backordersMetrics.active_backorders_count ?? 0}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Waiting for supplier restock
              </span>
            </div>

            <div className="metric-card" style={{ borderLeft: '4px solid #f97316' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase' }}>
                Total Shortage Units 📦
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#ea580c', margin: '4px 0' }}>
                {backordersMetrics.active_backorder_units ?? 0} pcs
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Cumulative units owed to customers
              </span>
            </div>

            <div className="metric-card">
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Affected Orders
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
                {backordersMetrics.affected_orders_count ?? 0}
              </div>
              <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>
                FIFO queue allocation active
              </span>
            </div>

            <div className="metric-card">
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Resolved &amp; Restocked
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', margin: '4px 0' }}>
                {backordersMetrics.fulfilled_backorders_count ?? 0}
              </div>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                ✓ Completed FIFO deliveries
              </span>
            </div>
          </div>

          {/* Backorders Filter & Controls */}
          <div className="management-controls" style={{ marginBottom: '18px', padding: '14px 18px', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-box" style={{ flex: 2, minWidth: '240px', background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                  value={backorderSearch}
                  onChange={(e) => {
                    setBackorderSearch(e.target.value)
                    fetchBackordersData(backorderStatusFilter, e.target.value)
                  }}
                  placeholder="Search backorders by product name, order #, or customer..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px', color: 'var(--text-primary)' }}
                />
                {backorderSearch && (
                  <button onClick={() => { setBackorderSearch(''); fetchBackordersData(backorderStatusFilter, ''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Status Filter for Backorders */}
              <select
                value={backorderStatusFilter}
                onChange={(e) => {
                  setBackorderStatusFilter(e.target.value)
                  fetchBackordersData(e.target.value, backorderSearch)
                }}
                className="filter-select"
                style={{ flex: 1, minWidth: '180px' }}
              >
                <option value="all">All Backorder Statuses</option>
                <option value="active">Active Shortages (Pending &amp; Partial)</option>
                <option value="pending">Pending Full Shortage</option>
                <option value="partially_fulfilled">Partially Fulfilled</option>
                <option value="fulfilled">Fulfilled / Cleared</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Backorders Queue Table */}
          <div className="panel" style={{ background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                  Backorder Queue ({backordersList.length})
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                </span>
              </div>
              <span style={{
                background: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fed7aa',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '4px 10px'
              }}>
              </span>
            </div>

            {backordersLoading ? (
              <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading backorder records...</p>
            ) : backordersList.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No backorders in queue</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>All current customer demand is fulfilled or no backorders match the selected filter.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>Backorder ID &amp; Date</th>
                      <th>Order # &amp; Customer</th>
                      <th>Product Material</th>
                      <th>Ordered</th>
                      <th>Fulfilled</th>
                      <th>Remaining Shortage</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Quick Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {backordersList.map((bo) => {
                      const orderNum = bo.order?.order_number || `#${bo.order_id}`
                      const custName = bo.order?.customer?.user?.name || bo.order?.customer_name || 'Customer'
                      const productName = bo.product?.name || 'Hardware Supply'
                      const remaining = Number(bo.remaining_quantity ?? 0)
                      const fulfilled = Number(bo.fulfilled_quantity ?? 0)
                      const requested = Number(bo.requested_quantity ?? (remaining + fulfilled))
                      const isClear = remaining === 0 || bo.status === 'fulfilled'
                      const isCancelled = bo.status === 'cancelled'

                      return (
                        <tr key={bo.id} style={{ background: isClear ? 'rgba(236, 253, 245, 0.2)' : 'transparent' }}>
                          {/* ID & Date */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                                #BO-{bo.id}
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {bo.created_at ? new Date(bo.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                              </span>
                            </div>
                          </td>

                          {/* Order & Customer */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <strong style={{ color: '#2563eb', fontSize: '13px', cursor: 'pointer' }} onClick={() => {
                                const found = (orders || []).find(o => o.id === bo.order_id || o.order_number === orderNum)
                                if (found) { setSelectedOrder(found); setShowDetails(true); }
                              }}>
                                {orderNum}
                              </strong>
                              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                👤 {custName}
                              </span>
                            </div>
                          </td>

                          {/* Product */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                                {productName}
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Unit: {bo.product?.unit || 'piece'}
                              </span>
                            </div>
                          </td>

                          {/* Ordered */}
                          <td>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                              {requested} pcs
                            </strong>
                          </td>

                          {/* Fulfilled */}
                          <td>
                            <span style={{ color: '#059669', fontWeight: '700', fontSize: '13px' }}>
                              {fulfilled} pcs
                            </span>
                          </td>

                          {/* Shortage */}
                          <td>
                            <span style={{
                              color: isClear ? '#10b981' : (isCancelled ? '#94a3b8' : '#ea580c'),
                              fontWeight: '800',
                              fontSize: '13.5px'
                            }}>
                              {remaining} pcs
                            </span>
                          </td>

                          {/* Status */}
                          <td>
                            {bo.status === 'fulfilled' ? (
                              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' }}>
                                ✓ Fulfilled
                              </span>
                            ) : bo.status === 'partially_fulfilled' || bo.status === 'partial' ? (
                              <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' }}>
                                ⚠️ Partially Fulfilled
                              </span>
                            ) : bo.status === 'cancelled' ? (
                              <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' }}>
                                ✕ Cancelled
                              </span>
                            ) : (
                              <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' }}>
                                ⏳ Pending Restock
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {!isClear && !isCancelled && role !== 'admin' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: '#059669', color: '#fff', fontSize: '11.5px', padding: '4px 9px', borderRadius: '6px' }}
                                  onClick={() => handleOpenAllocateModal(bo)}
                                  title="Manually allocate incoming stock to this backorder"
                                >
                                  <Package size={12} /> Allocate
                                </button>
                              )}

                              {!isClear && !isCancelled && role !== 'admin' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: '#ef4444', color: '#fff', fontSize: '11.5px', padding: '4px 9px', borderRadius: '6px' }}
                                  onClick={() => handleCancelBackorder(bo)}
                                  title="Cancel remaining backorder shortage"
                                >
                                  <X size={12} /> Cancel
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11.5px', padding: '4px 9px', borderRadius: '6px' }}
                                onClick={() => {
                                  const found = (orders || []).find(o => o.id === bo.order_id || o.order_number === orderNum)
                                  if (found) {
                                    setSelectedOrder(found)
                                    setShowDetails(true)
                                  } else {
                                    Swal.fire({
                                      icon: 'info',
                                      title: `Order #${orderNum}`,
                                      text: `Backorder ID: #${bo.id} | Product: ${productName} | Shortage: ${remaining} pcs. Customer: ${custName}.`
                                    })
                                  }
                                }}
                              >
                                <Eye size={12} /> Order
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
        </>
      )}

      {/* =========================================================================
          MODAL 1: ORDER DETAILS MODAL (WITH BACKORDER BREAKDOWN) (Requirement 5)
          ========================================================================= */}
      {showDetails && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" style={{ maxWidth: '680px', width: '100%', borderRadius: '18px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
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
                  {selectedOrder.status === 'backordered' && (
                    <span style={{
                      background: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #fed7aa',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px'
                    }}>
                      ⏳ Backordered
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Placed on {new Date(selectedOrder.created_at || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Requirement 5: Backorder Information Panel */}
            {(selectedOrder.status === 'backordered' || (selectedOrder.items || []).some(i => Number(i.backordered_quantity || 0) > 0)) && (
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={18} color="#ea580c" />
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#9a3412' }}>
                    Backorder Information &amp; Shortage Notice
                  </h4>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#c2410c', lineHeight: '1.4' }}>
                  This order contains item shortages waiting for incoming inventory shipments. Available physical units on hand were safely reserved/fulfilled. Remaining shortages will automatically be allocated in FIFO order when fresh supplier batches arrive.
                </p>

                {/* Backorder Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                    <span style={{ fontSize: '10.5px', color: '#9a3412', fontWeight: '700', textTransform: 'uppercase' }}>Total Ordered</span>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {(selectedOrder.items || []).reduce((sum, it) => sum + Number(it.ordered_quantity || it.quantity || 1), 0)} pcs
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                    <span style={{ fontSize: '10.5px', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Fulfilled (Physical)</span>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#047857' }}>
                      {(selectedOrder.items || []).reduce((sum, it) => sum + Number(it.fulfilled_quantity !== undefined ? it.fulfilled_quantity : it.quantity), 0)} pcs
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                    <span style={{ fontSize: '10.5px', color: '#c2410c', fontWeight: '700', textTransform: 'uppercase' }}>Waiting Backorder</span>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#ea580c' }}>
                      {(selectedOrder.items || []).reduce((sum, it) => sum + Number(it.backordered_quantity || 0), 0)} pcs
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer & Fulfillment Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Customer</span>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0' }}>
                  {selectedOrder.customer_name || selectedOrder.customer?.user?.name || 'Customer'}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  📞 {selectedOrder.customer_phone || selectedOrder.customer?.user?.phone || '0917-555-1234'}
                </p>
              </div>

              <div style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Payment &amp; Delivery</span>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0' }}>
                  {selectedOrder.payment_method?.toUpperCase()} (₱{Number(selectedOrder.total || 0).toLocaleString()})
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
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

            {/* Ordered Products Table with Granular Fulfillment Metrics */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ordered Products &amp; Fulfillment Breakdown
              </h4>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Product</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Ordered</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Fulfilled</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Backordered</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item, idx) => {
                      const name = item.product?.name || item.name || `Hardware Supply #${item.product_id}`
                      const price = Number(item.unit_price || item.price || item.product?.base_price || 0)
                      const ordered = Number(item.ordered_quantity ?? item.quantity ?? 1)
                      const fulfilled = Number(item.fulfilled_quantity !== undefined ? item.fulfilled_quantity : ordered)
                      const backordered = Number(item.backordered_quantity ?? 0)

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{name}</div>
                            <div style={{ marginTop: '3px' }}>
                              {getFulfillmentBadge(item)}
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {ordered}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#047857' }}>
                            {fulfilled}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: backordered > 0 ? '#ea580c' : '#64748b' }}>
                            {backordered}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#ea580c' }}>
                            ₱{(price * ordered).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Status & Workflow Transition Buttons */}
            <div style={{ background: 'var(--bg-hover)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)' }}>
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
                    Update order status to keep customer mobile app updated in real-time:
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#2563eb', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'confirmed')}
                      disabled={selectedOrder.status === 'confirmed'}
                    >
                      <CheckCircle2 size={13} /> Confirm Order
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#ea580c', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'backordered')}
                      disabled={selectedOrder.status === 'backordered'}
                    >
                      <AlertTriangle size={13} /> Mark Backordered
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#9333ea', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'processing')}
                      disabled={selectedOrder.status === 'processing'}
                    >
                      <Package size={13} /> Process in Warehouse
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#0284c7', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'out_for_delivery')}
                      disabled={selectedOrder.status === 'out_for_delivery'}
                    >
                      <Truck size={13} /> Dispatch Delivery
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#059669', color: '#fff' }}
                      onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_number, 'completed')}
                      disabled={selectedOrder.status === 'completed'}
                    >
                      <Check size={13} /> Complete &amp; Settle
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

      {/* =========================================================================
          MODAL 2: MANUAL STOCK ALLOCATION MODAL
          ========================================================================= */}
      {allocateModalBo && (
        <div className="modal-overlay" onClick={() => setAllocateModalBo(null)}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px', padding: '22px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Allocate Stock to Backorder #{allocateModalBo.id}
              </h3>
              <button
                type="button"
                onClick={() => setAllocateModalBo(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', marginBottom: '14px', fontSize: '13px', color: '#1e40af' }}>
              <div><strong>Product:</strong> {allocateModalBo.product?.name || 'Hardware Material'}</div>
              <div><strong>Order:</strong> {allocateModalBo.order?.order_number || `#${allocateModalBo.order_id}`}</div>
              <div><strong>Remaining Shortage:</strong> <span style={{ color: '#ea580c', fontWeight: '800' }}>{allocateModalBo.remaining_quantity} pcs</span></div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Quantity to Allocate (Max: {allocateModalBo.remaining_quantity})
              </label>
              <input
                type="number"
                min="1"
                max={allocateModalBo.remaining_quantity}
                value={allocateQty}
                onChange={(e) => setAllocateQty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  fontSize: '15px',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="deductPhysical"
                checked={deductPhysicalStock}
                onChange={(e) => setDeductPhysicalStock(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="deductPhysical" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Deduct allocated units from physical stock on hand
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAllocateModalBo(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAllocation}
                disabled={allocatingLoading}
                style={{ background: '#059669' }}
              >
                {allocatingLoading ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
