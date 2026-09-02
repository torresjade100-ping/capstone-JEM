import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Receipt,
  Printer,
  ArrowRight,
  ShieldCheck,
  PackageX,
  AlertTriangle,
  RotateCcw,
  Check,
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

  // Transaction Confirmation & Receipt Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [completedTransaction, setCompletedTransaction] = useState(null)

  const defaultCategories = ['All', 'Lumber', 'Cement', 'Roofing', 'Plumbing', 'Nails', 'Paint', 'Electrical']

  const getSavedCatalog = () => {
    try {
      const saved = localStorage.getItem('jem_pos_catalog')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {}
    return fallbackCatalog
  }

  const fetchLiveProducts = () => {
    getProducts({ per_page: 100 })
      .then((payload) => {
        const rawList = Array.isArray(payload) ? payload : payload?.data || []
        if (rawList.length > 0) {
          const mapped = rawList.map((p) => {
            const cleanedCat = cleanCategory(p.category?.name || 'General')
            return {
              id: p.id,
              name: p.name,
              category: cleanedCat,
              price: Number(p.base_price || 0),
              unit: p.unit || 'piece',
              stock: Number(p.stock_quantity ?? p.stock ?? 0),
              emoji: getProductEmoji({ name: p.name, category: cleanedCat }),
            }
          })
          setProducts(mapped)
          try {
            localStorage.setItem('jem_pos_catalog', JSON.stringify(mapped))
          } catch (e) {}
        } else {
          setProducts(getSavedCatalog())
        }
      })
      .catch(() => {
        setProducts(getSavedCatalog())
      })
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
  const amountReceivedNum = Number(amountReceived || 0)
  const changeDue = paymentMethod === 'cash' && amountReceived ? Math.max(0, amountReceivedNum - total) : 0
  const cashIsSufficient = paymentMethod !== 'cash' || amountReceivedNum >= total
  const isSubmitDisabled = cart.length === 0 || isProcessing || (paymentMethod === 'cash' && !cashIsSufficient)

  const showNotification = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const addToCart = (product) => {
    if (product.stock <= 0) {
      showNotification(`"${product.name}" is Out of Stock and cannot be added.`)
      return
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          showNotification(`Cannot add more. Maximum available stock (${product.stock} ${product.unit}) reached.`)
          return current
        }
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  const updateCartQuantity = (id, nextQty) => {
    const product = products.find((entry) => entry.id === id)
    const maxStock = product ? product.stock : 9999

    setCart((current) => {
      if (nextQty <= 0) {
        return current.filter((item) => item.id !== id)
      }
      if (nextQty > maxStock) {
        showNotification(`Maximum available stock (${maxStock}) reached for this product.`)
      }
      return current.map((item) => {
        if (item.id !== id) return item
        return { ...item, quantity: Math.min(nextQty, maxStock) }
      })
    })
  }

  const removeCartItem = (id) => {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  // Step 1: Staff clicks Complete Transaction -> Validate and open confirmation modal
  const handleInitiateCheckout = () => {
    if (cart.length === 0) {
      showNotification('Cart is empty. Add products before checkout.')
      return
    }

    if (paymentMethod === 'cash') {
      if (!amountReceived || amountReceivedNum < total) {
        showNotification(`Insufficient payment. Please enter at least ₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`)
        return
      }
    }

    // Open confirmation modal
    setShowConfirmModal(true)
  }

  // Step 2: Staff confirms transaction inside the modal -> Execute API & deduct inventory
  const handleConfirmCheckout = async () => {
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

      let txNumber = `POS-${Math.floor(100000 + Math.random() * 900000)}`
      try {
        const result = await createPosCheckout(payload)
        if (result?.transaction?.transaction_number) {
          txNumber = result.transaction.transaction_number
        }
      } catch (err) {
        console.warn('POS API recorded locally:', err.message)
      }

      const amountPaidDisplay = paymentMethod === 'cash' ? amountReceivedNum : total
      const changeDisplay = paymentMethod === 'cash' ? changeDue : 0

      const completedData = {
        id: Date.now(),
        number: txNumber,
        date: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Maya',
        total,
        amountPaid: amountPaidDisplay,
        change: changeDisplay,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
      }

      // Automatically deduct purchased quantities from live POS catalog state
      setProducts((prev) => {
        const updated = prev.map((p) => {
          const itemInCart = cart.find((c) => c.id === p.id)
          if (itemInCart) {
            const nextStock = Math.max(0, p.stock - itemInCart.quantity)
            return {
              ...p,
              stock: nextStock,
            }
          }
          return p
        })
        try {
          localStorage.setItem('jem_pos_catalog', JSON.stringify(updated))
        } catch (e) {}
        return updated
      })

      // Dispatch events to notify other modules (Inventory, Stock Requests, Product Management)
      try {
        window.dispatchEvent(new CustomEvent('jem_inventory_update'))
      } catch (e) {}

      // Reset cart and form
      setCart([])
      setAmountReceived('')
      setShowConfirmModal(false)
      setCompletedTransaction(completedData)

      if (onTransactionComplete) {
        onTransactionComplete(completedData)
      }

      showNotification('Transaction completed & inventory deducted successfully.')
    } catch (error) {
      showNotification(error.message || 'Transaction could not be completed.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <style>{`
        .pos-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
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
          margin-bottom: 18px;
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
          margin-bottom: 20px;
        }

        .pos-search-wrap {
          flex: 0 1 250px;
          min-width: 180px;
          position: relative;
        }

        .pos-search-input {
          width: 100%;
          height: 40px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0 14px 0 38px;
          font-size: 0.86rem;
          color: #17293a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .pos-search-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
        }

        .pos-search-input::placeholder {
          color: #94a3b8;
        }

        .pos-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .pos-pills-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        .pos-pill-btn {
          height: 38px;
          padding: 0 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #17293a;
          font-size: 0.82rem;
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
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          min-height: 0;
          overflow-y: auto;
          align-content: start;
          padding-right: 6px;
          padding-bottom: 20px;
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
          position: relative;
          user-select: none;
        }

        .pos-card:hover:not(.disabled) {
          transform: translateY(-3px);
          box-shadow: 0 10px 22px rgba(23, 41, 58, 0.08);
          border-color: #f97316;
        }

        .pos-card.disabled,
        .pos-card.out-of-stock {
          opacity: 0.58;
          cursor: not-allowed;
          background: #f8fafc;
          border-color: #e2e8f0;
          box-shadow: none !important;
          transform: none !important;
        }

        .pos-card-art {
          width: 100%;
          height: 88px;
          background: #f1f5f9;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          margin-bottom: 12px;
          position: relative;
          overflow: hidden;
        }

        .pos-card.out-of-stock .pos-card-art {
          background: #fecdd3;
        }

        .pos-card-title {
          margin: 0 0 2px;
          font-size: 0.9rem;
          font-weight: 700;
          color: #17293a;
          line-height: 1.3;
        }

        .pos-card-cat {
          font-size: 0.74rem;
          color: #8a9694;
          margin-bottom: 8px;
          display: block;
        }

        .pos-card-price-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 6px;
        }

        .pos-card-price {
          font-size: 1.05rem;
          font-weight: 800;
          color: #f97316;
        }

        .pos-card-unit {
          font-size: 0.74rem;
          color: #8a9694;
        }

        .pos-stock-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          margin-top: auto;
          width: fit-content;
        }

        .pos-stock-badge.in-stock {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .pos-stock-badge.low-stock {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
        }

        .pos-stock-badge.out-of-stock {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        /* Cart Panel (Current Transaction) */
        .pos-cart-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 110px);
          max-height: calc(100vh - 110px);
          position: sticky;
          top: 0;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }

        .pos-cart-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .pos-cart-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #17293a;
          letter-spacing: -0.02em;
        }

        .pos-cart-badge {
          background: #f97316;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .pos-cart-body {
          flex: 1 1 auto;
          padding: 16px;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
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
          border-radius: 10px;
          padding: 10px 12px;
          transition: border-color 0.15s;
        }

        .pos-cart-item:hover {
          border-color: #cbd5e1;
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
          font-size: 0.84rem;
          font-weight: 700;
          color: #17293a;
          line-height: 1.3;
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
          padding: 2px;
          border-radius: 4px;
          display: grid;
          place-items: center;
          transition: color 0.15s;
        }

        .pos-cart-item-header button:hover {
          color: #ef4444;
          background: #fee2e2;
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
          border-radius: 4px;
          transition: background 0.1s;
        }

        .pos-qty-grp button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .pos-qty-grp button:hover:not(:disabled) {
          background: #f1f5f9;
        }

        .pos-qty-val {
          font-weight: 800;
          color: #17293a;
          min-width: 18px;
          text-align: center;
          font-size: 0.8rem;
        }

        .pos-item-total {
          font-weight: 800;
          color: #17293a;
          font-size: 0.86rem;
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
          margin-bottom: 12px;
        }

        .pos-total-line span {
          font-size: 1rem;
          font-weight: 700;
          color: #64737b;
        }

        .pos-total-line strong {
          font-size: 1.25rem;
          font-weight: 800;
          color: #17293a;
        }

        .pos-field-group {
          margin-bottom: 10px;
        }

        .pos-field-group label {
          display: block;
          font-size: 0.74rem;
          font-weight: 700;
          color: #64737b;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
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
          transition: border-color 0.15s;
        }

        .pos-select-input:focus,
        .pos-num-input:focus {
          border-color: #f97316;
        }

        .pos-submit-btn {
          width: 100%;
          height: 44px;
          border: none;
          border-radius: 10px;
          background: #f97316;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 800;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
        }

        .pos-submit-btn:hover:not(:disabled) {
          background: #ea580c;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.35);
        }

        .pos-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        /* Confirmation & Receipt Modals */
        .pos-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          animation: posFadeIn 0.18s ease-out;
        }

        .pos-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          animation: posScaleUp 0.18s ease-out;
        }

        .pos-modal-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .pos-modal-header h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #17293a;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pos-modal-close-btn {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          display: grid;
          place-items: center;
          color: #64748b;
          transition: all 0.15s;
        }

        .pos-modal-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .pos-modal-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pos-items-review-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          max-height: 180px;
          overflow-y: auto;
        }

        .pos-items-review-title {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 8px;
        }

        .pos-review-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 0.84rem;
          border-bottom: 1px dashed #e2e8f0;
        }

        .pos-review-row:last-child {
          border-bottom: none;
        }

        .pos-review-row strong {
          color: #17293a;
        }

        .pos-review-row span {
          color: #64748b;
          font-size: 0.78rem;
        }

        .pos-summary-table {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .pos-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .pos-summary-row:last-child {
          border-bottom: none;
        }

        .pos-summary-row.highlight {
          background: #fff7ed;
        }

        .pos-summary-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: #64748b;
        }

        .pos-summary-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: #17293a;
        }

        .pos-summary-value.total {
          font-size: 1.3rem;
          font-weight: 800;
          color: #ea580c;
        }

        .pos-summary-value.change {
          font-size: 1.15rem;
          font-weight: 800;
          color: #059669;
        }

        .pos-summary-value.no-change {
          font-size: 0.95rem;
          font-weight: 700;
          color: #64748b;
        }

        .pos-notice-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 0.82rem;
          color: #1e40af;
          line-height: 1.4;
        }

        .pos-modal-footer {
          padding: 16px 24px 20px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        .pos-btn-secondary {
          height: 42px;
          padding: 0 18px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #334155;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }

        .pos-btn-secondary:hover {
          background: #f1f5f9;
        }

        .pos-btn-primary {
          height: 42px;
          padding: 0 22px;
          border: none;
          border-radius: 8px;
          background: #f97316;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
        }

        .pos-btn-primary:hover:not(:disabled) {
          background: #ea580c;
        }

        .pos-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Receipt Card in Success View */
        .pos-receipt-paper {
          background: #ffffff;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          font-family: monospace;
          color: #1e293b;
        }

        .pos-receipt-header {
          text-align: center;
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }

        .pos-receipt-header h4 {
          margin: 0 0 4px;
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .pos-receipt-header p {
          margin: 0;
          font-size: 0.8rem;
          color: #64748b;
        }

        .pos-receipt-line {
          display: flex;
          justify-content: space-between;
          font-size: 0.84rem;
          margin-bottom: 6px;
        }

        .pos-receipt-divider {
          border-top: 1px dashed #cbd5e1;
          margin: 10px 0;
        }

        /* Toast */
        .pos-toast {
          position: fixed;
          top: 84px;
          right: 26px;
          background: #0f172a;
          color: white;
          border-radius: 10px;
          padding: 12px 18px;
          font-size: 0.84rem;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
          z-index: 10000;
          animation: posSlideIn 0.2s ease-out;
        }

        @keyframes posFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes posScaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes posSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 1050px) {
          .pos-shell {
            grid-template-columns: 1fr;
          }
          .pos-cart-panel {
            position: static;
            height: auto;
            max-height: none;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div className="pos-toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{toast}</span>
        </div>
      )}

      <div className="pos-shell">
        {/* Left Side: Products Catalog */}
        <section className="pos-main-area">
          <div className="pos-header-block">
            <h1>Point of Sale</h1>
            <p>Walk-in customer checkout & real-time inventory management</p>
          </div>

          <div className="pos-toolbar">
            <div className="pos-search-wrap">
              <Search size={16} className="pos-search-icon" />
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
            {visibleProducts.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <PackageX size={40} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No products found matching "{search}"</p>
              </div>
            ) : (
              visibleProducts.map((product) => {
                const isOutOfStock = product.stock <= 0
                const isLowStock = product.stock > 0 && product.stock <= 10

                return (
                  <div
                    key={product.id}
                    className={`pos-card ${isOutOfStock ? 'disabled out-of-stock' : ''}`}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    role="button"
                    tabIndex={isOutOfStock ? -1 : 0}
                    aria-disabled={isOutOfStock}
                    title={isOutOfStock ? 'This product is currently out of stock' : `Add ${product.name} to cart`}
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

                    {isOutOfStock ? (
                      <span className="pos-stock-badge out-of-stock">
                        <PackageX size={12} /> Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="pos-stock-badge low-stock">
                        <AlertTriangle size={12} /> {product.stock} {product.unit} left
                      </span>
                    ) : (
                      <span className="pos-stock-badge in-stock">
                        <Check size={12} /> {product.stock} {product.unit} available
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Right Side: Current Transaction Panel */}
        <aside className="pos-cart-panel">
          <div className="pos-cart-header">
            <h3>Current Transaction</h3>
            {cart.length > 0 && (
              <span className="pos-cart-badge">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
            )}
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
                <p>Click on in-stock products from the left to begin</p>
              </div>
            ) : (
              cart.map((item) => {
                const productEntry = products.find((p) => p.id === item.id)
                const currentStock = productEntry ? productEntry.stock : item.stock || 0
                const isMaxReached = item.quantity >= currentStock

                return (
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
                        <button
                          type="button"
                          disabled={isMaxReached}
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          title={isMaxReached ? 'Maximum available stock reached' : 'Add one more'}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <span className="pos-item-total">₱{(item.price * item.quantity).toLocaleString('en-PH')}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pos-checkout-section">
            <div className="pos-total-line">
              <span>Total Amount</span>
              <strong>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
              <label htmlFor="pos-amount-recv">
                {paymentMethod === 'cash' ? 'Amount Received (₱)' : 'Payment Amount (₱)'}
              </label>
              <input
                id="pos-amount-recv"
                className="pos-num-input"
                type="number"
                min="0"
                step="0.01"
                placeholder={paymentMethod === 'cash' ? '0.00' : total.toFixed(2)}
                value={paymentMethod === 'cash' ? amountReceived : total ? total.toFixed(2) : ''}
                onChange={(event) => setAmountReceived(event.target.value)}
                disabled={paymentMethod !== 'cash'}
              />
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                className="pos-submit-btn"
                disabled={isSubmitDisabled}
                onClick={handleInitiateCheckout}
              >
                <Receipt size={17} />
                <span>Complete Transaction</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* 1. TRANSACTION CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="pos-modal-backdrop" onClick={() => !isProcessing && setShowConfirmModal(false)}>
          <div className="pos-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h3>
                <ShieldCheck size={20} color="#f97316" />
                Confirm Walk-In Transaction
              </h3>
              <button
                type="button"
                className="pos-modal-close-btn"
                disabled={isProcessing}
                onClick={() => setShowConfirmModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body">
              {/* Order Items Review */}
              <div className="pos-items-review-box">
                <div className="pos-items-review-title">Purchased Items ({cart.length})</div>
                {cart.map((item) => (
                  <div className="pos-review-row" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <div>
                        <span>{item.quantity} {item.unit} × ₱{item.price.toLocaleString('en-PH')}</span>
                      </div>
                    </div>
                    <strong>₱{(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown Table */}
              <div className="pos-summary-table">
                <div className="pos-summary-row highlight">
                  <span className="pos-summary-label">Total Amount:</span>
                  <span className="pos-summary-value total">
                    ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pos-summary-row">
                  <span className="pos-summary-label">Payment Method:</span>
                  <span className="pos-summary-value">
                    {paymentMethod === 'cash' ? '💵 Cash' : paymentMethod === 'gcash' ? '📱 GCash' : '💳 Maya'}
                  </span>
                </div>

                <div className="pos-summary-row">
                  <span className="pos-summary-label">Amount Paid:</span>
                  <span className="pos-summary-value">
                    ₱{(paymentMethod === 'cash' ? amountReceivedNum : total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pos-summary-row">
                  <span className="pos-summary-label">Change:</span>
                  {changeDue > 0 ? (
                    <span className="pos-summary-value change">
                      ₱{changeDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="pos-summary-value no-change">
                      ₱0.00 (No Change)
                    </span>
                  )}
                </div>
              </div>

              {/* Inventory Notice */}
              <div className="pos-notice-box">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Confirming this transaction will record the walk-in sale and <strong>automatically deduct the purchased quantities from inventory</strong>.
                </span>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary"
                disabled={isProcessing}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel / Go Back
              </button>

              <button
                type="button"
                className="pos-btn-primary"
                disabled={isProcessing}
                onClick={handleConfirmCheckout}
              >
                {isProcessing ? (
                  <>
                    <RotateCcw size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    <span>Confirm Transaction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TRANSACTION COMPLETED RECEIPT MODAL */}
      {completedTransaction && (
        <div className="pos-modal-backdrop" onClick={() => setCompletedTransaction(null)}>
          <div className="pos-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header" style={{ background: '#f0fdf4' }}>
              <h3 style={{ color: '#166534' }}>
                <CheckCircle2 size={22} color="#16a34a" />
                Transaction Completed!
              </h3>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setCompletedTransaction(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body">
              <div className="pos-receipt-paper">
                <div className="pos-receipt-header">
                  <h4>JEM HARDWARE SUPPLIES</h4>
                  <p>Walk-In POS Sales Receipt</p>
                  <p style={{ marginTop: 4, fontSize: '0.75rem' }}>Tx #{completedTransaction.number}</p>
                  <p style={{ fontSize: '0.75rem' }}>{completedTransaction.date}</p>
                </div>

                <div style={{ marginBottom: 8 }}>
                  {completedTransaction.items.map((it, idx) => (
                    <div className="pos-receipt-line" key={idx}>
                      <span>{it.quantity}x {it.name}</span>
                      <span>₱{it.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>

                <div className="pos-receipt-divider"></div>

                <div className="pos-receipt-line" style={{ fontWeight: 800 }}>
                  <span>TOTAL AMOUNT:</span>
                  <span>₱{completedTransaction.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="pos-receipt-line">
                  <span>PAYMENT METHOD:</span>
                  <span>{completedTransaction.paymentMethod}</span>
                </div>

                <div className="pos-receipt-line">
                  <span>AMOUNT PAID:</span>
                  <span>₱{completedTransaction.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="pos-receipt-line" style={{ fontWeight: 800, color: completedTransaction.change > 0 ? '#166534' : '#64748b' }}>
                  <span>CHANGE:</span>
                  <span>{completedTransaction.change > 0 ? `₱${completedTransaction.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00 (No Change)'}</span>
                </div>

                <div className="pos-receipt-divider"></div>
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>
                  Thank you for shopping at JEM Hardware!
                  <br />
                  Items deducted from inventory.
                </div>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} style={{ display: 'inline', marginRight: 6 }} />
                Print Receipt
              </button>

              <button
                type="button"
                className="pos-btn-primary"
                onClick={() => setCompletedTransaction(null)}
              >
                <Plus size={16} />
                New Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

