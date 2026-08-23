import { useState } from 'react'
import { products } from '../../data/mockData'

export default function POS() {
  const [cart, setCart] = useState([])
  const [selectedId, setSelectedId] = useState(products[0]?.id)

  const selectedProduct = products.find((product) => product.id === selectedId)
  const addToCart = () => {
    if (!selectedProduct) return
    setCart((current) => [...current, selectedProduct])
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Point of Sale</h2>
          <p style={{ color: '#64748b', marginTop: 6 }}>Add items to checkout and complete payments quickly.</p>
        </div>
        <button type="button" className="btn-primary">New transaction</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div className="stat-card">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add item</div>
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Product</label>
              <select
                className="select-field"
                value={selectedId}
                onChange={(event) => setSelectedId(Number(event.target.value))}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} — ₱{product.price}</option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-primary" onClick={addToCart}>Add to cart</button>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Checkout</div>
          <div style={{ display: 'grid', gap: 14 }}>
            {cart.length === 0 ? (
              <div style={{ color: '#64748b' }}>No items in cart yet.</div>
            ) : (
              cart.map((item, index) => (
                <div key={`${item.id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{item.name}</span>
                  <span style={{ fontWeight: 600 }}>₱{item.price}</span>
                </div>
              ))
            )}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total</span>
              <span>{cart.length ? `₱${cart.reduce((sum, item) => sum + Number(item.price), 0).toFixed(2)}` : '₱0.00'}</span>
            </div>
            <button type="button" className="btn-navy">Complete payment</button>
          </div>
        </div>
      </div>
    </div>
  )
}
