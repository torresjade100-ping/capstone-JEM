import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Heart, Home, LogOut, Menu, Package, Search, ShoppingCart, Star, Truck, User, X } from 'lucide-react'
import { addToCart as addCartItem, checkout, getCart, getCategories, getOrders, getProducts, getStoredUser, logout, removeCartItem, updateCartItem } from '../api'
import '../styles/customer.css'

const unwrap = (payload) => Array.isArray(payload) ? payload : payload?.data || []
const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`

export default function CustomerApp() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('home')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [checkoutStep, setCheckoutStep] = useState(0)
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', address: '', fulfillment: 'delivery', payment_method: 'cod' })

  useEffect(() => {
    const storedUser = getStoredUser()
    setUser(storedUser)
    setCheckoutData((current) => ({ ...current, name: storedUser?.name || '', phone: storedUser?.phone || '' }))
    Promise.allSettled([getProducts({ per_page: 100 }), getCategories(), getOrders(), getCart()]).then(([productResult, categoryResult, orderResult, cartResult]) => {
      if (productResult.status === 'fulfilled') setProducts(unwrap(productResult.value))
      if (categoryResult.status === 'fulfilled') setCategories(unwrap(categoryResult.value))
      if (orderResult.status === 'fulfilled') setOrders(unwrap(orderResult.value))
      if (cartResult.status === 'fulfilled') {
        const cartPayload = cartResult.value || {}
        const cartItems = Array.isArray(cartPayload) ? cartPayload : cartPayload.items || []
        setCart(cartItems.map((item) => ({ ...item.product, id: item.product_id || item.product?.id, cart_item_id: item.id, price: item.unit_price || item.price || item.product?.base_price, quantity: item.quantity })))
      }
      setLoading(false)
    })
  }, [])

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = product.name?.toLowerCase().includes(query.toLowerCase())
    const productCategory = product.category?.name || product.category_name || ''
    return matchesQuery && (category === 'all' || productCategory === category)
  }), [products, query, category])
  const total = cart.reduce((sum, item) => sum + Number(item.price || item.base_price || 0) * item.quantity, 0)

  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3000) }
  const addToCart = async (product) => {
    try {
      await addCartItem(product.id, 1, product.product_variant_id || null)
      setCart((current) => { const existing = current.find((item) => item.id === product.id); return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, price: product.base_price, quantity: 1 }] })
      notify(`${product.name} added to cart`)
    } catch (error) { notify(error.message || 'Unable to add this product.') }
  }
  const changeQuantity = async (item, quantity) => {
    if (quantity < 1) return removeItem(item)
    try { await updateCartItem(item.cart_item_id || item.id, quantity); setCart((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity } : entry)) } catch (error) { notify(error.message) }
  }
  const removeItem = async (item) => {
    try { await removeCartItem(item.cart_item_id || item.id); setCart((current) => current.filter((entry) => entry.id !== item.id)) } catch (error) { notify(error.message) }
  }
  const placeOrder = async () => {
    try { const result = await checkout({ ...checkoutData, delivery_address: checkoutData.address, items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })) }); setOrders((current) => [result, ...current]); setCart([]); setCheckoutStep(0); setPage('orders'); notify('Order placed successfully.') } catch (error) { notify(error.message || 'Unable to place order.') }
  }
  const handleLogout = async () => { await logout(); window.location.reload() }

  if (!user || user.role !== 'customer') return <div className="unauthorized">Access denied</div>
  return <div className="customer-app">
    <header className="customer-header"><div className="header-top"><button className="menu-toggle" onClick={() => setPage('profile')} aria-label="Open profile"><Menu size={22} /></button><button className="header-brand" onClick={() => setPage('home')}><div className="brand-icon">J</div><div className="brand-info"><strong>JEM Hardware</strong><small>Coco Lumber & Construction Supply</small></div></button><div className="header-right"><button className="profile-button" onClick={() => setPage('profile')} aria-label="Open profile"><User size={20} /><span>Account</span></button><button className="cart-button" onClick={() => setPage('cart')} aria-label="Open cart"><ShoppingCart size={22} />{cart.length > 0 && <span className="cart-badge">{cart.length}</span>}</button></div></div><label className="header-search"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage('products') }} placeholder="Search products..." /></label></header>
    {notice && <div className="customer-notice">{notice}</div>}
    <main className="customer-main">
      {page === 'home' && <HomePage products={products.slice(0, 4)} loading={loading} onShop={() => setPage('products')} onAdd={addToCart} />}
      {page === 'products' && <ProductsPage products={filteredProducts} categories={categories} category={category} setCategory={setCategory} loading={loading} onAdd={addToCart} />}
      {page === 'cart' && <CartPage cart={cart} total={total} onChange={changeQuantity} onRemove={removeItem} onCheckout={() => { setCheckoutStep(0); setPage('checkout') }} onShop={() => setPage('products')} />}
      {page === 'checkout' && <CheckoutPage step={checkoutStep} setStep={setCheckoutStep} data={checkoutData} setData={setCheckoutData} cart={cart} total={total} onPlace={placeOrder} onBack={() => setPage('cart')} />}
      {page === 'orders' && <OrdersPage orders={orders} onShop={() => setPage('products')} />}
      {page === 'profile' && <ProfilePage user={user} onLogout={handleLogout} />}
    </main>
    <nav className="bottom-nav">{[["home", Home, 'Home'], ['products', Package, 'Products'], ['cart', ShoppingCart, 'Cart'], ['orders', Truck, 'Orders'], ['profile', User, 'Profile']].map(([id, Icon, label]) => <button key={id} className={`nav-btn ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
  </div>
}

function HomePage({ products, loading, onShop, onAdd }) { return <div className="customer-page home-page"><section className="hero"><p className="eyebrow">JEM Hardware & Coco Lumber</p><h1>Build with confidence.</h1><p>Quality materials, reliable stock, and straightforward ordering for every project.</p><button className="btn btn-primary" onClick={onShop}>Browse products <ChevronRight size={16} /></button></section><section className="featured"><div className="customer-section-heading"><div><p className="eyebrow">In stock now</p><h2>Featured products</h2></div><button className="btn-text" onClick={onShop}>View all <ChevronRight size={15} /></button></div>{loading ? <Loading /> : <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div>}</section></div> }

function ProductsPage({ products, categories, category, setCategory, loading, onAdd }) { return <div className="customer-page products-page"><div className="customer-section-heading"><div><p className="eyebrow">Store catalog</p><h1>Products</h1></div></div><div className="products-filter"><select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>{loading ? <Loading /> : products.length ? <div className="product-list">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div> : <Empty text="No products found" />}</div> }

function ProductCard({ product, onAdd }) { const price = product.base_price || product.price || 0; return <article className="product-card"><div className="product-image product-visual cement"><Package size={30} /><button className="favorite-btn" aria-label="Save product"><Heart size={17} /></button></div><div className="product-info"><h3>{product.name}</h3><div className="product-rating"><Star size={13} fill="currentColor" /><span>Available</span></div><div className="product-footer"><div><strong>{money(price)}</strong><small> / {product.unit || 'unit'}</small></div><button className="btn-small btn-add" onClick={() => onAdd(product)}>Add</button></div></div></article> }

function CartPage({ cart, total, onChange, onRemove, onCheckout, onShop }) { return <div className="customer-page cart-page"><div className="customer-section-heading"><div><p className="eyebrow">Review items</p><h1>Your cart</h1></div></div>{!cart.length ? <Empty text="Your cart is empty" action="Continue shopping" onAction={onShop} /> : <><div className="cart-items">{cart.map((item) => <div className="order-card cart-item" key={item.id}><div><strong>{item.name}</strong><small>{money(item.price)} / {item.unit || 'unit'}</small></div><div className="quantity-control"><button onClick={() => onChange(item, item.quantity - 1)}>-</button><span>{item.quantity}</span><button onClick={() => onChange(item, item.quantity + 1)}>+</button><button className="btn-text" onClick={() => onRemove(item)}><X size={15} /></button></div></div>)}</div><div className="cart-summary"><div className="summary-row"><span>Subtotal</span><strong>{money(total)}</strong></div><div className="summary-row"><span>Delivery</span><span>Calculated at checkout</span></div><div className="summary-row total"><span>Total</span><strong>{money(total)}</strong></div><button className="btn btn-primary full" onClick={onCheckout}>Continue to checkout <ChevronRight size={16} /></button></div></>}</div> }

function CheckoutPage({ step, setStep, data, setData, cart, total, onPlace, onBack }) { const update = (key, value) => setData((current) => ({ ...current, [key]: value })); return <div className="customer-page checkout-page"><button className="btn-text" onClick={step ? () => setStep(step - 1) : onBack}><ArrowLeft size={15} /> Back</button><p className="eyebrow">Secure checkout</p><h1>Complete your order</h1><div className="checkout-steps"><span className={step >= 0 ? 'active' : ''}>1 Delivery</span><span className={step >= 1 ? 'active' : ''}>2 Summary</span><span className={step >= 2 ? 'active' : ''}>3 Payment</span></div>{step === 0 && <section className="order-card checkout-section"><h2>Delivery information</h2><label>Name<input className="input" value={data.name} onChange={(event) => update('name', event.target.value)} /></label><label>Contact number<input className="input" value={data.phone} onChange={(event) => update('phone', event.target.value)} /></label><label>Address<textarea className="input" rows="3" value={data.address} onChange={(event) => update('address', event.target.value)} placeholder="Delivery address" /></label><select className="input" value={data.fulfillment} onChange={(event) => update('fulfillment', event.target.value)}><option value="delivery">Delivery</option><option value="pickup">Store pickup</option></select><button className="btn btn-primary full" onClick={() => setStep(1)}>Continue <ChevronRight size={16} /></button></section>}{step === 1 && <section className="order-card checkout-section"><h2>Order summary</h2>{cart.map((item) => <div className="summary-row" key={item.id}><span>{item.name} × {item.quantity}</span><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="summary-row total"><span>Total</span><strong>{money(total)}</strong></div><button className="btn btn-primary full" onClick={() => setStep(2)}>Choose payment <ChevronRight size={16} /></button></section>}{step === 2 && <section className="order-card checkout-section"><h2>Payment method</h2>{[['cod', 'Cash on delivery'], ['gcash', 'GCash'], ['maya', 'Maya']].map(([value, label]) => <label className="payment-option" key={value}><input type="radio" name="payment" checked={data.payment_method === value} onChange={() => update('payment_method', value)} />{label}</label>)}<button className="btn btn-primary full" onClick={onPlace}>Place order <Check size={16} /></button></section>}</div> }

function OrdersPage({ orders, onShop }) { return <div className="customer-page orders-page"><div className="customer-section-heading"><div><p className="eyebrow">Order history</p><h1>My orders</h1></div></div>{orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-header"><div><strong>{order.order_number || `#${order.id}`}</strong><small>{order.items?.length || 0} items · {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</small></div><span className={`status status-${order.status}`}>{String(order.status || 'pending').replaceAll('_', ' ')}</span></div><div className="tracking-line"><span className="active"><Check size={13} /> Placed</span><span className={['processing', 'ready', 'completed'].includes(order.status) ? 'active' : ''}><Package size={13} /> Processing</span><span className={order.status === 'completed' ? 'active' : ''}><Truck size={13} /> Complete</span></div><div className="order-footer"><strong>{money(order.total)}</strong><button className="btn-text">View details <ChevronRight size={15} /></button></div></article>)}</div> : <Empty text="No orders yet" action="Start shopping" onAction={onShop} />}</div> }
function ProfilePage({ user, onLogout }) { return <div className="customer-page profile-page"><p className="eyebrow">Account</p><h1>My profile</h1><div className="profile-card"><div className="profile-avatar"><span>{user?.name?.charAt(0).toUpperCase()}</span></div><h2>{user?.name}</h2><p>{user?.email}</p><p>{user?.phone || 'No contact number added'}</p><button className="btn btn-secondary" onClick={onLogout}><LogOut size={15} /> Sign out</button></div></div> }
function Loading() { return <div className="empty-state"><Package size={25} /><p>Loading products...</p></div> }
function Empty({ text, action, onAction }) { return <div className="empty-state"><ShoppingCart size={35} /><p>{text}</p>{action && <button className="btn btn-primary" onClick={onAction}>{action}</button>}</div> }