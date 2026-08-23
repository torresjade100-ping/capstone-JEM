import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../api'
import '../styles/management.css'

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    reason: 'physical_count',
    notes: ''
  })

  const token = localStorage.getItem('jem_api_token')

  useEffect(() => {
    fetchInventory()
  }, [filter])

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
      setInventory(Array.isArray(payload) ? payload : payload.data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
      alert('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(search.toLowerCase())
    
    if (filter === 'low') return matchesSearch && (item.quantity <= item.low_stock_threshold)
    if (filter === 'out') return matchesSearch && item.quantity === 0
    return matchesSearch
  })

  const handleAdjustStock = async (e) => {
    e.preventDefault()
    
    if (!selectedProduct || adjustmentData.quantity === 0) {
      alert('Please select a product and enter quantity')
      return
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/stock-adjustments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: selectedProduct.product_id,
            quantity_change: parseInt(adjustmentData.quantity),
            reason: adjustmentData.reason,
            adjustment_type: 'other'
          })
        }
      )

      if (!response.ok) throw new Error('Failed to adjust stock')
      
      alert('Stock adjusted successfully')
      setShowAdjustment(false)
      setSelectedProduct(null)
      setAdjustmentData({ quantity: 0, reason: 'physical_count', notes: '' })
      fetchInventory()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert('Failed to adjust stock')
    }
  }

  const getStockStatus = (quantity, threshold) => {
    if (quantity === 0) return { label: 'Out of Stock', color: '#d32f2f' }
    if (quantity <= threshold) return { label: 'Low Stock', color: '#ff9800' }
    return { label: 'In Stock', color: '#4caf50' }
  }

  const totalInventoryValue = inventory.reduce((sum, item) => 
    sum + (item.unit_price * item.quantity), 0
  )

  const lowStockCount = inventory.filter(item => 
    item.quantity > 0 && item.quantity <= item.low_stock_threshold
  ).length

  const outOfStockCount = inventory.filter(item => 
    item.quantity === 0
  ).length

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Inventory Management</h1>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Items</h3>
          <p className="metric-value">{inventory.length}</p>
        </div>
        <div className="metric-card">
          <h3>Low Stock</h3>
          <p className="metric-value" style={{ color: '#ff9800' }}>{lowStockCount}</p>
        </div>
        <div className="metric-card">
          <h3>Out of Stock</h3>
          <p className="metric-value" style={{ color: '#d32f2f' }}>{outOfStockCount}</p>
        </div>
        <div className="metric-card">
          <h3>Inventory Value</h3>
          <p className="metric-value">₱{totalInventoryValue.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="management-controls">
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Items</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustment && (
        <div className="modal-overlay" onClick={() => setShowAdjustment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Adjust Stock: {selectedProduct?.product_name}</h2>
            <form onSubmit={handleAdjustStock}>
              <div className="form-group">
                <label>Current Quantity: {selectedProduct?.quantity}</label>
              </div>
              <input
                type="number"
                placeholder="Adjustment Quantity (+ or -)"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                required
              />
              <select
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
              >
                <option value="physical_count">Physical Count</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
                <option value="return">Return</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <textarea
                placeholder="Adjustment Notes"
                value={adjustmentData.notes}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                rows="3"
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-success">Apply Adjustment</button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdjustment(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {loading ? (
        <div className="loading">Loading inventory...</div>
      ) : filteredInventory.length === 0 ? (
        <div className="empty-state">No inventory items found</div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Low Stock Threshold</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => {
                const status = getStockStatus(item.quantity, item.low_stock_threshold)
                const totalValue = item.unit_price * item.quantity
                
                return (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.unit_price?.toFixed(2)}</td>
                    <td>₱{totalValue.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                    <td>{item.low_stock_threshold}</td>
                    <td>
                      <span 
                        className="badge"
                        style={{ backgroundColor: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => {
                          setSelectedProduct(item)
                          setShowAdjustment(true)
                        }}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
