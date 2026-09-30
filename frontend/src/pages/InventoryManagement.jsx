import React, { useEffect, useState, useMemo } from 'react'
import {
  Search, AlertCircle, Plus, Minus, RefreshCw, Package,
  Layers, Filter, ArrowUpDown, X, Check, Eye, History,
  CheckCircle2, XCircle, Clock, Power, AlertTriangle
} from 'lucide-react'
import Swal from 'sweetalert2'
import { API_BASE_URL, getSuppliers, adjustStock, getStockAdjustments, toggleProductStatus, getProductBatches, createProductBatch } from '../api'
import {
  formatQuantityWithUnit,
  getUnitBadgeText,
  getQuantityInputLabel,
  getQuantityPlaceholder,
} from '../utils/uom'
import '../styles/management.css'

export function calculateStockStatus(quantity, threshold = 10) {
  const qty = Number(quantity || 0)
  const reorder = Number(threshold ?? 10)
  if (qty <= 0) return 'out_of_stock'
  if (qty <= reorder) return 'low_stock'
  return 'in_stock'
}

export function getTransactionTypeBadge(type) {
  const t = String(type || 'adjustment').toLowerCase().trim()
  if (t === 'restock' || t.includes('restock') || t.includes('purchase')) {
    return {
      label: 'RESTOCK / STOCK IN',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.35)'
    }
  }
  if (t === 'sale' || t === 'order' || t.includes('sale') || t.includes('order')) {
    return {
      label: 'SALE / STOCK OUT',
      bg: 'rgba(168, 85, 247, 0.15)',
      color: '#a855f7',
      border: '1px solid rgba(168, 85, 247, 0.35)'
    }
  }
  if (t === 'damaged') {
    return {
      label: 'DAMAGED',
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.35)'
    }
  }
  if (t === 'expired') {
    return {
      label: 'EXPIRED',
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.35)'
    }
  }
  if (t === 'return' || t === 'return_to_supplier') {
    return {
      label: 'RETURN',
      bg: 'rgba(234, 179, 8, 0.15)',
      color: '#eab308',
      border: '1px solid rgba(234, 179, 8, 0.35)'
    }
  }
  if (t === 'adjustment' || t === 'miscount' || t === 'count') {
    return {
      label: 'ADJUSTMENT',
      bg: 'rgba(59, 130, 246, 0.15)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.35)'
    }
  }
  return {
    label: (type || 'OTHER').toUpperCase(),
    bg: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)'
  }
}

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, in_stock, low_stock, out_of_stock
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all') // all, active, inactive

  // Stock Adjustment Modal (Inventory Correction via Physical Count Only)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [adjustmentData, setAdjustmentData] = useState({
    physical_count: '',
    reason: 'Inventory Count Correction',
    custom_reason: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Restock Modal (Receiving New Inventory from Supplier / PO)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockProduct, setRestockProduct] = useState(null)
  const [restockFormData, setRestockFormData] = useState({
    product_id: '',
    quantity: '',
    supplier_id: '',
    reference_number: '',
    cost_price: '',
    notes: ''
  })
  const [submittingRestock, setSubmittingRestock] = useState(false)

  // History Modal State (Movement Logs + Batches)
  const [showHistory, setShowHistory] = useState(false)
  const [historyItem, setHistoryItem] = useState(null)
  const [historyTab, setHistoryTab] = useState('movements') // default 'movements' tab
  const [historyLogs, setHistoryLogs] = useState([])
  const [productBatchesData, setProductBatchesData] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const token = localStorage.getItem('jem_api_token')

  useEffect(() => {
    fetchInventory()
    fetchSuppliersList()

    const handleInvUpdate = () => {
      fetchInventory()
    }
    window.addEventListener('jem_inventory_update', handleInvUpdate)
    return () => window.removeEventListener('jem_inventory_update', handleInvUpdate)
  }, [])

  // Handle Deep Linking from Global Search
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const targetProdId = urlParams.get('productId')
      const targetSearch = urlParams.get('search')
      if (targetSearch && !search) {
        setSearch(targetSearch)
      }
      if (targetProdId && inventory.length > 0) {
        const matched = inventory.find(i => String(i.id || i.product_id) === String(targetProdId))
        if (matched) {
          if (!search) setSearch(matched.product_name)
          handleOpenHistory(matched, 'movements')
        }
      }
    } catch (e) {}
  }, [inventory])

  const fetchSuppliersList = async () => {
    try {
      const res = await getSuppliers()
      const list = Array.isArray(res) ? res : res?.data || []
      setSuppliers(list)
    } catch (e) {
      setSuppliers([])
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/admin/inventory`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!response.ok) throw new Error('Failed to fetch inventory')
      const data = await response.json()
      const payload = data.data || []
      const rawList = Array.isArray(payload) ? payload : payload.data || []
      
      if (rawList.length > 0) {
        const normalized = rawList.map((item) => {
          const qty = Number(item.stock_quantity ?? item.current_quantity ?? item.available_quantity ?? item.product?.stock_quantity ?? item.quantity ?? 0)
          const threshold = Number(item.low_stock_threshold ?? item.threshold ?? item.product?.low_stock_threshold ?? 10)
          const prodStatus = item.status ?? item.product?.status ?? 'active'
          const stockStatus = calculateStockStatus(qty, threshold)

          const selling = Number(item.selling_price ?? item.unit_price ?? item.price ?? item.product?.selling_price ?? item.product?.base_price ?? 0)
          const cost = Number(item.cost_price ?? item.product?.cost_price ?? (selling * 0.7) ?? 0)
          const margin = item.margin_percent ?? (selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0)
          const batchesCount = item.batches_count ?? item.batches?.length ?? 1

          return {
            id: item.id || item.product_id,
            product_id: item.product_id || item.id,
            product_name: item.name || item.product?.name || item.product_name || `Hardware Supply #${item.product_id || item.id}`,
            category: item.category || item.product?.category?.name || 'General Construction',
            category_id: item.category_id || item.product?.category_id || null,
            supplier: item.supplier || item.brand || item.product?.supplier?.name || item.product?.brand?.name || '—',
            supplier_id: item.supplier_id || item.product?.supplier_id || null,
            unit: item.unit || item.product?.unit || 'piece',
            unit_price: selling,
            cost_price: cost,
            selling_price: selling,
            margin_percent: margin,
            batches_count: batchesCount,
            quantity: qty,
            stock_quantity: qty,
            low_stock_threshold: threshold,
            stock_status: stockStatus,
            status: prodStatus,
            is_active: prodStatus === 'active'
          }
        })
        setInventory(normalized)
      } else {
        setInventory([])
      }
    } catch (error) {
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  // Handle Active / Inactive Status Toggle
  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active'
    
    // Optimistically update inventory state immediately
    setInventory(prev => prev.map(i => {
      if (i.id === item.id || i.product_id === item.product_id) {
        return { ...i, status: nextStatus, is_active: nextStatus === 'active' }
      }
      return i
    }))

    try {
      await toggleProductStatus(item.product_id || item.id, item.status)
      
      Swal.fire({
        icon: 'success',
        title: `Product ${nextStatus === 'active' ? 'Activated 🟢' : 'Deactivated 🔴'}`,
        text: `"${item.product_name}" is now ${nextStatus.toUpperCase()} and ${nextStatus === 'active' ? 'available' : 'hidden'} in store catalog.`,
        confirmButtonColor: nextStatus === 'active' ? '#16a34a' : '#dc2626',
        timer: 1800,
        showConfirmButton: false
      })
    } catch (err) {
      console.warn('Status toggle error:', err)
    }
  }

  // Dynamic Search Functionality across Name, Category, and Supplier
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const q = search.toLowerCase().trim()
      const matchesSearch = !q ||
        item.product_name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || item.stock_status === statusFilter
      const matchesCategory = categoryFilter === 'all' || 
        (item.category || '').toLowerCase().trim() === categoryFilter.toLowerCase().trim() ||
        String(item.category_id) === String(categoryFilter)
      const matchesActivity = activityFilter === 'all' || (activityFilter === 'active' ? item.status === 'active' : item.status === 'inactive')

      return matchesSearch && matchesStatus && matchesCategory && matchesActivity
    })
  }, [inventory, search, statusFilter, categoryFilter, activityFilter])

  // Extract unique categories for filter
  const categoriesList = useMemo(() => {
    return Array.from(new Set(inventory.map(i => i.category))).filter(Boolean)
  }, [inventory])

  // Metric Totals
  const totalCatalogItems = inventory.filter(i => i.status === 'active').length
  const inStockCount = inventory.filter(i => i.stock_status === 'in_stock').length
  const lowStockCount = inventory.filter(i => i.stock_status === 'low_stock').length
  const outOfStockCount = inventory.filter(i => i.stock_status === 'out_of_stock').length
  const totalValuation = inventory.reduce((sum, i) => sum + ((Number(i.cost_price) > 0 ? Number(i.cost_price) : Number(i.unit_price || 0)) * Number(i.quantity || 0)), 0)

  // Handle Adjust Stock (Inventory Correction via Physical Count Only)
  const handleOpenAdjustment = (item) => {
    setSelectedItem(item)
    setAdjustmentData({
      physical_count: '',
      reason: 'Inventory Count Correction',
      custom_reason: '',
      notes: ''
    })
    setShowAdjustment(true)
  }

  const handleSaveAdjustment = async (e) => {
    e.preventDefault()
    if (!selectedItem) return

    const rawInput = String(adjustmentData.physical_count).trim()
    if (rawInput === '' || isNaN(Number(rawInput))) {
      Swal.fire({
        icon: 'error',
        title: 'Physical Count Required',
        text: 'Please enter a valid numeric physical stock count.',
        confirmButtonColor: '#f97316'
      })
      return
    }

    const physicalCount = Number(rawInput)
    if (physicalCount < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Physical Count',
        text: 'Physical stock count cannot be negative.',
        confirmButtonColor: '#f97316'
      })
      return
    }

    const currentStock = Number(selectedItem.quantity || 0)
    if (physicalCount === currentStock) {
      Swal.fire({
        icon: 'info',
        title: 'No Adjustment Needed',
        text: 'No adjustment needed. The physical count matches the current stock.',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    if (adjustmentData.reason === 'Other' && !adjustmentData.custom_reason.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Reason Required',
        text: 'Please specify the custom reason for this inventory adjustment.',
        confirmButtonColor: '#f97316'
      })
      return
    }

    const effectiveReason = adjustmentData.reason === 'Other'
      ? adjustmentData.custom_reason.trim()
      : adjustmentData.reason

    let adjType = 'adjustment'
    if (adjustmentData.reason === 'Damaged Stock') adjType = 'damaged'
    else if (adjustmentData.reason === 'Expired Stock') adjType = 'expired'
    else if (adjustmentData.reason === 'Returned Stock') adjType = 'return'

    const delta = physicalCount - currentStock
    const newStatus = calculateStockStatus(physicalCount, selectedItem.low_stock_threshold)

    try {
      setSubmitting(true)

      // 1. Optimistically update inventory state immediately
      setInventory(prev => prev.map(item => {
        if (item.id === selectedItem.id || item.product_id === selectedItem.product_id) {
          return {
            ...item,
            quantity: physicalCount,
            stock_quantity: physicalCount,
            stock_status: newStatus
          }
        }
        return item
      }))

      // 2. Synchronize with backend API & shared storage
      await adjustStock({
        product_id: selectedItem.product_id || selectedItem.id,
        product_name: selectedItem.product_name,
        quantity_change: delta,
        quantity_before: currentStock,
        quantity_after: physicalCount,
        reason: effectiveReason,
        notes: adjustmentData.notes ? adjustmentData.notes.trim() : '',
        adjustment_type: adjType
      })

      Swal.fire({
        icon: 'success',
        title: 'Inventory Count Adjusted! 📦',
        text: `${selectedItem.product_name} adjusted from ${currentStock} to ${physicalCount} ${selectedItem.unit} (${delta > 0 ? '+' + delta : delta} ${selectedItem.unit}).`,
        confirmButtonColor: '#f97316',
        timer: 2400,
        showConfirmButton: false
      })

      setShowAdjustment(false)
      setSelectedItem(null)
      fetchInventory()
    } catch (err) {
      console.error('Stock adjust error:', err)
      Swal.fire({
        icon: 'error',
        title: 'Adjustment Failed',
        text: err.message || 'Could not save stock adjustment. Please try again.',
        confirmButtonColor: '#f97316'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Open Restock Modal (Receiving New Inventory from Supplier / PO)
  const handleOpenRestock = (item = null) => {
    setRestockProduct(item)
    const baseCost = item ? (item.cost_price ?? '') : ''
    setRestockFormData({
      product_id: item ? (item.product_id || item.id) : (inventory[0]?.product_id || inventory[0]?.id || ''),
      supplier_id: item?.supplier_id || (suppliers[0]?.id || ''),
      quantity: '',
      reference_number: '',
      cost_price: baseCost,
      notes: ''
    })
    setShowRestockModal(true)
  }

  // Handle Submit Restock
  const handleSaveRestock = async (e) => {
    e.preventDefault()
    const targetProd = restockProduct || inventory.find(i => String(i.product_id || i.id) === String(restockFormData.product_id))
    const prodId = restockFormData.product_id || targetProd?.product_id || targetProd?.id
    if (!prodId || !targetProd) {
      Swal.fire({ icon: 'error', title: 'Product Required', text: 'Please select a product to restock.' })
      return
    }

    const qty = parseInt(restockFormData.quantity, 10)
    if (!qty || qty <= 0) {
      Swal.fire({ icon: 'error', title: 'Invalid Quantity', text: 'Received stock quantity must be at least 1 unit.' })
      return
    }

    const cost = restockFormData.cost_price !== '' ? parseFloat(restockFormData.cost_price) : parseFloat(targetProd.cost_price || 0)
    if (isNaN(cost) || cost < 0) {
      Swal.fire({ icon: 'error', title: 'Invalid Unit Cost', text: 'Please enter a valid unit cost (greater than or equal to 0).' })
      return
    }

    const supplierObj = suppliers.find(s => String(s.id) === String(restockFormData.supplier_id))
    const currentQty = Number(targetProd.quantity || 0)
    const newTotal = currentQty + qty
    const newStatus = calculateStockStatus(newTotal, targetProd.low_stock_threshold)

    try {
      setSubmittingRestock(true)

      // 1. Optimistically update inventory state
      setInventory(prev => prev.map(item => {
        if (item.id === targetProd.id || item.product_id === targetProd.product_id) {
          return {
            ...item,
            quantity: newTotal,
            stock_quantity: newTotal,
            stock_status: newStatus,
            cost_price: cost > 0 ? cost : item.cost_price
          }
        }
        return item
      }))

      // 2. Submit to backend (creates batch and logs stock adjustment record)
      const payload = {
        product_id: Number(prodId),
        product_name: targetProd.product_name,
        quantity: qty,
        quantity_before: currentQty,
        quantity_after: newTotal,
        supplier_id: restockFormData.supplier_id ? Number(restockFormData.supplier_id) : null,
        supplier_name: supplierObj?.name || '',
        reference_number: restockFormData.reference_number ? restockFormData.reference_number.trim() : '',
        purchase_order: restockFormData.reference_number ? restockFormData.reference_number.trim() : '',
        cost_price: cost,
        selling_price: Number(targetProd.selling_price || targetProd.unit_price || 0),
        received_date: new Date().toISOString().split('T')[0],
        notes: restockFormData.notes ? restockFormData.notes.trim() : ''
      }

      await createProductBatch(prodId, payload)

      Swal.fire({
        icon: 'success',
        title: 'Stock Replenished! 📦',
        text: `Received ${qty} ${targetProd.unit} for ${targetProd.product_name}. New stock: ${newTotal} ${targetProd.unit}.`,
        confirmButtonColor: '#f97316',
        timer: 2400,
        showConfirmButton: false
      })

      setShowRestockModal(false)
      setRestockProduct(null)
      fetchInventory()
    } catch (err) {
      console.error('Restock error:', err)
      Swal.fire({
        icon: 'error',
        title: 'Restock Failed',
        text: err.message || 'Could not record restock delivery. Please try again.'
      })
    } finally {
      setSubmittingRestock(false)
    }
  }

  // Handle Open History Modal (Batches + Movement Logs)
  const handleOpenHistory = async (item, initialTab = 'movements') => {
    setHistoryItem(item)
    setShowHistory(true)
    setHistoryTab(initialTab)
    setLoadingHistory(true)
    try {
      const prodId = item.product_id || item.id
      const [batchesRes, logsRes] = await Promise.allSettled([
        getProductBatches(prodId),
        getStockAdjustments(prodId)
      ])

      if (batchesRes.status === 'fulfilled' && batchesRes.value) {
        setProductBatchesData(batchesRes.value)
      } else {
        setProductBatchesData(null)
      }

      if (logsRes.status === 'fulfilled' && logsRes.value) {
        const list = Array.isArray(logsRes.value) ? logsRes.value : logsRes.value?.data || []
        setHistoryLogs(list)
      } else {
        setHistoryLogs([])
      }
    } catch (err) {
      console.warn('Failed to load history:', err)
      setProductBatchesData(null)
      setHistoryLogs([])
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div className="management-container">
      {/* Header */}
      <div className="management-header">
        <div>
          <p className="eyebrow" style={{ color: '#f97316', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>
            Warehouse &amp; Stock Levels
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
            Inventory Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Track real-time stock levels, active/inactive catalog items, and view full change logs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchInventory}
            style={{ padding: '9px 16px', fontSize: '13px' }}
          >
            <RefreshCw size={15} /> Refresh Stock
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenRestock(null)}
            style={{ padding: '9px 16px', fontSize: '13px', background: '#ea580c', borderColor: '#ea580c' }}
          >
            <Plus size={15} /> Receive Restock
          </button>
        </div>
      </div>

      {/* Stock Status Metrics Grid */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="metric-card">
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Total Catalog Items
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            {totalCatalogItems}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {inventory.length} Total Registered
          </span>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase' }}>
            In Stock
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', margin: '4px 0' }}>
            {inStockCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Healthy stock level
          </span>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase' }}>
            Low Stock Alerts ⚠️
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', margin: '4px 0' }}>
            {lowStockCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Below Reorder Level
          </span>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase' }}>
            Out of Stock 🚨
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444', margin: '4px 0' }}>
            {outOfStockCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Zero Available Stock
          </span>
        </div>

        <div className="metric-card">
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Total Inventory Value
          </span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            ₱{totalValuation.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Available stock × cost price
          </span>
        </div>
      </div>

      {/* Search & Multi-Filter Control Bar */}
      <div className="management-controls">
        {/* Dynamic Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 2, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search inventory by product name, category, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ border: 'none', padding: '6px 0', outline: 'none', width: '100%', fontSize: '13.5px', background: 'transparent', color: 'var(--text-primary)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Active / Inactive Status Filter */}
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="filter-select"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="all">All Item Statuses</option>
          <option value="active">🟢 Active Only</option>
          <option value="inactive">🔴 Inactive Only</option>
        </select>

        {/* Stock Quantity Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="all">All Stock Levels</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="all">All Categories</option>
          {categoriesList.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="loading" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading synchronized inventory records...
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <Package size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No products found</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            No inventory items matched your search query "{search}". Try resetting filters.
          </p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '12px', display: 'inline-flex' }}
            onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setActivityFilter('all'); }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Product &amp; Batches</th>
                <th style={{ width: '12%' }}>Category</th>
                <th style={{ width: '11%' }}>Cost Price</th>
                <th style={{ width: '13%' }}>Selling Price</th>
                <th style={{ width: '12%' }}>Stock Quantity</th>
                <th style={{ width: '10%' }}>Stock Status</th>
                <th style={{ width: '8%' }}>Status</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => {
                const isActive = item.status === 'active'
                const stockStatus = item.stock_status || calculateStockStatus(item.quantity, item.low_stock_threshold)
                return (
                  <tr key={item.id || item.product_id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{item.product_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Supplier / Brand: {item.supplier}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(item)}
                        style={{
                          background: 'rgba(249, 115, 22, 0.12)',
                          border: '1px solid rgba(249, 115, 22, 0.28)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          color: '#f97316',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          marginTop: '3px'
                        }}
                        title="Click to view batch breakdown and history"
                      >
                        <Package size={11} /> {item.batches_count || 1} {item.batches_count === 1 ? 'Batch' : 'Batches'}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.category}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                        ₱{item.cost_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Cost / {getUnitBadgeText(item.unit, false)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#ea580c', fontSize: '13.5px' }}>
                           ₱{item.selling_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          background: item.margin_percent >= 20 ? '#ecfdf5' : '#fef3c7',
                          color: item.margin_percent >= 20 ? '#16a34a' : '#b45309'
                        }}>
                          {item.margin_percent}% margin
                        </span>
                      </div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>per {getUnitBadgeText(item.unit, false)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <strong style={{ fontSize: '14.5px', color: stockStatus === 'out_of_stock' ? '#ef4444' : 'var(--text-primary)' }}>
                          {formatQuantityWithUnit(item.quantity, item.unit)}
                        </strong>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                        Min: {formatQuantityWithUnit(item.low_stock_threshold, item.unit)}
                      </span>
                    </td>
                    <td>
                      {stockStatus === 'in_stock' ? (
                        <span
                          className="stock-status-badge in-stock"
                          style={{
                            position: 'static',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>✓ In Stock</span>
                        </span>
                      ) : stockStatus === 'low_stock' ? (
                        <span
                          className="stock-status-badge low-stock"
                          style={{
                            position: 'static',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <AlertTriangle size={13} color="#f59e0b" />
                          <span>⚠ Low Stock</span>
                        </span>
                      ) : (
                        <span
                          className="stock-status-badge out-of-stock"
                          style={{
                            position: 'static',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <XCircle size={13} color="#ef4444" />
                          <span>✕ Out of Stock</span>
                        </span>
                      )}
                    </td>

                    {/* Active / Inactive Status Icon Button */}
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        title={isActive ? "Product is Active — Click to Deactivate" : "Product is Inactive — Click to Activate"}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          border: isActive ? '1px solid #86efac' : '1px solid #fca5a5',
                          background: isActive ? '#f0fdf4' : '#fef2f2',
                          color: isActive ? '#15803d' : '#b91c1c',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 size={13} color="#16a34a" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} color="#dc2626" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions: Restock + History + Adjust */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        {/* Restock Button - Orange Primary Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenRestock(item)}
                          title={`Receive new inventory stock for ${item.product_name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            color: '#ffffff',
                            background: '#ea580c',
                            border: '1px solid #ea580c',
                            borderRadius: '7px',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={12} />
                          <span>Restock</span>
                        </button>

                        {/* History Button - Neutral Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(item, 'movements')}
                          title={`View stock movement history for ${item.product_name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '7px',
                            cursor: 'pointer'
                          }}
                        >
                          <History size={12} />
                          <span>History</span>
                        </button>

                        {/* Adjust Button - Secondary Action */}
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenAdjustment(item)}
                          style={{ padding: '5px 9px', fontSize: '11.5px' }}
                          title="Correct inventory based on physical count"
                        >
                          Adjust
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

      {/* =========================================================================
          MODAL: STOCK ADJUSTMENT (INVENTORY CORRECTION ONLY)
          ========================================================================= */}
      {showAdjustment && selectedItem && (() => {
        const currentStock = Number(selectedItem.quantity || 0)
        const hasInput = adjustmentData.physical_count !== '' && !isNaN(Number(adjustmentData.physical_count))
        const physicalVal = hasInput ? Number(adjustmentData.physical_count) : null
        const isNegative = hasInput && physicalVal < 0
        const isSame = hasInput && physicalVal === currentStock
        const delta = hasInput ? physicalVal - currentStock : 0
        const deltaFormatted = delta > 0 ? `+${delta}` : `${delta}`

        return (
          <div className="modal-overlay" onClick={() => setShowAdjustment(false)}>
            <div className="modal-content" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    Adjust Stock Quantity
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Inventory correction based on physical stock count
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdjustment(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Product & Category & Current System Stock */}
                <div style={{ background: 'var(--bg-hover)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
                    {selectedItem.category}
                  </span>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px', marginBottom: '6px' }}>
                    {selectedItem.product_name}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Current / System Stock:</span>
                    <strong style={{ fontSize: '14px', color: '#ea580c' }}>
                      {formatQuantityWithUnit(currentStock, selectedItem.unit)}
                    </strong>
                  </div>
                </div>

                {/* Physical Count Input */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Physical Count <span style={{ color: '#ef4444' }}>*</span></span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Unit: {getUnitBadgeText(selectedItem.unit, true)}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder={`Enter actual counted ${selectedItem.unit || 'units'}`}
                    value={adjustmentData.physical_count}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, physical_count: e.target.value })}
                    required
                    autoFocus
                  />
                  {isNegative && (
                    <span style={{ fontSize: '11.5px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                      Physical count cannot be negative.
                    </span>
                  )}
                </div>

                {/* Live Calculation Display: Adjustment & New Stock */}
                {hasInput && !isNegative && (
                  <div style={{
                    background: isSame ? 'rgba(59, 130, 246, 0.08)' : delta > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${isSame ? 'rgba(59, 130, 246, 0.3)' : delta > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}>
                    {isSame ? (
                      <div style={{ color: '#3b82f6', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>ℹ️</span>
                        <span>No adjustment needed. The physical count matches the current stock.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                            Adjustment
                          </span>
                          <strong style={{ fontSize: '15px', color: delta > 0 ? '#10b981' : '#ef4444' }}>
                            {deltaFormatted} {selectedItem.unit}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                            New Stock
                          </span>
                          <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                            {formatQuantityWithUnit(physicalVal, selectedItem.unit)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason for Adjustment */}
                <div className="form-group">
                  <label className="form-label">Reason for Adjustment <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className="form-input"
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                    required
                  >
                    <option value="Inventory Count Correction">Inventory Count Correction</option>
                    <option value="Damaged Stock">Damaged Stock</option>
                    <option value="Lost / Missing Stock">Lost / Missing Stock</option>
                    <option value="Expired Stock">Expired Stock</option>
                    <option value="Returned Stock">Returned Stock</option>
                    <option value="Data Entry Correction">Data Entry Correction</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Custom Reason if "Other" */}
                {adjustmentData.reason === 'Other' && (
                  <div className="form-group">
                    <label className="form-label">Specify Custom Reason <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Broken packaging during store transfer"
                      value={adjustmentData.custom_reason}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, custom_reason: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* Notes / Reference */}
                <div className="form-group">
                  <label className="form-label">Notes / Reference (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Audit tag #34, inspection remarks"
                    value={adjustmentData.notes}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowAdjustment(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={submitting || isSame || isNegative || !hasInput}
                  >
                    {submitting ? 'Saving...' : 'Save Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* =========================================================================
          MODAL: RESTOCK (RECEIVING NEW INVENTORY ONLY)
          ========================================================================= */}
      {showRestockModal && (() => {
        const activeProd = restockProduct || inventory.find(i => String(i.product_id || i.id) === String(restockFormData.product_id))
        const currentQty = Number(activeProd?.quantity || 0)
        const qtyReceived = Number(restockFormData.quantity || 0)
        const newStock = currentQty + qtyReceived

        return (
          <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
            <div
              className="modal-content"
              style={{ maxWidth: '520px', width: '100%', borderRadius: '16px', padding: '24px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={20} color="#ea580c" />
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                      Restock Inventory
                    </h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Receive incoming stock delivery from supplier or purchase order
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveRestock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Product Selection / Display */}
                <div className="form-group">
                  <label className="form-label">Product <span style={{ color: '#ef4444' }}>*</span></label>
                  {restockProduct ? (
                    <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
                        {restockProduct.category}
                      </span>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px', marginBottom: '4px' }}>
                        {restockProduct.product_name}
                      </h4>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Current Stock: <strong style={{ color: '#ea580c' }}>{formatQuantityWithUnit(currentQty, restockProduct.unit)}</strong>
                      </div>
                    </div>
                  ) : (
                    <select
                      className="form-input"
                      value={restockFormData.product_id}
                      onChange={(e) => {
                        const sel = inventory.find(i => String(i.product_id || i.id) === String(e.target.value))
                        setRestockFormData({
                          ...restockFormData,
                          product_id: e.target.value,
                          cost_price: sel?.cost_price || '',
                          supplier_id: sel?.supplier_id || restockFormData.supplier_id
                        })
                      }}
                      required
                    >
                      <option value="">-- Select Product to Restock --</option>
                      {inventory.map(item => (
                        <option key={item.id || item.product_id} value={item.product_id || item.id}>
                          {item.product_name} ({formatQuantityWithUnit(item.quantity, item.unit)} in stock)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* If selected product from dropdown */}
                {!restockProduct && activeProd && (
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current Stock:</span>
                    <strong style={{ color: '#ea580c' }}>{formatQuantityWithUnit(currentQty, activeProd.unit)}</strong>
                  </div>
                )}

                {/* Quantity Received & Supplier */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Quantity Received <span style={{ color: '#ef4444' }}>*</span></span>
                      {activeProd && (
                        <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '700' }}>
                          in {getUnitBadgeText(activeProd.unit, true)}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      placeholder={`e.g. 20 ${activeProd?.unit || ''}`}
                      value={restockFormData.quantity}
                      onChange={(e) => setRestockFormData({ ...restockFormData, quantity: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                      className="form-input"
                      value={restockFormData.supplier_id}
                      onChange={(e) => setRestockFormData({ ...restockFormData, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* PO / Reference Number & Unit Cost */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">PO / Reference Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. PO-1042 / DR #8821"
                      value={restockFormData.reference_number}
                      onChange={(e) => setRestockFormData({ ...restockFormData, reference_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit Cost (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={restockFormData.cost_price}
                      onChange={(e) => setRestockFormData({ ...restockFormData, cost_price: e.target.value })}
                    />
                  </div>
                </div>

                {/* Live Stock Calculation Banner */}
                {activeProd && qtyReceived > 0 && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                        Calculation
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {currentQty} + {qtyReceived} = <strong style={{ color: '#10b981' }}>{newStock} {activeProd.unit}</strong>
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                        New Stock
                      </span>
                      <strong style={{ fontSize: '16px', color: '#10b981' }}>
                        {newStock} {activeProd.unit}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Notes / Remarks */}
                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Delivered via truck 2, inspected good condition"
                    value={restockFormData.notes}
                    onChange={(e) => setRestockFormData({ ...restockFormData, notes: e.target.value })}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowRestockModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2, background: '#ea580c', borderColor: '#ea580c' }}
                    disabled={submittingRestock || !activeProd || qtyReceived <= 0}
                  >
                    {submittingRestock ? 'Saving Restock...' : 'Save Restock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* =========================================================================
          MODAL: PRODUCT INVENTORY & BATCH HISTORY (DUAL TAB)
          ========================================================================= */}
      {showHistory && historyItem && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '860px', width: '100%', borderRadius: '16px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={20} color="#ea580c" />
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    Product Inventory History
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <strong>{historyItem.product_name}</strong> · Total In-Stock: <strong style={{ color: '#ea580c' }}>{historyItem.quantity} {historyItem.unit}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setHistoryTab('batches')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: historyTab === 'batches' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                  color: historyTab === 'batches' ? '#ea580c' : 'var(--text-muted)'
                }}
              >
                <Package size={15} />
                <span>Inventory Batches ({productBatchesData?.batches?.length ?? historyItem.batches_count ?? 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('movements')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: historyTab === 'movements' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                  color: historyTab === 'movements' ? '#ea580c' : 'var(--text-muted)'
                }}
              >
                <Clock size={15} />
                <span>Stock Movement Logs ({historyLogs.length})</span>
              </button>
            </div>

            {/* Content Body */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading product history records...
                </div>
              ) : historyTab === 'batches' ? (
                <div>
                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: 'var(--bg-hover)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Batches Logged</span>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {productBatchesData?.summary?.total_batches || productBatchesData?.batches?.length || 1}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>Active In-Stock Batches</span>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>
                        {productBatchesData?.summary?.active_batches_count ?? productBatchesData?.batches?.filter(b => b.status === 'active' && b.quantity > 0).length ?? 1}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(249, 115, 22, 0.12)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                      <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '700', textTransform: 'uppercase' }}>Previous / Depleted Batches</span>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#f97316' }}>
                        {productBatchesData?.summary?.previous_batches_count ?? productBatchesData?.batches?.filter(b => b.status !== 'active' || b.quantity <= 0).length ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Batch Records Table */}
                  {!productBatchesData || !productBatchesData.batches || productBatchesData.batches.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--bg-hover)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                      <Package size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                      <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>No batches found</h4>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Use the "Restock" button to receive incoming stock batches for this product.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Current &amp; Historical Batches
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Older records &amp; prices are permanently preserved
                        </span>
                      </div>
                      <table className="management-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '18%' }}>Batch #</th>
                            <th style={{ width: '22%' }}>Supplier &amp; Notes</th>
                            <th style={{ width: '12%' }}>Cost Price</th>
                            <th style={{ width: '13%' }}>Selling Price</th>
                            <th style={{ width: '13%' }}>Stock (Remain / Init)</th>
                            <th style={{ width: '12%' }}>Received</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productBatchesData.batches.map(batch => {
                            const isDepleted = Number(batch.quantity || 0) <= 0 || batch.status === 'depleted'
                            const isExpired = batch.status === 'expired'
                            const cost = Number(batch.cost_price || 0)
                            const selling = Number(batch.selling_price || 0)
                            const margin = selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0

                            return (
                              <tr key={batch.id} style={{ opacity: isDepleted ? 0.75 : 1 }}>
                                <td>
                                  <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{batch.batch_number}</strong>
                                  {batch.expiration_date ? (
                                    <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: '600' }}>
                                      Exp: {batch.expiration_date}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>No Expiration</span>
                                  )}
                                </td>
                                <td>
                                  <strong style={{ color: 'var(--text-primary)', display: 'block' }}>
                                    {batch.supplier_name || batch.supplier?.name || '—'}
                                  </strong>
                                  {batch.notes && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{batch.notes}</span>
                                  )}
                                </td>
                                <td>
                                  <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>
                                    ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: '#f97316' }}>
                                    ₱{selling.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </strong>
                                  <span style={{ display: 'block', fontSize: '10px', color: '#10b981', fontWeight: '700' }}>
                                    {margin}% margin
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: isDepleted ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '13px' }}>
                                    {formatQuantityWithUnit(batch.quantity, historyItem.unit)}
                                  </strong>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>
                                    Initial: {formatQuantityWithUnit(batch.initial_quantity, historyItem.unit)}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                                  {batch.received_date || '—'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {isExpired ? (
                                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '10px' }}>EXPIRED</span>
                                  ) : isDepleted ? (
                                    <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '10px' }}>DEPLETED</span>
                                  ) : (
                                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '10px' }}>ACTIVE</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Stock Movement Logs */
                <div>
                  {historyLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-hover)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                      <Clock size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                      <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>No movement logs yet</h4>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Stock adjustments, restock shipments, or POS sales will appear in this history log automatically.
                      </p>
                    </div>
                  ) : (
                    <table className="management-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '16%' }}>Date &amp; Time</th>
                          <th style={{ width: '16%' }}>Transaction Type</th>
                          <th style={{ width: '12%' }}>Quantity Change</th>
                          <th style={{ width: '16%' }}>Stock Movement</th>
                          <th style={{ width: '22%' }}>Reason &amp; Reference</th>
                          <th style={{ width: '18%' }}>Performed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyLogs.map((log, idx) => {
                          const qtyChanged = Number(log.quantity_changed ?? 0)
                          const isPositive = qtyChanged > 0
                          const isZero = qtyChanged === 0
                          const dateStr = log.created_at
                            ? new Date(log.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
                            : 'Recent'
                          const typeBadge = getTransactionTypeBadge(log.adjustment_type || log.type)
                          const supplierName = log.supplier?.name || log.supplier_name
                          const refNo = log.reference_number || log.purchase_order

                          return (
                            <tr key={log.id || idx}>
                              <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                                {dateStr}
                              </td>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10.5px',
                                  fontWeight: '800',
                                  letterSpacing: '0.03em',
                                  background: typeBadge.bg,
                                  color: typeBadge.color,
                                  border: typeBadge.border,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {typeBadge.label}
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: '700',
                                  fontSize: '12px',
                                  background: isZero ? 'var(--bg-hover)' : isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  color: isZero ? 'var(--text-secondary)' : isPositive ? '#10b981' : '#ef4444',
                                  border: isZero ? '1px solid var(--border-color)' : isPositive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {isPositive ? `+${formatQuantityWithUnit(qtyChanged, historyItem.unit)}` : formatQuantityWithUnit(qtyChanged, historyItem.unit)}
                                </span>
                              </td>
                              <td>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '12px' }}>
                                  {log.quantity_before != null ? formatQuantityWithUnit(log.quantity_before, historyItem.unit) : '—'} ➔ {log.quantity_after != null ? formatQuantityWithUnit(log.quantity_after, historyItem.unit) : '—'}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '12px' }}>
                                  {log.reason || 'Stock Update'}
                                </strong>
                                {(supplierName || refNo) && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {supplierName && <span>Supplier: <strong style={{ color: 'var(--text-primary)' }}>{supplierName}</strong> </span>}
                                    {refNo && <span>(PO/Ref: <strong style={{ color: '#ea580c' }}>{refNo}</strong>)</span>}
                                  </div>
                                )}
                                {log.notes && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                                    {log.notes}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', fontWeight: '500' }}>
                                  {log.user?.name || 'System Administrator'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-color)', marginTop: '14px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowHistory(false)
                  handleOpenRestock(historyItem)
                }}
                style={{ padding: '7px 16px', fontSize: '13px', background: '#ea580c', borderColor: '#ea580c' }}
              >
                <Plus size={14} /> Receive Restock For This Product
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowHistory(false)}
                style={{ padding: '7px 18px', fontSize: '13px' }}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

