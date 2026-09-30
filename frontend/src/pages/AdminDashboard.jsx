import React, { useEffect, useMemo, useState, lazy, Suspense, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, Box, DollarSign, Package, ShoppingCart,
  TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight,
  Home, LogOut, Menu, X, Check, Truck,
  MessageSquare, ClipboardList, Search, MoreHorizontal, Tag,
  Receipt, KeyRound, RotateCcw, Ban, ShieldCheck, RefreshCw
} from 'lucide-react'
import {
  getAdminOrders, getInventory, getProducts, getRestockRequests,
  getStoredUser, getUsers, logout, getSharedOrders, getTransactions
} from '../api'
import NotificationDropdown from '../components/NotificationDropdown'
import ThemeToggle from '../components/ThemeToggle'
import LogoutConfirmationModal from '../components/LogoutConfirmationModal'
import PageSkeletonLoader from '../components/PageSkeletonLoader'
import ErrorBoundary from '../components/ErrorBoundary'
import '../styles/dashboard.css'

const ProductManagement = lazy(() => import('./ProductManagement'))
const CategoryManagement = lazy(() => import('./CategoryManagement'))
const OrdersManagement = lazy(() => import('./OrdersManagement'))
const UserManagement = lazy(() => import('./UserManagement'))
const InventoryManagement = lazy(() => import('./InventoryManagement'))
const SuppliersManagement = lazy(() => import('./SuppliersManagement'))
const RestockRequestsPage = lazy(() => import('./RestockRequestsPage'))
const ReportsPage = lazy(() => import('./ReportsPage'))
const FeedbackManagement = lazy(() => import('./FeedbackManagement'))
const TransactionsPage = lazy(() => import('./TransactionsPage'))
const VoidSecurityPage = lazy(() => import('./VoidSecurityPage'))

const SIDEBAR_PAGES = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    description: 'Overview, analytics & key business metrics',
    keywords: ['dashboard', 'dash', 'home', 'overview', 'main', 'analytics'],
  },
  {
    id: 'users',
    name: 'Users',
    path: '/users',
    icon: Users,
    description: 'User accounts, cashiers, staff roles & permissions',
    keywords: ['users', 'user', 'staff', 'admin', 'cashier', 'cashiers', 'accounts', 'account', 'customers', 'customer', 'roles'],
  },
  {
    id: 'products',
    name: 'Products',
    path: '/products',
    icon: Package,
    description: 'Product catalog, prices, batches & inventory details',
    keywords: ['products', 'product', 'items', 'item', 'catalog', 'goods', 'merchandise'],
  },
  {
    id: 'categories',
    name: 'Categories',
    path: '/categories',
    icon: Tag,
    description: 'Product categories & hardware classifications',
    keywords: ['categories', 'category', 'cats', 'cat', 'classification', 'tags', 'tag'],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    path: '/inventory',
    icon: Box,
    description: 'Stock levels, stock adjustments & low-stock alerts',
    keywords: ['inventory', 'stock', 'stocks', 'adjustments', 'supplies', 'warehouse'],
  },
  {
    id: 'orders',
    name: 'Orders',
    path: '/orders',
    icon: ShoppingCart,
    description: 'Customer & store sales orders, statuses & fulfillments',
    keywords: ['orders', 'order', 'sales', 'sales orders', 'purchases', 'backorders', 'checkout'],
  },
  {
    id: 'transactions',
    name: 'Transactions',
    path: '/transactions',
    icon: Receipt,
    description: 'Transactions audit ledger, cashier records & refunds',
    keywords: ['transactions', 'transaction', 'audit', 'ledger', 'receipts', 'receipt', 'refunds', 'refund', 'payments', 'sales history'],
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    path: '/suppliers',
    icon: Truck,
    description: 'Vendor directory & supplier management records',
    keywords: ['suppliers', 'supplier', 'vendors', 'vendor', 'distributors', 'distributor'],
  },
  {
    id: 'restock',
    name: 'Stock Requests',
    path: '/stock-requests',
    icon: ClipboardList,
    description: 'Staff restock requests & replenishment approvals',
    keywords: ['stock requests', 'stock request', 'restock', 'restocks', 'restock requests', 'replenishment', 'requests', 'request', 'stock'],
  },
  {
    id: 'reports',
    name: 'Reports',
    path: '/reports',
    icon: BarChart3,
    description: 'Sales reports, financial analytics & data exports',
    keywords: ['reports', 'report', 'analytics', 'statistics', 'sales report', 'financials', 'export'],
  },
  {
    id: 'void-security',
    name: 'Settings',
    secondaryName: 'Void Security',
    path: '/void-security',
    icon: KeyRound,
    description: 'Void PIN settings & authorization security',
    keywords: ['settings', 'setting', 'void security', 'void', 'security', 'void pin', 'pin settings', 'pin'],
  },
  {
    id: 'feedback',
    name: 'Feedback',
    path: '/feedback',
    icon: MessageSquare,
    description: 'Customer feedback, reviews & ratings',
    keywords: ['feedback', 'reviews', 'review', 'ratings', 'rating', 'comments'],
  },
]

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
    refundedTransactions: 0,
    voidedTransactions: 0,
    paidTransactions: 0,
  })
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [salesYear, setSalesYear] = useState(new Date().getFullYear())

  // Derive active route from browser URL
  const getActivePage = (pathname) => {
    const cleanPath = (pathname || '/').toLowerCase().replace(/\/$/, '') || '/'
    if (cleanPath === '/' || cleanPath === '/dashboard') return 'dashboard'
    if (cleanPath.startsWith('/users')) return 'users'
    if (cleanPath.startsWith('/products')) return 'products'
    if (cleanPath.startsWith('/categories') || cleanPath.startsWith('/category')) return 'categories'
    if (cleanPath.startsWith('/inventory')) return 'inventory'
    if (cleanPath.startsWith('/orders')) return 'orders'
    if (cleanPath.startsWith('/transactions')) return 'transactions'
    if (cleanPath.startsWith('/void-security') || cleanPath.startsWith('/settings/void-security') || cleanPath.startsWith('/settings')) return 'void-security'
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

  // Navigation Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Filter matching sidebar pages based on name, secondary name, or keywords
  const matchingPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return SIDEBAR_PAGES

    return SIDEBAR_PAGES.map((page) => {
      const name = page.name.toLowerCase()
      const secName = (page.secondaryName || '').toLowerCase()
      const id = page.id.toLowerCase()
      const path = page.path.toLowerCase().replace('/', '')
      const keywords = page.keywords || []

      let score = 0

      // Exact matches
      if (name === q || secName === q || id === q || path === q) {
        score = 100
      } else if (keywords.includes(q)) {
        score = 90
      } else if (name.startsWith(q) || secName.startsWith(q) || id.startsWith(q)) {
        score = 80
      } else if (keywords.some((k) => k.startsWith(q))) {
        score = 70
      } else if (name.includes(q) || secName.includes(q) || id.includes(q)) {
        score = 60
      } else if (keywords.some((k) => k.includes(q)) || page.description.toLowerCase().includes(q)) {
        score = 50
      }

      return { ...page, score }
    })
      .filter((page) => page.score > 0)
      .sort((a, b) => b.score - a.score)
  }, [searchQuery])

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Outside click listener to dismiss search dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Ensure highlighted result stays visible during keyboard arrow navigation
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(`.search-result-item[data-index="${selectedIndex}"]`)
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Navigate to matching sidebar page directly
  const handleNavigateToPage = (page) => {
    if (!page?.path) return
    setSearchOpen(false)
    setSearchQuery('')
    setSelectedIndex(0)
    inputRef.current?.blur()
    navigateTo(page.path)
  }

  // Handle keyboard navigation inside search input
  const handleSearchKeyDown = (e) => {
    if (!searchOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setSearchOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (matchingPages.length > 0) {
        setSelectedIndex((prev) => (prev < matchingPages.length - 1 ? prev + 1 : 0))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (matchingPages.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : matchingPages.length - 1))
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matchingPages.length > 0) {
        const target = (selectedIndex >= 0 && selectedIndex < matchingPages.length)
          ? matchingPages[selectedIndex]
          : matchingPages[0]
        handleNavigateToPage(target)
      } else {
        const q = searchQuery.trim().toLowerCase()
        const fallback = SIDEBAR_PAGES.find((p) =>
          p.name.toLowerCase() === q ||
          p.id.toLowerCase() === q ||
          (p.secondaryName && p.secondaryName.toLowerCase() === q) ||
          p.keywords.includes(q)
        )
        if (fallback) {
          handleNavigateToPage(fallback)
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setSearchOpen(false)
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser) setUser(storedUser)
    fetchDashboardStats()

    const handleSync = () => {
      fetchDashboardStats()
    }
    window.addEventListener('jem_orders_update', handleSync)
    window.addEventListener('jem_inventory_update', handleSync)
    return () => {
      window.removeEventListener('jem_orders_update', handleSync)
      window.removeEventListener('jem_inventory_update', handleSync)
    }
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const [productData, orderData, inventoryData, userData, restockData, transactionData] = await Promise.allSettled([
        getProducts({ status: 'active' }),
        getAdminOrders(),
        getInventory(),
        getUsers(),
        getRestockRequests(),
        getTransactions({ per_page: 6 }),
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

      let txList = []
      let txMeta = { counts: {}, summary: {} }
      if (transactionData.status === 'fulfilled' && transactionData.value) {
        const tVal = transactionData.value
        txList = tVal.data?.data || []
        txMeta = tVal.meta || { counts: {}, summary: {} }
      }
      setRecentTransactions(txList)

      const sales = txMeta.summary?.total_net_sales
        ? Number(txMeta.summary.total_net_sales)
        : nextOrders.reduce((sum, order) => sum + Number(order?.total || 0), 0)

      const lowStock = nextInventory.filter((item) => Number(item?.quantity || 0) > 0 && Number(item?.quantity || 0) <= Number(item?.low_stock_threshold || 5)).length
      const outOfStock = nextInventory.filter((item) => Number(item?.quantity || 0) === 0).length

      setOrders(nextOrders)
      setInventory(nextInventory)
      setStats({
        totalSales: sales,
        totalOrders: (txMeta.counts?.all ?? ((txMeta.counts?.retail || 0) + (txMeta.counts?.gcash || 0))) || nextOrders.length,
        totalProducts: nextProducts.length,
        totalCustomers: nextUsers.filter((u) => u?.role === 'customer').length,
        lowStockProducts: lowStock,
        outOfStock,
        pendingOrders: nextOrders.filter((order) => ['pending', 'confirmed'].includes(order?.status)).length,
        pendingRestock: nextRestocks.filter((request) => request?.status === 'pending').length,
        refundedTransactions: txMeta.counts?.refunded || 0,
        voidedTransactions: txMeta.counts?.voided || 0,
        paidTransactions: txMeta.counts?.paid || 0,
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
    categories: 'Category Management',
    inventory: 'Inventory Stock',
    orders: 'Orders Management',
    transactions: 'Transactions & Audit Ledger',
    'void-security': 'Settings (Void PIN Security)',
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
            className={`nav-item ${activePage === 'categories' ? 'active' : ''}`}
            onClick={() => navigateTo('/categories')}
          >
            <Tag size={18} /> Categories
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
            className={`nav-item ${activePage === 'transactions' ? 'active' : ''}`}
            onClick={() => navigateTo('/transactions')}
          >
            <Receipt size={18} /> Transactions
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
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} /> Stock Requests
            </span>
            {stats.pendingRestock > 0 && (
              <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {stats.pendingRestock}
              </span>
            )}
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
            className={`nav-item ${activePage === 'void-security' ? 'active' : ''}`}
            onClick={() => navigateTo('/void-security')}
          >
            <KeyRound size={18} /> Settings
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
          <div className="header-search-container" ref={searchRef}>
            <div className={`header-search ${searchOpen ? 'search-active' : ''}`}>
              <Search size={16} className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Global admin search... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => {
                  setSearchOpen(true)
                }}
                onKeyDown={handleSearchKeyDown}
                aria-label="Global admin search"
                autoComplete="off"
                spellCheck="false"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedIndex(0)
                    inputRef.current?.focus()
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="search-kbd-badge">Ctrl K</span>
              )}
            </div>

            {/* Navigation Search Dropdown */}
            {searchOpen && (
              <div className="global-search-dropdown" ref={dropdownRef} role="listbox">
                <div className="search-group-header">
                  <span className="search-group-title">
                    <Search size={13} />
                    {searchQuery.trim() ? `Matching Sidebar Pages (${matchingPages.length})` : 'Jump to Sidebar Page'}
                  </span>
                  <span className="search-group-count">{matchingPages.length}</span>
                </div>

                <div className="search-dropdown-content">
                  {matchingPages.length === 0 ? (
                    <div className="search-empty-state">
                      <Search size={28} className="search-empty-icon" />
                      <p className="search-empty-title">No sidebar page found for &ldquo;{searchQuery}&rdquo;</p>
                      <span className="search-empty-hint">Try searching for Users, Products, Categories, Inventory, Orders, Transactions, Suppliers, Reports, or Settings.</span>
                    </div>
                  ) : (
                    matchingPages.map((page, idx) => {
                      const IconComponent = page.icon
                      const isSelected = idx === selectedIndex
                      const isCurrentPage = activePage === page.id
                      return (
                        <div
                          key={page.id}
                          className={`search-result-item ${isSelected ? 'selected' : ''}`}
                          data-index={idx}
                          onClick={() => handleNavigateToPage(page)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="search-item-icon-box">
                            <IconComponent size={16} />
                          </div>
                          <div className="search-item-info">
                            <div className="search-item-title-row">
                              <span className="search-item-title">
                                {page.name}
                                {page.secondaryName && (
                                  <span style={{ opacity: 0.65, fontWeight: 400, marginLeft: 6 }}>
                                    ({page.secondaryName})
                                  </span>
                                )}
                              </span>
                              {isCurrentPage ? (
                                <span className="search-item-badge" style={{ background: 'rgba(249, 115, 22, 0.18)', color: '#f97316' }}>
                                  Active Page
                                </span>
                              ) : (
                                <span className="search-item-badge">
                                  Press Enter ↵
                                </span>
                              )}
                            </div>
                            <span className="search-item-subtitle">{page.description}</span>
                          </div>
                          <div className="search-item-action">
                            <ArrowUpRight size={14} />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {matchingPages.length > 0 && (
                  <div className="search-dropdown-footer">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
                    <span><kbd>↵</kbd> jump to page</span>
                    <span><kbd>esc</kbd> dismiss</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="header-actions">
            <ThemeToggle />
            <NotificationDropdown role="admin" iconSize={19} />
            <div className="user-menu">
              <span className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</span>
              <span>{user?.name || 'Administrator'}</span>
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

                  <div className="dashboard-card table-card" style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
                    <div className="card-heading">
                      <div>
                        <p className="eyebrow">Audit store sales & refunds</p>
                        <h2>Recent Transactions</h2>
                      </div>
                      <button type="button" className="text-button" onClick={() => navigateTo('/transactions')}>
                        View all transactions <ArrowUpRight size={14} />
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Order #</th>
                            <th>Customer</th>
                            <th>Cashier</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentTransactions.map((tx) => (
                            <tr key={tx.id || tx.transaction_number}>
                              <td>
                                <strong style={{
                                  fontFamily: 'monospace',
                                  textDecoration: tx.status === 'VOIDED' ? 'line-through' : 'none',
                                  color: tx.status === 'VOIDED' ? '#ef4444' : 'inherit'
                                }}>
                                  {tx.transaction_number}
                                </strong>
                              </td>
                              <td style={{ fontStyle: 'italic' }}>{tx.customer_name || 'Walk-in'}</td>
                              <td>{tx.cashier_name || 'Staff'}</td>
                              <td><strong>₱{Number(tx.total_net || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                              <td><span className="payment-chip" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>{(tx.payment_method || 'CASH').toUpperCase()}</span></td>
                              <td>
                                <span className={`status status-${(tx.status || 'paid').toLowerCase()}`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td>{tx.date_time ? new Date(tx.date_time).toLocaleDateString() : '—'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="text-button"
                                  onClick={() => navigateTo('/transactions')}
                                  style={{ padding: '3px 8px', fontSize: '11.5px' }}
                                >
                                  Inspect <ArrowUpRight size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!recentTransactions.length && (
                        <div className="empty-state">
                          <Receipt size={24} />
                          <p>No transactions recorded yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <Suspense fallback={<PageSkeletonLoader rows={6} />}>
              {activePage === 'products' && <ProductManagement />}
              {activePage === 'categories' && <CategoryManagement />}
              {activePage === 'orders' && <OrdersManagement role="admin" defaultTab="orders" />}
              {activePage === 'backorders' && <OrdersManagement role="admin" defaultTab="backorders" />}
              {activePage === 'transactions' && <TransactionsPage role="admin" />}
              {activePage === 'void-security' && <VoidSecurityPage />}
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
