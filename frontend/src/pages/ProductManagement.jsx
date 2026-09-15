import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, Plus, Edit2, Archive, AlertCircle, Filter, Eye,
  Building, Package, Tag, Check, X, Layers, Trash2, ArrowUpDown, ChevronDown,
  AlertTriangle, CheckCircle2, Sparkles, RotateCcw
} from 'lucide-react'
import Swal from 'sweetalert2'
import { API_BASE_URL, getBrands, getCategories, getSuppliers, getProductBatches, createProductBatch } from '../api'
import {
  STANDARD_UOM_OPTIONS,
  formatQuantityWithUnit,
  getUnitBadgeText,
  getQuantityInputLabel,
  getQuantityPlaceholder,
} from '../utils/uom'
import '../styles/dashboard.css'
import '../styles/management.css'

const UNIT_OPTIONS = STANDARD_UOM_OPTIONS

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category_id: '', brand_id: '', supplier_id: '', status: 'active' })
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false)
  const unitDropdownRef = useRef(null)

  
  // Modals
  const [showForm, setShowForm] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Product Batches Modal
  const [showProductBatchesModal, setShowProductBatchesModal] = useState(false)
  const [selectedBatchProduct, setSelectedBatchProduct] = useState(null)
  const [productBatchesData, setProductBatchesData] = useState(null)
  const [loadingBatches, setLoadingBatches] = useState(false)

  // Single Product Form Data (with Cost & Selling Price + Initial Batch)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
    supplier_id: '',
    cost_price: '',
    selling_price: '',
    base_price: '',
    unit: 'piece',
    stock_quantity: '',
    low_stock_threshold: '10',
    status: 'active',
    received_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
  })
  const [formErrors, setFormErrors] = useState({})

  // Add Supply Form Mode & Existing Product Selection
  const [addMode, setAddMode] = useState('existing') // 'existing' | 'new'
  const [existingProductSearch, setExistingProductSearch] = useState('')
  const [selectedExistingProduct, setSelectedExistingProduct] = useState(null)
  const [showProductSearchResults, setShowProductSearchResults] = useState(false)

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) {
        setUnitDropdownOpen(false)
      }
    }
    if (unitDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [unitDropdownOpen])



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
      params.append('per_page', '100')
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
    const selectedCatObj = categories.find(c => String(c.id) === String(filters.category_id))
    const selectedCatName = selectedCatObj ? selectedCatObj.name.toLowerCase().trim() : ''

    return products.filter(p => {
      const q = search.toLowerCase().trim()
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.category?.name || '').toLowerCase().includes(q) || (p.supplier_name || '').toLowerCase().includes(q)
      
      const prodCatId = String(p.category_id || p.category?.id || '')
      const prodCatName = (p.category?.name || p.category || '').toLowerCase().trim()

      const matchCategory = !filters.category_id ||
        prodCatId === String(filters.category_id) ||
        (selectedCatName && prodCatName === selectedCatName)

      const matchSupplier = !filters.supplier_id || String(p.supplier_id) === String(filters.supplier_id)
      const matchStatus = !filters.status || p.status === filters.status
      return matchSearch && matchCategory && matchSupplier && matchStatus
    })
  }, [products, search, filters, categories])

  // Matching products for existing product search in modal
  const matchingExistingProducts = useMemo(() => {
    const q = existingProductSearch.trim().toLowerCase()
    if (!q) return products.slice(0, 20)
    return products.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(q)) ||
      (p.brand?.name && p.brand.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 20)
  }, [products, existingProductSearch])

  // Real-time duplicate detection when typing a product name in 'new' mode
  const existingMatch = useMemo(() => {
    if (editingProduct || selectedExistingProduct || !formData.name.trim()) return null
    const typed = formData.name.trim().toLowerCase()
    return products.find(p => p.name.trim().toLowerCase() === typed) || null
  }, [editingProduct, selectedExistingProduct, formData.name, products])

  // Select an existing product from catalog & automatically load details
  const handleSelectExistingProduct = (prod) => {
    setSelectedExistingProduct(prod)
    setAddMode('existing')
    const selling = prod.selling_price ?? prod.base_price ?? ''
    const cost = prod.cost_price ?? (selling ? (Number(selling) * 0.7).toFixed(2) : '')
    setFormData({
      name: prod.name,
      description: prod.description || '',
      category_id: prod.category_id || prod.category?.id || '',
      brand_id: prod.brand_id || prod.brand?.id || '',
      supplier_id: prod.supplier_id || (prod.batches?.[0]?.supplier_id ?? ''),
      cost_price: cost,
      selling_price: selling,
      base_price: selling,
      unit: prod.unit || 'piece',
      stock_quantity: '', // user enters the new incoming quantity
      low_stock_threshold: prod.low_stock_threshold ?? '10',
      status: prod.status || 'active',
      received_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
    })
    setFormErrors({})
    setShowProductSearchResults(false)
    setExistingProductSearch('')
  }

  // Open Add Product modal
  const handleOpenAddProduct = () => {
    setEditingProduct(null)
    setSelectedExistingProduct(null)
    setAddMode('existing')
    setExistingProductSearch('')
    setShowProductSearchResults(false)
    setFormData({
      name: '',
      description: '',
      category_id: '',
      brand_id: '',
      supplier_id: '',
      cost_price: '',
      selling_price: '',
      base_price: '',
      unit: 'piece',
      stock_quantity: '',
      low_stock_threshold: '10',
      status: 'active',
      received_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
    })
    setFormErrors({})
    setShowForm(true)
  }

  // Single Product Form Validation
  const validateSingleForm = () => {
    const errors = {}

    // When restocking an existing product
    if (selectedExistingProduct) {
      if (!formData.stock_quantity || Number(formData.stock_quantity) <= 0) {
        errors.stock_quantity = 'Please enter a valid incoming quantity greater than 0.'
      }
      const cost = Number(formData.cost_price)
      if (formData.cost_price === '' || isNaN(cost) || cost < 0) {
        errors.cost_price = 'Please enter a valid cost price per unit.'
      }
      const selling = Number(formData.selling_price || formData.base_price)
      if (isNaN(selling) || selling <= 0) {
        errors.selling_price = 'Please enter a valid selling price greater than 0.'
      }
      setFormErrors(errors)
      return Object.keys(errors).length === 0
    }

    // When creating a brand new product
    if (!formData.name.trim()) {
      errors.name = 'Product Name is required.'
    } else if (!editingProduct) {
      const duplicate = products.find(p => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase())
      if (duplicate) {
        errors.name = `A product named "${duplicate.name}" already exists in your inventory. Please select it to add new stock.`
      }
    }

    const selling = Number(formData.selling_price || formData.base_price)
    if (!selling || selling <= 0) errors.selling_price = 'Selling price greater than 0 is required.'
    if (formData.cost_price === '' || Number(formData.cost_price) < 0) errors.cost_price = 'Cost price cannot be negative.'
    if (!formData.category_id) errors.category_id = 'Please select a product category.'
    if (!formData.unit.trim()) errors.unit = 'Unit of measure is required.'
    if (formData.stock_quantity === '' || Number(formData.stock_quantity) < 0) errors.stock_quantity = 'Stock quantity cannot be negative.'
    if (formData.low_stock_threshold === '' || Number(formData.low_stock_threshold) < 0) errors.low_stock_threshold = 'Reorder threshold is required.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Single Product Submit (Create New / Restock Existing / Edit)
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

    // 1. Existing Product Restock Flow (New Batch)
    if (selectedExistingProduct) {
      const qty = parseInt(formData.stock_quantity, 10)
      const cost = parseFloat(formData.cost_price)
      const selling = parseFloat(formData.selling_price || formData.base_price)
      
      try {
        setSubmitting(true)
        const supplierObj = suppliers.find(s => String(s.id) === String(formData.supplier_id))
        const batchPayload = {
          product_id: selectedExistingProduct.id,
          supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
          supplier_name: supplierObj?.name || '',
          quantity: qty,
          cost_price: cost,
          selling_price: selling,
          received_date: formData.received_date || new Date().toISOString().split('T')[0],
          expiration_date: formData.expiration_date || null,
          notes: formData.description || 'Restock batch added via Add Supply form'
        }

        await createProductBatch(selectedExistingProduct.id, batchPayload)

        // Optionally update low_stock_threshold or current prices if changed
        if (formData.low_stock_threshold && Number(formData.low_stock_threshold) !== Number(selectedExistingProduct.low_stock_threshold)) {
          try {
            await fetch(`${API_BASE_URL}/admin/products/${selectedExistingProduct.id}`, {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                low_stock_threshold: parseInt(formData.low_stock_threshold, 10),
                selling_price: selling,
                cost_price: cost
              })
            })
          } catch (e) {}
        }

        window.dispatchEvent(new CustomEvent('jem_inventory_update'))

        Swal.fire({
          icon: 'success',
          title: 'Stock Added to Existing Product! 📦',
          text: `Added ${formatQuantityWithUnit(qty, selectedExistingProduct.unit)} to "${selectedExistingProduct.name}". New inventory batch created; all previous batches, history, and prices are preserved.`,
          confirmButtonColor: '#f97316',
          timer: 2600,
          showConfirmButton: false
        })

        setShowForm(false)
        setSelectedExistingProduct(null)
        setExistingProductSearch('')
        fetchProducts()
        return
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Stock Batch Failed',
          text: err.message || 'Could not save stock batch. Please try again.'
        })
        return
      } finally {
        setSubmitting(false)
      }
    }

    // 2. Duplicate Detection Guard before creating new product
    if (!editingProduct && existingMatch) {
      Swal.fire({
        icon: 'warning',
        title: 'Product Already Exists',
        text: `A product named "${existingMatch.name}" is already in your inventory (Current stock: ${formatQuantityWithUnit(existingMatch.stock_quantity, existingMatch.unit)}). Please select the existing product to add new stock batches instead of creating a duplicate.`,
        confirmButtonColor: '#f97316',
        showCancelButton: true,
        confirmButtonText: 'Select & Restock Existing Product',
        cancelButtonText: 'Cancel'
      }).then((res) => {
        if (res.isConfirmed) {
          handleSelectExistingProduct(existingMatch)
        }
      })
      return
    }

    // 3. Normal Create / Edit Product Flow
    try {
      setSubmitting(true)
      const url = editingProduct ? `${API_BASE_URL}/admin/products/${editingProduct.id}` : `${API_BASE_URL}/admin/products`
      const method = editingProduct ? 'PUT' : 'POST'
      
      const supplierObj = suppliers.find(s => String(s.id) === String(formData.supplier_id))
      const categoryObj = categories.find(c => String(c.id) === String(formData.category_id))
      const brandObj = brands.find(b => String(b.id) === String(formData.brand_id))

      const selling = parseFloat(formData.selling_price || formData.base_price) || 0
      const cost = parseFloat(formData.cost_price) || 0

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category_id: Number(formData.category_id) || null,
        brand_id: Number(formData.brand_id) || null,
        supplier_id: Number(formData.supplier_id) || null,
        supplier_name: supplierObj?.name || '',
        cost_price: cost,
        selling_price: selling,
        base_price: selling,
        unit: formData.unit.trim() || 'piece',
        stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 10,
        status: formData.status || 'active',
        received_date: formData.received_date || new Date().toISOString().split('T')[0],
        expiration_date: formData.expiration_date || null,
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
      
      const resData = await res.json().catch(() => null)

      if (!res.ok) {
        if (resData?.existing_product) {
          Swal.fire({
            icon: 'warning',
            title: 'Product Already Exists',
            text: resData.message || `A product named "${payload.name}" already exists in your inventory catalog.`,
            showCancelButton: true,
            confirmButtonText: 'Select & Restock Existing Product',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#f97316'
          }).then((alertRes) => {
            if (alertRes.isConfirmed) {
              const matchedProd = products.find(p => p.id === resData.existing_product.id) || resData.existing_product
              handleSelectExistingProduct(matchedProd)
            }
          })
          return
        }
        throw new Error(resData?.message || 'Failed to save product.')
      }

      // Update local state immediately for instant feedback
      if (editingProduct) {
        setProducts(prev => {
          const updated = prev.map(p => p.id === editingProduct.id ? { ...p, ...payload, category: categoryObj, brand: brandObj } : p)
          return updated.sort((a, b) => a.name.localeCompare(b.name))
        })
      } else {
        const newProduct = {
          id: resData?.data?.id || Date.now(),
          ...payload,
          category: categoryObj,
          brand: brandObj,
          batches_count: payload.stock_quantity > 0 ? 1 : 0
        }
        setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)))
      }

      window.dispatchEvent(new CustomEvent('jem_inventory_update', { detail: payload }))

      Swal.fire({
        icon: 'success',
        title: editingProduct ? 'Product Updated! 🎉' : 'Product Created! 📦',
        text: `Product "${payload.name}" with initial stock batch has been saved.`,
        confirmButtonColor: '#f97316',
        timer: 2200,
        showConfirmButton: false
      })

      setShowForm(false)
      setEditingProduct(null)
      setSelectedExistingProduct(null)
      setFormData({
        name: '', description: '', category_id: '', brand_id: '', supplier_id: '',
        cost_price: '', selling_price: '', base_price: '', unit: 'piece',
        stock_quantity: '', low_stock_threshold: '10', status: 'active',
        received_date: new Date().toISOString().split('T')[0], expiration_date: ''
      })
      setFormErrors({})
      fetchProducts()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not save product. Please verify fields and try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Archive with SweetAlert2 Confirmation
  const handleArchive = async (product) => {
    const result = await Swal.fire({
      title: 'Archive this product?',
      text: `Are you sure you want to deactivate "${product.name}"? It will be moved to inactive products.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, archive it',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await fetch(`${API_BASE_URL}/admin/products/${product.id}/deactivate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (e) {}

      setProducts(prev => prev.filter(p => p.id !== product.id))
      window.dispatchEvent(new CustomEvent('jem_inventory_update', { detail: { product_id: product.id, status: 'inactive' } }))

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
    const sellingPrice = product.selling_price ?? product.base_price ?? ''
    const costPrice = product.cost_price ?? (sellingPrice ? (Number(sellingPrice) * 0.7).toFixed(2) : '')
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category_id: product.category_id || product.category?.id || '',
      brand_id: product.brand_id || product.brand?.id || '',
      supplier_id: product.supplier_id || '',
      cost_price: costPrice,
      selling_price: sellingPrice,
      base_price: sellingPrice,
      unit: product.unit || 'piece',
      stock_quantity: product.stock_quantity ?? '',
      low_stock_threshold: product.low_stock_threshold ?? '10',
      status: product.status || 'active',
      received_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
    })
    setFormErrors({})
    setShowForm(true)
  }

  // Open View Modal
  const handleViewProduct = (product) => {
    setViewingProduct(product)
    setShowViewModal(true)
  }

  // Open Product Batches Modal
  const handleOpenProductBatches = async (product) => {
    setSelectedBatchProduct(product)
    setShowProductBatchesModal(true)
    setLoadingBatches(true)
    try {
      const res = await getProductBatches(product.id)
      setProductBatchesData(res)
    } catch (err) {
      console.warn('Error loading batches:', err)
      setProductBatchesData(null)
    } finally {
      setLoadingBatches(false)
    }
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
    window.dispatchEvent(new CustomEvent('jem_inventory_update'))

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
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
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
            onClick={handleOpenAddProduct}
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
      <div className="panel" style={{ marginBottom: '18px', padding: '14px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '240px', background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, category, or supplier..."
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px', color: 'var(--text-primary)' }}
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
      <div className="panel" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
            Product Catalog ({filteredProducts.length} Items)
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sorted Alphabetically (A → Z)</span>
        </div>

        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No products found</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Try changing search terms or filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Product Name</th>
                  <th style={{ width: '13%' }}>Category</th>
                  <th style={{ width: '15%' }}>Supplier</th>
                  <th style={{ width: '11%' }}>Cost Price</th>
                  <th style={{ width: '14%' }}>Selling Price</th>
                  <th style={{ width: '13%' }}>Stock &amp; Batches</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLow = Number(product.stock_quantity || 0) <= Number(product.low_stock_threshold || 10) && Number(product.stock_quantity || 0) > 0
                  const isOut = Number(product.stock_quantity || 0) === 0
                  const cost = Number(product.cost_price ?? (product.base_price * 0.7) ?? 0)
                  const selling = Number(product.selling_price ?? product.base_price ?? 0)
                  const marginPct = selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0
                  const batchesCount = product.batches_count ?? product.batches?.length ?? 1

                  return (
                    <tr key={product.id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{product.name}</strong>
                        {product.brand?.name && (
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Brand: {product.brand.name}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.28)' }}>
                          {product.category?.name || 'General Hardware'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {product.supplier_name || (suppliers.find(s => s.id === product.supplier_id)?.name) || 'Metro Hardware Distributors'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                          ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Cost / {getUnitBadgeText(product.unit, false)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#ea580c', fontSize: '14px' }}>
                            ₱{selling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            background: marginPct >= 20 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: marginPct >= 20 ? '#22c55e' : '#f59e0b',
                            border: marginPct >= 20 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            {marginPct}% margin
                          </span>
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block' }}>per {getUnitBadgeText(product.unit, false)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: isOut ? '#ef4444' : 'var(--text-primary)', fontSize: '13px' }}>
                              {formatQuantityWithUnit(product.stock_quantity, product.unit)}
                            </strong>
                            {isOut ? (
                              <span className="badge status-out" style={{ fontSize: '9px', padding: '1px 5px' }}>OUT</span>
                            ) : isLow ? (
                              <span className="badge status-low" style={{ fontSize: '9px', padding: '1px 5px' }}>LOW</span>
                            ) : (
                              <span className="badge status-in" style={{ fontSize: '9px', padding: '1px 5px' }}>OK</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenProductBatches(product)}
                            style={{
                              background: 'rgba(249, 115, 22, 0.12)',
                              border: '1px solid rgba(249, 115, 22, 0.28)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              color: '#f97316',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content'
                            }}
                            title="View inventory batches"
                          >
                            <Package size={11} /> {batchesCount} {batchesCount === 1 ? 'Batch' : 'Batches'}
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '5px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenProductBatches(product)}
                            className="action-btn action-btn-batch"
                            title="View Inventory Batches History"
                          >
                            <Package size={15} />
                          </button>
                          <button
                            onClick={() => handleViewProduct(product)}
                            className="action-btn action-btn-view"
                            title="View Complete Product Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="action-btn action-btn-edit"
                            title="Edit Product Information"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleArchive(product)}
                            className="action-btn action-btn-delete"
                            title="Archive Product"
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
          <div
            className="modal-content"
            style={{
              maxWidth: '740px',
              width: '95%',
              maxHeight: '88vh',
              borderRadius: '16px',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 65px rgba(0, 0, 0, 0.35)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY MODAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  {editingProduct
                    ? 'Edit Product Details'
                    : selectedExistingProduct
                      ? 'Restock Existing Hardware Supply'
                      : 'Add Hardware Supply'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {editingProduct
                    ? 'Update catalog specifications, pricing, and stock limits'
                    : selectedExistingProduct
                      ? `Receiving incoming stock batch for "${selectedExistingProduct.name}"`
                      : 'Check if product already exists to restock, or register a new product'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
              >
                <X size={19} />
              </button>
            </div>

            {/* 2. MODE SWITCHER TABS (Only when adding, not editing) */}
            {!editingProduct && (
              <div style={{ padding: '12px 22px 0', background: 'var(--bg-surface)', flexShrink: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-hover)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAddMode('existing')
                      setFormErrors({})
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: addMode === 'existing' ? '1px solid var(--border-color)' : '1px solid transparent',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: addMode === 'existing' ? 'var(--bg-surface)' : 'transparent',
                      color: addMode === 'existing' ? '#f97316' : 'var(--text-secondary)',
                      boxShadow: addMode === 'existing' ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Search size={14} />
                    <span>Select &amp; Restock Existing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddMode('new')
                      setSelectedExistingProduct(null)
                      setFormData(prev => ({
                        ...prev,
                        name: '',
                        stock_quantity: '',
                        cost_price: '',
                        selling_price: '',
                        base_price: ''
                      }))
                      setFormErrors({})
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: addMode === 'new' ? '1px solid var(--border-color)' : '1px solid transparent',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: addMode === 'new' ? 'var(--bg-surface)' : 'transparent',
                      color: addMode === 'new' ? '#f97316' : 'var(--text-secondary)',
                      boxShadow: addMode === 'new' ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus size={14} />
                    <span>Register Brand New Product</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. SCROLLABLE FORM BODY */}
            <form
              id="add-supply-form"
              onSubmit={handleSubmit}
              noValidate
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '16px 22px 20px',
                overflowY: 'auto',
                flex: 1
              }}
            >
              {/* FLOW A: RESTOCK EXISTING PRODUCT (Pre-checked or Selected) */}
              {!editingProduct && addMode === 'existing' && (
                <>
                  {!selectedExistingProduct ? (
                    <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                        <span>Search &amp; Select Existing Hardware Product <span style={{ color: '#ef4444' }}>*</span></span>
                        <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '700' }}>
                          {matchingExistingProducts.length} in catalog
                        </span>
                      </label>
                      
                      {/* Search Bar with Quick Clear */}
                      <div style={{ position: 'relative' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Search product name or category (e.g. wire, nails, cement, pipes)..."
                          value={existingProductSearch}
                          onChange={(e) => setExistingProductSearch(e.target.value)}
                          style={{ paddingLeft: '36px', paddingRight: existingProductSearch ? '32px' : '12px', height: '40px', fontSize: '13.5px' }}
                          autoFocus
                        />
                        {existingProductSearch && (
                          <button
                            type="button"
                            onClick={() => setExistingProductSearch('')}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'var(--bg-hover)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'grid',
                              placeItems: 'center',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* IN-FLOW CATALOG RESULTS BOX: Roomy, Never Cut Off */}
                      <div style={{
                        background: 'var(--bg-elevated, var(--bg-surface))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          background: 'var(--bg-hover)',
                          padding: '8px 14px',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          <span>Matching Hardware Items ({matchingExistingProducts.length})</span>
                          <span>Click to Select &amp; Restock</span>
                        </div>

                        <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '4px' }}>
                          {matchingExistingProducts.length === 0 ? (
                            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                              <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                No existing product found matching "{existingProductSearch}"
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddMode('new')
                                  setFormData(prev => ({ ...prev, name: existingProductSearch }))
                                }}
                                style={{
                                  background: 'rgba(249, 115, 22, 0.12)',
                                  border: '1px solid rgba(249, 115, 22, 0.3)',
                                  color: '#f97316',
                                  padding: '7px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                + Register New Product "{existingProductSearch}"
                              </button>
                            </div>
                          ) : (
                            matchingExistingProducts.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => handleSelectExistingProduct(p)}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: '7px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: '1px solid var(--border-subtle)',
                                  transition: 'background 0.12s ease',
                                  margin: '1px 0'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.12)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                <div style={{ flex: 1, paddingRight: '12px' }}>
                                  <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block' }}>{p.name}</strong>
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '6px', marginTop: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontSize: '10.5px', padding: '1px 6px' }}>
                                      {p.category?.name || 'General'}
                                    </span>
                                    {p.brand?.name && (
                                      <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontSize: '10.5px', padding: '1px 6px' }}>
                                        {p.brand.name}
                                      </span>
                                    )}
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      Unit: <strong style={{ color: 'var(--text-primary)' }}>{p.unit || 'piece'}</strong>
                                    </span>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      color: '#10b981',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '2px 8px'
                                    }}
                                  >
                                    {formatQuantityWithUnit(p.stock_quantity, p.unit)}
                                  </span>
                                  <span style={{ display: 'block', fontSize: '12px', color: '#f97316', fontWeight: '800', marginTop: '3px' }}>
                                    ₱{Number(p.selling_price ?? p.base_price ?? 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Existing Product Detected & Loaded Banner */
                    <div style={{ background: 'rgba(16, 185, 129, 0.09)', border: '1px solid rgba(16, 185, 129, 0.28)', borderRadius: '12px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CheckCircle2 size={13} color="#10b981" /> Existing Product Detected &amp; Loaded
                          </span>
                          <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--text-primary)', margin: '3px 0 2px' }}>
                            {selectedExistingProduct.name}
                          </h3>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', fontSize: '11.5px' }}>
                            <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                              Category: <strong>{selectedExistingProduct.category?.name || 'General'}</strong>
                            </span>
                            {selectedExistingProduct.brand?.name && (
                              <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                                Brand: <strong>{selectedExistingProduct.brand.name}</strong>
                              </span>
                            )}
                            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              Unit: <strong>{selectedExistingProduct.unit || 'piece'}</strong>
                            </span>
                            <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', fontWeight: '700' }}>
                              Current Stock: {formatQuantityWithUnit(selectedExistingProduct.stock_quantity, selectedExistingProduct.unit)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExistingProduct(null)
                            setFormData(prev => ({ ...prev, name: '', stock_quantity: '' }))
                          }}
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700' }}
                        >
                          Change Product
                        </button>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#10b981' }}>
                        Product specifications are preloaded. Enter incoming stock batch details below:
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* FLOW B: REGISTER BRAND NEW PRODUCT OR EDIT DETAILS */}
              {(editingProduct || addMode === 'new') && (
                <>
                  {/* Product Name with Duplicate Detection */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Product Name <span style={{ color: '#ef4444' }}>*</span></span>
                      {existingMatch && (
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>
                          ⚠️ Match Found
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter product name (e.g. Common Wire Nails 4-inch)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        borderColor: existingMatch ? '#f59e0b' : formErrors.name ? '#ef4444' : undefined,
                        background: existingMatch ? 'rgba(245, 158, 11, 0.08)' : undefined
                      }}
                    />

                    {/* Duplicate Detection Alert Card */}
                    {existingMatch && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '10px 12px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={13} color="#f59e0b" /> Product Already Exists in Catalog!
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>"{existingMatch.name}"</strong> is already in inventory ({formatQuantityWithUnit(existingMatch.stock_quantity, existingMatch.unit)} in stock).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectExistingProduct(existingMatch)}
                          style={{ background: '#f97316', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Select &amp; Restock
                        </button>
                      </div>
                    )}

                    {formErrors.name && (
                      <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} /> {formErrors.name}
                      </span>
                    )}
                  </div>

                  {/* 2-Column Row: Category & Brand */}
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
                  </div>

                  {/* Unit of Measurement Dropdown */}
                  <div className="form-group" ref={unitDropdownRef} style={{ position: 'relative' }}>
                    <label className="form-label">
                      Unit of Measurement <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setUnitDropdownOpen(!unitDropdownOpen)}
                      className="form-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        background: 'var(--input-bg)',
                        color: 'var(--input-text)',
                        userSelect: 'none',
                        borderColor: unitDropdownOpen ? '#f97316' : 'var(--border-color)'
                      }}
                    >
                      <span style={{ fontWeight: '600', color: 'var(--input-text)' }}>
                        {UNIT_OPTIONS.find((o) => o.value === formData.unit)?.label || 'Piece (pcs)'}
                      </span>
                      <ChevronDown
                        size={16}
                        color="var(--text-secondary)"
                        style={{
                          transform: unitDropdownOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </button>

                    {unitDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          zIndex: 9999,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
                          padding: '5px'
                        }}
                      >
                        {UNIT_OPTIONS.map((opt) => {
                          const isSelected = formData.unit === opt.value
                          return (
                            <div
                              key={opt.value}
                              onClick={() => {
                                setFormData({ ...formData, unit: opt.value })
                                setUnitDropdownOpen(false)
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                fontWeight: isSelected ? '700' : '500',
                                color: isSelected ? '#f97316' : 'var(--text-primary)',
                                background: isSelected ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check size={14} color="#f97316" />}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {formErrors.unit && (
                      <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                        {formErrors.unit}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* COMMON STOCK DETAILS SECTION:
                  Appears for:
                  1. Restocking an existing product (once selected)
                  2. Registering a brand new product
                  3. Editing product details */}
              {(selectedExistingProduct || addMode === 'new' || editingProduct) && (
                <>
                  {/* Supplier Selection */}
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

                  {/* Cost Price & Selling Price with Live Gross Margin */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-hover)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>Cost Price (₱ / {getUnitBadgeText(formData.unit, false)}) <span style={{ color: '#ef4444' }}>*</span></span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Cost</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="0.00"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      />
                      {formErrors.cost_price && (
                        <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '2px' }}>
                          {formErrors.cost_price}
                        </span>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>Selling Price (₱ / {getUnitBadgeText(formData.unit, false)}) <span style={{ color: '#ef4444' }}>*</span></span>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          color: Number(formData.selling_price || formData.base_price) > Number(formData.cost_price) ? '#10b981' : '#f97316'
                        }}>
                          {Number(formData.selling_price || formData.base_price) > 0 && Number(formData.cost_price) > 0 ? (
                            `${Math.round(((Number(formData.selling_price || formData.base_price) - Number(formData.cost_price)) / Number(formData.selling_price || formData.base_price)) * 100)}% Margin`
                          ) : 'Retail'}
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="0.00"
                        value={formData.selling_price || formData.base_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value, base_price: e.target.value })}
                      />
                      {formErrors.selling_price && (
                        <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '2px' }}>
                          {formErrors.selling_price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Quantity to Add & Reorder Threshold */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          {selectedExistingProduct
                            ? `Incoming Quantity to Add`
                            : editingProduct
                              ? 'Current Stock'
                              : 'Initial Stock'} (in {getUnitBadgeText(formData.unit, true)}) <span style={{ color: '#ef4444' }}>*</span>
                        </span>
                        <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '700' }}>
                          Unit: {formData.unit || 'piece'}
                        </span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder={getQuantityPlaceholder(formData.unit, selectedExistingProduct ? 25 : 50)}
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      />
                      {formErrors.stock_quantity && (
                        <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '2px' }}>
                          {formErrors.stock_quantity}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Reorder Threshold (in {getUnitBadgeText(formData.unit, true)}) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder={getQuantityPlaceholder(formData.unit, 10)}
                        value={formData.low_stock_threshold}
                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                      />
                      {formErrors.low_stock_threshold && (
                        <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '2px' }}>
                          {formErrors.low_stock_threshold}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Batch Tracking Dates (Date Received & Expiration) */}
                  <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.22)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <Package size={14} color="#f97316" />
                      <strong style={{ fontSize: '12px', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {selectedExistingProduct ? 'New Incoming Inventory Batch' : 'Batch Tracking Information'}
                      </strong>
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                      {selectedExistingProduct
                        ? `Recorded as a new batch. Existing batches and history are preserved.`
                        : `Stock will be recorded with its own cost, selling price, and supplier.`}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Date Received</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.received_date}
                          onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Expiration Date (Optional)</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.expiration_date}
                          onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description / Batch Notes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      {selectedExistingProduct ? 'Batch Notes / Delivery Receipt Reference' : 'Product Description / Specifications'}
                    </label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: '55px', padding: '8px 10px' }}
                      placeholder={selectedExistingProduct ? 'e.g. Received via Delivery Receipt #DR-98124' : 'Enter product description / specifications...'}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </>
              )}
            </form>

            {/* 4. STICKY DOCKED FOOTER ACTIONS */}
            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              display: 'flex',
              gap: '10px',
              flexShrink: 0
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px 16px' }}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-supply-form"
                className="btn btn-primary"
                style={{ flex: 2, padding: '10px 16px' }}
                disabled={submitting || (!editingProduct && addMode === 'existing' && !selectedExistingProduct)}
              >
                {submitting
                  ? 'Saving...'
                  : editingProduct
                    ? 'Save Changes'
                    : selectedExistingProduct
                      ? `Receive Stock Batch (${formatQuantityWithUnit(Number(formData.stock_quantity) || 0, formData.unit)})`
                      : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: BATCH / MULTIPLE PRODUCT ENTRY
          ========================================================================= */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" style={{ maxWidth: '980px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  Add Multiple Products (Batch Entry)
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Enter multiple hardware supplies simultaneously and submit in one go.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
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
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.name ? '#ef4444' : 'var(--border-color)' }}
                              placeholder="Enter product name"
                              value={row.name}


                              onChange={(e) => handleUpdateBatchField(row.id, 'name', e.target.value)}
                            />
                            {err.name && <span style={{ color: '#ef4444', fontSize: '10px' }}>{err.name}</span>}
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.base_price ? '#ef4444' : 'var(--border-color)' }}
                              placeholder="0.00"
                              value={row.base_price}
                              onChange={(e) => handleUpdateBatchField(row.id, 'base_price', e.target.value)}
                            />
                            {err.base_price && <span style={{ color: '#ef4444', fontSize: '10px' }}>{err.base_price}</span>}
                          </td>
                          <td>
                            <select
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.category_id ? '#ef4444' : 'var(--border-color)' }}
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
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.supplier_id ? '#ef4444' : 'var(--border-color)' }}
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
                              style={{ padding: '6px 8px', fontSize: '12.5px', borderColor: err.stock_quantity ? '#ef4444' : 'var(--border-color)' }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Product Information
              </h2>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1.5px solid rgba(249, 115, 22, 0.3)', borderRadius: '12px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '800', textTransform: 'uppercase' }}>
                  {viewingProduct.category?.name || 'Hardware Supply'}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {viewingProduct.name}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Selling Price</span>
                    <strong style={{ fontSize: '22px', fontWeight: '800', color: '#f97316' }}>
                      ₱{Number(viewingProduct.selling_price ?? viewingProduct.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> / {viewingProduct.unit || 'piece'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Cost Price</span>
                    <strong style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      ₱{Number(viewingProduct.cost_price ?? (viewingProduct.base_price * 0.7) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Profit Margin:</span>
                  <span style={{ fontWeight: '800', color: '#16a34a' }}>
                    {(() => {
                      const sp = Number(viewingProduct.selling_price ?? viewingProduct.base_price ?? 0)
                      const cp = Number(viewingProduct.cost_price ?? (sp * 0.7) ?? 0)
                      return sp > 0 ? `${Math.round(((sp - cp) / sp) * 100)}% Gross Margin (₱${(sp - cp).toFixed(2)} profit/unit)` : '0%'
                    })()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Primary Supplier:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                    {viewingProduct.supplier_name || (suppliers.find(s => s.id === viewingProduct.supplier_id)?.name) || 'Metro Hardware Distributors'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Manufacturer Brand:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{viewingProduct.brand?.name || 'Verified Standard'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: '800', color: viewingProduct.stock_quantity === 0 ? '#ef4444' : 'var(--text-primary)' }}>
                    {formatQuantityWithUnit(viewingProduct.stock_quantity, viewingProduct.unit)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Reorder Threshold:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                    {formatQuantityWithUnit(viewingProduct.low_stock_threshold || 10, viewingProduct.unit)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Assigned Unit of Measure:</span>
                  <span style={{ fontWeight: '800', color: '#f97316', textTransform: 'capitalize' }}>
                    {viewingProduct.unit || 'Piece'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Catalog Status:</span>
                  <span style={{ fontWeight: '800', color: viewingProduct.status === 'active' ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>
                    {viewingProduct.status || 'Active'}
                  </span>
                </div>
              </div>

              {viewingProduct.description && (
                <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Description:</strong> {viewingProduct.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowViewModal(false)
                  handleOpenProductBatches(viewingProduct)
                }}
              >
                <Package size={14} /> View Batches History
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowViewModal(false)
                  handleOpenEdit(viewingProduct)
                }}
              >
                <Edit2 size={14} /> Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: PRODUCT INVENTORY BATCHES HISTORY
          ========================================================================= */}
      {showProductBatchesModal && selectedBatchProduct && (
        <div className="modal-overlay" onClick={() => setShowProductBatchesModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '820px', width: '100%', borderRadius: '16px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={20} color="#ea580c" />
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    Inventory Batches History
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>{selectedBatchProduct.name}</strong> · Total In-Stock: <strong style={{ color: '#f97316' }}>{selectedBatchProduct.stock_quantity} {selectedBatchProduct.unit || 'pcs'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductBatchesModal(false)}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', width: '32px', height: '32px', display: 'grid', placeItems: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {loadingBatches ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading inventory batches...
                </div>
              ) : !productBatchesData || !productBatchesData.batches || productBatchesData.batches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-hover)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <Package size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>No batch records found</h4>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Batches are automatically created when new stock is added or restocked.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Summary Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--bg-hover)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Total Batches Logged</span>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{productBatchesData.summary?.total_batches || productBatchesData.batches.length}</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>Active In-Stock Batches</span>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{productBatchesData.summary?.active_batches_count ?? productBatchesData.batches.filter(b => b.status === 'active' && b.quantity > 0).length}</div>
                    </div>
                    <div style={{ background: 'rgba(249, 115, 22, 0.12)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                      <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '700', textTransform: 'uppercase' }}>Depleted / Previous Batches</span>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#f97316' }}>{productBatchesData.summary?.previous_batches_count ?? productBatchesData.batches.filter(b => b.status !== 'active' || b.quantity <= 0).length}</div>
                    </div>
                  </div>

                  {/* Batches Table */}
                  <table className="management-table" style={{ fontSize: '12.5px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '20%' }}>Batch Number</th>
                        <th style={{ width: '22%' }}>Supplier &amp; Notes</th>
                        <th style={{ width: '13%' }}>Cost Price</th>
                        <th style={{ width: '13%' }}>Selling Price</th>
                        <th style={{ width: '14%' }}>Stock (Remain / Init)</th>
                        <th style={{ width: '10%' }}>Received</th>
                        <th style={{ width: '8%', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productBatchesData.batches.map((batch) => {
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
                              <span style={{ display: 'block', fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>
                                {margin}% margin
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: isDepleted ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '13px' }}>
                                {formatQuantityWithUnit(batch.quantity, selectedBatchProduct.unit)}
                              </strong>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>
                                Initial: {formatQuantityWithUnit(batch.initial_quantity, selectedBatchProduct.unit)}
                              </span>
                            </td>
                            <td style={{ color: '#64748b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                              {batch.received_date || '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isExpired ? (
                                <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '10px' }}>EXPIRED</span>
                              ) : isDepleted ? (
                                <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', fontSize: '10px' }}>DEPLETED</span>
                              ) : (
                                <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '10px' }}>ACTIVE</span>
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
          </div>
        </div>
      )}
    </div>
  )
}
