import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AlertTriangle, Search, Filter, Calendar, Plus, RefreshCw, X, Check,
  Eye, Edit3, Trash2, ArrowUpDown, ShieldAlert, Package, User as UserIcon,
  Clock, CheckCircle2, AlertCircle, FileText, ChevronRight, DollarSign,
  TrendingDown, ShieldCheck, Flame, Ban, CheckSquare, Layers
} from 'lucide-react'
import Swal from 'sweetalert2'
import {
  getLossDamageThefts,
  getLossDamageTheftSummary,
  getLossDamageTheft,
  createLossDamageTheft,
  updateLossDamageTheft,
  updateLossDamageTheftStatus,
  deleteLossDamageTheft,
  getProducts,
  getStoredUser
} from '../api'
import { formatQuantityWithUnit, getUnitBadgeText } from '../utils/uom'
import Pagination from '../components/Pagination'
import '../styles/management.css'

export default function LossDamageTheftPage() {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const currentUser = useMemo(() => getStoredUser() || {}, [])
  const isAdmin = currentUser.role === 'admin'

  // Filtering & Search states
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // all, lost, damaged, stolen
  const [statusFilter, setStatusFilter] = useState('all') // all, pending, investigating, resolved
  const [periodFilter, setPeriodFilter] = useState('all') // all, today, this_week, this_month, custom
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState('incident_date')
  const [sortDir, setSortDir] = useState('desc')

  // Pagination states
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, lastPage: 1, perPage: 10 })

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    product_id: '',
    sku: '',
    incident_type: 'damaged',
    quantity: 1,
    incident_date: new Date().toISOString().split('T')[0],
    reported_by: currentUser.name || 'Staff Member',
    reason: '',
    status: 'pending',
    action_taken: '',
    confirm_stock_deduction: false,
    notes: '',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Fetch Summary
  const fetchSummary = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoadingSummary(true)
      const params = {}
      if (periodFilter === 'custom' && customStartDate && customEndDate) {
        params.date_from = customStartDate
        params.date_to = customEndDate
      }
      const res = await getLossDamageTheftSummary(params)
      if (res && res.success) {
        setSummary(res.data)
      }
    } catch (err) {
      if (!isBackground) console.warn('Failed to fetch summary metrics:', err)
    } finally {
      if (!isBackground) setLoadingSummary(false)
    }
  }, [periodFilter, customStartDate, customEndDate])

  // Fetch Records
  const fetchRecords = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      const params = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_direction: sortDir,
      }
      if (search.trim()) params.search = search.trim()
      if (typeFilter !== 'all') params.incident_type = typeFilter
      if (statusFilter !== 'all') params.status = statusFilter
      if (periodFilter !== 'all' && periodFilter !== 'custom') {
        params.period = periodFilter
      } else if (periodFilter === 'custom') {
        if (customStartDate) params.date_from = customStartDate
        if (customEndDate) params.date_to = customEndDate
      }

      const res = await getLossDamageThefts(params)
      if (res && res.success && res.data) {
        const paginatedData = res.data
        setRecords(paginatedData.data || [])
        setPaginationMeta({
          total: paginatedData.total ?? 0,
          lastPage: paginatedData.last_page ?? 1,
          perPage: paginatedData.per_page ?? perPage,
        })
      }
    } catch (err) {
      if (!isBackground) console.error('Failed to load records:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [page, perPage, sortBy, sortDir, search, typeFilter, statusFilter, periodFilter, customStartDate, customEndDate])

  // Auto-reset page to 1 on filter, search or sorting changes
  useEffect(() => {
    setPage(1)
  }, [search, typeFilter, statusFilter, periodFilter, customStartDate, customEndDate, sortBy, sortDir])

  // Fetch Product Catalog for Dropdowns
  const fetchProductCatalog = async () => {
    try {
      const res = await getProducts()
      if (res) {
        const list = Array.isArray(res) ? res : res.data || []
        setProducts(list)
      }
    } catch (err) {
      console.warn('Could not load products catalog:', err)
    }
  }

  useEffect(() => {
    fetchSummary()
    fetchRecords()
    fetchProductCatalog()

    let isSubscribed = true
    let isPolling = false

    const pollLossDamage = async () => {
      if (isPolling || !isSubscribed) return
      isPolling = true
      try {
        await Promise.allSettled([
          fetchSummary(true),
          fetchRecords(true),
        ])
      } finally {
        if (isSubscribed) {
          isPolling = false
        }
      }
    }

    const interval = setInterval(pollLossDamage, 1800)

    const handleUpdate = () => {
      pollLossDamage()
    }
    window.addEventListener('jem_inventory_update', handleUpdate)
    return () => {
      isSubscribed = false
      clearInterval(interval)
      window.removeEventListener('jem_inventory_update', handleUpdate)
    }
  }, [fetchSummary, fetchRecords])

  // Selected product helper for Create Modal
  const selectedProduct = useMemo(() => {
    if (!formData.product_id) return null
    return products.find(p => String(p.id) === String(formData.product_id)) || null
  }, [products, formData.product_id])

  // Handle Product Selection Change in Form
  const handleProductChange = (productId) => {
    const prod = products.find(p => String(p.id) === String(productId))
    setFormData(prev => ({
      ...prev,
      product_id: productId,
      sku: prod?.sku || (prod?.variants?.[0]?.sku) || (prod ? `PRD-${String(prod.id).padStart(4, '0')}` : ''),
    }))
  }

  // Open Create Modal
  const handleOpenCreate = (preselectedProduct = null) => {
    const initialProd = preselectedProduct || (products[0] || null)
    setFormData({
      product_id: initialProd ? String(initialProd.id) : '',
      sku: initialProd?.sku || (initialProd?.variants?.[0]?.sku) || (initialProd ? `PRD-${String(initialProd.id).padStart(4, '0')}` : ''),
      incident_type: 'damaged',
      quantity: 1,
      incident_date: new Date().toISOString().split('T')[0],
      reported_by: currentUser.name || 'Staff Member',
      reason: '',
      status: 'pending',
      action_taken: '',
      confirm_stock_deduction: false,
      notes: '',
    })
    setShowCreateModal(true)
  }

  // Submit Create Incident
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!formData.product_id) {
      Swal.fire({ icon: 'warning', title: 'Product Required', text: 'Please select an affected product.' })
      return
    }
    const qty = parseInt(formData.quantity, 10)
    if (!qty || qty < 1) {
      Swal.fire({ icon: 'warning', title: 'Invalid Quantity', text: 'Quantity affected must be at least 1 unit.' })
      return
    }
    if (!formData.reason.trim()) {
      Swal.fire({ icon: 'warning', title: 'Reason Required', text: 'Please enter a description or reason for this incident.' })
      return
    }

    // Check stock warning if confirming deduction
    if ((formData.confirm_stock_deduction || formData.status === 'resolved') && selectedProduct) {
      const avail = Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0)
      if (qty > avail) {
        Swal.fire({
          icon: 'error',
          title: 'Insufficient Inventory Stock',
          text: `Cannot confirm deduction: available stock is ${avail} ${selectedProduct.unit || 'units'}, but ${qty} was requested.`,
        })
        return
      }
    }

    try {
      setFormSubmitting(true)
      const res = await createLossDamageTheft({
        product_id: Number(formData.product_id),
        sku: formData.sku,
        incident_type: formData.incident_type,
        quantity: qty,
        incident_date: formData.incident_date,
        reported_by: formData.reported_by,
        reason: formData.reason.trim(),
        status: formData.status,
        action_taken: formData.action_taken.trim(),
        confirm_stock_deduction: formData.confirm_stock_deduction || formData.status === 'resolved',
        notes: formData.notes.trim(),
      })

      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Incident Recorded! 📋',
          text: res.message || 'Record saved successfully.',
          timer: 2000,
          showConfirmButton: false,
        })
        setShowCreateModal(false)
        fetchRecords()
        fetchSummary()
      } else {
        throw new Error(res?.message || 'Failed to save record.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: err.message || 'Could not record incident. Please try again.',
      })
    } finally {
      setFormSubmitting(false)
    }
  }

  // Open Detail Dossier
  const handleOpenDetail = async (record) => {
    setSelectedRecord(record)
    setShowDetailModal(true)
    setDetailLoading(true)
    try {
      const res = await getLossDamageTheft(record.id)
      if (res && res.success && res.data) {
        setSelectedRecord(res.data)
      }
    } catch (err) {
      console.warn('Failed to load detailed record:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    setSelectedRecord(record)
    setEditFormData({
      quantity: record.quantity,
      incident_type: record.incident_type,
      incident_date: record.incident_date,
      reported_by: record.reported_by || '',
      reason: record.reason || '',
      status: record.status || 'pending',
      action_taken: record.action_taken || '',
      confirm_stock_deduction: record.stock_adjusted,
      notes: record.notes || '',
    })
    setShowEditModal(true)
  }

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedRecord) return

    const qty = parseInt(editFormData.quantity, 10)
    if (!qty || qty < 1) {
      Swal.fire({ icon: 'warning', title: 'Invalid Quantity', text: 'Quantity must be at least 1 unit.' })
      return
    }

    try {
      setEditSubmitting(true)
      const res = await updateLossDamageTheft(selectedRecord.id, {
        ...editFormData,
        quantity: qty,
      })

      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Incident Updated!',
          text: res.message || 'Changes saved successfully.',
          timer: 1800,
          showConfirmButton: false,
        })
        setShowEditModal(false)
        fetchRecords()
        fetchSummary()
      } else {
        throw new Error(res?.message || 'Update failed.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Error',
        text: err.message || 'Could not update record.',
      })
    } finally {
      setEditSubmitting(false)
    }
  }

  // Quick Status Transition
  const handleQuickStatusChange = async (record, nextStatus) => {
    const isResolving = nextStatus === 'resolved'
    const promptText = isResolving && !record.stock_adjusted
      ? `Transition status to '${nextStatus.toUpperCase()}'. This will automatically confirm the incident and deduct ${record.quantity} ${record.product?.unit || 'units'} from available inventory stock.`
      : `Transition incident status to '${nextStatus.toUpperCase()}'.`

    const result = await Swal.fire({
      title: `Update Status to ${nextStatus}?`,
      text: promptText,
      icon: isResolving ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isResolving ? '#10b981' : '#3b82f6',
      cancelButtonColor: '#64748b',
      confirmButtonText: isResolving ? 'Yes, Resolve & Deduct Stock' : 'Yes, Update Status',
    })

    if (!result.isConfirmed) return

    try {
      const res = await updateLossDamageTheftStatus(record.id, nextStatus, {
        confirm_stock_deduction: isResolving,
      })
      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Status Updated!',
          text: res.message || `Status changed to ${nextStatus}.`,
          timer: 1800,
          showConfirmButton: false,
        })
        fetchRecords()
        fetchSummary()
        if (showDetailModal && selectedRecord?.id === record.id) {
          handleOpenDetail(record)
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Status Update Failed',
        text: err.message || 'Could not update status.',
      })
    }
  }

  // Delete / Cancel Record (Admin only)
  const handleDelete = async (record) => {
    const result = await Swal.fire({
      title: 'Archive / Cancel Incident?',
      text: record.stock_adjusted
        ? `This record had ${record.quantity} items deducted. Deleting it will restore the items back into inventory stock.`
        : 'Are you sure you want to cancel and archive this incident record?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Archive Record',
    })

    if (!result.isConfirmed) return

    try {
      const res = await deleteLossDamageTheft(record.id, true)
      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Record Archived',
          text: res.message || 'Incident successfully archived.',
          timer: 1800,
          showConfirmButton: false,
        })
        fetchRecords()
        fetchSummary()
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err.message || 'Could not delete record.',
      })
    }
  }

  // Helpers for Badges & Icons
  const getTypeBadge = (type) => {
    const t = String(type || '').toLowerCase()
    if (t === 'damaged') {
      return {
        label: 'DAMAGED',
        icon: Flame,
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      }
    }
    if (t === 'lost') {
      return {
        label: 'LOST',
        icon: HelpCircleIcon,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
      }
    }
    if (t === 'stolen') {
      return {
        label: 'STOLEN',
        icon: ShieldAlert,
        color: '#a855f7',
        bg: 'rgba(168, 85, 247, 0.12)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      }
    }
    return {
      label: (type || 'UNKNOWN').toUpperCase(),
      icon: AlertTriangle,
      color: '#64748b',
      bg: 'rgba(100, 116, 139, 0.12)',
      border: '1px solid rgba(100, 116, 139, 0.3)',
    }
  }

  const getStatusBadge = (status) => {
    const s = String(status || 'pending').toLowerCase()
    if (s === 'resolved') {
      return {
        label: 'RESOLVED',
        icon: CheckCircle2,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
      }
    }
    if (s === 'investigating') {
      return {
        label: 'INVESTIGATING',
        icon: Search,
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
      }
    }
    return {
      label: 'PENDING',
      icon: Clock,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.35)',
    }
  }

  function HelpCircleIcon(props) {
    return <AlertCircle {...props} />
  }

  return (
    <div className="management-container">
      {/* Page Header */}
      <div className="management-header">
        <div>
          <p className="eyebrow" style={{ color: '#ef4444', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldAlert size={14} /> Inventory Shrinkage &amp; Auditing
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
            Loss, Damage, and Theft Records
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Track damaged items, missing products, and theft incidents. Update stock levels and maintain a permanent audit trail.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { fetchSummary(); fetchRecords(); }}
            style={{ padding: '9px 16px', fontSize: '13px' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenCreate(null)}
            style={{ padding: '9px 18px', fontSize: '13px', background: '#ef4444', borderColor: '#ef4444' }}
          >
            <Plus size={16} /> Report Incident
          </button>
        </div>
      </div>

      {/* KPI Summary Cards Grid (Requirement 7) */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        {/* Total Incidents */}
        <div className="metric-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' }}>
            Total Incidents
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            {loadingSummary ? '...' : (summary?.total_incidents ?? 0)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {summary?.total_quantity_affected ?? 0} total units affected
          </span>
        </div>

        {/* Damaged Stock */}
        <div className="metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Flame size={13} /> Damaged Stock
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444', margin: '4px 0' }}>
            {loadingSummary ? '...' : (summary?.by_type?.damaged?.quantity ?? 0)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            ₱{(summary?.by_type?.damaged?.estimated_cost ?? 0).toLocaleString()} est. cost
          </span>
        </div>

        {/* Lost Items */}
        <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={13} /> Lost Items
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', margin: '4px 0' }}>
            {loadingSummary ? '...' : (summary?.by_type?.lost?.quantity ?? 0)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            ₱{(summary?.by_type?.lost?.estimated_cost ?? 0).toLocaleString()} est. cost
          </span>
        </div>

        {/* Stolen Items */}
        <div className="metric-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#a855f7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldAlert size={13} /> Stolen Goods
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#a855f7', margin: '4px 0' }}>
            {loadingSummary ? '...' : (summary?.by_type?.stolen?.quantity ?? 0)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            ₱{(summary?.by_type?.stolen?.estimated_cost ?? 0).toLocaleString()} est. cost
          </span>
        </div>

        {/* Total Financial Loss */}
        <div className="metric-card" style={{ borderLeft: '4px solid #e11d48' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#e11d48', textTransform: 'uppercase' }}>
            Total Financial Loss
          </span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            ₱{Number(summary?.total_estimated_loss ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {(summary?.by_status?.pending ?? 0) + (summary?.by_status?.investigating ?? 0)} pending review
          </span>
        </div>
      </div>

      {/* Incident Type Filter Tabs (Requirement 5) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Incidents', count: summary?.total_incidents },
          { key: 'damaged', label: '💥 Damaged', count: summary?.by_type?.damaged?.count },
          { key: 'lost', label: '🔍 Lost', count: summary?.by_type?.lost?.count },
          { key: 'stolen', label: '🚨 Stolen', count: summary?.by_type?.stolen?.count },
        ].map(tab => {
          const isActive = typeFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setTypeFilter(tab.key); setPage(1); }}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: isActive ? '1px solid #ef4444' : '1px solid var(--border-color)',
                background: isActive ? '#ef4444' : 'var(--bg-surface)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)',
                  color: isActive ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: '700'
                }}>
                  {tab.count ?? 0}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search, Date Period & Multi-Filter Control Bar (Requirements 3 & 6) */}
      <div className="management-controls" style={{ flexWrap: 'wrap', gap: '10px' }}>
        {/* Dynamic Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 2, minWidth: '260px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by product, SKU, ref #, reported by, or reason..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="search-input"
            style={{ border: 'none', padding: '6px 0', outline: 'none', width: '100%', fontSize: '13.5px', background: 'transparent', color: 'var(--text-primary)' }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
          style={{ flex: 1, minWidth: '140px' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">⏳ Pending</option>
          <option value="investigating">🔎 Investigating</option>
          <option value="resolved">✅ Resolved</option>
        </select>

        {/* Date Period Filter */}
        <select
          value={periodFilter}
          onChange={(e) => { setPeriodFilter(e.target.value); setPage(1); }}
          className="filter-select"
          style={{ flex: 1, minWidth: '140px' }}
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>

        {/* Sorting Dropdown */}
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [b, d] = e.target.value.split('-')
            setSortBy(b)
            setSortDir(d)
            setPage(1)
          }}
          className="filter-select"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="incident_date-desc">Date (Newest first)</option>
          <option value="incident_date-asc">Date (Oldest first)</option>
          <option value="quantity-desc">Quantity (High to Low)</option>
          <option value="quantity-asc">Quantity (Low to High)</option>
          <option value="status-asc">Status</option>
        </select>
      </div>

      {/* Custom Date Range Pickers (shown only if 'custom' is selected) */}
      {periodFilter === 'custom' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-surface)',
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '14px',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Date Range:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => { setCustomStartDate(e.target.value); setPage(1); }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => { setCustomEndDate(e.target.value); setPage(1); }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
          </div>
          {(customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setPage(1); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Reset Date Filter
            </button>
          )}
        </div>
      )}

      {/* Main Records Table (Requirement 3) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading loss, damage, and theft records...
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <ShieldCheck size={42} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
            No Incidents Found
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '4px auto 16px' }}>
            {search || typeFilter !== 'all' || statusFilter !== 'all' || periodFilter !== 'all'
              ? 'No records match your active search and filter conditions.'
              : 'There are currently no recorded loss, damage, or theft incidents in the system.'}
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {(search || typeFilter !== 'all' || statusFilter !== 'all' || periodFilter !== 'all') && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('all')
                  setStatusFilter('all')
                  setPeriodFilter('all')
                  setCustomStartDate('')
                  setCustomEndDate('')
                  setPage(1)
                }}
              >
                Clear All Filters
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => handleOpenCreate(null)}
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
            >
              <Plus size={15} /> Report New Incident
            </button>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Ref # &amp; Date</th>
                <th style={{ width: '22%' }}>Product &amp; SKU</th>
                <th style={{ width: '11%' }}>Incident Type</th>
                <th style={{ width: '10%' }}>Qty Affected</th>
                <th style={{ width: '12%' }}>Reported By</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '10%' }}>Stock Impact</th>
                <th style={{ width: '11%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => {
                const typeBadge = getTypeBadge(rec.incident_type)
                const TypeIcon = typeBadge.icon
                const statusBadge = getStatusBadge(rec.status)
                const StatusIcon = statusBadge.icon
                const prodName = rec.product?.name || rec.product_name || 'Product'
                const sku = rec.effective_sku || rec.sku || `PRD-${rec.product_id}`
                const unit = rec.product?.unit || 'pc'

                return (
                  <tr key={rec.id}>
                    {/* Reference # and Date */}
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        display: 'block'
                      }}>
                        {rec.reference_number || `LDT-#${rec.id}`}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                        <Calendar size={11} /> {rec.incident_date}
                      </span>
                    </td>

                    {/* Product Name & SKU */}
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px', display: 'block' }}>
                        {prodName}
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'var(--bg-hover)',
                          color: 'var(--text-secondary)',
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          SKU: {sku}
                        </span>
                        {rec.product?.stock_quantity !== undefined && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            (Current Stock: {rec.product.stock_quantity} {unit})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Incident Type */}
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: typeBadge.color,
                        background: typeBadge.bg,
                        border: typeBadge.border,
                      }}>
                        <TypeIcon size={12} />
                        {typeBadge.label}
                      </span>
                    </td>

                    {/* Quantity Affected */}
                    <td>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        {rec.quantity}
                      </strong>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                        {unit}
                      </span>
                      {rec.estimated_cost > 0 && (
                        <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '1px' }}>
                          ≈ ₱{rec.estimated_cost.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Reported By */}
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {rec.reported_by || 'Staff'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: statusBadge.color,
                        background: statusBadge.bg,
                        border: statusBadge.border,
                      }}>
                        <StatusIcon size={12} />
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Stock Impact (Deducted / Pending) */}
                    <td>
                      {rec.stock_adjusted ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#10b981',
                          fontSize: '11.5px',
                          fontWeight: '600'
                        }}>
                          <CheckCircle2 size={13} /> Deducted
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#f59e0b',
                          fontSize: '11.5px',
                          fontWeight: '600'
                        }}>
                          <Clock size={13} /> Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* View Details */}
                        <button
                          type="button"
                          className="btn-icon"
                          title="View Incident Dossier"
                          onClick={() => handleOpenDetail(rec)}
                          style={{
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Record (Admin only) */}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit Incident"
                            onClick={() => handleOpenEdit(rec)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              padding: '6px',
                              color: '#3b82f6',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                        )}

                        {/* Quick Status Action (Resolve) */}
                        {rec.status !== 'resolved' && (
                          <button
                            type="button"
                            className="btn-icon"
                            title="Resolve & Deduct Stock"
                            onClick={() => handleQuickStatusChange(rec, 'resolved')}
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '6px',
                              padding: '6px',
                              color: '#10b981',
                              cursor: 'pointer'
                            }}
                          >
                            <Check size={14} />
                          </button>
                        )}

                        {/* Delete / Archive (Admin only) */}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-icon"
                            title="Archive / Cancel Incident"
                            onClick={() => handleDelete(rec)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              padding: '6px',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
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

      {/* Pagination Footer */}
      {!loading && paginationMeta.total > 0 && (
        <Pagination
          className="standalone"
          currentPage={page}
          totalItems={paginationMeta.total}
          rowsPerPage={perPage}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPerPage(newSize)
            setPage(1)
          }}
          itemName="incidents"
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REPORT NEW INCIDENT                             */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  New Inventory Incident
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  Report Loss, Damage, or Theft
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              {/* Product Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Affected Product <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg, var(--bg-surface))',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>
                    -- Select Product --
                  </option>
                  {products.map(p => (
                    <option
                      key={p.id}
                      value={p.id}
                      style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}
                    >
                      {p.name} (Stock: {p.stock_quantity ?? p.stock ?? 0} {p.unit || 'pcs'})
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px' }}>
                    <span>SKU: <strong>{formData.sku}</strong></span>
                    <span>Available Stock: <strong>{selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0} {selectedProduct.unit || 'units'}</strong></span>
                  </div>
                )}
              </div>

              {/* Incident Type Selection (Lost / Damaged / Stolen) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Incident Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { key: 'damaged', label: 'Damaged', icon: '💥', desc: 'Broken / unusable' },
                    { key: 'lost', label: 'Lost', icon: '🔍', desc: 'Missing from bin' },
                    { key: 'stolen', label: 'Stolen', icon: '🚨', desc: 'Theft / pilferage' },
                  ].map(t => {
                    const isSelected = formData.incident_type === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, incident_type: t.key }))}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #ef4444' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                          color: isSelected ? '#ef4444' : 'var(--text-primary)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '2px' }}>{t.icon}</div>
                        <div style={{ fontWeight: '700', fontSize: '13.5px' }}>{t.label}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{t.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quantity Affected & Date of Incident */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Quantity Affected <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                    }}
                  />
                  {selectedProduct && Number(formData.quantity) > Number(selectedProduct.stock_quantity ?? 0) && (
                    <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px' }}>
                      ⚠️ Quantity exceeds available stock ({selectedProduct.stock_quantity} available)
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Date of Incident <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              </div>

              {/* Reported By */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Reported By (Staff Member) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.reported_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, reported_by: e.target.value }))}
                  required
                  placeholder="e.g. Isaac Daumar"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              {/* Reason / Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Reason / Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  placeholder="Explain what happened, location in warehouse, circumstances, etc."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Initial Status & Action Taken */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        status: newStatus,
                        confirm_stock_deduction: newStatus === 'resolved' ? true : prev.confirm_stock_deduction,
                      }))
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--input-bg, var(--bg-surface))',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                    }}
                  >
                    <option value="pending" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>⏳ Pending Review</option>
                    <option value="investigating" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>🔎 Investigating</option>
                    <option value="resolved" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>✅ Resolved (Stock Deducted)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Action Taken
                  </label>
                  <input
                    type="text"
                    value={formData.action_taken}
                    onChange={(e) => setFormData(prev => ({ ...prev, action_taken: e.target.value }))}
                    placeholder="e.g. Quarantined, written off"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              </div>

              {/* Stock Deduction Confirmation Checkbox */}
              <div style={{
                background: formData.confirm_stock_deduction || formData.status === 'resolved'
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'var(--bg-hover)',
                border: '1px solid ' + (formData.confirm_stock_deduction || formData.status === 'resolved' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'),
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <input
                  type="checkbox"
                  id="confirm_deduct"
                  checked={formData.confirm_stock_deduction || formData.status === 'resolved'}
                  disabled={formData.status === 'resolved'}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirm_stock_deduction: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <label htmlFor="confirm_deduct" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <strong>Confirm incident &amp; deduct from available inventory now.</strong>
                  <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Creates a permanent stock adjustment and synchronizes inventory levels across Admin, Staff, and POS.
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                  style={{ background: '#ef4444', borderColor: '#ef4444' }}
                >
                  {formSubmitting ? 'Saving Incident...' : 'Save Incident Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: INCIDENT DETAILS DOSSIER                        */}
      {/* ======================================================== */}
      {showDetailModal && selectedRecord && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>
                    {selectedRecord.reference_number || `LDT-#${selectedRecord.id}`}
                  </span>
                  {selectedRecord.stock_adjusted && (
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      ✓ Stock Deducted
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Incident Dossier &amp; Permanent Database Audit Record
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Dossier Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Product</span>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedRecord.product?.name || selectedRecord.product_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  SKU: {selectedRecord.effective_sku || selectedRecord.sku || `PRD-${selectedRecord.product_id}`}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Category: {selectedRecord.product?.category?.name || 'General Hardware'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Incident Overview</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                    color: getTypeBadge(selectedRecord.incident_type).color,
                    background: getTypeBadge(selectedRecord.incident_type).bg
                  }}>
                    {selectedRecord.incident_type?.toUpperCase()}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                    color: getStatusBadge(selectedRecord.status).color,
                    background: getStatusBadge(selectedRecord.status).bg
                  }}>
                    {selectedRecord.status?.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '6px' }}>
                  Quantity: {selectedRecord.quantity} {selectedRecord.product?.unit || 'units'}
                </div>
              </div>
            </div>

            {/* Incident Details List */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '14px', marginBottom: '18px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Date of Incident</span>
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: '2px 0 0' }}>{selectedRecord.incident_date}</p>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Reported By</span>
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: '2px 0 0' }}>{selectedRecord.reported_by || 'Staff Member'}</p>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Reason / Explanation</span>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '2px 0 0', lineHeight: '1.4' }}>
                  {selectedRecord.reason}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Action Taken</span>
                <p style={{ fontSize: '13px', color: selectedRecord.action_taken ? 'var(--text-primary)' : 'var(--text-muted)', margin: '2px 0 0', fontStyle: selectedRecord.action_taken ? 'normal' : 'italic' }}>
                  {selectedRecord.action_taken || 'No action specified yet.'}
                </p>
              </div>
            </div>

            {/* Audit & Modification Info (Requirement 8) */}
            <div style={{
              background: 'var(--bg-hover)',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '18px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <div>
                <strong>Recorded On:</strong> {selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleString() : 'N/A'}<br />
                <strong>Recorded By:</strong> {selectedRecord.creator?.name || selectedRecord.reported_by || 'System'}
              </div>
              <div>
                <strong>Last Updated:</strong> {selectedRecord.updated_at ? new Date(selectedRecord.updated_at).toLocaleString() : 'N/A'}<br />
                <strong>Modified By:</strong> {selectedRecord.updater?.name || 'Same as creator'}
              </div>
            </div>

            {/* Status Transition & Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedRecord.status !== 'investigating' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleQuickStatusChange(selectedRecord, 'investigating')}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Mark Investigating
                  </button>
                )}
                {selectedRecord.status !== 'resolved' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleQuickStatusChange(selectedRecord, 'resolved')}
                    style={{ fontSize: '12px', padding: '6px 14px', background: '#10b981', borderColor: '#10b981' }}
                  >
                    Resolve &amp; Deduct Stock
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowDetailModal(false); handleOpenEdit(selectedRecord); }}
                    style={{ fontSize: '12.5px' }}
                  >
                    <Edit3 size={14} /> Edit Record
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                  style={{ fontSize: '12.5px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT INCIDENT RECORD (ADMIN ONLY)               */}
      {/* ======================================================== */}
      {showEditModal && selectedRecord && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase' }}>
                  Admin Authorization Required
                </span>
                <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  Edit Incident: {selectedRecord.reference_number}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              {/* Product Info Display (Product is immutable to prevent corruption) */}
              <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Product:</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block' }}>
                  {selectedRecord.product?.name || selectedRecord.product_name}
                </strong>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  SKU: {selectedRecord.effective_sku || selectedRecord.sku}
                </span>
              </div>

              {/* Type & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Incident Type
                  </label>
                  <select
                    value={editFormData.incident_type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, incident_type: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-color)', background: 'var(--input-bg, var(--bg-surface))',
                      color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  >
                    <option value="damaged" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>💥 Damaged</option>
                    <option value="lost" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>🔍 Lost</option>
                    <option value="stolen" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>🚨 Stolen</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Incident Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-color)', background: 'var(--input-bg, var(--bg-surface))',
                      color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  >
                    <option value="pending" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>⏳ Pending</option>
                    <option value="investigating" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>🔎 Investigating</option>
                    <option value="resolved" style={{ background: 'var(--bg-surface, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>✅ Resolved</option>
                  </select>
                </div>
              </div>

              {/* Quantity & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Quantity Affected
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                      color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Date of Incident
                  </label>
                  <input
                    type="date"
                    value={editFormData.incident_date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                      color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Reported By */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Reported By
                </label>
                <input
                  type="text"
                  value={editFormData.reported_by}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, reported_by: e.target.value }))}
                  required
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                    color: 'var(--text-primary)', fontSize: '13px'
                  }}
                />
              </div>

              {/* Reason */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Reason / Description
                </label>
                <textarea
                  rows="3"
                  value={editFormData.reason}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                    color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical'
                  }}
                />
              </div>

              {/* Action Taken */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Action Taken
                </label>
                <textarea
                  rows="2"
                  value={editFormData.action_taken}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, action_taken: e.target.value }))}
                  placeholder="Steps taken to address, write off, or resolve this incident"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                    color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical'
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSubmitting}
                  style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
