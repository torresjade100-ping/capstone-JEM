import { Package, ClipboardList, Truck, ShoppingBag, BarChart3, Users, Gift, Settings, Bell, MessageSquare, CreditCard, Award, Tag, FileText, SlidersHorizontal, Zap, Archive, Layers } from 'lucide-react'

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: Package },
  { id: 'products', label: 'Products', icon: ClipboardList },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'brands', label: 'Brands', icon: Layers },
  { id: 'adjustments', label: 'Stock Adjustments', icon: Truck },
  { id: 'restock', label: 'Restock Requests', icon: Archive },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'backorders', label: 'Backorders', icon: Gift },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'pos', label: 'Point of Sale', icon: CreditCard },
  { id: 'express', label: 'Express Checkout', icon: Zap },
  { id: 'purchase', label: 'Purchase Orders', icon: FileText },
  { id: 'suppliers', label: 'Suppliers', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'feedback', label: 'Customer Feedback', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'staff', label: 'Staff Management', icon: Users },
  { id: 'audit', label: 'Audit Trail', icon: Award },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'support', label: 'Support', icon: SlidersHorizontal },
]

export default function Sidebar({ activeSection, onNavigate, collapsed, onToggleSidebar }) {
  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? 88 : 270,
        background: '#07101e',
        color: '#e2e8f0',
        borderRight: '1px solid rgba(148, 163, 184, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        transition: 'width 0.2s ease',
      }}
    >
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            background: '#f97316',
            display: 'grid',
            placeItems: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          J
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.3 }}>JEM HARDWARE & COCO LUMBER</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Inventory, orders & POS</div>
          </div>
        )}
      </div>

      <nav style={{ display: 'grid', gap: 8, flex: 1 }}>
        {sections.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item${isActive ? ' active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} />
              {!collapsed && item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ marginTop: 24, padding: collapsed ? '14px 0' : '16px 14px', borderRadius: 18, background: 'rgba(255,255,255,0.05)', display: 'grid', gap: 10 }}>
        {collapsed ? (
          <button type="button" className="btn-navy" style={{ width: '100%' }} onClick={onToggleSidebar}>⇨</button>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Need a quick overview?</div>
            <div style={{ fontWeight: 700, color: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Sales & support
              <Bell size={16} />
            </div>
            <button type="button" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onToggleSidebar}>
              Collapse menu
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
