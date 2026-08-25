import React, { useEffect, useState, useMemo } from 'react'
import {
  Search, AlertCircle, Plus, Minus, RefreshCw, Package,
  Layers, Filter, ArrowUpDown, X, Check, Eye
} from 'lucide-react'
import Swal from 'sweetalert2'
import { API_BASE_URL, getSuppliers } from '../api'
import '../styles/management.css'

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, in_stock, low_stock, out_of_stock
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: '',
    type: 'add', // add or deduct
    reason: 'Restock shipment received',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

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
          const qty = Number(item.current_quantity ?? item.available_quantity ?? item.product?.stock_quantity ?? item.quantity ?? 0)
          const threshold = Number(item.threshold ?? item.product?.low_stock_threshold ?? item.low_stock_threshold ?? 10)
          let status = 'in_stock'
          if (qty === 0) status = 'out_of_stock'
          else if (qty <= threshold) status = 'low_stock'

          return {
            id: item.id || item.product_id,
            product_id: item.product_id || item.id,
            product_name: item.product?.name || item.product_name || `Hardware Supply #${item.product_id || item.id}`,
            category: item.product?.category?.name || item.category || 'General Construction',
            supplier: item.product?.supplier?.name || item.supplier_name || '—',
            unit: item.product?.unit || item.unit || 'piece',
            unit_price: Number(item.product?.base_price ?? item.product_variant?.price ?? item.unit_price ?? 0),
            quantity: qty,
            low_stock_threshold: threshold,
            stock_status: status
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


  // Dynamic Search Functionality across Name, Category, and Supplier
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const q = search.toLowerCase().trim()
      const matchesSearch = !q ||
        item.product_name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || item.stock_status === statusFilter
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [inventory, search, statusFilter, categoryFilter])

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
      reason: 'Physical inventory audit',
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

      // Update State immediately
      setInventory(prev => prev.map(item => {
        if (item.id === selectedItem.id) {
          return {
            ...item,
            quantity: newTotal,
            stock_status: newStatus
          }
        }
        return item
      }))

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
      console.error('Stock adjust notice:', err)
    } finally {
      setSubmitting(false)
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
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
            Inventory Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '4px' }}>
            Track real-time stock levels, reorder thresholds, and warehouse valuation.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchInventory}
          style={{ padding: '9px 16px', fontSize: '13px' }}
        >
          <RefreshCw size={15} /> Refresh Stock
        </button>
      </div>

      {/* Stock Status Metrics Grid */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Catalog Items
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
            {totalItemsCount}
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
            {inStockCount} In Stock
          </span>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #ff9800' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
            Low Stock Alerts ⚠️
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', margin: '4px 0' }}>
            {lowStockCount}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Below Reorder Level
          </span>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>
            Out of Stock 🚨
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', margin: '4px 0' }}>
            {outOfStockCount}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Zero Available Stock
          </span>
        </div>

        <div className="metric-card">
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Inventory Value
          </span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
            ₱{totalValuation.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Across all warehouses
          </span>
        </div>
      </div>

      {/* Search & Multi-Filter Control Bar */}
      <div className="management-controls" style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* Dynamic Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 2, minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search inventory by product name, category, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ border: 'none', padding: '6px 0', outline: 'none', width: '100%', fontSize: '13.5px' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Stock Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
          style={{ flex: 1, minWidth: '160px' }}
        >
          <option value="all">All Stock Statuses</option>
          <option value="in_stock">🟢 In Stock Only</option>
          <option value="low_stock">🟡 Low Stock Alert</option>
          <option value="out_of_stock">🔴 Out of Stock</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
          style={{ flex: 1, minWidth: '160px' }}
        >
          <option value="all">All Categories</option>
          {categoriesList.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Inventory Table with Clear Badges */}
      {loading ? (
        <div className="loading" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading inventory records...
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>No products found</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            No inventory items matched your search query "{search}". Try resetting the search or category filter.
          </p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '12px', display: 'inline-flex' }}
            onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Product Name</th>
                <th style={{ width: '18%' }}>Category</th>
                <th style={{ width: '18%' }}>Supplier</th>
                <th style={{ width: '12%' }}>Current Stock</th>
                <th style={{ width: '12%' }}>Reorder Level</th>
                <th style={{ width: '12%' }}>Stock Status</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => {
                return (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>{item.product_name}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: '#475569' }}>{item.category}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{item.supplier}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <strong style={{ fontSize: '15px', color: item.stock_status === 'out_of_stock' ? '#ef4444' : '#0f172a' }}>
                          {item.quantity}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{item.unit}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                        {item.low_stock_threshold} {item.unit}
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
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleOpenAdjustment(item)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        title="Adjust Stock Quantity"
                      >
                        Adjust Stock
                      </button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Adjust Stock Quantity
              </h2>
              <button
                type="button"
                onClick={() => setShowAdjustment(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                  {selectedItem.category}
                </span>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {selectedItem.product_name}
                </h4>
                <div style={{ fontSize: '13px', color: '#ea580c', fontWeight: '700', marginTop: '4px' }}>
                  Current Stock: {selectedItem.quantity} {selectedItem.unit}
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
                <label className="form-label">Adjustment Quantity ({selectedItem.unit})</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="50"
                  value={adjustmentData.quantity}

                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                  required
                />
              </div>

              {/* Reason */}
              <div className="form-group">
                <label className="form-label">Reason for Adjustment</label>
                <select
                  className="form-input"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                >
                  <option value="Restock shipment received">Restock shipment received from supplier</option>
                  <option value="Physical count audit adjustment">Physical count audit correction</option>
                  <option value="Damaged / expired materials">Damaged / weather degraded stock</option>
                  <option value="Return from construction site">Customer / Job site return</option>
                </select>
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
    </div>
  )
}
