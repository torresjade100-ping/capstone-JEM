import React, { useEffect, useState, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  MessageSquareText,
  LogOut,
  ChevronDown,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Warehouse,
} from 'lucide-react'
import { getStoredUser, logout, getSharedOrders } from '../api'
import NotificationDropdown from '../components/NotificationDropdown'
import LogoutConfirmationModal from '../components/LogoutConfirmationModal'
import PageSkeletonLoader from '../components/PageSkeletonLoader'
import ErrorBoundary from '../components/ErrorBoundary'

const POSPage = lazy(() => import('./POSPage'))
const OrdersManagement = lazy(() => import('./OrdersManagement'))
const RestockRequestsPage = lazy(() => import('./RestockRequestsPage'))
const FeedbackManagement = lazy(() => import('./FeedbackManagement'))


const navItems = [
  { key: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', path: '/pos', label: 'POS', icon: ShoppingCart },
  { key: 'orders', path: '/orders', label: 'Orders', icon: ClipboardList },
  { key: 'restock', path: '/stock-requests', label: 'Stock Requests', icon: Package },
  { key: 'feedback', path: '/feedback', label: 'Feedback', icon: MessageSquareText },
]


export default function StaffDashboard() {
  const location = useLocation()
  const navigate = useNavigate()

  const [user, setUser] = useState(() => getStoredUser())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [orders, setOrders] = useState(() => {
    const list = getSharedOrders()
    return Array.isArray(list) ? list : []
  })

  const getActivePage = (pathname) => {
    const cleanPath = (pathname || '/').toLowerCase().replace(/\/$/, '') || '/'
    if (cleanPath === '/' || cleanPath === '/dashboard') return 'dashboard'
    if (cleanPath.startsWith('/pos')) return 'pos'
    if (cleanPath.startsWith('/orders')) return 'orders'
    if (cleanPath.startsWith('/stock-requests') || cleanPath.startsWith('/stock-request') || cleanPath.startsWith('/restock')) return 'restock'
    if (cleanPath.startsWith('/feedback')) return 'feedback'
    return 'dashboard'
  }


  const activePage = getActivePage(location.pathname)

  const navigateTo = (path) => {
    navigate(path)
  }

  useEffect(() => {
    setUser(getStoredUser())
    const initialOrders = getSharedOrders()
    setOrders(Array.isArray(initialOrders) ? initialOrders : [])
    const interval = setInterval(() => {
      const live = getSharedOrders()
      setOrders(Array.isArray(live) ? live : [])
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const safeOrders = Array.isArray(orders) ? orders : []

  const stats = [
    { label: 'TODAY SALES', value: safeOrders.reduce((sum, order) => sum + Number(order?.total || 0), 0), format: 'currency' },
    { label: 'ORDERS TODAY', value: safeOrders.length, format: 'number' },
    { label: 'PENDING ORDERS', value: safeOrders.filter((o) => ['pending', 'confirmed'].includes(o?.status)).length, format: 'number' },
    { label: 'COMPLETED TODAY', value: safeOrders.filter((o) => o?.status === 'completed').length, format: 'number' },
  ]

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleConfirmLogout = async () => {
    try {
      setLogoutLoading(true)
      await logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      window.location.href = '/login'
    } finally {
      setLogoutLoading(false)
      setShowLogoutModal(false)
    }
  }

  const renderPage = () => {
    if (activePage === 'pos') {
      return (
        <POSPage
          onTransactionComplete={(transaction) => {
            const live = getSharedOrders()
            setOrders(Array.isArray(live) ? live : [])
          }}
        />
      )
    }

    if (activePage === 'orders') {
      return <OrdersManagement role="staff" />
    }

    if (activePage === 'restock') {
      return <RestockRequestsPage role="staff" />
    }


    if (activePage === 'feedback') {
      return <FeedbackManagement />
    }

    if (activePage === 'dashboard') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      
      const realWeeklySales = days.map((dayLabel, idx) => {
        const dayOrders = safeOrders.filter(ord => {
          if (!ord?.created_at) return false
          const d = new Date(ord.created_at)
          const dayIndex = (d.getDay() + 6) % 7 // Monday = 0
          return dayIndex === idx
        })
        const total = dayOrders.reduce((sum, o) => sum + Number(o?.total || 0), 0)
        return { label: dayLabel, value: total }
      })

      const maxSales = Math.max(...realWeeklySales.map(d => d.value), 1)

      return (
        <div className="jem-content-panel">
          <div className="jem-panel-header">
            <div>
              <p className="jem-eyebrow">Overview</p>
              <h2>Staff dashboard</h2>
            </div>
          </div>

          <div className="jem-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            {stats.map((stat) => (
              <div key={stat.label} className="jem-stat-card" style={{ background: 'white', borderRadius: '16px', padding: '18px 16px', border: '1px solid rgba(23,41,58,0.08)', boxShadow: '0 8px 18px rgba(23,41,58,0.02)' }}>
                <div style={{ color: '#64737b', fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.06em', color: '#17293a' }}>
                  {stat.format === 'currency'
                    ? `₱${Number(stat.value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : stat.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.8fr)', gap: '18px', marginBottom: '18px' }}>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(23,41,58,0.08)', padding: '18px 18px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <div style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sales activity</div>
                  <div style={{ marginTop: '6px', fontSize: '1.35rem', fontWeight: 800, color: '#17293a' }}>This week</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px', paddingTop: '8px' }}>
                {realWeeklySales.map((d, index) => (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '100%', height: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{
                        width: '100%',
                        maxWidth: '26px',
                        height: d.value ? `${Math.max((d.value / maxSales) * 100, 10)}%` : '4px',
                        background: d.value ? '#f97316' : '#e2e8f0',
                        borderRadius: '10px 10px 4px 4px'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64737b' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(23,41,58,0.08)', padding: '18px' }}>
              <div style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Orders Stream</div>
              <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                {safeOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '13px' }}>
                    No incoming orders currently.
                  </div>
                ) : (
                  safeOrders.slice(0, 3).map((ord) => (
                    <div key={ord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#17293a', fontSize: '0.85rem' }}>{ord.order_number || `#${ord.id}`}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64737b' }}>{ord.customer_name || 'Customer'}</div>
                      </div>
                      <span style={{ color: '#f97316', fontWeight: 800, fontSize: '0.9rem' }}>
                        ₱{Number(ord.total || 0).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="jem-panel-header" style={{ marginTop: '8px' }}>
            <div>
              <p className="jem-eyebrow">Recent activity</p>
              <h2>Latest transactions</h2>
            </div>
          </div>

          <div className="jem-orders-list">
            {safeOrders.length === 0 ? (
              <div className="jem-empty-state compact">
                <LayoutDashboard size={32} />
                <p>No sales have been recorded yet. POS transactions will appear here.</p>
              </div>
            ) : (
              safeOrders.slice(0, 5).map((order) => (
                <div className="jem-order-row" key={order.id}>
                  <div>
                    <strong>{order.order_number || `#${order.id}`}</strong>
                    <span>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Today'}</span>
                  </div>
                  <div>
                    <span>{order.payment_method?.toUpperCase() || 'COD'}</span>
                    <strong>₱{Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    return null
  }


  return (
    <>
      <style>{`
        .jem-staff-shell {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          display: flex;
          background: #f5f4f1;
          color: #17293a;
        }

        .jem-staff-sidebar {
          width: 260px;
          min-width: 260px;
          flex: 0 0 260px;
          height: 100vh;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          align-self: flex-start;
          z-index: 20;
          box-sizing: border-box;
          background: #17293a;
          color: #dfe7e4;
          padding: 22px 16px 18px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.06);
          transition: width 0.2s ease;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .jem-staff-sidebar.collapsed {
          width: 76px;
          min-width: 76px;
          flex-basis: 76px;
        }

        .jem-staff-sidebar.collapsed .jem-brand-copy,
        .jem-staff-sidebar.collapsed .jem-badge,
        .jem-staff-sidebar.collapsed .jem-nav-label,
        .jem-staff-sidebar.collapsed .jem-nav-indicator {
          display: none;
        }

        .jem-staff-sidebar.collapsed .jem-nav-item {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }

        .jem-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 2px 4px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .jem-brand-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .jem-brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #f97316;
          color: white;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 1.2rem;
          box-shadow: 0 10px 18px rgba(249, 115, 22, 0.25);
        }

        .jem-brand-copy {
          min-width: 0;
        }

        .jem-brand-copy strong,
        .jem-brand-copy span {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .jem-brand-copy strong {
          font-size: 0.82rem;
          color: #fff;
          margin-bottom: 2px;
        }

        .jem-brand-copy span {
          font-size: 0.62rem;
          color: rgba(255,255,255,0.7);
        }

        .jem-collapse-btn {
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
          border-radius: 8px;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .jem-badge {
          margin: 18px 10px 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(249, 115, 22, 0.35);
          background: rgba(249, 115, 22, 0.12);
          color: #f6b787;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .jem-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 6px;
        }

        .jem-nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          background: transparent;
          border: none;
          color: #c7d1d0;
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .jem-nav-item:hover {
          background: rgba(255,255,255,0.04);
        }

        .jem-nav-item.active {
          background: rgba(249, 115, 22, 0.14);
          color: #ffb17e;
          box-shadow: inset 3px 0 0 #f97316;
        }

        .jem-nav-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .jem-nav-item.active svg {
          color: #f97316;
        }

        .jem-nav-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f97316;
          flex-shrink: 0;
        }

        .jem-sidebar-footer {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.09);
        }

        .jem-main {
          flex: 1;
          width: 0;
          min-width: 0;
          height: 100vh;
          max-height: 100vh;
          background: #f5f4f1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .jem-header {
          flex-shrink: 0;
          height: 72px;
          min-height: 72px;
          background: rgba(255,255,255,0.96);
          border-bottom: 1px solid rgba(23,41,58,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px 0 24px;
          backdrop-filter: blur(10px);
          position: relative;
          z-index: 100;
          overflow: visible;
        }

        .jem-header-title {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          margin-left: 16px;
          margin-right: auto;
        }

        .jem-header-title h1 {
          margin: 0;
          font-size: 2rem;
          line-height: 1;
          letter-spacing: -0.06em;
          color: #17293a;
        }

        .jem-header-title p {
          margin: 0;
          color: #64737b;
          font-size: 0.78rem;
        }

        .jem-header-tools {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-left: 12px;
          position: relative;
          overflow: visible;
        }

        .jem-notice-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(23,41,58,0.08);
          background: white;
          color: #17293a;
          display: grid;
          place-items: center;
          position: relative;
        }

        .jem-notice-btn::after {
          content: '';
          position: absolute;
          top: 7px;
          right: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f97316;
        }

        .jem-user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #17293a;
          color: white;
          font-weight: 700;
          display: grid;
          place-items: center;
          font-size: 1rem;
        }

        .jem-content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 22px 24px 28px;
        }

        .jem-content-panel {
          background: transparent;
          border: none;
          border-radius: 16px;
        }

        .jem-panel-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .jem-eyebrow {
          margin: 0 0 8px;
          color: #f97316;
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .jem-panel-header h2 {
          margin: 0;
          font-size: 1.7rem;
          letter-spacing: -0.06em;
          color: #17293a;
        }

        .jem-orders-list {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }

        .jem-order-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          border: 1px solid rgba(23,41,58,0.08);
          border-radius: 12px;
          padding: 16px 18px;
          box-shadow: 0 6px 18px rgba(23,41,58,0.03);
        }

        .jem-order-row strong,
        .jem-order-row span {
          display: block;
        }

        .jem-order-row span {
          color: #64737b;
          font-size: 0.72rem;
          margin-top: 4px;
        }

        .jem-order-row > div:last-child {
          text-align: right;
        }

        .jem-empty-state {
          min-height: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(255,255,255,0.55);
          color: #64737b;
          border: 1px dashed rgba(23,41,58,0.12);
          border-radius: 16px;
          text-align: center;
          padding: 24px;
        }

        .jem-empty-state.compact {
          min-height: 180px;
        }

        .jem-empty-state p {
          margin: 0;
          max-width: 320px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .jem-pos-header-tools .notification-dropdown {
            right: 0;
          }

          .jem-staff-sidebar {
            width: 72px !important;
            min-width: 72px !important;
            flex-basis: 72px !important;
            padding: 16px 8px;
          }

          .jem-brand-copy,
          .jem-badge,
          .jem-nav-label,
          .jem-nav-indicator,
          .jem-collapse-btn {
            display: none !important;
          }

          .jem-brand {
            justify-content: center;
            padding-bottom: 12px;
          }

          .jem-nav-item {
            justify-content: center;
            padding: 10px 0;
          }

          .jem-header {
            padding: 0 16px;
          }

          .jem-header-title {
            margin-left: 8px;
          }

          .jem-header-title h1 {
            font-size: 1.4rem;
          }
        }
      `}</style>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
        loading={logoutLoading}
        title="Staff Sign Out"
        message="Are you sure you want to log out?"
      />

      <div className="jem-staff-shell">

        <aside className={`jem-staff-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="jem-brand">
            <div className="jem-brand-main">
              <div className="jem-brand-mark">J</div>
              <div className="jem-brand-copy">
                <strong>JEM Hardware</strong>
                <span>&amp; Coco Lumber</span>
              </div>
            </div>
            <button className="jem-collapse-btn" onClick={() => setSidebarOpen((state) => !state)} aria-label="Toggle sidebar">
              {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            </button>
          </div>

          <div className="jem-badge">Staff</div>

          <nav className="jem-nav" aria-label="Sidebar navigation">
            {navItems.map(({ key, path, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`jem-nav-item ${activePage === key ? 'active' : ''}`}
                onClick={() => navigateTo(path)}
              >
                <span className="jem-nav-main">
                  <Icon size={17} />
                  <span className="jem-nav-label">{label}</span>
                </span>
                {activePage === key && <span className="jem-nav-indicator" aria-hidden="true" />}
              </button>
            ))}
          </nav>

          <div className="jem-sidebar-footer">
            <button type="button" className="jem-nav-item" onClick={handleLogoutClick}>
              <span className="jem-nav-main">
                <LogOut size={17} />
                <span className="jem-nav-label">Logout</span>
              </span>
            </button>
          </div>
        </aside>

        <main className="jem-main">
          <header className="jem-header">
            <div className="jem-header-title">
              <h1>{activePage === 'pos' ? 'POS' : activePage === 'orders' ? 'Orders' : activePage === 'restock' ? 'Stock Requests' : activePage === 'feedback' ? 'Feedback' : 'Dashboard'}</h1>

              <p>Staff · JEM Hardware &amp; Coco Lumber</p>
            </div>


            <div className="jem-header-tools">
              <NotificationDropdown role="staff" iconSize={16} />
              <div className="jem-user-avatar" aria-label="Current user">{user?.name ? user.name.charAt(0).toUpperCase() : 'S'}</div>
            </div>
          </header>

          <div className="jem-content">
            <ErrorBoundary>
              <Suspense fallback={<PageSkeletonLoader rows={6} />}>
                {renderPage()}
              </Suspense>
            </ErrorBoundary>
          </div>

        </main>
      </div>
    </>
  )
}

