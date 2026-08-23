import { useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

const productCatalog = [
  { id: 1, name: 'Coco Lumber 2×3×10', category: 'Lumber', price: 120, unit: 'piece', stock: 342, imageTone: 'wood' },
  { id: 2, name: 'Portland Cement 40kg', category: 'Cement', price: 290, unit: 'bag', stock: 15, imageTone: 'cement' },
  { id: 3, name: 'GI Sheet 24 Gauge 8ft', category: 'Roofing', price: 720, unit: 'sheet', stock: 88, imageTone: 'roof' },
  { id: 4, name: 'PVC Pipe 4" × 3m', category: 'Plumbing', price: 240, unit: 'piece', stock: 156, imageTone: 'plumbing' },
  { id: 5, name: 'Common Wire Nail 4"', category: 'Nails', price: 85, unit: 'box', stock: 210, imageTone: 'nails' },
  { id: 6, name: 'Boysen Latex Paint White', category: 'Paint', price: 420, unit: 'can', stock: 34, imageTone: 'paint' },
  { id: 7, name: 'Electrical Wire 2.0mm', category: 'Electrical', price: 180, unit: 'roll', stock: 62, imageTone: 'electrical' },
  { id: 8, name: 'Marine Plywood 12mm', category: 'Lumber', price: 650, unit: 'sheet', stock: 9, imageTone: 'wood' },
]

const categoryOptions = ['All', 'Lumber', 'Cement', 'Roofing', 'Plumbing', 'Nails', 'Paint', 'Electrical']

export default function POSPage({ onTransactionComplete }) {
  const [products, setProducts] = useState(productCatalog)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [toast, setToast] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, products, search])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal
  const changeDue = paymentMethod === 'cash' && amountReceived ? Number(amountReceived) - total : 0
  const cashIsSufficient = paymentMethod !== 'cash' || Number(amountReceived || 0) >= total
  const isSubmitDisabled = cart.length === 0 || isProcessing || (paymentMethod === 'cash' && !cashIsSufficient)

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          return current
        }

        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...current, { ...product, quantity: 1 }]
    })
  }

  const updateCartQuantity = (id, nextQty) => {
    setCart((current) => {
      if (nextQty <= 0) {
        return current.filter((item) => item.id !== id)
      }

      const product = products.find((entry) => entry.id === id)
      return current.map((item) => {
        if (item.id !== id) return item
        const maxQty = product?.stock || item.stock || 0
        return { ...item, quantity: Math.min(nextQty, maxQty) }
      })
    })
  }

  const removeCartItem = (id) => {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  const handleCompleteTransaction = () => {
    if (cart.length === 0) {
      setToast('Cart is empty. Add products before checkout.')
      return
    }

    if (paymentMethod === 'cash' && Number(amountReceived || 0) < total) {
      setToast('Payment is insufficient for this cash transaction.')
      return
    }

    setIsProcessing(true)

    const finalProducts = products.map((product) => {
      const cartItem = cart.find((item) => item.id === product.id)
      if (!cartItem) return product
      return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) }
    })

    setProducts(finalProducts)

    const transaction = {
      id: Date.now(),
      number: `JEM-${String(Date.now()).slice(-6)}`,
      date: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Maya',
      total,
      change: paymentMethod === 'cash' ? Number(Math.max(0, Number(amountReceived || 0) - total)).toFixed(2) : 0,
      items: cart.map((item) => ({ name: item.name, quantity: item.quantity, total: item.price * item.quantity })),
    }

    if (typeof onTransactionComplete === 'function') {
      onTransactionComplete(transaction)
    }

    setCart([])
    setAmountReceived('')
    setToast('Transaction completed successfully.')
    setTimeout(() => setToast(''), 2600)
    setIsProcessing(false)
  }

  return (
    <>
      <style>{`
        .jem-pos-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 400px;
          gap: 18px;
          min-height: calc(100vh - 118px);
        }

        .jem-pos-main {
          min-width: 0;
          background: transparent;
        }

        .jem-pos-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 14px;
          align-items: center;
          margin-bottom: 16px;
        }

        .jem-pos-search {
          flex: 1 1 360px;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 1px solid rgba(23,41,58,0.08);
          border-radius: 12px;
          padding: 0 16px;
          height: 52px;
          box-shadow: 0 10px 24px rgba(23,41,58,0.02);
        }

        .jem-pos-search input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 0.9rem;
          color: #17293a;
          background: transparent;
        }

        .jem-pos-search input::placeholder {
          color: #8a9694;
        }

        .jem-category-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          flex: 1 1 100%;
        }

        .jem-category-btn {
          border: 1px solid rgba(23,41,58,0.08);
          background: white;
          color: #17293a;
          border-radius: 10px;
          min-height: 36px;
          padding: 0 14px;
          font-weight: 700;
          font-size: 0.76rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .jem-category-btn.active {
          background: #17293a;
          color: white;
          border-color: #17293a;
        }

        .jem-product-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .jem-product-card {
          background: white;
          border: 1px solid rgba(23,41,58,0.06);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 18px rgba(23,41,58,0.03);
          cursor: pointer;
          text-align: left;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          padding: 0;
        }

        .jem-product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 28px rgba(23,41,58,0.08);
          border-color: rgba(249,115,22,0.25);
        }

        .jem-product-card.disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .jem-product-art {
          height: 115px;
          padding: 14px;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          color: rgba(255,255,255,0.86);
          font-weight: 800;
          font-size: 0.66rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .jem-product-art.wood { background: linear-gradient(135deg, #b67c4e, #8d5d37); }
        .jem-product-art.cement { background: linear-gradient(135deg, #b2b7b5, #8a8e8d); }
        .jem-product-art.roof { background: linear-gradient(135deg, #c87d5f, #a95c43); }
        .jem-product-art.plumbing { background: linear-gradient(135deg, #7ca6c4, #5f7f94); }
        .jem-product-art.nails { background: linear-gradient(135deg, #7f8d96, #596a73); }
        .jem-product-art.paint { background: linear-gradient(135deg, #d9d5d0, #b8b0a8); color: rgba(23,41,58,0.7); }
        .jem-product-art.electrical { background: linear-gradient(135deg, #d5b675, #b8964e); }

        .jem-product-body {
          padding: 14px 14px 16px;
        }

        .jem-product-category {
          display: inline-block;
          color: #f97316;
          font-size: 0.64rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .jem-product-name {
          margin: 10px 0 12px;
          font-size: 1rem;
          line-height: 1.4;
          color: #17293a;
          min-height: 44px;
        }

        .jem-price-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 8px;
        }

        .jem-price {
          color: #f97316;
          font-weight: 800;
          font-size: 1.12rem;
        }

        .jem-unit {
          color: #64737b;
          font-size: 0.7rem;
        }

        .jem-stock {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #64737b;
          font-size: 0.7rem;
          margin-top: 10px;
        }

        .jem-stock strong {
          color: #17293a;
          font-size: 0.74rem;
        }

        .jem-stock.warning {
          color: #d97706;
        }

        .jem-stock.warning strong {
          color: #d97706;
        }

        .jem-cart-panel {
          background: white;
          border: 1px solid rgba(23,41,58,0.06);
          border-radius: 18px;
          box-shadow: 0 12px 24px rgba(23,41,58,0.04);
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .jem-cart-header {
          padding: 18px 18px 14px;
          border-bottom: 1px solid rgba(23,41,58,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .jem-cart-header h3 {
          margin: 0;
          font-size: 1.05rem;
          letter-spacing: -0.04em;
          color: #17293a;
        }

        .jem-cart-header .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 7px;
          border-radius: 999px;
          background: rgba(249,115,22,0.12);
          color: #f97316;
          font-weight: 800;
          font-size: 0.7rem;
        }

        .jem-cart-body {
          flex: 1;
          overflow: auto;
          padding: 16px 16px 0;
        }

        .jem-empty-cart {
          min-height: 320px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          color: #64737b;
          gap: 10px;
        }

        .jem-empty-cart h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #17293a;
        }

        .jem-empty-cart p {
          margin: 0;
          font-size: 0.8rem;
        }

        .jem-cart-item {
          border: 1px solid rgba(23,41,58,0.06);
          border-radius: 12px;
          padding: 12px 12px 10px;
          background: #f9f8f6;
        }

        .jem-cart-item + .jem-cart-item {
          margin-top: 12px;
        }

        .jem-cart-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }

        .jem-cart-item h4 {
          margin: 0;
          font-size: 0.82rem;
          line-height: 1.4;
          color: #17293a;
        }

        .jem-cart-item p {
          margin: 5px 0 0;
          color: #64737b;
          font-size: 0.7rem;
        }

        .jem-remove-btn {
          background: transparent;
          border: none;
          color: #7a878f;
          cursor: pointer;
          padding: 2px;
        }

        .jem-cart-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .jem-qty-box {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(23,41,58,0.08);
          border-radius: 10px;
          background: white;
          padding: 4px 8px;
        }

        .jem-qty-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 8px;
          background: rgba(23,41,58,0.04);
          color: #17293a;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-weight: 700;
        }

        .jem-qty-value {
          min-width: 22px;
          text-align: center;
          font-weight: 700;
          color: #17293a;
          font-size: 0.8rem;
        }

        .jem-line-total {
          color: #17293a;
          font-weight: 800;
          font-size: 0.82rem;
        }

        .jem-checkout {
          border-top: 1px solid rgba(23,41,58,0.08);
          padding: 16px;
          background: white;
        }

        .jem-total-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 700;
          color: #17293a;
          margin-bottom: 18px;
        }

        .jem-total-row strong {
          font-size: 1.1rem;
        }

        .jem-payment-label {
          display: block;
          margin-bottom: 8px;
          color: #64737b;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .jem-payment-select,
        .jem-amount-input {
          width: 100%;
          height: 42px;
          border: 1px solid rgba(23,41,58,0.12);
          border-radius: 10px;
          background: #f9f8f6;
          color: #17293a;
          padding: 0 12px;
          font-size: 0.82rem;
        }

        .jem-payment-select {
          margin-bottom: 14px;
        }

        .jem-amount-wrap {
          margin-bottom: 10px;
        }

        .jem-change {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 10px 0 16px;
          font-size: 0.77rem;
          color: #64737b;
        }

        .jem-change strong {
          color: #17293a;
          font-size: 0.8rem;
        }

        .jem-payment-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #b45309;
          font-size: 0.74rem;
          margin-bottom: 12px;
        }

        .jem-pay-btn {
          width: 100%;
          border: none;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.92rem;
          background: #f97316;
          color: white;
          height: 50px;
          cursor: pointer;
          box-shadow: 0 14px 24px rgba(249,115,22,0.18);
          transition: opacity 0.15s ease;
        }

        .jem-pay-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .jem-toast {
          position: fixed;
          top: 84px;
          right: 26px;
          background: #0f172a;
          color: white;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.81rem;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 12px 26px rgba(15,23,42,0.14);
          z-index: 50;
        }

        @media (max-width: 1100px) {
          .jem-pos-shell {
            grid-template-columns: minmax(0, 1fr);
          }

          .jem-cart-panel {
            min-height: 420px;
          }
        }

        @media (max-width: 760px) {
          .jem-pos-shell {
            gap: 12px;
          }

          .jem-product-grid {
            grid-template-columns: 1fr;
          }

          .jem-cart-panel {
            border-radius: 14px;
          }
        }
      `}</style>

      {toast && (
        <div className="jem-toast">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      <div className="jem-pos-shell">
        <section className="jem-pos-main">
          <div className="jem-pos-toolbar">
            <div className="jem-pos-search">
              <Search size={17} color="#8a9694" />
              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="jem-category-row" aria-label="Category filters">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`jem-category-btn ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="jem-product-grid">
            {visibleProducts.map((product) => {
              const isLowStock = product.stock <= 10
              const disabled = product.stock <= 0

              return (
                <button
                  key={product.id}
                  type="button"
                  className={`jem-product-card ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && addToCart(product)}
                  aria-label={`Add ${product.name} to cart`}
                >
                  <div className={`jem-product-art ${product.imageTone}`}>
                    {product.category.slice(0, 3).toUpperCase()}
                  </div>

                  <div className="jem-product-body">
                    <span className="jem-product-category">{product.category}</span>
                    <h3 className="jem-product-name">{product.name}</h3>

                    <div className="jem-price-row">
                      <span className="jem-price">₱{product.price.toLocaleString('en-PH')}</span>
                      <span className="jem-unit">/ {product.unit}</span>
                    </div>

                    <div className={`jem-stock ${isLowStock ? 'warning' : ''}`}>
                      <strong>{product.stock} available</strong>
                      {isLowStock && <span>Low stock</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="jem-cart-panel">
          <div className="jem-cart-header">
            <h3>Cart</h3>
            <span className="badge">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>

          <div className="jem-cart-body">
            {cart.length === 0 ? (
              <div className="jem-empty-cart">
                <ShoppingCart size={42} color="#f97316" />
                <h4>No items yet</h4>
                <p>Select products from the left</p>
              </div>
            ) : (
              cart.map((item) => (
                <div className="jem-cart-item" key={item.id}>
                  <div className="jem-cart-row-top">
                    <div>
                      <h4>{item.name}</h4>
                      <p>₱{item.price.toLocaleString('en-PH')} / {item.unit}</p>
                    </div>
                    <button type="button" className="jem-remove-btn" onClick={() => removeCartItem(item.id)} aria-label={`Remove ${item.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="jem-cart-controls">
                    <div className="jem-qty-box">
                      <button type="button" className="jem-qty-btn" onClick={() => updateCartQuantity(item.id, item.quantity - 1)} aria-label={`Decrease quantity for ${item.name}`}>
                        <Minus size={12} />
                      </button>
                      <span className="jem-qty-value">{item.quantity}</span>
                      <button type="button" className="jem-qty-btn" onClick={() => updateCartQuantity(item.id, item.quantity + 1)} aria-label={`Increase quantity for ${item.name}`}>
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="jem-line-total">₱{(item.price * item.quantity).toLocaleString('en-PH')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="jem-checkout">
            <div className="jem-total-row">
              <span>Total</span>
              <strong>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>

            <label className="jem-payment-label" htmlFor="payment-method">Payment Method</label>
            <select
              id="payment-method"
              className="jem-payment-select"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
            </select>

            <div className="jem-amount-wrap">
              <label className="jem-payment-label" htmlFor="amount-received">Amount Received (₱)</label>
              <input
                id="amount-received"
                className="jem-amount-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(event) => setAmountReceived(event.target.value)}
                disabled={paymentMethod !== 'cash'}
              />
            </div>

            {paymentMethod === 'cash' && Number(amountReceived || 0) > 0 && (
              <div className="jem-change">
                <span>Change</span>
                <strong>₱{Math.max(changeDue, 0).toFixed(2)}</strong>
              </div>
            )}

            {paymentMethod === 'cash' && !cashIsSufficient && cart.length > 0 && (
              <div className="jem-payment-warning">
                <AlertCircle size={14} />
                <span>Payment is insufficient.</span>
              </div>
            )}

            <button
              type="button"
              className="jem-pay-btn"
              disabled={isSubmitDisabled}
              onClick={handleCompleteTransaction}
            >
              {isProcessing ? 'Processing...' : 'Complete Transaction'}
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}

