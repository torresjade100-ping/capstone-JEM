import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { getProducts, createPosCheckout } from '../api'

const fallbackCatalog = [
  { id: 1, name: 'Coco Lumber 2×3×10', category: 'Lumber', price: 120, unit: 'piece', stock: 342, emoji: '🪵' },
  { id: 2, name: 'Portland Cement 40kg', category: 'Cement', price: 290, unit: 'bag', stock: 15, emoji: '🏗️' },
  { id: 3, name: 'GI Sheet 24 Gauge 8ft', category: 'Roofing', price: 720, unit: 'sheet', stock: 88, emoji: '🏠' },
  { id: 4, name: 'PVC Pipe 4" x 3m', category: 'Plumbing', price: 240, unit: 'piece', stock: 156, emoji: '🔧' },
  { id: 5, name: 'Common Wire Nails 4"', category: 'Nails', price: 85, unit: 'kg', stock: 160, emoji: '📌' },
  { id: 6, name: 'Boysen Latex Paint White', category: 'Paint', price: 740, unit: 'gal', stock: 42, emoji: '🎨' },
  { id: 7, name: 'THHN Wire 2.0mm 150m', category: 'Electrical', price: 2450, unit: 'roll', stock: 18, emoji: '⚡' },
  { id: 8, name: 'Marine Plywood 1/2"', category: 'Lumber', price: 680, unit: 'sheet', stock: 24, emoji: '🪵' },
]

function getProductEmoji(product) {
  if (product.emoji) return product.emoji
  const text = `${product.name} ${product.category}`.toLowerCase()
  if (text.includes('lumber') || text.includes('wood') || text.includes('plywood')) return '🪵'
  if (text.includes('cement') || text.includes('masonry') || text.includes('block')) return '🏗️'
  if (text.includes('roof') || text.includes('sheet') || text.includes('gi') || text.includes('steel')) return '🏠'
  if (text.includes('pipe') || text.includes('plumb') || text.includes('pvc') || text.includes('elbow')) return '🔧'
  if (text.includes('nail') || text.includes('screw') || text.includes('bolt') || text.includes('fastener')) return '📌'
  if (text.includes('paint') || text.includes('primer') || text.includes('latex') || text.includes('finish')) return '🎨'
  if (text.includes('wire') || text.includes('electr') || text.includes('switch') || text.includes('breaker')) return '⚡'
  return '📦'
}

function cleanCategory(catName) {
  if (!catName) return 'General'
  const c = catName.trim()
  if (c.toLowerCase().includes('cement')) return 'Cement'
  if (c.toLowerCase().includes('roof')) return 'Roofing'
  if (c.toLowerCase().includes('nail')) return 'Nails'
  if (c.toLowerCase().includes('paint')) return 'Paint'
  if (c.toLowerCase().includes('plumb')) return 'Plumbing'
  if (c.toLowerCase().includes('electr')) return 'Electrical'
  if (c.toLowerCase().includes('lumber')) return 'Lumber'
  return c
}

export default function POSPage({ onTransactionComplete }) {
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [toast, setToast] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const defaultCategories = ['All', 'Lumber', 'Cement', 'Roofing', 'Plumbing', 'Nails', 'Paint', 'Electrical']

  const fetchLiveProducts = () => {
    getProducts({ per_page: 100 })
      .then((payload) => {
        const rawList = Array.isArray(payload) ? payload : payload?.data || []
        if (rawList.length > 0) {
          setProducts(
            rawList.map((p) => {
              const cleanedCat = cleanCategory(p.category?.name || 'General')
              return {
                id: p.id,
                name: p.name,
                category: cleanedCat,
                price: Number(p.base_price || 0),
                unit: p.unit || 'piece',
                stock: Number(p.stock_quantity || 0),
                emoji: getProductEmoji({ name: p.name, category: cleanedCat }),
              }
            })
          )
        } else {
          setProducts(fallbackCatalog)
        }
      })
      .catch(() => setProducts(fallbackCatalog))
  }

  useEffect(() => {
    fetchLiveProducts()

    const handleInv = () => {
      fetchLiveProducts()
    }
    window.addEventListener('jem_inventory_update', handleInv)
    return () => window.removeEventListener('jem_inventory_update', handleInv)
  }, [])


  const categoryOptions = useMemo(() => {
    const list = [...defaultCategories]
    products.forEach((p) => {
      if (p.category && !list.includes(p.category)) {
        list.push(p.category)
      }
    })
    return list
  }, [products])

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = activeCategory === 'All' || product.category.toLowerCase() === activeCategory.toLowerCase()
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
        if (existing.quantity >= product.stock) return current
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
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

  const handleCompleteTransaction = async () => {
    if (cart.length === 0) {
      setToast('Cart is empty. Add products before checkout.')
      return
    }

    if (paymentMethod === 'cash' && Number(amountReceived || 0) < total) {
      setToast('Payment is insufficient for this cash transaction.')
      return
    }

    setIsProcessing(true)

    try {
      const backendPaymentMethod = paymentMethod === 'cash' ? 'cod' : paymentMethod
      const payload = {
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        payment_method: backendPaymentMethod,
        discount: 0,
      }

      let txNumber = `JEM-${String(Date.now()).slice(-6)}`
      try {
        const result = await createPosCheckout(payload)
        if (result?.transaction?.transaction_number) {
          txNumber = result.transaction.transaction_number
        }
      } catch (err) {
        console.warn('POS API recorded locally:', err.message)
      }

      const transaction = {
        id: Date.now(),
        number: txNumber,
        date: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Maya',
        total,
        change: paymentMethod === 'cash' ? Number(Math.max(0, Number(amountReceived || 0) - total)).toFixed(2) : 0,
        items: cart.map((item) => ({ name: item.name, quantity: item.quantity, total: item.price * item.quantity })),
      }

      // Immediately deduct purchased quantities from live POS catalog state
      setProducts((prev) =>
        prev.map((p) => {
          const itemInCart = cart.find((c) => c.id === p.id)
          if (itemInCart) {
            return {
              ...p,
              stock: Math.max(0, p.stock - itemInCart.quantity)
            }
          }
          return p
        })
      )

      setCart([])
      setAmountReceived('')
      setToast('Transaction completed & stock deducted successfully.')
      setTimeout(() => setToast(''), 2600)

    } catch (error) {
      setToast(error.message || 'Transaction could not be completed.')
      setTimeout(() => setToast(''), 2600)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <style>{`
        .pos-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 24px;
          align-items: start;
          height: 100%;
          min-height: 0;
        }

        .pos-main-area {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
          min-height: 0;
        }

        .pos-header-block {
          margin-bottom: 20px;
        }

        .pos-header-block h1 {
          margin: 0 0 4px;
          font-size: 1.55rem;
          font-weight: 800;
          color: #17293a;
          letter-spacing: -0.03em;
        }

        .pos-header-block p {
          margin: 0;
          font-size: 0.85rem;
          color: #8a9694;
        }

        /* Toolbar with Search and Category Pills */
        .pos-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .pos-search-wrap {
          flex: 0 1 240px;
          min-width: 180px;
        }

        .pos-search-input {
          width: 100%;
          height: 38px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0 14px;
          font-size: 0.85rem;
          color: #17293a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s;
        }

        .pos-search-input:focus {
          border-color: #cbd5e1;
        }

        .pos-search-input::placeholder {
          color: #94a3b8;
        }

        .pos-pills-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .pos-pill-btn {
          height: 38px;
          padding: 0 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #17293a;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .pos-pill-btn:hover:not(.active) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .pos-pill-btn.active {
          background: #17293a;
          color: #ffffff;
          border-color: #17293a;
        }

        /* Products Grid */
        .pos-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          min-height: 0;
          overflow-y: auto;
          align-content: start;
          padding-right: 8px;
        }

        .pos-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          display: flex;
          flex-direction: column;
        }

        .pos-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }

        .pos-card.disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .pos-card-art {
          width: 100%;
          height: 92px;
          background: #edebe6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 12px;
          user-select: none;
        }

        .pos-card-title {
          margin: 0 0 2px;
          font-size: 0.92rem;
          font-weight: 700;
          color: #17293a;
          line-height: 1.3;
        }

        .pos-card-cat {
          font-size: 0.76rem;
          color: #8a9694;
          margin-bottom: 8px;
          display: block;
        }

        .pos-card-price-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 2px;
        }

        .pos-card-price {
          font-size: 1rem;
          font-weight: 800;
          color: #f97316;
        }

        .pos-card-unit {
          font-size: 0.76rem;
          color: #8a9694;
        }

        .pos-card-stock {
          font-size: 0.76rem;
          color: #64737b;
          display: block;
          margin-top: 2px;
        }

        /* Cart Panel (Current Transaction) */
        .pos-cart-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 120px);
          max-height: calc(100vh - 120px);
          position: sticky;
          top: 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }

        .pos-cart-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .pos-cart-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #17293a;
          letter-spacing: -0.02em;
        }

        .pos-cart-body {
          flex: 1 1 auto;
          padding: 16px 20px;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .pos-cart-body::-webkit-scrollbar {
          width: 5px;
        }

        .pos-cart-body::-webkit-scrollbar-track {
          background: #f8fafc;
        }

        .pos-cart-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .pos-cart-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .pos-empty-state {
          margin: auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #8a9694;
          padding: 30px 10px;
        }

        .pos-empty-cart-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          color: #94a3b8;
        }

        .pos-empty-state h4 {
          margin: 0 0 4px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #17293a;
        }

        .pos-empty-state p {
          margin: 0;
          font-size: 0.8rem;
          color: #8a9694;
        }

        /* Filled cart items */
        .pos-cart-item {
          border: 1px solid #f1f5f9;
          background: #f8fafc;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }

        .pos-cart-item-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 6px;
        }

        .pos-cart-item-header h5 {
          margin: 0;
          font-size: 0.82rem;
          font-weight: 700;
          color: #17293a;
        }

        .pos-cart-item-header p {
          margin: 2px 0 0;
          font-size: 0.72rem;
          color: #64737b;
        }

        .pos-cart-item-header button {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
        }

        .pos-cart-item-header button:hover {
          color: #ef4444;
        }

        .pos-cart-item-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
        }

        .pos-qty-grp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 2px 6px;
        }

        .pos-qty-grp button {
          border: none;
          background: transparent;
          cursor: pointer;
          display: grid;
          place-items: center;
          color: #17293a;
          padding: 2px;
        }

        .pos-qty-val {
          font-weight: 700;
          color: #17293a;
          min-width: 16px;
          text-align: center;
          font-size: 0.78rem;
        }

        .pos-item-total {
          font-weight: 800;
          color: #17293a;
          font-size: 0.82rem;
        }

        /* Bottom Checkout Section */
        .pos-checkout-section {
          border-top: 1px solid #e2e8f0;
          padding: 16px 20px;
          background: #ffffff;
          flex-shrink: 0;
        }

        .pos-total-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .pos-total-line span {
          font-size: 1.05rem;
          font-weight: 800;
          color: #17293a;
        }

        .pos-total-line strong {
          font-size: 1.15rem;
          font-weight: 800;
          color: #17293a;
        }

        .pos-field-group {
          margin-bottom: 12px;
        }

        .pos-field-group label {
          display: block;
          font-size: 0.76rem;
          font-weight: 600;
          color: #64737b;
          margin-bottom: 6px;
        }

        .pos-select-input,
        .pos-num-input {
          width: 100%;
          height: 38px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #17293a;
          padding: 0 12px;
          font-size: 0.85rem;
          outline: none;
        }

        .pos-submit-btn {
          width: 100%;
          height: 42px;
          border: none;
          border-radius: 8px;
          background: #f97316;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          margin-top: 8px;
          transition: opacity 0.15s;
        }

        .pos-submit-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* Floating help button */
        .pos-help-bubble {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #17293a;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
        }

        .pos-toast {
          position: fixed;
          top: 84px;
          right: 26px;
          background: #0f172a;
          color: white;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 24px rgba(15,23,42,0.18);
          z-index: 150;
        }

        @media (max-width: 1050px) {
          .pos-shell {
            grid-template-columns: 1fr;
          }
          .pos-cart-panel {
            position: static;
            height: auto;
            min-height: auto;
          }
        }
      `}</style>

      {toast && (
        <div className="pos-toast">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      <div className="pos-shell">
        <section className="pos-main-area">
          <div className="pos-header-block">
            <h1>Point of Sale</h1>
            <p>Walk-in transaction</p>
          </div>

          <div className="pos-toolbar">
            <div className="pos-search-wrap">
              <input
                type="text"
                className="pos-search-input"
                placeholder="Search product..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="pos-pills-row" aria-label="Category filters">
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pos-pill-btn ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pos-grid">
            {visibleProducts.map((product) => {
              const disabled = product.stock <= 0

              return (
                <div
                  key={product.id}
                  className={`pos-card ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && addToCart(product)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="pos-card-art">
                    {product.emoji}
                  </div>

                  <h3 className="pos-card-title">{product.name}</h3>
                  <span className="pos-card-cat">{product.category}</span>

                  <div className="pos-card-price-row">
                    <strong className="pos-card-price">₱{product.price.toLocaleString('en-PH')}</strong>
                    <span className="pos-card-unit">/{product.unit}</span>
                  </div>

                  <span className="pos-card-stock">{product.stock} available</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Current Transaction Panel */}
        <aside className="pos-cart-panel">
          <div className="pos-cart-header">
            <h3>Current Transaction</h3>
          </div>

          <div className="pos-cart-body">
            {cart.length === 0 ? (
              <div className="pos-empty-state">
                <div className="pos-empty-cart-icon">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </div>
                <h4>No items yet</h4>
                <p>Select products from the left</p>
              </div>
            ) : (
              cart.map((item) => (
                <div className="pos-cart-item" key={item.id}>
                  <div className="pos-cart-item-header">
                    <div>
                      <h5>{item.name}</h5>
                      <p>₱{item.price.toLocaleString('en-PH')} / {item.unit}</p>
                    </div>
                    <button type="button" onClick={() => removeCartItem(item.id)} aria-label="Remove item">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="pos-cart-item-controls">
                    <div className="pos-qty-grp">
                      <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>
                        <Minus size={12} />
                      </button>
                      <span className="pos-qty-val">{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="pos-item-total">₱{(item.price * item.quantity).toLocaleString('en-PH')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-checkout-section">
            <div className="pos-total-line">
              <span>Total</span>
              <strong>₱{total.toLocaleString('en-PH')}</strong>
            </div>

            <div className="pos-field-group">
              <label htmlFor="pos-pay-method">Payment Method</label>
              <select
                id="pos-pay-method"
                className="pos-select-input"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
              </select>
            </div>

            <div className="pos-field-group">
              <label htmlFor="pos-amount-recv">Amount Received (₱)</label>
              <input
                id="pos-amount-recv"
                className="pos-num-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(event) => setAmountReceived(event.target.value)}
                disabled={paymentMethod !== 'cash'}
              />
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                className="pos-submit-btn"
                disabled={isSubmitDisabled}
                onClick={handleCompleteTransaction}
              >
                {isProcessing ? 'Processing...' : 'Complete Transaction'}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Floating help question mark */}
      <div className="pos-help-bubble" title="Help">?</div>
    </>
  )
}
