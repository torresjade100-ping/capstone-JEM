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
  Receipt,
  ArrowUpRight,
  AlertTriangle,
  Box,
} from 'lucide-react'
import { getStoredUser, logout, getSharedOrders, getAdminOrders, getTransactions, getInventory, getStockAdjustments } from '../api'
import NotificationDropdown from '../components/NotificationDropdown'
import ThemeToggle from '../components/ThemeToggle'
import HeaderDateTime from '../components/HeaderDateTime'
import LogoutConfirmationModal from '../components/LogoutConfirmationModal'
import PageSkeletonLoader from '../components/PageSkeletonLoader'
import ErrorBoundary from '../components/ErrorBoundary'
import SidebarFloatingTooltip from '../components/SidebarFloatingTooltip'
import Sidebar from '../components/Sidebar'
import useSidebarCollapse from '../hooks/useSidebarCollapse'
import '../styles/dashboard.css'

const POSPage = lazy(() => import('./POSPage'))
const OrdersManagement = lazy(() => import('./OrdersManagement'))
const InventoryManagement = lazy(() => import('./InventoryManagement'))
const RestockRequestsPage = lazy(() => import('./RestockRequestsPage'))
const FeedbackManagement = lazy(() => import('./FeedbackManagement'))
const TransactionsPage = lazy(() => import('./TransactionsPage'))
const LossDamageTheftPage = lazy(() => import('./LossDamageTheftPage'))




export default function StaffDashboard() {
  const location = useLocation()
  const navigate = useNavigate()

  const [user, setUser] = useState(() => getStoredUser())
  const {
    isCollapsed,
    toggleSidebar,
    activeTooltip,
    getTooltipProps,
  } = useSidebarCollapse()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [staffInventory, setStaffInventory] = useState([])
  const [stockAdjustments, setStockAdjustments] = useState([])
  const [orders, setOrders] = useState(() => {
    const list = getSharedOrders()
    return Array.isArray(list) ? list : []
  })

  const getActivePage = (pathname) => {
    const cleanPath = (pathname || '/').toLowerCase().replace(/\/$/, '') || '/'
    if (cleanPath === '/' || cleanPath === '/dashboard' || cleanPath === '/staff/dashboard') return 'dashboard'
    if (cleanPath.startsWith('/pos')) return 'pos'
    if (cleanPath.startsWith('/inventory')) return 'inventory'
    if (cleanPath.startsWith('/orders')) return 'orders'
    if (cleanPath.startsWith('/transactions')) return 'transactions'
    if (cleanPath.startsWith('/backorders')) return 'backorders'
    if (cleanPath.startsWith('/stock-requests') || cleanPath.startsWith('/stock-request') || cleanPath.startsWith('/restock')) return 'restock'
    if (cleanPath.startsWith('/loss-damage-theft') || cleanPath.startsWith('/loss-damage') || cleanPath.startsWith('/incidents')) return 'loss-damage-theft'
    if (cleanPath.startsWith('/feedback')) return 'feedback'
    return 'dashboard'
  }


  const activePage = getActivePage(location.pathname)

  const navigateTo = (path) => {
    navigate(path)
  }

  const fetchStaffOrders = async () => {
    try {
      const data = await getAdminOrders()
      if (Array.isArray(data)) {
        setOrders(data)
      } else {
        const live = getSharedOrders()
        setOrders(Array.isArray(live) ? live : [])
      }
    } catch (e) {
      const live = getSharedOrders()
      setOrders(Array.isArray(live) ? live : [])
    }
  }

  const fetchStaffTransactions = async () => {
    try {
      const res = await getTransactions({ per_page: 5 })
      if (res && res.success) {
        setRecentTransactions(res.data?.data || [])
      }
    } catch (e) {
      console.error('Failed to fetch staff transactions:', e)
    }
  }

  const fetchStaffInventoryData = async () => {
    try {
      const [invRes, adjRes] = await Promise.allSettled([
        getInventory(),
        getStockAdjustments(null, { per_page: 6 })
      ])
      if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
        setStaffInventory(invRes.value)
      }
      if (adjRes.status === 'fulfilled' && Array.isArray(adjRes.value)) {
        setStockAdjustments(adjRes.value)
      }
    } catch (e) {
      console.warn('Failed to fetch staff inventory overview:', e)
    }
  }

  useEffect(() => {
    setUser(getStoredUser())
    let isSubscribed = true
    let isFetching = false

    const pollStaffDashboard = async () => {
      if (isFetching || !isSubscribed) return
      isFetching = true
      try {
        await Promise.allSettled([
          fetchStaffOrders(),
          fetchStaffTransactions(),
          fetchStaffInventoryData(),
        ])
      } finally {
        if (isSubscribed) {
          isFetching = false
        }
      }
    }

    pollStaffDashboard()

    // Smooth 1.5 - 2 second data refresh without overlapping requests
    const interval = setInterval(pollStaffDashboard, 1800)

    const handleSync = () => {
      pollStaffDashboard()
    }
    window.addEventListener('jem_orders_update', handleSync)
    window.addEventListener('jem_inventory_update', handleSync)
    window.addEventListener('jem_notification_update', handleSync)

    return () => {
      isSubscribed = false
      clearInterval(interval)
      window.removeEventListener('jem_orders_update', handleSync)
      window.removeEventListener('jem_inventory_update', handleSync)
      window.removeEventListener('jem_notification_update', handleSync)
    }
  }, [])

  const safeOrders = Array.isArray(orders) ? orders : []
  const safeInventory = Array.isArray(staffInventory) ? staffInventory : []
  const lowStockCount = safeInventory.filter(i => Number(i.quantity ?? i.stock_quantity ?? 0) <= Number(i.low_stock_threshold ?? 10)).length
  const inStockCount = safeInventory.filter(i => Number(i.quantity ?? i.stock_quantity ?? 0) > Number(i.low_stock_threshold ?? 10)).length

  const stats = [
    { label: 'TODAY SALES', value: safeOrders.reduce((sum, order) => sum + Number(order?.total || 0), 0), format: 'currency' },
    { label: 'ORDERS TODAY', value: safeOrders.length, format: 'number' },
    { label: 'CATALOG ITEMS', value: safeInventory.length, format: 'number' },
    { label: 'IN STOCK', value: inStockCount, format: 'number' },
    { label: 'LOW STOCK ALERTS', value: lowStockCount, format: 'number', highlight: lowStockCount > 0 },
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

    if (activePage === 'transactions') {
      return (
        <Suspense fallback={<PageSkeletonLoader rows={6} />}>
          <TransactionsPage role="staff" />
        </Suspense>
      )
    }

    if (activePage === 'inventory') {
      return (
        <Suspense fallback={<PageSkeletonLoader rows={6} />}>
          <InventoryManagement role="staff" />
        </Suspense>
      )
    }

    if (activePage === 'orders') {
      return <OrdersManagement role="staff" defaultTab="orders" />
    }

    if (activePage === 'backorders') {
      return <OrdersManagement role="staff" defaultTab="backorders" />
    }

    if (activePage === 'restock') {
      return <RestockRequestsPage role="staff" />
    }

    if (activePage === 'loss-damage-theft') {
      return (
        <Suspense fallback={<PageSkeletonLoader rows={6} />}>
          <LossDamageTheftPage />
        </Suspense>
      )
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
              <div key={stat.label} className="jem-stat-card" style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '18px 16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 18px var(--shadow-sm)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.06em', color: 'var(--text-primary)' }}>
                  {stat.format === 'currency'
                    ? `₱${Number(stat.value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : stat.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.8fr)', gap: '18px', marginBottom: '18px' }}>
            <div className="jem-chart-card" style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 18px var(--shadow-sm)', padding: '18px 18px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <div style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sales activity</div>
                  <div style={{ marginTop: '6px', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>This week</div>
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
                        background: d.value ? '#f97316' : 'var(--border-color)',
                        borderRadius: '10px 10px 4px 4px'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="jem-orders-stream-card" style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 18px var(--shadow-sm)', padding: '18px' }}>
              <div style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Orders Stream</div>
              <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                {safeOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No incoming orders currently.
                  </div>
                ) : (
                  safeOrders.slice(0, 3).map((ord) => (
                    <div key={ord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{ord.order_number || `#${ord.id}`}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ord.customer_name || 'Customer'}</div>
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

          <div className="jem-panel-header" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="jem-eyebrow">Recent activity</p>
              <h2>Latest transactions</h2>
            </div>
            <button
              type="button"
              className="jem-button jem-button-secondary"
              onClick={() => navigateTo('/transactions')}
            >
              Open Ledger <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="jem-orders-list">
            {(recentTransactions.length > 0 ? recentTransactions : safeOrders.slice(0, 5)).map((tx) => {
              const txNum = tx.transaction_number || tx.order_number || `#${tx.id}`
              const isVoided = tx.status === 'VOIDED'
              const amount = tx.total_net ?? tx.total ?? 0
              const method = tx.payment_method?.toUpperCase() || 'CASH'
              const dateDisplay = tx.date_time ? new Date(tx.date_time).toLocaleDateString() : (tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Today')

              return (
                <div className="jem-order-row" key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ textDecoration: isVoided ? 'line-through' : 'none', color: isVoided ? '#ef4444' : 'inherit' }}>
                      {txNum}
                    </strong>
                    <span>{tx.customer_name || 'Walk-in'} • {dateDisplay}</span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', marginRight: '6px' }}>{method}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isVoided ? '#ef4444' : tx.status === 'REFUNDED' ? '#f59e0b' : '#10b981'
                      }}>
                        {tx.status || 'PAID'}
                      </span>
                    </div>
                    <strong>₱{Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              )
            })}
            {recentTransactions.length === 0 && safeOrders.length === 0 && (
              <div className="jem-empty-state compact">
                <Receipt size={32} />
                <p>No sales recorded yet. Completed POS transactions will appear here.</p>
              </div>
            )}
          </div>

          <div className="jem-panel-header" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="jem-eyebrow">Warehouse &amp; Inventory</p>
              <h2>Recent Stock Movements</h2>
            </div>
            <button
              type="button"
              className="jem-button jem-button-secondary"
              onClick={() => navigateTo('/inventory')}
            >
              Manage Inventory <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="jem-orders-list">
            {stockAdjustments.slice(0, 5).map((adj) => {
              const prodName = adj.product?.name || adj.product_name || `Product #${adj.product_id}`
              const change = Number(adj.quantity_changed ?? adj.quantity_change ?? 0)
              const isPositive = change > 0
              const type = (adj.adjustment_type || 'adjustment').toUpperCase()
              const dateDisplay = adj.created_at ? new Date(adj.created_at).toLocaleDateString() : 'Today'

              return (
                <div className="jem-order-row" key={adj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {prodName}
                    </strong>
                    <span>{adj.reason || 'Stock Update'} • {dateDisplay} {adj.reference_number ? `(${adj.reference_number})` : ''}</span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: isPositive ? '#10b981' : '#ef4444',
                      fontWeight: 700
                    }}>
                      {type}
                    </span>
                    <strong style={{
                      fontSize: '1rem',
                      color: isPositive ? '#10b981' : '#ef4444'
                    }}>
                      {isPositive ? `+${change}` : change}
                    </strong>
                  </div>
                </div>
              )
            })}
            {stockAdjustments.length === 0 && (
              <div className="jem-empty-state compact">
                <Box size={32} />
                <p>No recent stock adjustments recorded yet.</p>
              </div>
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
          max-width: 100vw;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          overflow-x: hidden;
          display: flex;
          background: var(--bg-main);
          color: var(--text-primary);
          transition: background-color 0.2s ease, color 0.2s ease;
          box-sizing: border-box;
        }


        .jem-main {
          flex: 1;
          width: 0;
          min-width: 0;
          max-width: 100%;
          height: 100vh;
          max-height: 100vh;
          background: var(--bg-main);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          overflow-x: hidden;
          transition: background-color 0.2s ease;
          box-sizing: border-box;
        }

        .jem-header {
          flex-shrink: 0;
          height: 72px;
          min-height: 72px;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px 0 24px;
          backdrop-filter: blur(10px);
          position: relative;
          z-index: 100;
          overflow: visible;
          transition: background-color 0.2s ease, border-color 0.2s ease;
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
          color: var(--text-primary);
        }

        .jem-header-title p {
          margin: 0;
          color: var(--text-secondary);
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
          border: 1px solid var(--border-color);
          background: var(--bg-surface);
          color: var(--text-primary);
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
          background: #f97316;
          color: white;
          font-weight: 700;
          display: grid;
          place-items: center;
          font-size: 1rem;
        }

        .jem-content {
          flex: 1;
          min-height: 0;
          min-width: 0;
          width: 100%;
          max-width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 22px 24px 28px;
          box-sizing: border-box;
        }

        @media (max-width: 1440px) {
          .jem-content {
            padding: 16px 18px 24px;
          }
        }

        @media (max-width: 1366px) {
          .jem-content {
            padding: 14px 14px 20px;
          }
        }

        @media (max-width: 1280px) {
          .jem-content {
            padding: 12px 10px 18px;
          }
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
          color: var(--text-primary);
        }

        .jem-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          box-sizing: border-box;
          line-height: 1.4;
          white-space: nowrap;
        }

        .jem-button-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .jem-button-secondary:hover {
          background: #f97316;
          color: #ffffff;
          border-color: #f97316;
          box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35);
          transform: translateY(-1px);
        }

        .jem-button-secondary:active {
          transform: translateY(0);
        }

        [data-theme="light"] .jem-button-secondary {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        [data-theme="light"] .jem-button-secondary:hover {
          background: #f97316;
          color: #ffffff;
          border-color: #f97316;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        [data-theme="dark"] .jem-button-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        [data-theme="dark"] .jem-button-secondary:hover {
          background: #f97316;
          color: #ffffff;
          border-color: #f97316;
          box-shadow: 0 4px 14px rgba(249, 115, 22, 0.45);
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
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px 18px;
          box-shadow: 0 6px 18px var(--shadow-sm);
          color: var(--text-primary);
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .jem-order-row strong,
        .jem-order-row span {
          display: block;
        }

        .jem-order-row span {
          color: var(--text-secondary);
          font-size: 0.72rem;
          margin-top: 4px;
        }

        .jem-order-row > div:last-child {
          text-align: right;
        }

        .jem-empty-state {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--bg-surface);
          color: var(--text-muted);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: 0 8px 18px var(--shadow-sm);
          text-align: center;
          padding: 32px 24px;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .jem-empty-state.compact {
          min-height: 180px;
        }

        .jem-empty-state svg {
          color: var(--text-muted);
        }

        .jem-empty-state p {
          margin: 0;
          max-width: 360px;
          line-height: 1.6;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        [data-theme="dark"] .jem-staff-shell {
          background: #020617;
          color: #F8FAFC;
        }
        [data-theme="dark"] .jem-staff-sidebar {
          background: #090e17;
          border-right: 1px solid #1E293B;
        }
        [data-theme="dark"] .jem-brand-mark {
          background: #f97316;
          box-shadow: 0 0 16px rgba(249, 115, 22, 0.45);
        }
        [data-theme="dark"] .jem-badge {
          background: rgba(249, 115, 22, 0.16);
          border: 1px solid rgba(249, 115, 22, 0.35);
          color: #ffb37c;
        }
        [data-theme="dark"] .jem-nav-item.active {
          background: rgba(249, 115, 22, 0.18);
          color: #ffb37c;
          box-shadow: inset 3px 0 0 #f97316;
        }
        [data-theme="dark"] .jem-nav-item.active svg {
          color: #f97316;
        }
        [data-theme="dark"] .jem-nav-indicator {
          background: #f97316;
        }
        [data-theme="dark"] .jem-eyebrow {
          color: #f97316;
        }
        [data-theme="dark"] .jem-main {
          background: #020617;
        }
        [data-theme="dark"] .jem-header {
          background: #0B1120;
          border-bottom: 1px solid #1E293B;
        }
        [data-theme="dark"] .jem-header-title h1 {
          color: #F8FAFC;
        }
        [data-theme="dark"] .jem-header-title p {
          color: #94A3B8;
        }
        [data-theme="dark"] .jem-panel-header h2 {
          color: #F8FAFC;
        }
        [data-theme="dark"] .jem-stat-card,
        [data-theme="dark"] .jem-chart-card,
        [data-theme="dark"] .jem-orders-stream-card {
          background: #0F172A !important;
          border-color: #1E293B !important;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45) !important;
        }
        [data-theme="dark"] .jem-stat-card > div:first-child {
          color: #94A3B8 !important;
        }
        [data-theme="dark"] .jem-stat-card > div:last-child {
          color: #F8FAFC !important;
        }
        [data-theme="dark"] .jem-empty-state {
          background: #0F172A;
          color: #94A3B8;
          border: 1px solid #1E293B;
        }
        [data-theme="dark"] .jem-empty-state svg,
        [data-theme="dark"] .jem-empty-state p {
          color: #94A3B8;
        }

        @media (max-width: 1023.98px) {
          .jem-pos-header-tools .notification-dropdown {
            right: 0;
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

      {/* Floating tooltip for icon-only collapsed mode */}
      <SidebarFloatingTooltip tooltip={activeTooltip} />

      <div className="jem-staff-shell">

        <Sidebar
          role="staff"
          activePage={activePage}
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          onLogout={handleLogoutClick}
          navigateTo={navigateTo}
          getTooltipProps={getTooltipProps}
        />

        <main className="jem-main">
          <header className="jem-header">
            <div className="jem-header-title">
              <h1>{activePage === 'pos' ? 'POS' : activePage === 'orders' ? 'Orders' : activePage === 'restock' ? 'Stock Requests' : activePage === 'feedback' ? 'Feedback' : 'Dashboard'}</h1>

              <p>Staff · JEM Hardware &amp; Coco Lumber</p>
            </div>


            <div className="jem-header-tools">
              <HeaderDateTime />
              <ThemeToggle />
              <NotificationDropdown role="staff" iconSize={16} />
              <div className="jem-user-avatar" aria-label="Current user">{user?.name ? user.name.charAt(0).toUpperCase() : 'O'}</div>
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

