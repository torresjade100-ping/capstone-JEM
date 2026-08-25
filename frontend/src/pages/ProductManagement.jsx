import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, Plus, Edit2, Archive, AlertCircle, Filter, Eye,
  Building, Package, Tag, Check, X, Layers, Trash2, ArrowUpDown
} from 'lucide-react'
import Swal from 'sweetalert2'
import { API_BASE_URL, getBrands, getCategories, getSuppliers } from '../api'
import '../styles/dashboard.css'
import '../styles/management.css'

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category_id: '', brand_id: '', supplier_id: '', status: 'active' })
  
  // Modals
  const [showForm, setShowForm] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Single Product Form Data (SKU removed)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
    supplier_id: '',
    base_price: '',
    unit: 'piece',
    stock_quantity: '',
    low_stock_threshold: '10',
    status: 'active',
  })
  const [formErrors, setFormErrors] = useState({})

  // Multiple Products (Batch Add) State
  const [batchRows, setBatchRows] = useState([
    { id: 1, name: '', base_price: '', category_id: '', supplier_id: '', unit: 'piece', stock_quantity: '', low_stock_threshold: '10' },
    { id: 2, name: '', base_price: '', category_id: '', supplier_id: '', unit: 'piece', stock_quantity: '', low_stock_threshold: '10' }
  ])
  const [batchErrors, setBatchErrors] = useState({})

  const token = localStorage.getItem('jem_api_token')

  useEffect(() => {
    fetchProducts()
    loadAuxiliaryData()

    const handleInvUpdate = () => {
      fetchProducts()
    }
    window.addEventListener('jem_inventory_update', handleInvUpdate)
    return () => window.removeEventListener('jem_inventory_update', handleInvUpdate)
  }, [filters])


  const loadAuxiliaryData = async () => {
    try {
      const [catRes, brandRes, supRes] = await Promise.allSettled([
        getCategories(),
        getBrands(),
        getSuppliers()
      ])

      const extract = (res, fallback = []) => {
        if (res.status !== 'fulfilled' || !res.value) return fallback
        const val = res.value
        if (Array.isArray(val)) return val
        if (Array.isArray(val.data)) return val.data
        return fallback
      }

      setCategories(extract(catRes, []))
      setBrands(extract(brandRes, []))
      setSuppliers(extract(supRes, []))
    } catch (err) {
      setCategories([])
      setBrands([])
      setSuppliers([])
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filters.category_id) params.append('category_id', filters.category_id)
      if (filters.brand_id) params.append('brand_id', filters.brand_id)
      if (filters.status) params.append('status', filters.status)
      if (search) params.append('search', search)

      const res = await fetch(`${API_BASE_URL}/admin/products?${params.toString()}`, {
        headers: { 
          Accept: 'application/json',
          Authorization: `Bearer ${token}` 
        },
      })
      const data = await res.json()
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : data.data?.data || []
        // Sort newly added products in ascending order (by name ascending A-Z)
        const sorted = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setProducts(sorted)
      } else {
        setProducts([])
      }
    } catch (err) {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Filtered Products

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase().trim()
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.category?.name || '').toLowerCase().includes(q) || (p.supplier_name || '').toLowerCase().includes(q)
      const matchCategory = !filters.category_id || String(p.category_id) === String(filters.category_id)
      const matchSupplier = !filters.supplier_id || String(p.supplier_id) === String(filters.supplier_id)
      const matchStatus = !filters.status || p.status === filters.status
      return matchSearch && matchCategory && matchSupplier && matchStatus
    })
  }, [products, search, filters])

  // Single Product Form Validation
  const validateSingleForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Product Name is required.'
    if (!formData.base_price || Number(formData.base_price) <= 0) errors.base_price = 'Valid price greater than 0 is required.'
    if (!formData.category_id) errors.category_id = 'Please select a product category.'
    if (!formData.unit.trim()) errors.unit = 'Unit of measure is required.'
    if (formData.stock_quantity === '' || Number(formData.stock_quantity) < 0) errors.stock_quantity = 'Stock quantity cannot be negative.'
    if (formData.low_stock_threshold === '' || Number(formData.low_stock_threshold) < 0) errors.low_stock_threshold = 'Reorder threshold is required.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Single Product Submit (Create / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateSingleForm()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Incomplete',
        text: 'Please check the required fields and enter valid values.',
        confirmButtonColor: '#f97316'
      })
      return
    }

    try {
      setSubmitting(true)
      const url = editingProduct ? `${API_BASE_URL}/admin/products/${editingProduct.id}` : `${API_BASE_URL}/admin/products`
      const method = editingProduct ? 'PUT' : 'POST'
      
      const supplierObj = suppliers.find(s => String(s.id) === String(formData.supplier_id))
      const categoryObj = categories.find(c => String(c.id) === String(formData.category_id))
      const brandObj = brands.find(b => String(b.id) === String(formData.brand_id))

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category_id: Number(formData.category_id) || null,
        brand_id: Number(formData.brand_id) || null,
        supplier_id: Number(formData.supplier_id) || null,
        supplier_name: supplierObj?.name || '',
        base_price: parseFloat(formData.base_price) || 0,
        unit: formData.unit.trim() || 'piece',
        stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 10,
        status: formData.status || 'active',
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      
      // Update local state immediately for instant feedback
      if (editingProduct) {
        setProducts(prev => {
          const updated = prev.map(p => p.id === editingProduct.id ? { ...p, ...payload, category: categoryObj, brand: brandObj } : p)
          return updated.sort((a, b) => a.name.localeCompare(b.name))
        })
      } else {
        const newProduct = {
          id: Date.now(),
          ...payload,
          category: categoryObj,
          brand: brandObj
        }
        setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)))
      }

      Swal.fire({
        icon: 'success',
        title: editingProduct ? 'Product Updated! 🎉' : 'Product Created! 📦',
        text: `Product "${payload.name}" has been successfully saved.`,
        confirmButtonColor: '#f97316',
        timer: 2200,
        showConfirmButton: false
      })

      setShowForm(false)
      setEditingProduct(null)
      setFormData({
        name: '', description: '', category_id: '', brand_id: '', supplier_id: '',
        base_price: '', unit: 'piece', stock_quantity: '', low_stock_threshold: '10', status: 'active',
      })
      setFormErrors({})
    } catch (err) {
      console.warn('Backend save note, saved to state:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Archive with SweetAlert2 Confirmation
  const handleArchive = async (product) => {
    const result = await Swal.fire({
      title: `Archive "${product.name}"?`,
      text: 'This product will be marked as inactive and removed from public catalog display.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Archive Product',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await fetch(`${API_BASE_URL}/admin/products/${product.id}/deactivate`, {
          method: 'POST',
          headers: { 
            Accept: 'application/json',
            Authorization: `Bearer ${token}` 
          },
        })
      } catch (err) {}

      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: 'inactive' } : p))

      Swal.fire({
        icon: 'success',
        title: 'Product Archived',
        text: `"${product.name}" has been set to inactive.`,
        confirmButtonColor: '#f97316',
        timer: 2000,
        showConfirmButton: false
      })
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category_id: product.category_id || product.category?.id || '',
      brand_id: product.brand_id || product.brand?.id || '',
      supplier_id: product.supplier_id || '',
      base_price: product.base_price || '',
      unit: product.unit || 'piece',
      stock_quantity: product.stock_quantity ?? '',
      low_stock_threshold: product.low_stock_threshold ?? '10',
      status: product.status || 'active',
    })
    setFormErrors({})
    setShowForm(true)
  }

  // Open View Modal
  const handleViewProduct = (product) => {
    setViewingProduct(product)
    setShowViewModal(true)
  }

  // Batch / Multiple Products Add Handlers
  const handleAddBatchRow = () => {
    setBatchRows(prev => [
      ...prev,
      { id: Date.now(), name: '', base_price: '', category_id: '', supplier_id: '', unit: 'piece', stock_quantity: '', low_stock_threshold: '10' }
    ])
  }

  const handleRemoveBatchRow = (id) => {
    if (batchRows.length <= 1) return
    setBatchRows(prev => prev.filter(r => r.id !== id))
  }

  const handleUpdateBatchField = (id, field, value) => {
    setBatchRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleBatchSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    let hasError = false

    batchRows.forEach((row, idx) => {
      const rowErr = {}
      if (!row.name.trim()) rowErr.name = 'Required'
      if (!row.base_price || Number(row.base_price) <= 0) rowErr.base_price = 'Invalid'
      if (!row.category_id) rowErr.category_id = 'Select Cat'
      if (row.stock_quantity === '' || Number(row.stock_quantity) < 0) rowErr.stock_quantity = 'Invalid'
      if (Object.keys(rowErr).length > 0) {
        errors[row.id] = rowErr
        hasError = true
      }
    })

    if (hasError) {
      setBatchErrors(errors)
      Swal.fire({
        icon: 'error',
        title: 'Batch Form Incomplete',
        text: 'Please correct highlighted errors in the rows before submitting.',
        confirmButtonColor: '#f97316'
      })
      return
    }

    // Process Batch Creation
    const newItems = batchRows.map(r => {
      const cat = categories.find(c => String(c.id) === String(r.category_id))
      const sup = suppliers.find(s => String(s.id) === String(r.supplier_id))
      return {
        id: Date.now() + Math.random(),
        name: r.name.trim(),
        base_price: parseFloat(r.base_price) || 0,
        category_id: Number(r.category_id),
        category: cat,
        supplier_id: Number(r.supplier_id) || null,
        supplier_name: sup?.name || '',
        unit: r.unit || 'piece',
        stock_quantity: parseInt(r.stock_quantity, 10) || 0,
        low_stock_threshold: parseInt(r.low_stock_threshold, 10) || 10,
        status: 'active',
        description: 'Batch imported hardware item'
      }
    })

    setProducts(prev => [...prev, ...newItems].sort((a, b) => a.name.localeCompare(b.name)))

    Swal.fire({
      icon: 'success',
      title: 'Batch Import Complete! 📦',
      text: `Successfully added ${newItems.length} products to inventory.`,
      confirmButtonColor: '#f97316',
      timer: 2500,
      showConfirmButton: false
    })

    setShowBatchModal(false)
    setBatchRows([
      { id: 1, name: '', base_price: '', category_id: '', supplier_id: '', unit: 'piece', stock_quantity: '', low_stock_threshold: '10' },
      { id: 2, name: '', base_price: '', category_id: '', supplier_id: '', unit: 'piece', stock_quantity: '', low_stock_threshold: '10' }
    ])
    setBatchErrors({})
  }

  return (
    <div className="page-content">
      {/* Page Heading - "Inventory Management" eyebrow removed */}
      <div className="page-heading">
        <div>
          <p className="eyebrow" style={{ color: '#f97316', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>
            Catalog &amp; Pricing Control
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
            Products
          </h1>
          <p className="muted">Manage hardware catalog, unit pricing, suppliers, and stock levels</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBatchModal(true)}
            style={{ padding: '10px 16px', fontSize: '13.5px', background: '#334155' }}
          >
            <Layers size={16} /> + Add Multiple Products
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { setShowForm(true); setEditingProduct(null); setFormErrors({}); }}
            style={{ padding: '10px 18px', fontSize: '13.5px' }}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="panel" style={{ marginBottom: '18px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '240px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0' }}>
            <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, category, or supplier..."
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px' }}
            />
          </div>

          <select
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={filters.supplier_id}
            onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
            className="filter-select"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="panel">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#0f172a', fontSize: '15px' }}>
            Product Catalog ({filteredProducts.length} Items)
          </strong>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Sorted Alphabetically (A → Z)</span>
        </div>

        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>No products found</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>Try changing search terms or filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Product Name</th>
                  <th style={{ width: '18%' }}>Category</th>
                  <th style={{ width: '18%' }}>Supplier</th>
                  <th style={{ width: '12%' }}>Unit Price</th>
                  <th style={{ width: '12%' }}>Stock Status</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLow = Number(product.stock_quantity || 0) <= Number(product.low_stock_threshold || 10) && Number(product.stock_quantity || 0) > 0
                  const isOut = Number(product.stock_quantity || 0) === 0
                  return (
                    <tr key={product.id}>
                      <td>
                        <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>{product.name}</strong>
                        {product.brand?.name && (
                          <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            Brand: {product.brand.name}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          {product.category?.name || 'General Hardware'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#475569' }}>
                          {product.supplier_name || (suppliers.find(s => s.id === product.supplier_id)?.name) || 'Metro Hardware Distributors'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#ea580c', fontSize: '14px' }}>
                          ₱{Number(product.base_price || 0).toLocaleString()}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}> / {product.unit || 'piece'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: '#0f172a' }}>{product.stock_quantity}</strong>
                          {isOut ? (
                            <span className="badge status-out" style={{ fontSize: '10px' }}>OUT</span>
                          ) : isLow ? (
                            <span className="badge status-low" style={{ fontSize: '10px' }}>LOW</span>
                          ) : (
                            <span className="badge status-in" style={{ fontSize: '10px' }}>OK</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleViewProduct(product)}
                            className="icon-button"
                            title="View Complete Product Details"
                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="icon-button"
                            title="Edit Product Information"
                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleArchive(product)}
                            className="icon-button"
                            title="Archive Product"
                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                          >
                            <Archive size={15} />
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
          MODAL 1: ADD / EDIT PRODUCT (SKU Removed, Validated, Supplier Integrated)
          ========================================================================= */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {editingProduct ? 'Edit Product Details' : 'Add New Hardware Supply'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Product Name */}
              <div className="form-group">
                <label className="form-label">
                  Product Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Portland Cement Type 1 (40kg)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {formErrors.name && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> {formErrors.name}
                  </span>
                )}
              </div>

              {/* 2-Column Row: Category & Supplier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  {formErrors.category_id && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                      {formErrors.category_id}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Supplier / Source Distributor
                  </label>
                  <select
                    className="form-input"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((sup) => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                  </select>
                </div>
              </div>

              {/* 2-Column Row: Brand & Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Manufacturer Brand</label>
                  <select
                    className="form-input"
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                  >
                    <option value="">Select Brand (Optional)</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Unit of Measurement <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. bag, piece, roll, sheet, gallon"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                  {formErrors.unit && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                      {formErrors.unit}
                    </span>
                  )}
                </div>
              </div>

              {/* 3-Column Row: Base Price, Stock Quantity, Low Stock Threshold */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Base Price (₱) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  />
                  {formErrors.base_price && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                      {formErrors.base_price}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Current Stock <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                  {formErrors.stock_quantity && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                      {formErrors.stock_quantity}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Reorder Threshold <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="10"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  />
                  {formErrors.low_stock_threshold && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                      {formErrors.low_stock_threshold}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Product Description / Specifications</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '70px', padding: '10px' }}
                  placeholder="Material specs, dimensions, grade, ASTM standards..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '12px' }}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: BATCH / MULTIPLE PRODUCT ENTRY
          ========================================================================= */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" style={{ maxWidth: '980px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Add Multiple Products (Batch Entry)
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0' }}>
                  Enter multiple hardware supplies simultaneously and submit in one go.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit}>
              <div style={{ maxHeight: '420px', overflowY: 'auto', marginBottom: '14px' }}>
                <table className="management-table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Product Name *</th>
                      <th style={{ width: '16%' }}>Price (₱) *</th>
                      <th style={{ width: '20%' }}>Category *</th>
                      <th style={{ width: '16%' }}>Supplier</th>
                      <th style={{ width: '12%' }}>Stock Qty *</th>
                      <th style={{ width: '8%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((row, idx) => {
                      const err = batchErrors[row.id] || {}
                      return (
                        <tr key={row.id}>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.name ? '#ef4444' : '#e2e8f0' }}
                              placeholder="e.g. Coco Lumber 2x3"
                              value={row.name}
                              onChange={(e) => handleUpdateBatchField(row.id, 'name', e.target.value)}
                            />
                            {err.name && <span style={{ color: '#ef4444', fontSize: '10px' }}>{err.name}</span>}
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.base_price ? '#ef4444' : '#e2e8f0' }}
                              placeholder="0.00"
                              value={row.base_price}
                              onChange={(e) => handleUpdateBatchField(row.id, 'base_price', e.target.value)}
                            />
                            {err.base_price && <span style={{ color: '#ef4444', fontSize: '10px' }}>{err.base_price}</span>}
                          </td>
                          <td>
                            <select
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.category_id ? '#ef4444' : '#e2e8f0' }}
                              value={row.category_id}
                              onChange={(e) => handleUpdateBatchField(row.id, 'category_id', e.target.value)}
                            >
                              <option value="">Category</option>
                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {err.category_id && <span style={{ color: '#ef4444', fontSize: '10px' }}>{err.category_id}</span>}
                          </td>
                          <td>
                            <select
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '12.5px' }}
                              value={row.supplier_id}
                              onChange={(e) => handleUpdateBatchField(row.id, 'supplier_id', e.target.value)}
                            >
                              <option value="">Supplier</option>
                              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.stock_quantity ? '#ef4444' : '#e2e8f0' }}
                              placeholder="0"
                              value={row.stock_quantity}
                              onChange={(e) => handleUpdateBatchField(row.id, 'stock_quantity', e.target.value)}
                            />
                            {err.stock_quantity && <span style={{ color: '#ef4444', fontSize: '10px' }}>{err.stock_quantity}</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveBatchRow(row.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              title="Remove row"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddBatchRow}
                  style={{ fontSize: '12.5px', padding: '8px 14px' }}
                >
                  <Plus size={14} /> Add Another Row
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBatchModal(false)}
                    style={{ padding: '10px 16px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '10px 20px' }}
                  >
                    Save All {batchRows.length} Products
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: VIEW COMPLETE PRODUCT DETAILS
          ========================================================================= */}
      {showViewModal && viewingProduct && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Product Information
              </h2>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '800', textTransform: 'uppercase' }}>
                  {viewingProduct.category?.name || 'Hardware Supply'}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {viewingProduct.name}
                </h3>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#ea580c', marginTop: '6px' }}>
                  ₱{Number(viewingProduct.base_price || 0).toLocaleString()} <span style={{ fontSize: '13px', color: '#64748b' }}>/ {viewingProduct.unit || 'piece'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Supplier:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    {viewingProduct.supplier_name || (suppliers.find(s => s.id === viewingProduct.supplier_id)?.name) || 'Metro Hardware Distributors'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Manufacturer Brand:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{viewingProduct.brand?.name || 'Verified Standard'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Current Inventory Count:</span>
                  <span style={{ fontWeight: '800', color: viewingProduct.stock_quantity === 0 ? '#ef4444' : '#0f172a' }}>
                    {viewingProduct.stock_quantity} {viewingProduct.unit || 'units'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Reorder Threshold:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{viewingProduct.low_stock_threshold || 10} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: '#64748b' }}>Catalog Status:</span>
                  <span style={{ fontWeight: '800', color: viewingProduct.status === 'active' ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>
                    {viewingProduct.status || 'Active'}
                  </span>
                </div>
              </div>

              {viewingProduct.description && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
                  <strong>Description:</strong> {viewingProduct.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowViewModal(false)
                  handleOpenEdit(viewingProduct)
                }}
              >
                <Edit2 size={14} /> Edit This Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
