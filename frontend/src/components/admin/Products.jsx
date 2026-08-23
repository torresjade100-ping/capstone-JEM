import { useState, useMemo } from 'react'
import { products as allProducts, categories } from '../../data/mockData'

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [formValues, setFormValues] = useState({ name: '', sku: '', category: '', price: '', stock: '', size: '', color: '', grade: '', thickness: '' })

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesSearch = [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = categoryFilter === 'All categories' || product.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, categoryFilter])

  const openAddProduct = () => {
    setSelectedProduct(null)
    setFormValues({ name: '', sku: '', category: categories[0] || '', price: '', stock: '', size: '', color: '', grade: '', thickness: '' })
    setModalOpen(true)
  }

  const openEditProduct = (product) => {
    setSelectedProduct(product)
    setFormValues({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      stock: product.stock,
      size: product.variants.size,
      color: product.variants.color,
      grade: product.variants.grade,
      thickness: product.variants.thickness,
    })
    setModalOpen(true)
  }

  const handleSave = (event) => {
    event.preventDefault()
    setModalOpen(false)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Product catalog</h2>
          <p style={{ color: '#64748b', marginTop: 6 }}>Search, filter, and update product variants in one place.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAddProduct}>Add new product</button>
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 24, gridTemplateColumns: '1fr minmax(180px, 260px)' }}>
        <input
          type="search"
          className="input-field"
          placeholder="Search by product, SKU, or category"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select className="select-field" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option>All categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="stat-card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Margin</th>
              <th>Supplier</th>
              <th>Variant</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} style={{ cursor: 'pointer' }} onClick={() => openEditProduct(product)}>
                <td style={{ fontWeight: 600 }}>{product.name}</td>
                <td className="font-mono" style={{ fontSize: 12.5 }}>{product.sku}</td>
                <td>{product.category}</td>
                <td style={{ fontWeight: 600 }}>{product.stock}</td>
                <td>₱{product.price}</td>
                <td>{product.margin}</td>
                <td>{product.supplier}</td>
                <td>{product.variants.size}, {product.variants.color}</td>
                <td><span className={`badge ${product.stock > 30 ? 'badge-green' : product.stock > 10 ? 'badge-yellow' : 'badge-red'}`}>{product.stock > 30 ? 'In stock' : product.stock > 10 ? 'Low stock' : 'Critical'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 640, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedProduct ? 'Edit product' : 'Add product'}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{selectedProduct ? 'Update inventory and variant details.' : 'Create a new product listing.'}</div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Product name
                  <input value={formValues.name} onChange={(event) => setFormValues({ ...formValues, name: event.target.value })} />
                </label>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  SKU
                  <input value={formValues.sku} onChange={(event) => setFormValues({ ...formValues, sku: event.target.value })} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Category
                  <select value={formValues.category} onChange={(event) => setFormValues({ ...formValues, category: event.target.value })} className="select-field">
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Price
                  <input value={formValues.price} onChange={(event) => setFormValues({ ...formValues, price: event.target.value })} />
                </label>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Stock
                  <input type="number" value={formValues.stock} onChange={(event) => setFormValues({ ...formValues, stock: event.target.value })} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Size
                  <input value={formValues.size} onChange={(event) => setFormValues({ ...formValues, size: event.target.value })} />
                </label>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Color
                  <input value={formValues.color} onChange={(event) => setFormValues({ ...formValues, color: event.target.value })} />
                </label>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Grade
                  <input value={formValues.grade} onChange={(event) => setFormValues({ ...formValues, grade: event.target.value })} />
                </label>
                <label className="input-field" style={{ display: 'grid', gap: 8 }}>
                  Thickness
                  <input value={formValues.thickness} onChange={(event) => setFormValues({ ...formValues, thickness: event.target.value })} />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
