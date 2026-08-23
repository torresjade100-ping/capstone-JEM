import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Archive, AlertCircle, Filter } from 'lucide-react'
import { API_BASE_URL, getBrands } from '../api'
import '../styles/dashboard.css'

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category: '', brand: '', status: 'active' })
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
    base_price: '',
    unit: 'piece',
    stock_quantity: '',
    low_stock_threshold: '',
    status: 'active',
  })

  useEffect(() => {
    fetchProducts()
    getBrands().then((payload) => setBrands(Array.isArray(payload) ? payload : payload?.data || [])).catch(() => setBrands([]))
  }, [filters])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...filters,
        search,
      })
      const res = await fetch(`${API_BASE_URL}/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('jem_api_token')}` },
      })
      const data = await res.json()
      if (data.success) setProducts(data.data.data || data.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingProduct ? `${API_BASE_URL}/admin/products/${editingProduct.id}` : `${API_BASE_URL}/admin/products`
      const method = editingProduct ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jem_api_token')}`,
        },
        body: JSON.stringify(formData),
      })
      
      if (res.ok) {
        setShowForm(false)
        setEditingProduct(null)
        setFormData({
          name: '', description: '', category_id: '', brand_id: '',
          base_price: '', unit: 'piece', stock_quantity: '', low_stock_threshold: '', status: 'active',
        })
        fetchProducts()
      }
    } catch (error) {
      console.error('Failed to save product:', error)
    }
  }

  const handleArchive = async (productId) => {
    if (confirm('Are you sure you want to archive this product?')) {
      try {
        await fetch(`${API_BASE_URL}/admin/products/${productId}/deactivate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('jem_api_token')}` },
        })
        fetchProducts()
      } catch (error) {
        console.error('Failed to archive product:', error)
      }
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventory Management</p>
          <h1>Products</h1>
          <p className="muted">Manage your product catalog and pricing</p>
        </div>
        <button className="button button-accent" onClick={() => { setShowForm(true); setEditingProduct(null) }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panel-head">
            <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <button onClick={() => setShowForm(false)}>Close</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input type="text" placeholder="Product Name" required value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <input type="number" placeholder="Base Price" required value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} />
              <textarea placeholder="Description" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              <input type="text" placeholder="Unit (e.g., piece, kg, bag)" value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
              <input type="number" placeholder="Stock Quantity" required value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} />
              <input type="number" placeholder="Low Stock Threshold" required value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })} />
              <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                <option value="">Select Category</option>
                <option value="1">Lumber</option>
                <option value="2">Masonry</option>
                <option value="3">Hardware</option>
              </select>
              <select required value={formData.brand_id} onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}>
                <option value="">Select Brand</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button type="submit" className="button button-dark" style={{ marginTop: '16px' }}>
              {editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <div className="search-box">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." />
          </div>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        {loading ? (
          <p style={{ padding: '16px' }}>Loading...</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={24} />
            <p>No products found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong></td>
                    <td>{product.sku}</td>
                    <td>₱{product.base_price?.toLocaleString()}</td>
                    <td>
                      <strong>{product.stock_quantity}</strong>
                      {product.stock_quantity <= product.low_stock_threshold && (
                        <span style={{ color: '#f44336', marginLeft: '8px' }}>Low</span>
                      )}
                    </td>
                    <td>
                      <span className={`status status-${product.status}`}>{product.status}</span>
                    </td>
                    <td>
                      <button onClick={() => { setEditingProduct(product); setFormData(product); setShowForm(true) }} 
                        className="icon-button" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleArchive(product.id)} className="icon-button" title="Archive">
                        <Archive size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
