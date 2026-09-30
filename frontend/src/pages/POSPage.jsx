import { useEffect, useMemo, useState, useRef } from 'react'
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
import { getProducts, createPosCheckout, getStoredUser } from '../api'
import { formatQuantityWithUnit, getUnitBadgeText } from '../utils/uom'

function JemReceiptEmblem({ size = 68 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'block', margin: '0 auto' }}
      aria-label="JEM Hardware and Construction Supply Official Stamp"
    >
      <circle cx="50" cy="50" r="47" fill="none" stroke="#111827" strokeWidth="1.8" strokeDasharray="3 2" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#111827" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="31.5" fill="none" stroke="#111827" strokeWidth="0.9" strokeDasharray="2 1.5" />

      <path id="jemSealTop" d="M 19 50 A 31 31 0 0 1 81 50" fill="none" />
      <text fill="#111827" fontSize="7.6" fontWeight="900" letterSpacing="1.1">
        <textPath href="#jemSealTop" startOffset="50%" textAnchor="middle">
          JEM HARDWARE
        </textPath>
      </text>

      <g transform="translate(36, 36) scale(0.28)">
        <polygon
          points="50,5 90,28 90,75 50,97 10,75 10,28"
          fill="#111827"
          stroke="#111827"
          strokeWidth="2"
        />
        <text
          x="50"
          y="70"
          fill="#ffffff"
          fontSize="52"
          fontWeight="900"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          J
        </text>
      </g>

      <path id="jemSealBottom" d="M 20 50 A 30 30 0 0 0 80 50" fill="none" />
      <text fill="#374151" fontSize="6.4" fontWeight="800" letterSpacing="0.9">
        <textPath href="#jemSealBottom" startOffset="50%" textAnchor="middle">
          CALAMBA • EST. 2020
        </textPath>
      </text>
    </svg>
  )
}

const fallbackCatalog = [
  { id: 1, name: 'Marine Plywood 3/4"', category: 'Lumber', price: 1080, unit: 'sheet', stock: 50, emoji: '🪵' },
  { id: 2, name: 'Marine Plywood 1/2"', category: 'Lumber', price: 690, unit: 'sheet', stock: 60, emoji: '🪵' },
  { id: 3, name: 'Ordinary Plywood 3/4"', category: 'Lumber', price: 990, unit: 'sheet', stock: 50, emoji: '🪵' },
  { id: 4, name: 'Hardiflex Board 3.5mm', category: 'Lumber', price: 280, unit: 'sheet', stock: 65, emoji: '🧱' },
  { id: 5, name: 'Smart Board 3.5mm', category: 'Lumber', price: 290, unit: 'sheet', stock: 55, emoji: '🧱' },
  { id: 6, name: 'Welded Screen 1/2" × 4ft × 25M', category: 'Roofing', price: 140, unit: 'meter', stock: 120, emoji: '🏠' },
  { id: 7, name: 'Aluminum Screen 3ft', category: 'Roofing', price: 180, unit: 'meter', stock: 80, emoji: '🏠' },
  { id: 8, name: 'PE Pipe 1/2"', category: 'Pipes', price: 45, unit: 'meter', stock: 200, emoji: '🚿' },
  { id: 9, name: 'Blue Elbow Plain 1/2"', category: 'Plumbing', price: 15, unit: 'piece', stock: 150, emoji: '🔧' },
  { id: 10, name: 'GI Nipple 1/2" × 2" S-20', category: 'Plumbing', price: 18, unit: 'piece', stock: 100, emoji: '🔩' },
  { id: 11, name: 'Hose Clamp 1/2"', category: 'Hardware', price: 15, unit: 'piece', stock: 150, emoji: '🔩' },
  { id: 12, name: 'Poly Rope 6mm', category: 'Hardware', price: 14, unit: 'meter', stock: 250, emoji: '🪢' },
  { id: 13, name: 'PVC Sanitary P-Trap 2"', category: 'Plumbing', price: 65, unit: 'piece', stock: 80, emoji: '🔧' },
  { id: 14, name: 'Tile Trim Aluminum 8ft', category: 'Paint', price: 175, unit: 'length', stock: 80, emoji: '🎨' },
  { id: 15, name: 'Trapal Baga Heavy Duty', category: 'Roofing', price: 85, unit: 'meter', stock: 150, emoji: '⛺' },
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

function cleanCategory(catName, prodName = '') {
  if (!catName) return 'General'
  const c = catName.trim().toLowerCase()
  const p = (prodName || '').toLowerCase()

  // Exact / Specific check for Pipes first
  if (c === 'pipes' || c.includes('pipe') || p.includes('pipe') || p.includes('tubo')) return 'Pipes'

  // Exact / Specific check for Nails
  if (c === 'nails' || c.includes('nail') || p.includes('nail') || p.includes('lansang') || p.includes('pako')) return 'Nails'

  if (c.includes('cement') || c.includes('masonry')) return 'Cement'
  if (c.includes('roof') || c.includes('steel') || c.includes('rebar')) return 'Roofing'
  if (c.includes('paint')) return 'Paint'
  if (c.includes('plumb')) return 'Plumbing'
  if (c.includes('electr') || c.includes('wire')) return 'Electrical'
  if (c.includes('lumber') || c.includes('wood') || c.includes('plywood')) return 'Lumber'
  if (c.includes('tool')) return 'Tools'
  return catName.trim()
}

function PosQuantityInput({ item, maxStock, onUpdateQuantity, showNotification }) {
  const [localVal, setLocalVal] = useState(String(item.quantity))
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  // Keep local input in sync if quantity is modified outside (e.g. + / - buttons or item re-added)
  useEffect(() => {
    setLocalVal(String(item.quantity))
  }, [item.quantity])

  const handleChange = (e) => {
    const rawVal = e.target.value

    // Allow empty string temporarily so the user can backspace and type a new number
    if (rawVal === '') {
      setLocalVal('')
      return
    }

    // Check for negative signs, decimal points, or exponents
    if (/[.\-,+eE]/.test(rawVal)) {
      if (typeof showNotification === 'function') {
        showNotification('Whole numbers only. Decimals and negatives are not accepted.')
      }
      return
    }

    const digitsOnly = rawVal.replace(/\D/g, '')
    if (!digitsOnly) return

    const parsed = parseInt(digitsOnly, 10)

    // Prevent values below 1
    if (parsed < 1) {
      if (typeof showNotification === 'function') {
        showNotification('Quantity must be at least 1.')
      }
      return
    }

    // Check maximum stock
    if (parsed > maxStock) {
      if (typeof showNotification === 'function') {
        showNotification(`Maximum available stock (${maxStock}) reached for this product.`)
      }
      setLocalVal(String(maxStock))
      onUpdateQuantity(item.id, maxStock)
      return
    }

    setLocalVal(String(parsed))
    onUpdateQuantity(item.id, parsed)
  }

  const handleKeyDown = (e) => {
    // Disallow non-integer keys
    if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault()
      if (typeof showNotification === 'function') {
        showNotification('Whole numbers only. Decimals and negatives are not accepted.')
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (item.quantity < maxStock) {
        const next = item.quantity + 1
        setLocalVal(String(next))
        onUpdateQuantity(item.id, next)
      } else if (typeof showNotification === 'function') {
        showNotification(`Maximum available stock (${maxStock}) reached for this product.`)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (item.quantity > 1) {
        const next = item.quantity - 1
        setLocalVal(String(next))
        onUpdateQuantity(item.id, next)
      }
      return
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (!localVal || parseInt(localVal, 10) < 1) {
      const fallback = Math.max(1, Number(item.quantity) || 1)
      setLocalVal(String(fallback))
      onUpdateQuantity(item.id, fallback)
    }
  }

  const handleFocus = (e) => {
    setIsFocused(true)
    e.target.select()
  }

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }

  const unitBadge = getUnitBadgeText(item.unit, false)

  return (
    <div
      className={`pos-qty-input-wrap ${isFocused ? 'focused' : ''}`}
      onClick={handleContainerClick}
      title="Click to edit quantity directly"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="pos-qty-input"
        value={localVal}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-label={`Quantity for ${item.name}`}
        style={{
          width: `${Math.max(14, (localVal || '1').length * 8.5 + 4)}px`,
        }}
      />
      <span className="pos-qty-unit">{unitBadge}</span>
    </div>
  )
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
  const [showCartReceiptPreview, setShowCartReceiptPreview] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => getStoredUser())

  useEffect(() => {
    setCurrentUser(getStoredUser())
  }, [])

  const defaultStoreSettings = {
    name: 'JEM HARDWARE AND CONSTRUCTIONS SUPPLY',
    branch: 'BALULANG',
    address: 'Carinugan, Balulang CDOC',
    tel: '(049) 545-2981 / +63 917 825 4362',
    tin: '',
    website: 'www.jemhardware.ph',
  }

  const storeSettings = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('jem_store_settings') || '{}')
      return {
        name: saved.name || defaultStoreSettings.name,
        branch: currentUser?.branch || saved.branch || defaultStoreSettings.branch,
        address: saved.address || defaultStoreSettings.address,
        tel: saved.tel || defaultStoreSettings.tel,
        tin: saved.tin || '',
        website: saved.website || defaultStoreSettings.website,
      }
    } catch {
      return {
        ...defaultStoreSettings,
        branch: currentUser?.branch || defaultStoreSettings.branch,
      }
    }
  }, [currentUser])

  const defaultCategories = ['All', 'Lumber', 'Cement', 'Roofing', 'Pipes', 'Plumbing', 'Nails', 'Paint', 'Electrical', 'Tools']

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
    getProducts({ per_page: 150 })
      .then((payload) => {
        const rawList = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.data)
              ? payload.data
              : (Array.isArray(payload?.data?.data)
                  ? payload.data.data
                  : []))

        if (rawList.length > 0) {
          const mapped = rawList.map((p) => {
            const cleanedCat = cleanCategory(p.category?.name || 'General', p.name)
            return {
              id: p.id,
              name: p.name,
              category: cleanedCat,
              price: Number(p.selling_price ?? p.base_price ?? 0),
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

  const currentCartReceiptData = useMemo(() => {
    if (cart.length === 0) return null
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const amountPaidDisplay = paymentMethod === 'cash' ? (amountReceivedNum || total) : total
    const changeDisplay = paymentMethod === 'cash' ? Math.max(0, (amountReceivedNum || total) - total) : 0
    return {
      id: Date.now(),
      number: `ORD-${todayStr}-PREV`,
      date: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      cashier: currentUser?.name
        ? `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Staff'})`
        : 'Isaac Daumar (Staff)',
      paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Maya',
      subtotal,
      discount: 0,
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
      isDraftPreview: true,
    }
  }, [cart, paymentMethod, amountReceivedNum, total, subtotal, currentUser])

  const activeReceiptData = completedTransaction || (showCartReceiptPreview ? currentCartReceiptData : null)

  const handleCloseReceiptModal = () => {
    if (completedTransaction) {
      setCompletedTransaction(null)
    }
    if (showCartReceiptPreview) {
      setShowCartReceiptPreview(false)
    }
  }

  const receiptSubtotal = Number(activeReceiptData?.subtotal || activeReceiptData?.total || 0)
  const receiptDiscount = Number(activeReceiptData?.discount || 0)
  const receiptTotal = Math.max(0, receiptSubtotal - receiptDiscount)
  const vatableSales = receiptTotal / 1.12
  const vatAmount = receiptTotal - vatableSales

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

    // Validate available stock for all items before opening confirmation
    for (const item of cart) {
      const currentProd = products.find((p) => p.id === item.id)
      const currentStock = currentProd ? Number(currentProd.stock ?? 0) : 0
      if (currentStock < item.quantity) {
        showNotification(`Insufficient stock. Only ${currentStock} pcs of ${item.name} are available.`)
        return
      }
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
    if (isProcessing) return
    setIsProcessing(true)

    // Re-verify stock before dispatching transaction
    for (const item of cart) {
      const currentProd = products.find((p) => p.id === item.id)
      const currentStock = currentProd ? Number(currentProd.stock ?? 0) : 0
      if (currentStock < item.quantity) {
        showNotification(`Insufficient stock. Only ${currentStock} pcs of ${item.name} are available.`)
        setShowConfirmModal(false)
        setIsProcessing(false)
        return
      }
    }

    try {
      const backendPaymentMethod = paymentMethod === 'cash' ? 'cod' : paymentMethod
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const proposedTxNumber = `ORD-${todayStr}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`

      const payload = {
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        payment_method: backendPaymentMethod,
        discount: 0,
        transaction_number: proposedTxNumber,
      }

      // Execute backend transaction (atomic, verifies stock & deducts inventory)
      const result = await createPosCheckout(payload)
      const txNumber = result?.data?.transaction?.transaction_number || result?.transaction?.transaction_number || proposedTxNumber

      const amountPaidDisplay = paymentMethod === 'cash' ? amountReceivedNum : total
      const changeDisplay = paymentMethod === 'cash' ? changeDue : 0

      const completedData = {
        id: Date.now(),
        number: txNumber,
        date: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        cashier: currentUser?.name
          ? `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Staff'})`
          : 'Isaac Daumar (Staff)',
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Maya',
        subtotal,
        discount: 0,
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
        isDraftPreview: false,
      }

      // 1. Immediately deduct purchased quantities from live POS catalog state
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

      // 2. Fetch fresh catalog from backend to synchronize state
      fetchLiveProducts()

      // 3. Reset cart and form
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
          color: var(--text-primary);
          letter-spacing: -0.03em;
        }

        .pos-header-block p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
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
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0 14px 0 38px;
          font-size: 0.86rem;
          color: var(--text-primary);
          background: var(--input-bg);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .pos-search-input:focus {
          border-color: var(--primary, #f97316);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
        }

        .pos-search-input::placeholder {
          color: var(--text-muted);
        }

        .pos-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
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
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .pos-pill-btn:hover:not(.active) {
          background: var(--bg-hover);
          border-color: var(--border-color);
          color: var(--text-primary);
        }

        .pos-pill-btn.active {
          background: var(--primary, #f97316);
          color: #ffffff;
          border-color: var(--primary, #f97316);
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.35);
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
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
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
          box-shadow: var(--shadow-md, 0 10px 22px rgba(0, 0, 0, 0.25));
          border-color: var(--primary, #f97316);
        }

        .pos-card.disabled,
        .pos-card.out-of-stock {
          opacity: 0.55;
          cursor: not-allowed;
          background: var(--bg-surface);
          border-color: var(--border-color);
          box-shadow: none !important;
          transform: none !important;
        }

        .pos-card-art {
          width: 100%;
          height: 88px;
          background: var(--bg-hover);
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
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
          background: var(--error-bg, rgba(239, 68, 68, 0.15));
          border-color: rgba(239, 68, 68, 0.3);
        }

        .pos-card-title {
          margin: 0 0 2px;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .pos-card-cat {
          font-size: 0.74rem;
          color: var(--text-muted);
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
          color: var(--primary, #f97316);
        }

        .pos-card-unit {
          font-size: 0.74rem;
          color: var(--text-muted);
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
          background: var(--success-bg, rgba(16, 185, 129, 0.15));
          color: var(--success-text, #34d399);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .pos-stock-badge.low-stock {
          background: var(--warning-bg, rgba(245, 158, 11, 0.15));
          color: var(--warning-text, #fbbf24);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .pos-stock-badge.out-of-stock {
          background: var(--error-bg, rgba(239, 68, 68, 0.15));
          color: var(--error-text, #f87171);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        /* Cart Panel (Current Transaction) */
        .pos-cart-panel {
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 110px);
          max-height: calc(100vh - 110px);
          position: sticky;
          top: 0;
          box-shadow: var(--shadow-md, 0 6px 20px rgba(0, 0, 0, 0.15));
          overflow: hidden;
        }

        .pos-cart-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .pos-cart-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .pos-cart-badge {
          background: var(--primary, #f97316);
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
          background: var(--bg-surface);
        }

        .pos-cart-body::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }

        .pos-empty-state {
          margin: auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-muted);
          padding: 30px 10px;
        }

        .pos-empty-cart-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          color: var(--text-muted);
        }

        .pos-empty-state h4 {
          margin: 0 0 4px;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .pos-empty-state p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* Filled cart items */
        .pos-cart-item {
          border: 1px solid var(--border-color);
          background: var(--bg-hover);
          border-radius: 10px;
          padding: 10px 12px;
          transition: border-color 0.15s;
        }

        .pos-cart-item:hover {
          border-color: var(--primary-border, #f97316);
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
          color: var(--text-primary);
          line-height: 1.3;
        }

        .pos-cart-item-header p {
          margin: 2px 0 0;
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        .pos-cart-item-header button {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: grid;
          place-items: center;
          transition: color 0.15s, background 0.15s;
        }

        .pos-cart-item-header button:hover {
          color: var(--error, #ef4444);
          background: var(--error-bg, rgba(239, 68, 68, 0.15));
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
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 2px 6px;
        }

        .pos-qty-grp button {
          border: none;
          background: transparent;
          cursor: pointer;
          display: grid;
          place-items: center;
          color: var(--text-primary);
          padding: 2px;
          border-radius: 4px;
          transition: background 0.1s;
        }

        .pos-qty-grp button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .pos-qty-grp button:hover:not(:disabled) {
          background: var(--bg-hover);
        }

        .pos-qty-val {
          font-weight: 800;
          color: var(--text-primary);
          min-width: 18px;
          text-align: center;
          font-size: 0.8rem;
        }

        .pos-qty-input-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: text;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          padding: 1px 4px;
          min-width: 36px;
          height: 22px;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }

        .pos-qty-input-wrap:hover {
          background: var(--bg-hover, rgba(255, 255, 255, 0.08));
          border-color: var(--border-color, rgba(255, 255, 255, 0.18));
        }

        .pos-qty-input-wrap.focused {
          background: var(--bg-surface, rgba(0, 0, 0, 0.4));
          border-color: var(--primary, #f97316);
          box-shadow: 0 0 0 1px var(--primary, #f97316);
        }

        .pos-qty-input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.78rem;
          font-weight: 800;
          text-align: right;
          outline: none;
          padding: 0;
          margin: 0;
          min-width: 12px;
          line-height: 1;
          -moz-appearance: textfield;
        }

        .pos-qty-input::-webkit-outer-spin-button,
        .pos-qty-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .pos-qty-unit {
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--text-primary);
          padding-left: 2px;
          user-select: none;
          cursor: text;
          white-space: nowrap;
          line-height: 1;
        }

        .pos-item-total {
          font-weight: 800;
          color: var(--text-primary);
          font-size: 0.86rem;
        }

        /* Bottom Checkout Section */
        .pos-checkout-section {
          border-top: 1px solid var(--border-color);
          padding: 16px 20px;
          background: var(--bg-surface);
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
          color: var(--text-secondary);
        }

        .pos-total-line strong {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .pos-field-group {
          margin-bottom: 10px;
        }

        .pos-field-group label {
          display: block;
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pos-select-input,
        .pos-num-input {
          width: 100%;
          height: 38px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--input-bg);
          color: var(--text-primary);
          padding: 0 12px;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.15s;
        }

        .pos-select-input option {
          background: var(--bg-surface);
          color: var(--text-primary);
        }

        .pos-select-input:focus,
        .pos-num-input:focus {
          border-color: var(--primary, #f97316);
        }

        .pos-submit-btn {
          width: 100%;
          height: 44px;
          border: none;
          border-radius: 10px;
          background: var(--primary, #f97316);
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
          background: var(--primary-hover, #ea580c);
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
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          animation: posFadeIn 0.18s ease-out;
        }

        .pos-modal-card {
          background: var(--bg-surface);
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg, 0 20px 45px rgba(0, 0, 0, 0.5));
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          animation: posScaleUp 0.18s ease-out;
        }

        .pos-modal-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .pos-modal-header h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pos-modal-close-btn {
          background: var(--bg-hover);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          display: grid;
          place-items: center;
          color: var(--text-secondary);
          transition: all 0.15s;
        }

        .pos-modal-close-btn:hover {
          background: var(--bg-active);
          color: var(--text-primary);
        }

        .pos-modal-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pos-items-review-box {
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
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
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .pos-review-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 0.84rem;
          border-bottom: 1px dashed var(--border-color);
        }

        .pos-review-row:last-child {
          border-bottom: none;
        }

        .pos-review-row strong {
          color: var(--text-primary);
        }

        .pos-review-row span {
          color: var(--text-secondary);
          font-size: 0.78rem;
        }

        .pos-summary-table {
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }

        .pos-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .pos-summary-row:last-child {
          border-bottom: none;
        }

        .pos-summary-row.highlight {
          background: var(--primary-soft, rgba(249, 115, 22, 0.12));
        }

        .pos-summary-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .pos-summary-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .pos-summary-value.total {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--primary, #f97316);
        }

        .pos-summary-value.change {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--success-text, #10b981);
        }

        .pos-summary-value.no-change {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .pos-notice-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: var(--info-bg, rgba(59, 130, 246, 0.12));
          border: 1px solid var(--info-border, rgba(59, 130, 246, 0.25));
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 0.82rem;
          color: var(--info-text, #60a5fa);
          line-height: 1.4;
        }

        .pos-modal-footer {
          padding: 16px 24px 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        .pos-btn-secondary {
          height: 42px;
          padding: 0 18px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-hover);
          color: var(--text-primary);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }

        .pos-btn-secondary:hover {
          background: var(--bg-active);
        }

        .pos-btn-primary {
          height: 42px;
          padding: 0 22px;
          border: none;
          border-radius: 8px;
          background: var(--primary, #f97316);
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
          background: var(--primary-hover, #ea580c);
        }

        .pos-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* OFFICIAL RECEIPT PREVIEW MODAL STYLES */
        .pos-receipt-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 16, 28, 0.82);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
          animation: posFadeIn 0.2s ease-out;
        }

        .pos-receipt-modal-container {
          background: #0d1726;
          border-radius: 12px;
          width: 100%;
          max-width: 440px;
          max-height: 94vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
          animation: posScaleUp 0.22s ease-out;
        }

        .pos-receipt-modal-header {
          background: #0d1726;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .pos-receipt-modal-title {
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .pos-receipt-modal-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pos-receipt-print-btn {
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 7px 14px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.35);
          font-family: system-ui, -apple-system, sans-serif;
        }

        .pos-receipt-print-btn:hover {
          background: #047857;
          transform: translateY(-1px);
        }

        .pos-receipt-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          border-radius: 6px;
          padding: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .pos-receipt-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .pos-receipt-modal-body {
          background: #090f1d;
          padding: 22px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          min-height: 0;
        }

        .pos-receipt-draft-notice {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 6px 12px;
          text-align: center;
          width: 100%;
          max-width: 360px;
        }

        .pos-thermal-paper {
          background: #ffffff;
          color: #111827;
          width: 100%;
          max-width: 360px;
          padding: 24px 18px;
          border-radius: 3px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          font-family: Consolas, 'Courier New', Courier, Monaco, monospace;
          font-size: 11px;
          line-height: 1.35;
          user-select: text;
          box-sizing: border-box;
        }

        .pos-receipt-emblem-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .pos-receipt-store-block {
          text-align: center;
          margin-bottom: 6px;
        }

        .pos-receipt-store-name {
          font-size: 12.5px;
          font-weight: 900;
          color: #000000;
          letter-spacing: 0.02em;
          margin: 0 0 5px;
          line-height: 1.25;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .pos-receipt-store-meta {
          font-size: 10.5px;
          color: #334155;
          margin: 0 0 2px;
          line-height: 1.3;
        }

        .pos-receipt-store-meta.bold {
          font-weight: 700;
          color: #000000;
        }

        .pos-receipt-dash {
          border-top: 1px dashed #64748b;
          margin: 9px 0;
        }

        .pos-receipt-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 11px;
          margin-bottom: 3px;
          color: #1e293b;
        }

        .pos-receipt-row.bold {
          font-weight: 700;
          color: #000000;
        }

        .pos-receipt-row .label {
          color: #475569;
        }

        .pos-receipt-row .val {
          color: #0f172a;
          text-align: right;
        }

        .pos-receipt-row .val.order-no {
          font-weight: 800;
          color: #000000;
          letter-spacing: 0.02em;
        }

        .pos-receipt-table-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 36px 64px 68px;
          font-size: 10.5px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .pos-receipt-table-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 36px 64px 68px;
          font-size: 11px;
          margin-bottom: 4px;
          align-items: start;
          color: #0f172a;
        }

        .pos-receipt-table-header .col-item,
        .pos-receipt-table-row .col-item {
          text-align: left;
        }

        .pos-receipt-table-header .col-qty,
        .pos-receipt-table-row .col-qty {
          text-align: right;
        }

        .pos-receipt-table-header .col-price,
        .pos-receipt-table-row .col-price {
          text-align: right;
        }

        .pos-receipt-table-header .col-total,
        .pos-receipt-table-row .col-total {
          text-align: right;
          font-weight: 600;
        }

        .pos-receipt-table-row .item-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 4px;
          font-weight: 600;
          color: #000000;
        }

        .pos-receipt-grand-total {
          margin-top: 5px;
          padding-top: 2px;
        }

        .pos-receipt-grand-total .total-label {
          font-size: 13.5px !important;
          font-weight: 900 !important;
          color: #000000 !important;
          letter-spacing: 0.03em;
        }

        .pos-receipt-grand-total .total-val {
          font-size: 14.5px !important;
          font-weight: 900 !important;
          color: #000000 !important;
        }

        .pos-receipt-section-title {
          font-size: 10.5px;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .pos-receipt-footer {
          text-align: center;
          padding-top: 2px;
        }

        .pos-receipt-footer-line {
          margin: 0 0 2px;
          font-size: 10px;
          line-height: 1.4;
          color: #475569;
        }

        .pos-receipt-end-tag {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin-top: 5px;
          color: #64748b;
        }

        .pos-receipt-secondary-actions {
          display: flex;
          justify-content: center;
          width: 100%;
          max-width: 360px;
        }

        .pos-receipt-btn-new-sale {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }

        .pos-receipt-btn-new-sale:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .pos-receipt-preview-btn {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px dashed var(--border-color);
          background: var(--bg-surface);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .pos-receipt-preview-btn:hover {
          background: var(--bg-hover);
          border-color: var(--primary);
          color: var(--primary);
        }

        /* PRINT STYLES FOR 80MM THERMAL RECEIPT */
        @page {
          size: 80mm auto;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 80mm !important;
            max-width: 80mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
          }

          /* Reset all ancestor wrappers so they collapse to natural receipt height */
          #root,
          .jem-staff-shell,
          .jem-main,
          .jem-content,
          .pos-receipt-modal-backdrop,
          .pos-receipt-modal-container,
          .pos-receipt-modal-body {
            display: block !important;
            position: static !important;
            width: 80mm !important;
            max-width: 80mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            inset: auto !important;
            transform: none !important;
            flex: none !important;
          }

          /* Hide all UI elements that should not appear on print */
          .jem-staff-sidebar,
          .jem-header,
          .jem-staff-topbar,
          .pos-shell,
          .pos-main-area,
          .pos-header-block,
          .pos-toolbar,
          .pos-grid,
          .pos-cart-panel,
          .pos-toast,
          .pos-receipt-modal-header,
          .pos-receipt-modal-actions,
          .pos-receipt-draft-notice,
          .pos-receipt-secondary-actions,
          .pos-modal-backdrop {
            display: none !important;
          }

          /* Receipt paper container - fits 80mm roll, height is purely content-driven */
          #jem-official-receipt-print-area {
            display: block !important;
            position: static !important;
            width: 74mm !important;
            max-width: 74mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 auto !important;
            padding: 3mm 4mm 2mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .pos-receipt-emblem-wrap {
            margin-bottom: 4px !important;
          }

          .pos-receipt-emblem-wrap svg {
            width: 48px !important;
            height: 48px !important;
          }

          .pos-receipt-store-block {
            margin-bottom: 3px !important;
          }

          .pos-receipt-store-name {
            font-size: 11.5px !important;
            font-weight: 900 !important;
            color: #000000 !important;
            margin: 0 0 2px !important;
            line-height: 1.2 !important;
          }

          .pos-receipt-store-meta {
            font-size: 9.5px !important;
            color: #1e293b !important;
            margin: 0 0 1px !important;
            line-height: 1.25 !important;
          }

          .pos-receipt-dash {
            border-top: 1px dashed #000000 !important;
            margin: 4px 0 !important;
            width: 100% !important;
          }

          .pos-receipt-tx-info {
            margin: 0 !important;
          }

          .pos-receipt-row {
            font-size: 10px !important;
            margin-bottom: 2px !important;
            line-height: 1.25 !important;
            color: #000000 !important;
          }

          .pos-receipt-row .label {
            color: #1e293b !important;
          }

          .pos-receipt-row .val {
            color: #000000 !important;
          }

          .pos-receipt-items-table {
            margin: 0 !important;
          }

          .pos-receipt-table-header {
            font-size: 9.5px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            margin-bottom: 3px !important;
            grid-template-columns: minmax(0, 1fr) 26px 50px 54px !important;
          }

          .pos-receipt-table-row {
            font-size: 10px !important;
            margin-bottom: 2px !important;
            line-height: 1.25 !important;
            grid-template-columns: minmax(0, 1fr) 26px 50px 54px !important;
            color: #000000 !important;
          }

          .pos-receipt-table-row .item-name {
            font-size: 10px !important;
            color: #000000 !important;
          }

          .pos-receipt-grand-total {
            margin-top: 3px !important;
          }

          .pos-receipt-grand-total .total-label {
            font-size: 12px !important;
            font-weight: 900 !important;
            color: #000000 !important;
          }

          .pos-receipt-grand-total .total-val {
            font-size: 13px !important;
            font-weight: 900 !important;
            color: #000000 !important;
          }

          .pos-receipt-section-title {
            font-size: 9.5px !important;
            font-weight: 800 !important;
            color: #1e293b !important;
            margin-bottom: 2px !important;
          }

          .pos-receipt-footer {
            margin-top: 4px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .pos-receipt-footer-line {
            font-size: 9px !important;
            line-height: 1.3 !important;
            color: #1e293b !important;
            margin: 0 0 1px !important;
          }

          .pos-receipt-end-tag {
            font-size: 8.5px !important;
            font-weight: 700 !important;
            letter-spacing: 0.08em !important;
            margin-top: 3px !important;
            margin-bottom: 0 !important;
            color: #000000 !important;
          }
        }

        /* Toast */
        .pos-toast {
          position: fixed;
          top: 84px;
          right: 26px;
          background: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 12px 18px;
          font-size: 0.84rem;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.3));
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
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
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
                      <span className="pos-card-unit">/{getUnitBadgeText(product.unit, false)}</span>
                    </div>

                    {isOutOfStock ? (
                      <span className="pos-stock-badge out-of-stock">
                        <PackageX size={12} /> Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="pos-stock-badge low-stock">
                        <AlertTriangle size={12} /> {formatQuantityWithUnit(product.stock, product.unit)} left
                      </span>
                    ) : (
                      <span className="pos-stock-badge in-stock">
                        <Check size={12} /> {formatQuantityWithUnit(product.stock, product.unit)} available
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
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                        <p>₱{item.price.toLocaleString('en-PH')} / {getUnitBadgeText(item.unit, false)}</p>
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
                        <PosQuantityInput
                          item={item}
                          maxStock={currentStock}
                          onUpdateQuantity={updateCartQuantity}
                          showNotification={showNotification}
                        />
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="pos-submit-btn"
                  disabled={isSubmitDisabled}
                  onClick={handleInitiateCheckout}
                >
                  <Receipt size={17} />
                  <span>Complete Transaction</span>
                </button>

                <button
                  type="button"
                  className="pos-receipt-preview-btn"
                  onClick={() => setShowCartReceiptPreview(true)}
                  title="Preview Official Receipt before completing transaction"
                >
                  <Printer size={16} />
                  <span>Official Receipt Preview</span>
                </button>
              </div>
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
                        <span>{formatQuantityWithUnit(item.quantity, item.unit)} × ₱{item.price.toLocaleString('en-PH')}</span>
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

      {/* 2. OFFICIAL RECEIPT PREVIEW MODAL */}
      {activeReceiptData && (
        <div className="pos-receipt-modal-backdrop" onClick={handleCloseReceiptModal}>
          <div className="pos-receipt-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Dark Navy Header */}
            <div className="pos-receipt-modal-header">
              <div className="pos-receipt-modal-title">
                OFFICIAL RECEIPT PREVIEW
              </div>
              <div className="pos-receipt-modal-actions">
                <button
                  type="button"
                  className="pos-receipt-print-btn"
                  onClick={() => window.print()}
                  title="Print Official Receipt"
                >
                  <Printer size={15} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  className="pos-receipt-close-btn"
                  onClick={handleCloseReceiptModal}
                  title="Close Receipt Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body with dark backdrop and thermal paper */}
            <div className="pos-receipt-modal-body">
              {activeReceiptData.isDraftPreview && (
                <div className="pos-receipt-draft-notice">
                  Draft Receipt Preview · Cart not yet confirmed
                </div>
              )}

              {/* Thermal Receipt Paper Card (Printed Area) */}
              <div id="jem-official-receipt-print-area" className="pos-thermal-paper">
                {/* Store Emblem Logo */}
                <div className="pos-receipt-emblem-wrap">
                  <JemReceiptEmblem size={66} />
                </div>

                {/* Store Name & Store Info */}
                <div className="pos-receipt-store-block">
                  <h2 className="pos-receipt-store-name">
                    {storeSettings.name}
                  </h2>
                  <p className="pos-receipt-store-meta">
                    Branch: {storeSettings.branch}
                  </p>
                  <p className="pos-receipt-store-meta">
                    {storeSettings.address}
                  </p>
                  <p className="pos-receipt-store-meta">
                    Tel: {storeSettings.tel}
                  </p>
                  {storeSettings.tin && (
                    <p className="pos-receipt-store-meta bold">
                      VAT-REG TIN: {storeSettings.tin}
                    </p>
                  )}
                </div>

                {/* Dashed divider */}
                <div className="pos-receipt-dash" />

                {/* Transaction Information */}
                <div className="pos-receipt-tx-info">
                  <div className="pos-receipt-row">
                    <span className="label">Order No:</span>
                    <span className="val order-no">{activeReceiptData.number}</span>
                  </div>
                  <div className="pos-receipt-row">
                    <span className="label">Date/Time:</span>
                    <span className="val">{activeReceiptData.date}</span>
                  </div>
                  <div className="pos-receipt-row">
                    <span className="label">Cashier:</span>
                    <span className="val">{activeReceiptData.cashier}</span>
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="pos-receipt-dash" />

                {/* Purchased Items Table */}
                <div className="pos-receipt-items-table">
                  <div className="pos-receipt-table-header">
                    <span className="col-item">ITEM</span>
                    <span className="col-qty">QTY</span>
                    <span className="col-price">PRICE</span>
                    <span className="col-total">TOTAL</span>
                  </div>
                  <div className="pos-receipt-table-body">
                    {activeReceiptData.items.map((item, idx) => (
                      <div className="pos-receipt-table-row" key={idx}>
                        <span className="col-item item-name" title={item.name}>
                          {item.name}
                        </span>
                        <span className="col-qty">{item.quantity}</span>
                        <span className="col-price">
                          {Number(item.price).toFixed(2)}
                        </span>
                        <span className="col-total">
                          {Number(item.total).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="pos-receipt-dash" />

                {/* Transaction Totals */}
                <div className="pos-receipt-totals">
                  <div className="pos-receipt-row">
                    <span className="label">Gross Subtotal:</span>
                    <span className="val">
                      ₱{receiptSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {receiptDiscount > 0 && (
                    <div className="pos-receipt-row">
                      <span className="label">Discount:</span>
                      <span className="val">
                        -₱{receiptDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pos-receipt-row pos-receipt-grand-total">
                    <span className="total-label">TOTAL  DUE :</span>
                    <span className="total-val">
                      ₱{receiptTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="pos-receipt-dash" />

                {/* Payments Breakdown */}
                <div className="pos-receipt-breakdown">
                  <div className="pos-receipt-section-title">PAYMENTS BREAKDOWN</div>
                  <div className="pos-receipt-row">
                    <span className="label">{activeReceiptData.paymentMethod} :</span>
                    <span className="val">
                      ₱{receiptTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="pos-receipt-row">
                    <span className="label">Amount Tendered:</span>
                    <span className="val">
                      ₱{Number(activeReceiptData.amountPaid).toFixed(2)}
                    </span>
                  </div>
                  <div className="pos-receipt-row bold">
                    <span className="label">CHANGE :</span>
                    <span className="val">
                      ₱{Number(activeReceiptData.change).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="pos-receipt-dash" />

                {/* Tax Summary */}
                <div className="pos-receipt-tax">
                  <div className="pos-receipt-section-title">TAX SUMMARY (12% VAT)</div>
                  <div className="pos-receipt-row">
                    <span className="label">VATable Sales:</span>
                    <span className="val">
                      ₱{vatableSales.toFixed(2)}
                    </span>
                  </div>
                  <div className="pos-receipt-row">
                    <span className="label">12% VAT Amount:</span>
                    <span className="val">
                      ₱{vatAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="pos-receipt-row">
                    <span className="label">VAT-Exempt Sales:</span>
                    <span className="val">₱0.00</span>
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="pos-receipt-dash" />

                {/* Footer */}
                <div className="pos-receipt-footer">
                  <p className="pos-receipt-footer-line">
                    Thank you for shopping at JEM Hardware and Constructions Supply!
                  </p>
                  <p className="pos-receipt-footer-line">
                    Please keep this receipt for your records.
                  </p>
                  {storeSettings.website && (
                    <p className="pos-receipt-footer-line">
                      Visit us at {storeSettings.website}
                    </p>
                  )}
                  <p className="pos-receipt-footer-line pos-receipt-end-tag">
                    *** END OF RECEIPT ***
                  </p>
                </div>
              </div>

              {/* Secondary actions outside thermal paper */}
              <div className="pos-receipt-secondary-actions">
                <button
                  type="button"
                  className="pos-receipt-btn-new-sale"
                  onClick={handleCloseReceiptModal}
                >
                  <Plus size={16} />
                  <span>{activeReceiptData.isDraftPreview ? 'Continue Editing Cart' : 'New Transaction'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

