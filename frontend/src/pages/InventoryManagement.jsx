import React, { useEffect, useState, useMemo } from 'react'
import {
  Search, AlertCircle, Plus, Minus, RefreshCw, Package,
  Layers, Filter, ArrowUpDown, X, Check, Eye, History,
  CheckCircle2, XCircle, Clock, Power
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

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, in_stock, low_stock, out_of_stock
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all') // all, active, inactive

  // Stock Adjustment Modal
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: '',
    type: 'add', // add or deduct
    reason: 'Restock shipment received from supplier',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // New Batch Restock Modal
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchProduct, setBatchProduct] = useState(null)
  const [batchFormData, setBatchFormData] = useState({
    product_id: '',
    supplier_id: '',
    quantity: '',
    cost_price: '',
    selling_price: '',
    received_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    notes: ''
  })
  const [submittingBatch, setSubmittingBatch] = useState(false)

  // History Modal State (Batches + Movement Logs)
  const [showHistory, setShowHistory] = useState(false)
  const [historyItem, setHistoryItem] = useState(null)
  const [historyTab, setHistoryTab] = useState('batches') // 'batches' | 'movements'
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
          let stockStatus = 'in_stock'
          if (qty === 0) stockStatus = 'out_of_stock'
          else if (qty <= threshold) stockStatus = 'low_stock'

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
  const totalItemsCount = inventory.length
  const inStockCount = inventory.filter(i => i.stock_status === 'in_stock').length
  const lowStockCount = inventory.filter(i => i.stock_status === 'low_stock').length
  const outOfStockCount = inventory.filter(i => i.stock_status === 'out_of_stock').length
  const totalValuation = inventory.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0)

  // Handle Adjust Stock
  const handleOpenAdjustment = (item) => {
    setSelectedItem(item)
    setAdjustmentData({
      quantity: '',
      type: 'add',
      reason: 'Restock shipment received from supplier',
      notes: ''
    })
    setShowAdjustment(true)
  }

  const handleSaveAdjustment = async (e) => {
    e.preventDefault()
    const qtyChange = Number(adjustmentData.quantity)
    if (!qtyChange || qtyChange <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Quantity',
        text: 'Please enter a valid stock quantity adjustment greater than 0.',
        confirmButtonColor: '#f97316'
      })
      return
    }

    try {
      setSubmitting(true)
      const delta = adjustmentData.type === 'add' ? qtyChange : -qtyChange
      const newTotal = Math.max(0, selectedItem.quantity + delta)
      const newStatus = newTotal === 0 ? 'out_of_stock' : (newTotal <= selectedItem.low_stock_threshold ? 'low_stock' : 'in_stock')

      // 1. Update State immediately for instant UI response
      setInventory(prev => prev.map(item => {
        if (item.id === selectedItem.id || item.product_id === selectedItem.product_id) {
          return {
            ...item,
            quantity: newTotal,
            stock_quantity: newTotal,
            stock_status: newStatus
          }
        }
        return item
      }))

      // 2. Synchronize with Backend & Shared Storage
      await adjustStock({
        product_id: selectedItem.product_id || selectedItem.id,
        product_name: selectedItem.product_name,
        quantity_change: delta,
        quantity_before: selectedItem.quantity,
        quantity_after: newTotal,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes,
        adjustment_type: adjustmentData.type === 'add' ? 'restock' : 'damaged'
      })

      Swal.fire({
        icon: 'success',
        title: 'Inventory Count Adjusted! 📦',
        text: `${selectedItem.product_name} new stock level: ${newTotal} ${selectedItem.unit}.`,
        confirmButtonColor: '#f97316',
        timer: 2200,
        showConfirmButton: false
      })

      setShowAdjustment(false)
      setSelectedItem(null)
    } catch (err) {
      console.error('Stock adjust error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Open Restock Batch Modal
  const handleOpenNewBatch = (item = null) => {
    setBatchProduct(item)
    const baseSelling = item ? (item.selling_price ?? item.unit_price ?? '') : ''
    const baseCost = item ? (item.cost_price ?? (baseSelling ? (Number(baseSelling) * 0.7).toFixed(2) : '')) : ''
    setBatchFormData({
      product_id: item ? (item.product_id || item.id) : (inventory[0]?.product_id || inventory[0]?.id || ''),
      supplier_id: item?.supplier_id || (suppliers[0]?.id || ''),
      quantity: '',
      cost_price: baseCost,
      selling_price: baseSelling,
      received_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
      notes: ''
    })
    setShowBatchModal(true)
  }

  // Handle Submit New Batch
  const handleSaveNewBatch = async (e) => {
    e.preventDefault()
    const prodId = batchFormData.product_id || batchProduct?.product_id || batchProduct?.id
    if (!prodId) {
      Swal.fire({ icon: 'error', title: 'Product Required', text: 'Please select a product for this batch.' })
      return
    }
    const qty = parseInt(batchFormData.quantity, 10)
    if (!qty || qty <= 0) {
      Swal.fire({ icon: 'error', title: 'Invalid Quantity', text: 'Received batch quantity must be at least 1 unit.' })
      return
    }
    const cost = parseFloat(batchFormData.cost_price)
    if (isNaN(cost) || cost < 0) {
      Swal.fire({ icon: 'error', title: 'Invalid Cost Price', text: 'Please enter a valid cost price per unit.' })
      return
    }
    const selling = parseFloat(batchFormData.selling_price)
    if (isNaN(selling) || selling <= 0) {
      Swal.fire({ icon: 'error', title: 'Invalid Selling Price', text: 'Please enter a valid selling price per unit.' })
      return
    }

    try {
      setSubmittingBatch(true)
      const supplierObj = suppliers.find(s => String(s.id) === String(batchFormData.supplier_id))
      const payload = {
        product_id: Number(prodId),
        supplier_id: batchFormData.supplier_id ? Number(batchFormData.supplier_id) : null,
        supplier_name: supplierObj?.name || '',
        quantity: qty,
        cost_price: cost,
        selling_price: selling,
        received_date: batchFormData.received_date || new Date().toISOString().split('T')[0],
        expiration_date: batchFormData.expiration_date || null,
        notes: batchFormData.notes || 'Restock shipment batch'
      }

      await createProductBatch(prodId, payload)

      Swal.fire({
        icon: 'success',
        title: 'New Batch Received! 📦',
        text: `Successfully created new inventory batch of ${qty} units. Previous batches are safely preserved in history.`,
        confirmButtonColor: '#f97316'
      })

      setShowBatchModal(false)
      fetchInventory()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Batch Creation Failed',
        text: err.message || 'Could not save inventory batch. Please try again.'
      })
    } finally {
      setSubmittingBatch(false)
    }
  }

  // Handle Open History Modal (Batches + Movement Logs)
  const handleOpenHistory = async (item) => {
    setHistoryItem(item)
    setShowHistory(true)
    setHistoryTab('batches')
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
        setHistoryLogs(Array.isArray(logsRes.value) ? logsRes.value : logsRes.value?.data || [])
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
            onClick={() => handleOpenNewBatch(null)}
            style={{ padding: '9px 16px', fontSize: '13px' }}
          >
            <Plus size={15} /> Receive New Batch
          </button>
        </div>
      </div>

      {/* Stock Status Metrics Grid */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Total Catalog Items
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            {totalItemsCount}
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
            {inStockCount} In Stock
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
            Across all warehouses
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
          <option value="in_stock">🟢 In Stock</option>
          <option value="low_stock">🟡 Low Stock</option>
          <option value="out_of_stock">🔴 Out of Stock</option>
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
                        <strong style={{ fontSize: '14.5px', color: item.stock_status === 'out_of_stock' ? '#ef4444' : 'var(--text-primary)' }}>
                          {formatQuantityWithUnit(item.quantity, item.unit)}
                        </strong>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                        Min: {formatQuantityWithUnit(item.low_stock_threshold, item.unit)}
                      </span>
                    </td>
                    <td>
                      {item.stock_status === 'in_stock' && (
                        <span className="badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: '800' }}>
                          ● In Stock
                        </span>
                      )}
                      {item.stock_status === 'low_stock' && (
                        <span className="badge" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: '800' }}>
                          ⚠️ Low Stock
                        </span>
                      )}
                      {item.stock_status === 'out_of_stock' && (
                        <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: '800' }}>
                          🚨 Out of Stock
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

                    {/* Actions: Restock Batch + Blended History Button + Adjust */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                        {/* Receive Batch Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenNewBatch(item)}
                          title={`Receive new inventory batch for ${item.product_name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 9px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            color: '#f97316',
                            background: 'rgba(249, 115, 22, 0.12)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            borderRadius: '7px',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={12} />
                          <span>Restock</span>
                        </button>

                        {/* Blended History Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(item)}
                          title={`View batches and stock movement history for ${item.product_name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 9px',
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

                        {/* Adjust Stock Button */}
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenAdjustment(item)}
                          style={{ padding: '5px 8px', fontSize: '11.5px' }}
                          title="Adjust Stock Quantity manually"
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
          MODAL: STOCK ADJUSTMENT
          ========================================================================= */}
      {showAdjustment && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowAdjustment(false)}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Adjust Stock Quantity
              </h2>
              <button
                type="button"
                onClick={() => setShowAdjustment(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-hover)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
                  {selectedItem.category}
                </span>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedItem.product_name}
                </h4>
                <div style={{ fontSize: '13px', color: '#ea580c', fontWeight: '700', marginTop: '4px' }}>
                  Current Stock: {formatQuantityWithUnit(selectedItem.quantity, selectedItem.unit)}
                </div>
              </div>

              {/* Adjustment Type Selector */}
              <div className="form-group">
                <label className="form-label">Action Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${adjustmentData.type === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setAdjustmentData({ ...adjustmentData, type: 'add' })}
                    style={{ padding: '8px' }}
                  >
                    <Plus size={14} /> Add Stock (+)
                  </button>
                  <button
                    type="button"
                    className={`btn ${adjustmentData.type === 'deduct' ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setAdjustmentData({ ...adjustmentData, type: 'deduct' })}
                    style={{ padding: '8px' }}
                  >
                    <Minus size={14} /> Deduct Stock (-)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">
                  {getQuantityInputLabel(selectedItem.unit, adjustmentData.type === 'add' ? 'Quantity to Add' : 'Quantity to Deduct')}
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder={getQuantityPlaceholder(selectedItem.unit, 20)}
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                  required
                />
                {adjustmentData.quantity && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', background: 'var(--bg-hover)', padding: '6px 10px', borderRadius: '6px' }}>
                    Resulting Stock: <strong style={{ color: 'var(--text-primary)' }}>{formatQuantityWithUnit(
                      adjustmentData.type === 'add'
                        ? Number(selectedItem.quantity) + Number(adjustmentData.quantity)
                        : Math.max(0, Number(selectedItem.quantity) - Number(adjustmentData.quantity)),
                      selectedItem.unit
                    )}</strong>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="form-group">
                <label className="form-label">Reason for Adjustment</label>
                <select
                  className="form-input"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                >
                  <option value="Restock shipment received from supplier">Restock shipment received from supplier</option>
                  <option value="Physical inventory count audit correction">Physical inventory count audit correction</option>
                  <option value="Damaged / weather degraded stock">Damaged / weather degraded stock</option>
                  <option value="Customer / Job site return">Customer / Job site return</option>
                  <option value="Stock transfer between store branches">Stock transfer between store branches</option>
                </select>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., PO #1042 / Supplier Delivery Slip"
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RECEIVE NEW INVENTORY BATCH
          ========================================================================= */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px', width: '100%', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="#f97316" />
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  Receive New Stock Batch
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {(() => {
              const activeBatchProduct = batchProduct || inventory.find(i => String(i.product_id || i.id) === String(batchFormData.product_id))

              return (
                <form onSubmit={handleSaveNewBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Product Selector / Display */}
                  <div className="form-group">
                    <label className="form-label">Target Product <span style={{ color: '#ef4444' }}>*</span></label>
                    {batchProduct ? (
                      <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{batchProduct.product_name}</strong>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span>Category: {batchProduct.category}</span>
                          <span>Current Stock: <strong style={{ color: '#f97316' }}>{formatQuantityWithUnit(batchProduct.quantity, batchProduct.unit)}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <select
                        className="form-input"
                        value={batchFormData.product_id}
                        onChange={(e) => {
                          const selected = inventory.find(i => String(i.product_id || i.id) === String(e.target.value))
                          setBatchFormData({
                            ...batchFormData,
                            product_id: e.target.value,
                            cost_price: selected?.cost_price || '',
                            selling_price: selected?.selling_price || ''
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

                  {/* Assigned Unit Banner */}
                  {activeBatchProduct && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.28)', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: '#10b981' }}>
                        Tracking Unit: <strong style={{ color: 'var(--text-primary)' }}>{activeBatchProduct.unit || 'Piece'}</strong>
                      </span>
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.16)', color: '#10b981', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        {getUnitBadgeText(activeBatchProduct.unit, true).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Quantity & Supplier */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{getQuantityInputLabel(activeBatchProduct?.unit, 'Quantity to Receive')} <span style={{ color: '#ef4444' }}>*</span></span>
                        <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '700' }}>
                          in {getUnitBadgeText(activeBatchProduct?.unit, true)}
                        </span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        placeholder={getQuantityPlaceholder(activeBatchProduct?.unit, 100)}
                        value={batchFormData.quantity}
                        onChange={(e) => setBatchFormData({ ...batchFormData, quantity: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Supplier <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className="form-input"
                        value={batchFormData.supplier_id}
                        onChange={(e) => setBatchFormData({ ...batchFormData, supplier_id: e.target.value })}
                        required
                      >
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pricing (Cost Price & Selling Price) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-hover)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Cost Price (₱ / {getUnitBadgeText(activeBatchProduct?.unit, false)}) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="0.00"
                        value={batchFormData.cost_price}
                        onChange={(e) => setBatchFormData({ ...batchFormData, cost_price: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Selling Price (₱ / {getUnitBadgeText(activeBatchProduct?.unit, false)}) <span style={{ color: '#ef4444' }}>*</span></span>
                        {Number(batchFormData.selling_price) > 0 && Number(batchFormData.cost_price) > 0 && (
                          <span style={{ color: '#10b981', fontWeight: '700' }}>
                            {Math.round(((Number(batchFormData.selling_price) - Number(batchFormData.cost_price)) / Number(batchFormData.selling_price)) * 100)}% Margin
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="0.00"
                        value={batchFormData.selling_price}
                        onChange={(e) => setBatchFormData({ ...batchFormData, selling_price: e.target.value })}
                        required
                      />
                    </div>
                  </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Date Received <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    value={batchFormData.received_date}
                    onChange={(e) => setBatchFormData({ ...batchFormData, received_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={batchFormData.expiration_date}
                    onChange={(e) => setBatchFormData({ ...batchFormData, expiration_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Batch Notes / PO Reference</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., PO #2026-0819 Delivery"
                  value={batchFormData.notes}
                  onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowBatchModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={submittingBatch}
                >
                  {submittingBatch ? 'Saving Batch...' : 'Create Batch & Restock'}
                </button>
              </div>
            </form>
              )
            })()}
          </div>
        </div>
      )}

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
                    <table className="management-table" style={{ fontSize: '12.5px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '22%' }}>Date &amp; Time</th>
                          <th style={{ width: '22%' }}>Change</th>
                          <th style={{ width: '26%' }}>Before ➔ After</th>
                          <th style={{ width: '20%' }}>Reason / Action</th>
                          <th style={{ width: '10%' }}>User</th>
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

                          return (
                            <tr key={log.id || idx}>
                              <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{dateStr}</td>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: '700',
                                  fontSize: '12px',
                                  background: isZero ? '#f1f5f9' : isPositive ? '#ecfdf5' : '#fef2f2',
                                  color: isZero ? '#64748b' : isPositive ? '#16a34a' : '#dc2626',
                                  border: isZero ? '1px solid #e2e8f0' : isPositive ? '1px solid #bbf7d0' : '1px solid #fecaca'
                                }}>
                                  {isPositive ? `+${formatQuantityWithUnit(qtyChanged, historyItem.unit)}` : formatQuantityWithUnit(qtyChanged, historyItem.unit)}
                                </span>
                              </td>
                              <td>
                                <span style={{ color: '#475569', fontWeight: '600' }}>
                                  {log.quantity_before != null ? formatQuantityWithUnit(log.quantity_before, historyItem.unit) : '—'} ➔ {log.quantity_after != null ? formatQuantityWithUnit(log.quantity_after, historyItem.unit) : '—'}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '12.5px' }}>
                                  {log.reason || log.adjustment_type || 'Stock Change'}
                                </strong>
                                {log.notes && <span style={{ fontSize: '11px', color: '#64748b' }}>{log.notes}</span>}
                              </td>
                              <td style={{ color: '#64748b' }}>{log.user?.name || 'Staff / Admin'}</td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #e2e8f0', marginTop: '14px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowHistory(false)
                  handleOpenNewBatch(historyItem)
                }}
                style={{ padding: '7px 16px', fontSize: '13px' }}
              >
                <Plus size={14} /> Receive New Batch For This Product
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

