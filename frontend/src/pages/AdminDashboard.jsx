import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, Box, DollarSign, Package, ShoppingCart,
  TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight,
  Home, LogOut, ChevronDown, Menu, X, Check, Truck,
  MessageSquare, ClipboardList, Search, MoreHorizontal
} from 'lucide-react'
import { getAdminOrders, getInventory, getProducts, getRestockRequests, getStoredUser, getUsers, logout, getSharedOrders } from '../api'
import NotificationDropdown from '../components/NotificationDropdown'
import LogoutConfirmationModal from '../components/LogoutConfirmationModal'
import PageSkeletonLoader from '../components/PageSkeletonLoader'
import ErrorBoundary from '../components/ErrorBoundary'
import '../styles/dashboard.css'

const ProductManagement = lazy(() => import('./ProductManagement'))
const OrdersManagement = lazy(() => import('./OrdersManagement'))
const UserManagement = lazy(() => import('./UserManagement'))
const InventoryManagement = lazy(() => import('./InventoryManagement'))
const SuppliersManagement = lazy(() => import('./SuppliersManagement'))
const RestockRequestsPage = lazy(() => import('./RestockRequestsPage'))
const ReportsPage = lazy(() => import('./ReportsPage'))
const FeedbackManagement = lazy(() => import('./FeedbackManagement'))


export default function AdminDashboard() {
  const location = useLocation()
  const navigate = useNavigate()

  const [user, setUser] = useState(() => getStoredUser())
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [stats, setStats] = useState({

    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
    outOfStock: 0,
    pendingRestock: 0,
  })
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [salesYear, setSalesYear] = useState(new Date().getFullYear())

  // Derive active route from browser URL
  const getActivePage = (pathname) => {
    const cleanPath = (pathname || '/').toLowerCase().replace(/\/$/, '') || '/'
    if (cleanPath === '/' || cleanPath === '/dashboard') return 'dashboard'
    if (cleanPath.startsWith('/users')) return 'users'
    if (cleanPath.startsWith('/products')) return 'products'
    if (cleanPath.startsWith('/inventory')) return 'inventory'
    if (cleanPath.startsWith('/orders')) return 'orders'
    if (cleanPath.startsWith('/suppliers')) return 'suppliers'
    if (cleanPath.startsWith('/stock-requests') || cleanPath.startsWith('/stock-request') || cleanPath.startsWith('/restock')) return 'restock'
    if (cleanPath.startsWith('/reports')) return 'reports'

    if (cleanPath.startsWith('/feedback')) return 'feedback'
    return 'dashboard'
  }

  const activePage = getActivePage(location.pathname)

  const navigateTo = (path) => {
    navigate(path)
    if (window.innerWidth <= 900) {
      setSidebarOpen(false)
    }
  }

  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser) setUser(storedUser)
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const [productData, orderData, inventoryData, userData, restockData] = await Promise.allSettled([
        getProducts({ status: 'active' }),
        getAdminOrders(),
        getInventory(),
        getUsers(),
        getRestockRequests(),
      ])

      const extract = (res) => {
        if (res.status !== 'fulfilled' || !res.value) return []
        const val = res.value
        if (Array.isArray(val)) return val
        if (Array.isArray(val.data)) return val.data
        return []
      }

      const nextProducts = extract(productData)
      let nextOrders = extract(orderData)
      if (nextOrders.length === 0) {
        nextOrders = getSharedOrders()
      }
      const nextInventory = extract(inventoryData)
      const nextUsers = extract(userData)
      const nextRestocks = extract(restockData)

      const sales = nextOrders.reduce((sum, order) => sum + Number(order?.total || 0), 0)
      const lowStock = nextInventory.filter((item) => Number(item?.quantity || 0) > 0 && Number(item?.quantity || 0) <= Number(item?.low_stock_threshold || 5)).length
      const outOfStock = nextInventory.filter((item) => Number(item?.quantity || 0) === 0).length

      setOrders(nextOrders)
      setInventory(nextInventory)
      setStats({
        totalSales: sales,
        totalOrders: nextOrders.length,
        totalProducts: nextProducts.length,
        totalCustomers: nextUsers.filter((u) => u?.role === 'customer').length,
        lowStockProducts: lowStock,
        outOfStock,
        pendingOrders: nextOrders.filter((order) => ['pending', 'confirmed'].includes(order?.status)).length,
        pendingRestock: nextRestocks.filter((request) => request?.status === 'pending').length,
      })

    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }

  const monthlySales = useMemo(() => Array.from({ length: 12 }, (_, month) => ({
    label: new Date(salesYear, month, 1).toLocaleString('en', { month: 'short' }),
    value: (Array.isArray(orders) ? orders : []).filter((order) => {
      if (!order?.created_at) return false
      const date = new Date(order.created_at)
      return date.getFullYear() === salesYear && date.getMonth() === month
    }).reduce((sum, order) => sum + Number(order?.total || 0), 0),
  })), [orders, salesYear])

  const topProducts = useMemo(() => {
    const totals = (Array.isArray(orders) ? orders : []).flatMap((order) => order?.items || []).reduce((result, item) => {
      const name = item?.product?.name || item?.name || 'Uncategorized'
      result[name] = (result[name] || 0) + Number(item?.quantity || item?.qty || 0)
      return result
    }, {})
    return Object.entries(totals).sort(([, first], [, second]) => second - first).slice(0, 5)
  }, [orders])

  const maxMonthlySales = Math.max(...monthlySales.map((month) => month.value), 1)
  const stockAlerts = (Array.isArray(inventory) ? inventory : []).filter((item) => Number(item?.quantity || 0) <= Number(item?.low_stock_threshold || 5)).slice(0, 4)

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleConfirmLogout = async () => {
    try {
      setLogoutLoading(true)
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
      window.location.href = '/'
    } finally {
      setLogoutLoading(false)
      setShowLogoutModal(false)
    }
  }

  const pageTitles = {
    dashboard: 'Dashboard',
    users: 'Users Management',
    products: 'Products Catalog',
    inventory: 'Inventory Stock',
    orders: 'Orders Management',
    suppliers: 'Suppliers Management',
    restock: 'Stock Requests',
    reports: 'Reports & Analytics',
    feedback: 'Customer Feedback'
  }


  return (
    <div className="dashboard-layout">
      {/* Logout Confirmation Dialog */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
        loading={logoutLoading}
        title="Admin Sign Out"
        message="Are you sure you want to log out?"
      />

      {/* Mobile backdrop */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar - Fixed and Persistent */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">J</div>
          <div className="brand-text">
            <strong>JEM Hardware</strong>
            <small>&amp; Coco Lumber</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            type="button"
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('/dashboard')}
          >
            <Home size={18} /> Dashboard
          </button>
          <button 
            type="button"
            className={`nav-item ${activePage === 'users' ? 'active' : ''}`}
            onClick={() => navigateTo('/users')}
          >
            <Users size={18} /> Users
          </button>
          <button 
            type="button"
            className={`nav-item ${activePage === 'products' ? 'active' : ''}`}
            onClick={() => navigateTo('/products')}
          >
            <Package size={18} /> Products
          </button>
          <button 
            type="button"
            className={`nav-item ${activePage === 'inventory' ? 'active' : ''}`}
            onClick={() => navigateTo('/inventory')}
          >
            <Box size={18} /> Inventory
          </button>
          <button 
            type="button"
            className={`nav-item ${activePage === 'orders' ? 'active' : ''}`}
            onClick={() => navigateTo('/orders')}
          >
            <ShoppingCart size={18} /> Orders
          </button>
          <button 
            type="button"
            className={`nav-item ${activePage === 'suppliers' ? 'active' : ''}`}
            onClick={() => navigateTo('/suppliers')}
          >
            <Truck size={18} /> Suppliers
          </button>
          <button 
            type="button"
            className={`nav-item ${activePage === 'restock' ? 'active' : ''}`}
            onClick={() => navigateTo('/stock-requests')}
          >
            <ClipboardList size={18} /> Stock Requests
          </button>


          <button 
            type="button"
            className={`nav-item ${activePage === 'reports' ? 'active' : ''}`}
            onClick={() => navigateTo('/reports')}
          >
            <BarChart3 size={18} /> Reports
          </button>
          <button 
            type="button"
            className={`nav-item ${activePage === 'feedback' ? 'active' : ''}`}
            onClick={() => navigateTo('/feedback')}
          >
            <MessageSquare size={18} /> Feedback
          </button>
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={handleLogoutClick}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>


      {/* Main Content Area - Dynamically switches based on route */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <button 
            type="button"
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="header-context">
            <span>JEM Hardware &amp; Coco Lumber</span>
            <strong>{pageTitles[activePage] || 'Dashboard'}</strong>
          </div>
          <div className="header-search">
            <Search size={16} />
            <input type="text" placeholder="Search..." />
          </div>

          <div className="header-actions">
            <NotificationDropdown role="admin" iconSize={19} />
            <div className="user-menu">
              <span className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</span>
              <span>{user?.name || 'Administrator'}</span>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="dashboard-content">
          <ErrorBoundary>
            {activePage === 'dashboard' && (
              <section className="dashboard-section">
                <div className="dashboard-title-row">
                  <div>
                    <p className="eyebrow">Operations overview</p>
                    <h1>Good morning, {user?.name ? user.name.split(' ')[0] : 'Admin'}.</h1>
                    <p className="section-subtitle">A clear view of today’s sales, stock, and order flow.</p>
                  </div>
                  <button type="button" className="button button-accent" onClick={fetchDashboardStats}>
                    <TrendingUp size={16} /> Refresh data
                  </button>
                </div>

                {/* Key Metrics */}
                <div className="metrics-grid">
                  <MetricCard
                    icon={DollarSign}
                    label="Sales processed"
                    value={`₱${Number(stats.totalSales || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
                    detail="From available orders"
                    trend="up"
                  />
                  <MetricCard
                    icon={ShoppingCart}
                    label="Orders this period"
                    value={String(stats.totalOrders ?? 0)}
                    detail={`${stats.pendingOrders ?? 0} need attention`}
                    trend="up"
                  />
                  <MetricCard
                    icon={Package}
                    label="Active products"
                    value={String(stats.totalProducts ?? 0)}
                    detail={`${stats.lowStockProducts ?? 0} low stock`}
                    trend="neutral"
                  />
                  <MetricCard
                    icon={Users}
                    label="Registered customers"
                    value={String(stats.totalCustomers ?? 0)}
                    detail="From customer accounts"
                    trend="up"
                  />
                </div>

                <div className="metrics-grid metrics-grid-secondary">
                  <MetricCard icon={AlertCircle} label="Low stock" value={String(stats.lowStockProducts ?? 0)} detail="Reorder recommended" trend="neutral" />
                  <MetricCard icon={Box} label="Out of stock" value={String(stats.outOfStock ?? 0)} detail="Immediate action" trend="down" />
                  <MetricCard icon={ClipboardList} label="Pending restock" value={String(stats.pendingRestock ?? 0)} detail="Awaiting approval" trend="neutral" />
                  <MetricCard icon={ShoppingCart} label="Pending orders" value={String(stats.pendingOrders ?? 0)} detail="Needs attention" trend="up" />
                </div>

                <div className="analytics-grid">
                  <div className="dashboard-card sales-card">
                    <div className="card-heading">
                      <div>
                        <p className="eyebrow">Revenue trend</p>
                        <h2>Monthly sales</h2>
                      </div>
                      <select value={salesYear} onChange={(event) => setSalesYear(Number(event.target.value))}>
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                        <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                      </select>
                    </div>
                    <div className="bar-chart">
                      {monthlySales.map((month) => (
                        <div className="bar-column" key={month.label}>
                          <span className="bar-value">{month.value ? `₱${Math.round(month.value / 1000)}k` : ''}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ height: `${Math.max((month.value / maxMonthlySales) * 100, month.value ? 8 : 2)}%` }} />
                          </div>
                          <small>{month.label}</small>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-card top-products-card">
                    <div className="card-heading">
                      <div>
                        <p className="eyebrow">Sales mix</p>
                        <h2>Top products</h2>
                      </div>
                      <MoreHorizontal size={18} />
                    </div>
                    {topProducts.length ? (
                      <div className="product-rank-list">
                        {topProducts.map(([name, quantity], index) => (
                          <div className="product-rank" key={name}>
                            <span className={`rank-dot rank-${index}`} />
                            <strong>{name}</strong>
                            <span>{quantity} sold</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-chart">
                        <Package size={22} />
                        <span>No sales data yet</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-grid dashboard-grid-wide">
                  <div className="dashboard-card table-card">
                    <div className="card-heading">
                      <div>
                        <p className="eyebrow">Latest activity</p>
                        <h2>Recent orders</h2>
                      </div>
                      <button type="button" className="text-button" onClick={() => navigateTo('/orders')}>
                        View all <ArrowUpRight size={14} />
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(orders) ? orders : []).slice(0, 5).map((order) => (
                            <tr key={order.id || Math.random()}>
                              <td><strong>{order.order_number || `#${order.id}`}</strong></td>
                              <td>{order.customer_name || order.customer?.user?.name || 'Walk-in customer'}</td>
                              <td><strong>₱{Number(order.total || 0).toLocaleString()}</strong></td>
                              <td><span className={`status status-${order.status || 'pending'}`}>{String(order.status || 'pending').replaceAll('_', ' ')}</span></td>
                              <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!orders.length && (
                        <div className="empty-state">
                          <ShoppingCart size={22} />
                          <p>No orders found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="dashboard-card stock-card">
                    <div className="card-heading">
                      <div>
                        <p className="eyebrow">Inventory watch</p>
                        <h2>Stock alerts</h2>
                      </div>
                      <button type="button" className="text-button" onClick={() => navigateTo('/inventory')}>
                        Inventory <ArrowUpRight size={14} />
                      </button>
                    </div>
                    {stockAlerts.length ? (
                      stockAlerts.map((item) => (
                        <div className="stock-alert" key={item.id || Math.random()}>
                          <div className="stock-alert-icon">
                            <Package size={16} />
                          </div>
                          <div>
                            <strong>{item.product_name || item.product?.name || 'Item'}</strong>
                            <span>{item.quantity ?? 0} available · min {item.low_stock_threshold ?? 5}</span>
                          </div>
                          <span className={`status ${Number(item.quantity || 0) === 0 ? 'status-cancelled' : 'status-pending'}`}>
                            {Number(item.quantity || 0) === 0 ? 'Out of stock' : 'Low stock'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Check size={22} />
                        <p>No stock alerts</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <Suspense fallback={<PageSkeletonLoader rows={6} />}>
              {activePage === 'products' && <ProductManagement />}
              {activePage === 'orders' && <OrdersManagement />}
              {activePage === 'users' && <UserManagement />}
              {activePage === 'inventory' && <InventoryManagement />}
              {activePage === 'suppliers' && <SuppliersManagement />}
              {activePage === 'restock' && <RestockRequestsPage role="admin" />}
              {activePage === 'reports' && <ReportsPage />}

              {activePage === 'feedback' && <FeedbackManagement />}
            </Suspense>

          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, detail, trend }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <div className={`metric-icon ${trend || 'neutral'}`}>
          <Icon size={24} />
        </div>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">
        {trend === 'up' && <ArrowUpRight size={16} className="trend-icon up" />}
        {trend === 'down' && <ArrowDownRight size={16} className="trend-icon down" />}
        <span>{detail}</span>
      </div>
    </div>
  )
}
