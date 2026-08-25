import { Menu, UserCircle2, Search } from 'lucide-react'
import NotificationDropdown from '../NotificationDropdown'

export default function Header({ title, onToggleSidebar, onShowCustomer, onLogout }) {
  return (
    <header
      style={{
        padding: '18px 28px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="btn-secondary"
          style={{ padding: '10px', borderRadius: 12, minWidth: 44 }}
        >
          <Menu size={18} />
        </button>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Admin Panel
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <input
            className="input-field"
            style={{ paddingRight: 38, minWidth: 220 }}
            placeholder="Search products, orders..."
          />
          <Search size={16} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>
        <button type="button" className="btn-secondary" onClick={onShowCustomer}>
          Customer App
        </button>
        <NotificationDropdown role="admin" iconSize={18} />
        <button type="button" className="btn-secondary" style={{ padding: '10px 12px' }}>
          <UserCircle2 size={18} />
        </button>
        {onLogout && (
          <button type="button" className="btn-secondary" onClick={onLogout}>Sign out</button>
        )}
      </div>
    </header>
  )
}
