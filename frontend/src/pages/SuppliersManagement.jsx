import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../api'
import '../styles/management.css'

export default function SuppliersManagement() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    payment_terms: ''
  })

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
      setSuppliers(Array.isArray(payload) ? payload : payload.data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      alert('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(search.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      alert('Supplier name and email are required')
      return
    }

    try {
      const method = editingSupplier ? 'PUT' : 'POST'
      const url = editingSupplier 
        ? `${API_BASE_URL}/admin/suppliers/${editingSupplier.id}`
        : `${API_BASE_URL}/admin/suppliers`

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: formData.name, contact: formData.contact_person, email: formData.email, address: [formData.address, formData.city, formData.province].filter(Boolean).join(', '), notes: formData.payment_terms })
      })

      if (!response.ok) throw new Error('Failed to save supplier')
      
      alert(editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully')
      setShowForm(false)
      setEditingSupplier(null)
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        province: '',
        payment_terms: ''
      })
      fetchSuppliers()
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert('Failed to save supplier')
    }
  }

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email,
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      province: supplier.province || '',
      payment_terms: supplier.payment_terms || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (supplierId) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/suppliers/${supplierId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      
      if (!response.ok) throw new Error('Failed to delete supplier')
      alert('Supplier deleted successfully')
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      alert('Failed to delete supplier')
    }
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Suppliers Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingSupplier(null)
            setFormData({
              name: '',
              contact_person: '',
              email: '',
              phone: '',
              address: '',
              city: '',
              province: '',
              payment_terms: ''
            })
            setShowForm(true)
          }}
        >
          + Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="management-controls">
        <input
          type="text"
          placeholder="Search by name, contact person, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Supplier Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Contact Person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <textarea
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows="3"
              />
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <input
                type="text"
                placeholder="Province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              />
              <input
                type="text"
                placeholder="Payment Terms"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-success">Save</button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      {loading ? (
        <div className="loading">Loading suppliers...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="empty-state">No suppliers found</div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Payment Terms</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.contact_person || '—'}</td>
                  <td>{supplier.email}</td>
                  <td>{supplier.phone || '—'}</td>
                  <td>{supplier.city || '—'}</td>
                  <td>{supplier.payment_terms || '—'}</td>
                  <td className="action-buttons">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleEdit(supplier)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(supplier.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
