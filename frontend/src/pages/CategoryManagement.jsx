import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tag, Plus, Search, Edit2, Trash2, Eye, AlertCircle,
  Package, RefreshCw, Layers, ArrowRight, ShieldCheck,
  X, Check, CheckCircle2, Ban, Power
} from 'lucide-react'
import Swal from 'sweetalert2'
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  activateCategory,
  deactivateCategory
} from '../api'
import '../styles/management.css'

export default function CategoryManagement() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Products in Category Modal
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryProducts, setCategoryProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  })
  const [formErrors, setFormErrors] = useState({})

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAdminCategories({ all: 1 })
      const list = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : [])
      setCategories(list)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Handle Deep Linking from Global Search
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const targetCatId = urlParams.get('categoryId')
      const targetSearch = urlParams.get('search')
      if (targetSearch && !search) {
        setSearch(targetSearch)
      }
      if (targetCatId && categories.length > 0) {
        const matched = categories.find(c => String(c.id) === String(targetCatId))
        if (matched) {
          setSelectedCategory(matched)
          setShowProductsModal(true)
        }
      }
    } catch (e) {}
  }, [categories])

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const q = search.trim().toLowerCase()
      const matchSearch = !q ||
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))
      const matchStatus = statusFilter === 'all' || cat.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [categories, search, statusFilter])

  // Statistics
  const stats = useMemo(() => {
    const total = categories.length
    const active = categories.filter(c => c.status === 'active').length
    const totalProducts = categories.reduce((sum, c) => sum + (Number(c.products_count) || 0), 0)
    const sortedByProducts = [...categories].sort((a, b) => (b.products_count || 0) - (a.products_count || 0))
    const topCategory = sortedByProducts[0] || null

    return { total, active, totalProducts, topCategory }
  }, [categories])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '', status: 'active' })
    setFormErrors({})
    setShowFormModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat)
    setFormData({
      name: cat.name || '',
      description: cat.description || '',
      status: cat.status || 'active'
    })
    setFormErrors({})
    setShowFormModal(true)
  }

  // Submit Category Form (Create / Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Category name is required.'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setFormSubmitting(true)
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status
      }

      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, payload)
        if (!res?.success) throw new Error(res?.message || 'Failed to update category')
        Swal.fire({
          icon: 'success',
          title: 'Category Updated! ✨',
          text: `"${payload.name}" was successfully updated.`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        const res = await createCategory(payload)
        if (!res?.success) throw new Error(res?.message || 'Failed to create category')
        Swal.fire({
          icon: 'success',
          title: 'Category Created! 🎉',
          text: `"${payload.name}" is now ready to hold multiple products.`,
          timer: 2000,
          showConfirmButton: false
        })
      }

      setShowFormModal(false)
      fetchCategories()
    } catch (err) {
      if (err.errors) {
        const mappedErrors = {}
        Object.entries(err.errors).forEach(([field, msg]) => {
          mappedErrors[field] = Array.isArray(msg) ? msg[0] : msg
        })
        setFormErrors(mappedErrors)
      }
      const errorMsg = err.errors?.name?.[0] || err.message || 'Unable to save category. Please try again.'
      Swal.fire({
        icon: 'error',
        title: 'Error Saving Category',
        text: errorMsg,
        confirmButtonColor: '#ea580c'
      })
    } finally {
      setFormSubmitting(false)
    }
  }

  // View Products in Category Modal
  const handleViewProducts = async (cat) => {
    setSelectedCategory(cat)
    setShowProductsModal(true)
    setProductSearch('')
    try {
      setLoadingProducts(true)
      const res = await getCategoryProducts(cat.id)
      const list = res?.data || []
      setCategoryProducts(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Error fetching category products:', err)
      setCategoryProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  // Filtered Products inside Modal
  const filteredCategoryProducts = useMemo(() => {
    if (!productSearch.trim()) return categoryProducts
    const q = productSearch.trim().toLowerCase()
    return categoryProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand?.name && p.brand.name.toLowerCase().includes(q))
    )
  }, [categoryProducts, productSearch])

  // Delete / Archive Category with Safety Validation
  const handleDeleteCategory = async (cat) => {
    const pCount = Number(cat.products_count) || 0

    if (pCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Delete Category',
        html: `
          <p style="font-size: 14px; margin-bottom: 8px;">
            The category <strong>"${cat.name}"</strong> contains <strong>${pCount} product(s)</strong>.
          </p>
          <p style="font-size: 12.5px; color: #64748b;">
            To protect your inventory records from accidental loss, categories with existing products cannot be deleted. 
            Please reassign or remove its products first.
          </p>
        `,
        showCancelButton: true,
        confirmButtonText: `View ${pCount} Products`,
        cancelButtonText: 'Understood',
        confirmButtonColor: '#ea580c',
      }).then((result) => {
        if (result.isConfirmed) {
          handleViewProducts(cat)
        }
      })
      return
    }

    // Safe deletion for categories with 0 products
    const result = await Swal.fire({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${cat.name}"? This action can be undone from database backups.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444'
    })

    if (result.isConfirmed) {
      try {
        const res = await deleteCategory(cat.id)
        if (!res?.success) throw new Error(res?.message || 'Failed to delete category')
        Swal.fire({
          icon: 'success',
          title: 'Category Deleted',
          text: `"${cat.name}" was removed.`,
          timer: 1800,
          showConfirmButton: false
        })
        fetchCategories()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Deletion Blocked',
          text: err.message,
          confirmButtonColor: '#ea580c'
        })
      }
    }
  }

  // Handle Toggle Active / Inactive Status
  const handleToggleCategoryStatus = async (cat) => {
    const nextStatus = cat.status === 'active' ? 'inactive' : 'active'

    // Optimistically update categories
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, status: nextStatus } : c))

    try {
      if (nextStatus === 'active') {
        const res = await activateCategory(cat.id)
        if (!res?.success) throw new Error(res?.message || 'Failed to activate category')
      } else {
        const res = await deactivateCategory(cat.id)
        if (!res?.success) throw new Error(res?.message || 'Failed to deactivate category')
      }

      Swal.fire({
        icon: 'success',
        title: nextStatus === 'active' ? 'Category Activated 🟢' : 'Category Deactivated 🔴',
        text: `"${cat.name}" is now ${nextStatus.toUpperCase()} and ${nextStatus === 'active' ? 'available' : 'unavailable'} for new product assignments.`,
        timer: 1800,
        showConfirmButton: false
      })
    } catch (err) {
      // Revert on error
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, status: cat.status } : c))
      Swal.fire({
        icon: 'error',
        title: 'Status Update Failed',
        text: err.message || 'Unable to update category status.',
        confirmButtonColor: '#ea580c'
      })
    }
  }

  // Quick navigate to Product Management with this category selected
  const handleNavigateToProducts = (cat) => {
    navigate(`/products?category_id=${cat.id}`)
  }

  return (
    <div className="management-page">
      {/* Page Header */}
      <div className="management-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Tag size={26} color="#ea580c" /> Category Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Manage product categories with dynamic <strong>One Category → Many Products</strong> relationship.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchCategories}
            title="Refresh categories"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add New Category
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="panel" style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Categories</span>
            <Tag size={18} color="#ea580c" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '8px' }}>
            {stats.total}
          </div>
          <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>{stats.active} Active</span>
        </div>

        <div className="panel" style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Categorized Products</span>
            <Package size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '8px' }}>
            {stats.totalProducts}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Across all active departments</span>
        </div>

        <div className="panel" style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Top Category</span>
            <Layers size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stats.topCategory?.name || 'None'}
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
            {stats.topCategory ? `${stats.topCategory.products_count} Products` : 'No data'}
          </span>
        </div>

        <div className="panel" style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Architecture Rule</span>
            <ShieldCheck size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#8b5cf6', marginTop: '8px' }}>
            1 Category → ∞ Products
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cascade protection active</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ marginBottom: '18px', padding: '14px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '240px', background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category name or description..."
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px', color: 'var(--text-primary)' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            style={{ minWidth: '140px' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Categories Table */}
      <div className="panel" style={{ padding: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
            <p>Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Tag size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No categories found</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Try adjusting your search criteria or click "Add New Category" to create one.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Category Name</th>
                  <th style={{ width: '38%' }}>Description</th>
                  <th style={{ width: '15%' }}>Assigned Products</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => {
                  const pCount = Number(cat.products_count) || 0
                  const isActive = cat.status === 'active'

                  return (
                    <tr key={cat.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(234, 88, 12, 0.1)',
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '12px'
                          }}>
                            {cat.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{cat.name}</strong>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>ID #{cat.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {cat.description || <em style={{ color: 'var(--text-muted)' }}>No description provided.</em>}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleViewProducts(cat)}
                          style={{
                            background: pCount > 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                            color: pCount > 0 ? '#3b82f6' : 'var(--text-muted)',
                            border: pCount > 0 ? '1px solid rgba(59, 130, 246, 0.28)' : '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '3px 9px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title={`Click to view all ${pCount} products in ${cat.name}`}
                        >
                          <Package size={13} />
                          {pCount} {pCount === 1 ? 'Product' : 'Products'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleCategoryStatus(cat)}
                          title={isActive ? "Category is Active — Click to Deactivate" : "Category is Inactive — Click to Activate"}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: isActive ? '1px solid #86efac' : '1px solid #fca5a5',
                            background: isActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isActive ? '#22c55e' : '#ef4444',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            outline: 'none'
                          }}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 size={13} color="#22c55e" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <Ban size={13} color="#ef4444" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleToggleCategoryStatus(cat)}
                            title={isActive ? "Deactivate category" : "Activate category"}
                            style={{ color: isActive ? '#f59e0b' : '#22c55e' }}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleViewProducts(cat)}
                            title="View all products under this category"
                            style={{ color: '#3b82f6' }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleOpenEdit(cat)}
                            title="Edit category details"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleDeleteCategory(cat)}
                            title={pCount > 0 ? `Cannot delete: contains ${pCount} products` : 'Delete category'}
                            style={{ color: pCount > 0 ? 'var(--text-muted)' : '#ef4444' }}
                          >
                            <Trash2 size={15} />
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

      {/* MODAL: View Products in Category */}
      {showProductsModal && selectedCategory && (
        <div className="modal-overlay" onClick={() => setShowProductsModal(false)} style={{ zIndex: 2000 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '820px',
              width: '90%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              boxShadow: '0 25px 65px rgba(0, 0, 0, 0.45)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                    {selectedCategory.name}
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Category ID #{selectedCategory.id} • {categoryProducts.length} Products Assigned
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowProductsModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Search & Quick Action Bar */}
            <div style={{ padding: '14px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="search-box" style={{ flex: 1, background: 'var(--input-bg)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <Search size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={`Search products in ${selectedCategory.name}...`}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)' }}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleNavigateToProducts(selectedCategory)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '7px 14px' }}
              >
                <span>Manage in Products</span> <ArrowRight size={14} />
              </button>
            </div>

            {/* Modal Product List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {loadingProducts ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={22} className="spin" style={{ margin: '0 auto 8px' }} />
                  <p>Loading products in this category...</p>
                </div>
              ) : filteredCategoryProducts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Package size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    No products found in this category
                  </h4>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    You can add new products to "{selectedCategory.name}" using the Product Management page.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleNavigateToProducts(selectedCategory)}
                    style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={15} /> Add Products to {selectedCategory.name}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredCategoryProducts.map((prod, idx) => (
                    <div
                      key={prod.id || idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>📦</span>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{prod.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                            {prod.brand?.name && <span>Brand: {prod.brand.name}</span>}
                            <span>Unit: {prod.unit || 'piece'}</span>
                            <span>Stock: <strong>{prod.stock_quantity}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '14px', color: '#ea580c', display: 'block' }}>
                          ₱{Number(prod.selling_price || prod.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        <span className={`badge ${prod.status === 'active' ? 'badge-success' : 'badge-inactive'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {prod.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {filteredCategoryProducts.length} of {categoryProducts.length} products
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowProductsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Category */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)} style={{ zIndex: 2000 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              width: '90%',
              padding: 0,
              overflow: 'hidden',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              boxShadow: '0 25px 65px rgba(0, 0, 0, 0.45)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} color="#ea580c" />
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowFormModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Category Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Electrical, Plumbing, Power Tools..."
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13.5px', borderRadius: '8px', border: formErrors.name ? '1px solid #ef4444' : '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                />
                {formErrors.name && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> {formErrors.name}
                  </span>
                )}
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  This category will dynamically support multiple products.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Description <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief summary of items classified under this category..."
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Status
                </label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13.5px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="active">Active (Available for products)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFormModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {formSubmitting ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
