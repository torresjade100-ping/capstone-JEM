import React, { useState } from 'react'

const sampleProducts = [
  { id: 'P-001', name: '2x4 Lumber', price: 120 },
  { id: 'P-002', name: 'Cement 40kg', price: 320 },
  { id: 'P-003', name: 'Galvanized Nails 2"', price: 45 },
]

export default function StaffPOS() {
  const [cart, setCart] = useState([])

  const add = (p) => {
    setCart((c) => {
      const found = c.find(i => i.id === p.id)
      if (found) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      return [...c, { ...p, qty: 1 }]
    })
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input-field" placeholder="Search products" style={{ flex: 1 }} />
            <button className="btn-secondary">Scan</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {sampleProducts.map(p => (
              <div key={p.id} className="stat-card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: '#64748b', marginTop: 6 }}>₱{p.price}</div>
                <div style={{ marginTop: 10 }}>
                  <button className="btn-primary" onClick={() => add(p)}>Add</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Cart</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cart.length === 0 && <div style={{ color: '#64748b' }}>Cart is empty</div>}
            {cart.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{i.name} × {i.qty}</div>
                <div style={{ fontWeight: 700 }}>₱{i.price * i.qty}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ color: '#64748b' }}>Subtotal</div>
              <div style={{ fontWeight: 700 }}>₱{total}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary">Clear</button>
              <button className="btn-primary">Complete Sale</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
