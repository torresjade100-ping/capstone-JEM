import { useEffect, useState } from 'react'
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
import { getStoredUser, logout } from '../api'
import POSPage from './POSPage'

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'POS', icon: ShoppingCart },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'restock', label: 'Restock', icon: Package },
  { key: 'feedback', label: 'Feedback', icon: MessageSquareText },
]

export default function StaffDashboard() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [orders, setOrders] = useState([])

  const stats = [
    { label: 'Today\'s sales', value: orders.reduce((sum, order) => sum + Number(order.total || 0), 0), format: 'currency' },
    { label: 'Orders today', value: orders.length, format: 'number' },
    { label: 'Pending', value: orders.filter((order) => order.paymentMethod === 'Cash' || order.paymentMethod === 'GCash' || order.paymentMethod === 'Maya').length, format: 'number' },
    { label: 'Cash sales', value: orders.filter((order) => order.paymentMethod === 'Cash').reduce((sum, order) => sum + Number(order.total || 0), 0), format: 'currency' },
  ]

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const renderPage = () => {
    if (currentPage === 'pos') {
      return <POSPage onTransactionComplete={(transaction) => setOrders((list) => [transaction, ...list])} />
    }

    if (currentPage === 'orders') {
      return (
        <div className="jem-content-panel jem-orders-panel">
          <div className="jem-panel-header">
            <div>
              <p className="jem-eyebrow">Recent sales</p>
              <h2>Orders</h2>
            </div>
          </div>

          <div className="jem-orders-list">
            {orders.length === 0 ? (
              <div className="jem-empty-state">
                <Warehouse size={36} />
                <p>No transactions yet.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div className="jem-order-row" key={order.id}>
                  <div>
                    <strong>{order.number}</strong>
                    <span>{order.date}</span>
                  </div>
                  <div>
                    <span>{order.paymentMethod}</span>
                    <strong>₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'dashboard') {
      const salesTrend = [28, 42, 37, 61, 55, 73, 64]
      const lowStockPreview = [
        { name: 'Coco Lumber 2x3', remaining: 8 },
        { name: 'Portland Cement', remaining: 14 },
        { name: 'GI Sheet 24G', remaining: 11 },
      ]

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
                  <div style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sales trend</div>
                  <div style={{ marginTop: '6px', fontSize: '1.35rem', fontWeight: 800, color: '#17293a' }}>This week</div>
                </div>
                <div style={{ color: '#64737b', fontSize: '0.78rem' }}>+14.2% vs last week</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px', paddingTop: '8px' }}>
                {salesTrend.map((value, index) => (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '100%', height: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '100%', maxWidth: '26px', height: `${value}%`, background: index === salesTrend.length - 1 ? '#f97316' : '#dfe6eb', borderRadius: '10px 10px 4px 4px' }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64737b' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(23,41,58,0.08)', padding: '18px' }}>
              <div style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Low stock</div>
              <div style={{ marginTop: '10px', display: 'grid', gap: '12px' }}>
                {lowStockPreview.map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffaf5', border: '1px solid rgba(249,115,22,0.12)', borderRadius: '10px', padding: '10px 12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#17293a' }}>{item.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64737b' }}>Critical remaining</div>
                    </div>
                    <span style={{ color: '#f97316', fontWeight: 800, fontSize: '1rem' }}>{item.remaining}</span>
                  </div>
                ))}
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
            {orders.length === 0 ? (
              <div className="jem-empty-state compact">
                <LayoutDashboard size={32} />
                <p>No sales have been recorded yet. POS transactions will appear here.</p>
              </div>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div className="jem-order-row" key={order.id}>
                  <div>
                    <strong>{order.number}</strong>
                    <span>{order.date}</span>
                  </div>
                  <div>
                    <span>{order.paymentMethod}</span>
                    <strong>₱{Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'restock') {
      return (
        <div className="jem-content-panel">
          <div className="jem-panel-header">
            <div>
              <p className="jem-eyebrow">Inventory</p>
              <h2>Restock</h2>
            </div>
          </div>
          <div className="jem-empty-state compact">
            <Package size={32} />
            <p>Restock workflow is ready for the next inventory module.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="jem-content-panel">
        <div className="jem-panel-header">
          <div>
            <p className="jem-eyebrow">Customer care</p>
            <h2>Feedback</h2>
          </div>
        </div>
        <div className="jem-empty-state compact">
          <MessageSquareText size={32} />
          <p>Customer feedback view is ready for future review tools.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .jem-staff-shell {
          display: flex;
          height: 100vh;
          width: 100%;
          background: #f5f4f1;
          color: #17293a;
        }

        .jem-staff-sidebar {
          width: 260px;
          background: #17293a;
          color: #dfe7e4;
          padding: 22px 16px 18px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.06);
          transition: width 0.2s ease;
        }

        .jem-staff-sidebar.collapsed {
          width: 76px;
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
          min-width: 0;
          background: #f5f4f1;
          display: flex;
          flex-direction: column;
        }

        .jem-header {
          height: 74px;
          background: rgba(255,255,255,0.82);
          border-bottom: 1px solid rgba(23,41,58,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px 0 24px;
          backdrop-filter: blur(10px);
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
          overflow: auto;
          padding: 22px 18px 18px;
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
          .jem-staff-sidebar {
            width: 84px;
          }

          .jem-brand-copy,
          .jem-badge,
          .jem-nav-label,
          .jem-nav-indicator {
            display: none;
          }

          .jem-nav-item {
            justify-content: center;
            padding-left: 0;
            padding-right: 0;
          }

          .jem-header {
            padding: 0 16px;
          }

          .jem-header-title {
            margin-left: 8px;
          }

          .jem-header-title h1 {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 640px) {
          .jem-staff-shell {
            display: block;
          }

          .jem-staff-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }

          .jem-nav {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .jem-header {
            height: auto;
            padding: 14px 16px;
            flex-wrap: wrap;
            gap: 10px;
          }

          .jem-header-title {
            width: 100%;
            margin-left: 0;
          }

          .jem-content {
            padding: 16px 12px 18px;
          }
        }
      `}</style>

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
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`jem-nav-item ${currentPage === key ? 'active' : ''}`}
                onClick={() => setCurrentPage(key)}
              >
                <span className="jem-nav-main">
                  <Icon size={17} />
                  <span className="jem-nav-label">{label}</span>
                </span>
                {currentPage === key && <span className="jem-nav-indicator" aria-hidden="true" />}
              </button>
            ))}
          </nav>

          <div className="jem-sidebar-footer">
            <button type="button" className="jem-nav-item" onClick={handleLogout}>
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
              <h1>{currentPage === 'pos' ? 'POS' : currentPage === 'orders' ? 'Orders' : currentPage === 'restock' ? 'Restock' : currentPage === 'feedback' ? 'Feedback' : 'Dashboard'}</h1>
              <p>Staff · JEM Hardware &amp; Coco Lumber</p>
            </div>

            <div className="jem-header-tools">
              <button className="jem-notice-btn" aria-label="Notifications" type="button">
                <Bell size={15} />
              </button>
              <div className="jem-user-avatar" aria-label="Current user">R</div>
            </div>
          </header>

          <div className="jem-content">{renderPage()}</div>
        </main>
      </div>
    </>
  )
}

