import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, Bell, Box, DollarSign, Package, ShoppingCart,
  TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight,
  Home, LogOut, ChevronDown, Menu, X, Check, Truck,
  MessageSquare, ClipboardList, Search, MoreHorizontal
} from 'lucide-react'
import { getAdminOrders, getInventory, getProducts, getRestockRequests, getStoredUser, getUsers, logout } from '../api'
import ProductManagement from './ProductManagement'
import OrdersManagement from './OrdersManagement'
import UserManagement from './UserManagement'
import InventoryManagement from './InventoryManagement'
import SuppliersManagement from './SuppliersManagement'
import RestockRequestsPage from './RestockRequestsPage'
import ReportsPage from './ReportsPage'
import FeedbackManagement from './FeedbackManagement'
import '../styles/dashboard.css'

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900)
  const [currentPage, setCurrentPage] = useState('overview')
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

  useEffect(() => {
    const storedUser = getStoredUser()
    setUser(storedUser)
    
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const [productData, orderData, inventoryData, userData, restockData] = await Promise.all([
        getProducts({ status: 'active' }),
        getAdminOrders(),
        getInventory(),
        getUsers(),
        getRestockRequests(),
      ])
      const nextOrders = Array.isArray(orderData) ? orderData : orderData?.data || []
      const nextInventory = Array.isArray(inventoryData) ? inventoryData : inventoryData?.data || []
      const nextProducts = Array.isArray(productData) ? productData : productData?.data || []
      const nextUsers = Array.isArray(userData) ? userData : userData?.data || []
      const nextRestocks = Array.isArray(restockData) ? restockData : restockData?.data || []
      const sales = nextOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      const lowStock = nextInventory.filter((item) => Number(item.quantity) > 0 && Number(item.quantity) <= Number(item.low_stock_threshold)).length
      const outOfStock = nextInventory.filter((item) => Number(item.quantity) === 0).length
      setOrders(nextOrders)
      setInventory(nextInventory)
      setStats({
        totalSales: sales,
        totalOrders: nextOrders.length,
        totalProducts: nextProducts.length,
        totalCustomers: nextUsers.filter((item) => item.role === 'customer').length,
        lowStockProducts: lowStock,
        outOfStock,
        pendingOrders: nextOrders.filter((order) => ['pending', 'confirmed'].includes(order.status)).length,
        pendingRestock: nextRestocks.filter((request) => request.status === 'pending').length,
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }

  const monthlySales = useMemo(() => Array.from({ length: 12 }, (_, month) => ({
    label: new Date(salesYear, month, 1).toLocaleString('en', { month: 'short' }),
    value: orders.filter((order) => {
      const date = new Date(order.created_at)
      return date.getFullYear() === salesYear && date.getMonth() === month
    }).reduce((sum, order) => sum + Number(order.total || 0), 0),
  })), [orders, salesYear])

  const topProducts = useMemo(() => {
    const totals = orders.flatMap((order) => order.items || []).reduce((result, item) => {
      const name = item.product?.name || 'Uncategorized'
      result[name] = (result[name] || 0) + Number(item.quantity || 0)
      return result
    }, {})
    return Object.entries(totals).sort(([, first], [, second]) => second - first).slice(0, 5)
  }, [orders])

  const maxMonthlySales = Math.max(...monthlySales.map((month) => month.value), 1)
  const stockAlerts = inventory.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold)).slice(0, 4)

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!user || user.role !== 'admin') {
    return <div className="unauthorized">Access denied</div>
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">J</div>
          <div className="brand-text">
            <strong>JEM Hardware</strong>
            <small>& Coco Lumber</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentPage === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentPage('overview')}
          >
            <Home size={18} /> Dashboard
          </button>
          <button 
            className={`nav-item ${currentPage === 'users' ? 'active' : ''}`}
            onClick={() => setCurrentPage('users')}
          >
            <Users size={18} /> Users
          </button>
          <button 
            className={`nav-item ${currentPage === 'products' ? 'active' : ''}`}
            onClick={() => setCurrentPage('products')}
          >
            <Package size={18} /> Products
          </button>
          <button 
            className={`nav-item ${currentPage === 'inventory' ? 'active' : ''}`}
            onClick={() => setCurrentPage('inventory')}
          >
            <Box size={18} /> Inventory
          </button>
          <button 
            className={`nav-item ${currentPage === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentPage('orders')}
          >
            <ShoppingCart size={18} /> Orders
          </button>
          <button 
            className={`nav-item ${currentPage === 'suppliers' ? 'active' : ''}`}
            onClick={() => setCurrentPage('suppliers')}
          >
            <Truck size={18} /> Suppliers
          </button>
          <button 
            className={`nav-item ${currentPage === 'restock' ? 'active' : ''}`}
            onClick={() => setCurrentPage('restock')}
          >
            <ClipboardList size={18} /> Restock
          </button>
          <button 
            className={`nav-item ${currentPage === 'reports' ? 'active' : ''}`}
            onClick={() => setCurrentPage('reports')}
          >
            <BarChart3 size={18} /> Reports
          </button>
          <button className={`nav-item ${currentPage === 'feedback' ? 'active' : ''}`} onClick={() => setCurrentPage('feedback')}>
            <MessageSquare size={18} /> Feedback
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <button 
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="header-context"><span>JEM Hardware & Coco Lumber</span><strong>{currentPage === 'overview' ? 'Dashboard' : currentPage}</strong></div>
          <div className="header-search"><Search size={16} /><input type="text" placeholder="Search..." /></div>

          <div className="header-actions">
            <button className="icon-button">
              <Bell size={20} />
              <span className="badge">3</span>
            </button>
            <div className="user-menu">
              <span className="avatar">{user?.name?.charAt(0).toUpperCase()}</span>
              <span>{user?.name}</span>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="dashboard-content">
          {currentPage === 'overview' && (
            <section className="dashboard-section">
              <div className="dashboard-title-row"><div><p className="eyebrow">Operations overview</p><h1>Good morning, {user?.name?.split(' ')[0]}.</h1><p className="section-subtitle">A clear view of today’s sales, stock, and order flow.</p></div><button className="button button-accent" onClick={fetchDashboardStats}><TrendingUp size={16} /> Refresh data</button></div>

              {/* Key Metrics */}
              <div className="metrics-grid">
                <MetricCard
                  icon={DollarSign}
                  label="Sales processed"
                  value={`₱${stats.totalSales.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
                  detail="From available orders"
                  trend="up"
                />
                <MetricCard
                  icon={ShoppingCart}
                  label="Orders this period"
                  value={stats.totalOrders.toString()}
                  detail={`${stats.pendingOrders} need attention`}
                  trend="up"
                />
                <MetricCard
                  icon={Package}
                  label="Active products"
                  value={stats.totalProducts.toString()}
                  detail={`${stats.lowStockProducts} low stock`}
                  trend="neutral"
                />
                <MetricCard
                  icon={Users}
                  label="Registered customers"
                  value={stats.totalCustomers.toString()}
                  detail="From customer accounts"
                  trend="up"
                />
              </div>

              <div className="metrics-grid metrics-grid-secondary">
                <MetricCard icon={AlertCircle} label="Low stock" value={stats.lowStockProducts} detail="Reorder recommended" trend="neutral" />
                <MetricCard icon={Box} label="Out of stock" value={stats.outOfStock} detail="Immediate action" trend="down" />
                <MetricCard icon={ClipboardList} label="Pending restock" value={stats.pendingRestock} detail="Awaiting approval" trend="neutral" />
                <MetricCard icon={ShoppingCart} label="Pending orders" value={stats.pendingOrders} detail="Needs attention" trend="up" />
              </div>

              <div className="analytics-grid">
                <div className="dashboard-card sales-card"><div className="card-heading"><div><p className="eyebrow">Revenue trend</p><h2>Monthly sales</h2></div><select value={salesYear} onChange={(event) => setSalesYear(Number(event.target.value))}><option value={new Date().getFullYear()}>{new Date().getFullYear()}</option><option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option></select></div><div className="bar-chart">{monthlySales.map((month) => <div className="bar-column" key={month.label}><span className="bar-value">{month.value ? `₱${Math.round(month.value / 1000)}k` : ''}</span><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max((month.value / maxMonthlySales) * 100, month.value ? 8 : 2)}%` }} /></div><small>{month.label}</small></div>)}</div></div>
                <div className="dashboard-card top-products-card"><div className="card-heading"><div><p className="eyebrow">Sales mix</p><h2>Top products</h2></div><MoreHorizontal size={18} /></div>{topProducts.length ? <div className="product-rank-list">{topProducts.map(([name, quantity], index) => <div className="product-rank" key={name}><span className={`rank-dot rank-${index}`} /><strong>{name}</strong><span>{quantity} sold</span></div>)}</div> : <div className="empty-chart"><Package size={22} /><span>No sales data yet</span></div>}</div>
              </div>

              <div className="dashboard-grid dashboard-grid-wide"><div className="dashboard-card table-card"><div className="card-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent orders</h2></div><button className="text-button" onClick={() => setCurrentPage('orders')}>View all <ArrowUpRight size={14} /></button></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.slice(0, 5).map((order) => <tr key={order.id}><td><strong>{order.order_number || `#${order.id}`}</strong></td><td>{order.customer?.user?.name || 'Walk-in customer'}</td><td><strong>₱{Number(order.total || 0).toLocaleString()}</strong></td><td><span className={`status status-${order.status}`}>{String(order.status || 'pending').replaceAll('_', ' ')}</span></td><td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td></tr>)}</tbody></table>{!orders.length && <div className="empty-state"><ShoppingCart size={22} /><p>No orders found</p></div>}</div></div><div className="dashboard-card stock-card"><div className="card-heading"><div><p className="eyebrow">Inventory watch</p><h2>Stock alerts</h2></div><button className="text-button" onClick={() => setCurrentPage('inventory')}>Inventory <ArrowUpRight size={14} /></button></div>{stockAlerts.length ? stockAlerts.map((item) => <div className="stock-alert" key={item.id}><div className="stock-alert-icon"><Package size={16} /></div><div><strong>{item.product_name || item.product?.name}</strong><span>{item.quantity} available · min {item.low_stock_threshold}</span></div><span className={`status ${Number(item.quantity) === 0 ? 'status-cancelled' : 'status-pending'}`}>{Number(item.quantity) === 0 ? 'Out of stock' : 'Low stock'}</span></div>) : <div className="empty-state"><Check size={22} /><p>No stock alerts</p></div>}</div></div>
            </section>
          )}

          {currentPage === 'products' && <ProductManagement />}
          {currentPage === 'orders' && <OrdersManagement />}
          {currentPage === 'users' && <UserManagement />}
          {currentPage === 'inventory' && <InventoryManagement />}
          {currentPage === 'suppliers' && <SuppliersManagement />}
          {currentPage === 'restock' && <RestockRequestsPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'feedback' && <FeedbackManagement />}
        </div>
      </main>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, detail, trend }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <div className={`metric-icon ${trend}`}>
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
