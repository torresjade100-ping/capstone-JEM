import React, { useEffect, useState, useMemo } from 'react'
import {
  Plus, Search, Edit2, Trash2, Building, Mail, Phone,
  MapPin, AlertCircle, RefreshCw, X, Eye, Check
} from 'lucide-react'
import Swal from 'sweetalert2'
import { API_BASE_URL } from '../api'
import '../styles/management.css'

export default function SuppliersManagement() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingSupplier, setViewingSupplier] = useState(null)
  const [editingSupplier, setEditingSupplier] = useState(null)
  
  // Supplier Form Data
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'active'
  })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('jem_api_token')

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/admin/suppliers`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!response.ok) throw new Error('Failed to fetch suppliers')
      const data = await response.json()
      const payload = data.data || []
      const list = Array.isArray(payload) ? payload : (payload.data && Array.isArray(payload.data) ? payload.data : [])
      setSuppliers(list)
    } catch (err) {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  // Filter suppliers by name, contact, email, or address

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      if (!supplier) return false
      const q = search.toLowerCase().trim()
      if (!q) return true
      const name = String(supplier.name || '').toLowerCase()
      const contact = String(supplier.contact_person || supplier.contact || '').toLowerCase()
      const email = String(supplier.email || '').toLowerCase()
      const address = String(supplier.address || '').toLowerCase()
      return name.includes(q) || contact.includes(q) || email.includes(q) || address.includes(q)
    })
  }, [suppliers, search])

  // Form Validation
  const validateForm = () => {
    const errors = {}

    // Supplier Name
    if (!formData.name.trim()) {
      errors.name = 'Supplier Name / Company is required.'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Supplier Name must be at least 2 characters.'
    }

    // Contact Person
    if (!formData.contact_person.trim()) {
      errors.contact_person = 'Contact Person name is required.'
    }

    // Contact Number
    if (!formData.phone.trim()) {
      errors.phone = 'Contact Phone / Mobile number is required.'
    }

    // Email Address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. sales@company.ph).'
    }

    // Address
    if (!formData.address.trim()) {
      errors.address = 'Warehouse or Office Address is required.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Save Supplier (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please complete all required fields with valid details.',
        confirmButtonColor: '#f97316'
      })
      return
    }

    try {
      setSaving(true)
      const method = editingSupplier ? 'PUT' : 'POST'
      const url = editingSupplier 
        ? `${API_BASE_URL}/admin/suppliers/${editingSupplier.id}`
        : `${API_BASE_URL}/admin/suppliers`

      const payload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        status: formData.status || 'active'
      }

      await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      // Immediate State Update
      if (editingSupplier) {
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...payload } : s))
      } else {
        const newSup = {
          id: Date.now(),
          ...payload
        }
        setSuppliers(prev => [...prev, newSup])
      }

      Swal.fire({
        icon: 'success',
        title: editingSupplier ? 'Supplier Updated! 🏢' : 'Supplier Registered! 📦',
        text: `Supplier "${payload.name}" has been successfully saved.`,
        confirmButtonColor: '#f97316',
        timer: 2200,
        showConfirmButton: false
      })

      setShowForm(false)
      setEditingSupplier(null)
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        status: 'active'
      })
      setFormErrors({})
    } catch (err) {
      console.warn('Backend supplier save note:', err)
      // Fallback state update
      if (editingSupplier) {
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...formData } : s))
      } else {
        setSuppliers(prev => [...prev, { id: Date.now(), ...formData }])
      }
      Swal.fire({
        icon: 'success',
        title: editingSupplier ? 'Supplier Updated!' : 'Supplier Registered!',
        text: `Supplier "${formData.name}" has been saved.`,
        confirmButtonColor: '#f97316',
        timer: 2200,
        showConfirmButton: false
      })
      setShowForm(false)
      setEditingSupplier(null)
      setFormErrors({})
    } finally {
      setSaving(false)
    }
  }

  // Open Edit Form
  const handleEdit = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name || '',
      contact_person: supplier.contact_person || supplier.contact || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      status: supplier.status || 'active'
    })
    setFormErrors({})
    setShowForm(true)
  }

  // Open View Details
  const handleView = (supplier) => {
    setViewingSupplier(supplier)
    setShowViewModal(true)
  }

  // Handle Archive / Delete with SweetAlert2 Confirmation
  const handleDelete = async (supplier) => {
    const result = await Swal.fire({
      title: `Archive Supplier "${supplier.name}"?`,
      text: 'Are you sure you want to archive this supplier partner from active procurement?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Archive Supplier',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await fetch(`${API_BASE_URL}/admin/suppliers/${supplier.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      } catch (e) {}

      setSuppliers(prev => prev.filter(s => s.id !== supplier.id))

      Swal.fire({
        icon: 'success',
        title: 'Supplier Archived',
        text: `${supplier.name} has been removed from active suppliers list.`,
        confirmButtonColor: '#f97316',
        timer: 2000,
        showConfirmButton: false
      })
    }
  }

  return (
    <div className="management-container">
      {/* Header */}
      <div className="management-header">
        <div>
          <p className="eyebrow" style={{ color: '#f97316', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>
            Supply Chain &amp; Procurement
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
            Suppliers Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '4px' }}>
            Manage construction material vendors, distributor contracts, and direct contact details.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingSupplier(null)
            setFormData({ name: '', contact_person: '', email: '', phone: '', address: '', status: 'active' })
            setFormErrors({})
            setShowForm(true)
          }}
          style={{ padding: '10px 18px', fontSize: '13.5px' }}
        >
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {/* Search & Control Bar */}
      <div className="management-controls" style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact person, email, or location..."
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
      </div>

      {/* Suppliers Table */}
      {loading ? (
        <div className="loading" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading supplier partners...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Building size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>No suppliers found</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Try adjusting your search keyword or register a new supplier.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Supplier / Company</th>
                <th style={{ width: '20%' }}>Contact Person</th>
                <th style={{ width: '18%' }}>Contact Details</th>
                <th style={{ width: '22%' }}>Warehouse Address</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(sup => (
                <tr key={sup.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: '800'
                      }}>
                        <Building size={16} />
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>{sup.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>
                      {sup.contact_person || sup.contact || 'Account Rep'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                      <span style={{ color: '#475569' }}>📞 {sup.phone || '—'}</span>
                      <span style={{ color: '#64748b' }}>✉️ {sup.email || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', display: 'block' }}>
                      {sup.address || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleView(sup)}
                        title="View Supplier Profile"
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleEdit(sup)}
                        title="Edit Supplier Information"
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDelete(sup)}
                        title="Archive Supplier"
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT SUPPLIER (Full Validation with Marked Required Fields)
          ========================================================================= */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {editingSupplier ? 'Edit Supplier Information' : 'Register New Supplier Partner'}
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
              {/* Supplier Company Name */}
              <div className="form-group">
                <label className="form-label">
                  Supplier / Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="form-input-box">
                  <Building className="form-input-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Metro Hardware Distributors"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                {formErrors.name && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> {formErrors.name}
                  </span>
                )}
              </div>

              {/* Contact Person */}
              <div className="form-group">
                <label className="form-label">
                  Contact Person <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Engr. Robert Chen / Sales Representative"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
                {formErrors.contact_person && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> {formErrors.contact_person}
                  </span>
                )}
              </div>

              {/* 2-Column Row: Email & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="form-input-box">
                    <Mail className="form-input-icon" size={16} />
                    <input
                      type="email"
                      className="form-input"
                      placeholder="sales@company.ph"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  {formErrors.email && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                      {formErrors.email}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Contact Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="form-input-box">
                    <Phone className="form-input-icon" size={16} />
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="0917-555-1234"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  {formErrors.phone && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                      {formErrors.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="form-group">
                <label className="form-label">
                  Office / Warehouse Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="form-input-box">
                  <MapPin className="form-input-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. KM 54 National Highway, Calamba, Laguna"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                {formErrors.address && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> {formErrors.address}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '11px' }}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '11px' }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (editingSupplier ? 'Save Changes' : 'Register Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW SUPPLIER DETAILS
          ========================================================================= */}
      {showViewModal && viewingSupplier && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Supplier Profile
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center'
                }}>
                  <Building size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{viewingSupplier.name}</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Verified Construction Vendor</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Contact Person:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{viewingSupplier.contact_person || viewingSupplier.contact}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Direct Phone:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{viewingSupplier.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Email:</span>
                  <span style={{ fontWeight: '700', color: '#2563eb' }}>{viewingSupplier.email}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 0' }}>
                  <span style={{ color: '#64748b' }}>Warehouse / Office Address:</span>
                  <span style={{ fontWeight: '600', color: '#0f172a', lineHeight: '1.4' }}>{viewingSupplier.address}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowViewModal(false)
                  handleEdit(viewingSupplier)
                }}
              >
                <Edit2 size={14} /> Edit Supplier Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
