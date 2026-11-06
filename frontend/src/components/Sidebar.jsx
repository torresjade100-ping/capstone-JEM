import React from 'react'
import {
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Home,
  Users,
  Package,
  Tag,
  Box,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  Truck,
  ClipboardList,
  BarChart3,
  KeyRound,
  MessageSquare
} from 'lucide-react'

// Default navigation item configuration for Administrator
export const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { key: 'users', path: '/users', label: 'Users', icon: Users },
  { key: 'products', path: '/products', label: 'Products', icon: Package },
  { key: 'categories', path: '/categories', label: 'Categories', icon: Tag },
  { key: 'inventory', path: '/inventory', label: 'Inventory', icon: Box },
  { key: 'loss-damage-theft', path: '/loss-damage-theft', label: 'Loss & Damage', icon: AlertTriangle },
  { key: 'orders', path: '/orders', label: 'Orders', icon: ShoppingCart },
  { key: 'transactions', path: '/transactions', label: 'Transactions', icon: Receipt },
  { key: 'suppliers', path: '/suppliers', label: 'Suppliers', icon: Truck },
  { key: 'restock', path: '/stock-requests', label: 'Stock Requests', icon: ClipboardList, badgeKey: 'pendingRestock' },
  { key: 'reports', path: '/reports', label: 'Reports', icon: BarChart3 },
  { key: 'void-security', path: '/void-security', label: 'Settings', icon: KeyRound },
  { key: 'feedback', path: '/feedback', label: 'Feedback', icon: MessageSquare },
]

// Default navigation item configuration for Staff
export const STAFF_NAV_ITEMS = [
  { key: 'dashboard', path: '/staff/dashboard', label: 'Dashboard', icon: Home },
  { key: 'pos', path: '/pos', label: 'POS', icon: ShoppingCart },
  { key: 'inventory', path: '/inventory', label: 'Inventory', icon: Box },
  { key: 'orders', path: '/orders', label: 'Orders', icon: ClipboardList },
  { key: 'transactions', path: '/transactions', label: 'Transactions', icon: Receipt },
  { key: 'restock', path: '/stock-requests', label: 'Stock Requests', icon: Package },
  { key: 'loss-damage-theft', path: '/loss-damage-theft', label: 'Loss & Damage', icon: AlertTriangle },
  { key: 'feedback', path: '/feedback', label: 'Feedback', icon: MessageSquare },
]

/**
 * Universal Sidebar Component for Admin and Staff Dashboards
 * Features:
 * - Minimalist, distraction-free vertical rail when collapsed
 * - Centered collapse/expand toggle button at the very top of collapsed rail
 * - Instant hover tooltips for all icons in collapsed mode
 * - Role-aware dashboard redirection on logo click in expanded mode
 * - Seamless responsive mobile drawer integration
 */
export default function Sidebar({
  role = 'admin',
  activePage = 'dashboard',
  isCollapsed = false,
  toggleSidebar,
  sidebarOpen = false,
  setSidebarOpen,
  onLogout,
  navigateTo,
  getTooltipProps = () => ({}),
  badges = {},
  customNavItems = null,
  className = ''
}) {
  const items = customNavItems || (role === 'staff' ? STAFF_NAV_ITEMS : ADMIN_NAV_ITEMS)

  const handleBrandClick = () => {
    const target = role === 'staff' ? '/staff/dashboard' : '/admin/dashboard'
    if (navigateTo) {
      navigateTo(target)
    }
  }

  const handleNavClick = (path) => {
    if (navigateTo) {
      navigateTo(path)
    }
    if (sidebarOpen && setSidebarOpen) {
      setSidebarOpen(false)
    }
  }

  return (
    <aside
      className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${isCollapsed ? 'collapsed' : ''} ${className}`}
      aria-label="Main Navigation Sidebar"
    >
      {/* 1. TOP HEADER & BRAND ROW */}
      <div className="sidebar-brand">
        {!isCollapsed ? (
          <>
            <div
              className="sidebar-brand-main"
              onClick={handleBrandClick}
              role="button"
              tabIndex={0}
              title={role === 'staff' ? 'Go to Staff Dashboard' : 'Go to Admin Dashboard'}
              aria-label="Go to Dashboard"
            >
              <div className="brand-mark clickable-brand-logo">J</div>
              <div className="brand-text">
                <strong>JEM Hardware</strong>
                <small>&amp; Coco Lumber</small>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              {...getTooltipProps('Collapse sidebar')}
            >
              <PanelLeftClose size={16} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="sidebar-collapse-btn collapsed-toggle"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
            title="Open sidebar"
            {...getTooltipProps('Open sidebar')}
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>

      {/* 2. OPTIONAL ROLE BADGE (Expanded mode only) */}
      {!isCollapsed && role === 'staff' && (
        <div className="sidebar-role-badge">Staff</div>
      )}

      {/* 3. VERTICAL NAVIGATION LIST */}
      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.key
          const badgeVal = item.badgeKey ? badges[item.badgeKey] : null

          return (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path)}
              aria-label={item.label}
              {...getTooltipProps(item.label)}
            >
              <Icon size={18} />
              <span className="nav-label">{item.label}</span>
              {badgeVal > 0 && (
                <span className="nav-badge" title={`${badgeVal} pending`}>
                  {!isCollapsed ? badgeVal : ''}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* 4. FOOTER & LOGOUT */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
          aria-label="Logout"
          {...getTooltipProps('Logout')}
        >
          <LogOut size={18} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  )
}
