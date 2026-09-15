import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  X,
  Clock,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  MessageSquare,
  Sparkles,
  Info,
  Plus,
  Users,
  ArrowRight,
} from 'lucide-react'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  createNotification,
  getStoredUser,
} from '../api'
import '../styles/notifications.css'

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Recently'

  const diffSeconds = Math.floor((new Date() - date) / 1000)
  if (diffSeconds < 60) return 'Just now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  if (diffSeconds < 172800) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Maps any notification to its corresponding destination URL
 */
export function getNotificationDestination(notification, role = 'admin') {
  if (!notification) return '/dashboard'

  const type = String(notification.type || '').toLowerCase()
  const title = String(notification.title || '').toLowerCase()
  const message = String(notification.message || '').toLowerCase()
  const data = notification.data || {}

  // 1. Feedback notification -> Feedback page
  if (
    type.includes('feedback') ||
    type.includes('review') ||
    type.includes('rating') ||
    title.includes('feedback') ||
    title.includes('review') ||
    title.includes('star') ||
    message.includes('feedback') ||
    message.includes('review') ||
    data.feedback_id
  ) {
    return '/feedback'
  }

  // 2. Order / POS / Delivery notification -> Orders page
  if (
    type.includes('order') ||
    type.includes('sale') ||
    type.includes('pos') ||
    type.includes('delivery') ||
    type.includes('checkout') ||
    type.includes('payment') ||
    title.includes('order') ||
    title.includes('pos') ||
    title.includes('payment') ||
    message.includes('order #') ||
    data.order_id ||
    data.order_number ||
    data.transaction_id
  ) {
    return '/orders'
  }

  // 3. Restock / Stock Requests notification -> Restock Requests page
  if (
    type.includes('restock') ||
    type.includes('stock_request') ||
    title.includes('restock') ||
    title.includes('stock request') ||
    message.includes('stock request') ||
    message.includes('restock') ||
    data.request_id ||
    data.restock_request_id
  ) {
    return '/stock-requests'
  }

  // 4. Inventory / Low Stock Alert notification
  if (
    type.includes('stock_alert') ||
    type.includes('inventory') ||
    type.includes('low_stock') ||
    type.includes('out_of_stock') ||
    title.includes('stock alert') ||
    title.includes('low stock') ||
    title.includes('out of stock')
  ) {
    return role === 'admin' ? '/inventory' : '/stock-requests'
  }

  // 5. User / Customer Management notification -> User Management page
  if (
    type.includes('user') ||
    type.includes('customer') ||
    type.includes('account') ||
    title.includes('user') ||
    title.includes('customer') ||
    message.includes('customer') ||
    message.includes('user') ||
    data.user_id
  ) {
    return role === 'admin' ? '/users' : '/dashboard'
  }

  // 6. Products notification
  if (type.includes('product') || title.includes('product')) {
    return role === 'admin' ? '/products' : '/pos'
  }

  // 7. Suppliers / Purchase Orders
  if (type.includes('supplier') || type.includes('purchase_order')) {
    return role === 'admin' ? '/suppliers' : '/dashboard'
  }

  // 8. Reports
  if (type.includes('report')) {
    return role === 'admin' ? '/reports' : '/dashboard'
  }

  return '/dashboard'
}

/**
 * Human-readable label for target destination
 */
export function getNotificationDestinationLabel(notification, role = 'admin') {
  const dest = getNotificationDestination(notification, role)
  switch (dest) {
    case '/feedback':
      return 'Feedback'
    case '/orders':
      return 'Orders'
    case '/stock-requests':
      return 'Stock Requests'
    case '/inventory':
      return 'Inventory'
    case '/users':
      return 'Users'
    case '/products':
      return 'Products'
    case '/suppliers':
      return 'Suppliers'
    case '/reports':
      return 'Reports'
    default:
      return 'Details'
  }
}

function getNotificationIcon(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('feedback') || t.includes('review') || t.includes('rating')) {
    return <MessageSquare size={17} />
  }
  if (t.includes('order') || t.includes('pos') || t.includes('sale') || t.includes('checkout')) {
    return <ShoppingCart size={17} />
  }
  if (t.includes('stock_request_confirmed')) {
    return <CheckCircle2 size={17} style={{ color: '#16a34a' }} />
  }
  if (t.includes('restock') || t.includes('stock_request')) {
    return <ClipboardList size={17} />
  }
  if (t.includes('stock_alert') || t.includes('inventory') || t.includes('low_stock') || t.includes('out_of_stock')) {
    return <AlertTriangle size={17} />
  }
  if (t.includes('user') || t.includes('customer') || t.includes('account')) {
    return <Users size={17} />
  }
  if (t.includes('payment')) {
    return <CreditCard size={17} />
  }
  return <Info size={17} />
}

export default function NotificationDropdown({
  role = 'admin',
  buttonClassName = '',
  iconSize = 18,
  onNotificationSelect = null,
}) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | 'read'
  const [loading, setLoading] = useState(false)
  const [toastNotif, setToastNotif] = useState(null)
  const dropdownRef = useRef(null)

  const user = getStoredUser()
  const effectiveRole = role || user?.role || 'admin'

  // Load notifications from API and deduplicate
  const fetchNotifs = async () => {
    try {
      const res = await getNotifications(effectiveRole)
      const raw = Array.isArray(res) ? res : res?.data || []
      const items = Array.isArray(raw) ? raw : raw?.data || []

      // Deduplicate notifications
      const seen = new Set()
      const deduped = []
      items.forEach((item) => {
        if (!item || !item.id) return
        const key = String(item.id)
        if (!seen.has(key)) {
          seen.add(key)
          deduped.push(item)
        }
      })

      setNotifications(deduped)
    } catch (err) {
      setNotifications([])
    }
  }

  useEffect(() => {
    fetchNotifs()

    // 3-second background sync for cross-window and real-time updates
    const pollInterval = setInterval(fetchNotifs, 3000)

    // Listen to custom browser events for immediate notification popups
    const handlePop = (e) => {
      const notif = e.detail
      if (notif) {
        const matchesRole = !notif.targetRole || notif.targetRole === effectiveRole || notif.targetRole === 'all'
        if (matchesRole) {
          setToastNotif(notif)
          fetchNotifs()
          setTimeout(() => {
            setToastNotif(null)
          }, 6000)
        }
      }
    }

    const handleUpdate = () => {
      fetchNotifs()
    }

    window.addEventListener('jem_notification_pop', handlePop)
    window.addEventListener('jem_notification_update', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('jem_notification_pop', handlePop)
      window.removeEventListener('jem_notification_update', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [effectiveRole])

  // Handle clicking outside to close
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const unreadCount = notifications.filter((item) => !item.read).length

  /**
   * Handle clicking ANYWHERE on a notification item:
   * 1. Marks notification as read in state & backend API
   * 2. Updates unread badge count
   * 3. Closes dropdown
   * 4. Automatically redirects to correct page based on notification type & data
   */
  const handleNotificationClick = async (item, event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    // 1. Mark as read immediately in local state
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === item.id ? { ...notif, read: true } : notif))
      )

      // Call API if real backend notification
      if (typeof item.id === 'number' || (typeof item.id === 'string' && !item.id.startsWith('sample-'))) {
        try {
          await markNotificationRead(item.id)
        } catch (err) {
          console.warn('Failed to mark notification as read on backend:', err)
        }
      }
    }

    // 2. Close the dropdown
    setIsOpen(false)

    // 3. Optional callback
    if (onNotificationSelect) {
      onNotificationSelect(item)
    }

    // 4. Resolve destination and navigate
    const destination = getNotificationDestination(item, effectiveRole)
    if (destination) {
      navigate(destination)
    }
  }

  // Mark all as read
  const handleMarkAllRead = async (event) => {
    event?.stopPropagation()
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))

    try {
      await markAllNotificationsRead()
    } catch (err) {
      console.warn('Failed to mark all as read on backend:', err)
    }
  }

  // Clear all notifications
  const handleClearAll = async (event) => {
    event?.stopPropagation()
    setNotifications([])

    try {
      await clearAllNotifications()
    } catch (err) {
      console.warn('Failed to clear notifications on backend:', err)
    }
  }

  // Add sample test notification with instant dispatch for specific test scenarios
  const handleAddTestNotif = async (chosenType = null) => {
    const testTypes = ['feedback', 'order', 'restock', 'user']
    const type = chosenType || testTypes[Math.floor(Math.random() * testTypes.length)]

    const sampleMap = {
      feedback: {
        title: '⭐ New Customer Feedback (5 Stars)',
        message: 'Contractor Juan Dela Cruz submitted a 5-star review for Order #JEM-2026-1001: "Fast delivery to site!"',
        data: { feedback_id: 1, order_number: 'JEM-2026-1001', rating: 5 },
      },
      order: {
        title: `🛒 New Customer Order #JEM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        message: `Order totaling ₱${Math.floor(2500 + Math.random() * 6000).toLocaleString()}.00 placed via GCash.`,
        data: { order_id: 1, order_number: `JEM-2026-${Date.now().toString().slice(-4)}`, total: 3500 },
      },
      restock: {
        title: '📦 New Restock Request: Coco Lumber 2×3×10',
        message: 'Staff submitted a restock request for Coco Lumber (50 units). Awaiting approval.',
        data: { request_id: 1, product_id: 1, quantity: 50 },
      },
      user: {
        title: '👤 New Customer Registered',
        message: 'New contractor account created: Engr. Miguel Santos (miguel@sitebuilders.ph).',
        data: { user_id: 2, user_name: 'Engr. Miguel Santos', role: 'customer' },
      },
    }

    const payload = sampleMap[type] || sampleMap.feedback

    const newNotif = {
      id: 'sample-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: payload.title,
      message: payload.message,
      type: type,
      data: payload.data,
      read: false,
      created_at: new Date().toISOString(),
    }

    // Prepend to current list without duplicates
    setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)])

    // Try saving to backend database
    try {
      await createNotification({
        type: type,
        title: newNotif.title,
        message: newNotif.message,
        data: newNotif.data,
      })
    } catch (err) {}
  }

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.read
    if (filter === 'read') return item.read
    return true
  })

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      {/* Real-time Floating Pop-up Toast for Staff & Admin with One-Click Navigation */}
      {toastNotif && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 999999,
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 20px 25px -5px rgba(249, 115, 22, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            maxWidth: '380px',
            borderLeft: '5px solid #f97316',
            animation: 'slideIn 0.3s ease-out',
            cursor: 'pointer',
          }}
          onClick={(e) => handleNotificationClick(toastNotif, e)}
          title={`Click to open ${getNotificationDestinationLabel(toastNotif, effectiveRole)}`}
        >
          <div style={{ background: '#ffedd5', color: '#ea580c', padding: '8px', borderRadius: '50%', display: 'flex', flexShrink: 0, marginTop: '2px' }}>
            {getNotificationIcon(toastNotif.type)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>
                {toastNotif.title}
              </h4>
              <span style={{ fontSize: '9px', fontWeight: 800, background: '#ea580c', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                {getNotificationDestinationLabel(toastNotif, effectiveRole).toUpperCase()}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
              {toastNotif.message}
            </p>
            <span style={{ fontSize: '10.5px', color: '#ea580c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
              Click to view page <ArrowRight size={11} />
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setToastNotif(null)
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`notification-trigger ${buttonClassName} ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell size={iconSize} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-header">
            <div className="notification-title-area">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="unread-pill">{unreadCount} new</span>
              )}
            </div>

            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="action-text-btn"
                  onClick={handleMarkAllRead}
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notification-filters">
            <button
              type="button"
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Notification List: Entire item is clickable with automatic redirection */}
          <div className="notification-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((item) => {
                const destLabel = getNotificationDestinationLabel(item, effectiveRole)
                return (
                  <div
                    key={item.id}
                    className={`notification-item ${!item.read ? 'unread' : 'read'}`}
                    onClick={(e) => handleNotificationClick(item, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleNotificationClick(item, e)
                      }
                    }}
                    title={`Click to open ${destLabel}`}
                  >
                    {/* Category icon */}
                    <div className={`notif-icon-wrap ${item.type || 'system'}`}>
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="notif-content">
                      <div className="notif-header-row">
                        <h5 className="notif-title">{item.title}</h5>
                        {!item.read && <span className="notif-status-badge new">NEW</span>}
                      </div>
                      <p className="notif-message">{item.message}</p>
                      <div className="notif-footer-row">
                        <span className="notif-time">
                          <Clock size={11} /> {formatRelativeTime(item.created_at)}
                        </span>
                        <span className="notif-destination-pill">
                          {destLabel} <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>

                    {/* Unread indicator dot */}
                    {!item.read && <div className="unread-indicator-dot" />}
                  </div>
                )
              })
            ) : (
              <div className="notification-empty">
                <div className="empty-icon-circle">
                  <BellOff size={24} />
                </div>
                <h4>
                  {filter === 'unread'
                    ? 'No unread notifications'
                    : 'No notifications yet'}
                </h4>
                <p>
                  {filter === 'unread'
                    ? "You're all caught up! There are no unread alerts at the moment."
                    : "When new orders, stock alerts, or feedback occur, they'll appear here."}
                </p>
              </div>
            )}
          </div>

          {/* Footer with quick test buttons for all 4 notification types */}
          <div className="notification-footer">
            <div className="test-alert-pills">
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Test Alert:</span>
              <button
                type="button"
                className="test-pill"
                onClick={() => handleAddTestNotif('feedback')}
                title="Add Test Feedback Notification (Opens /feedback)"
              >
                💬 Feedback
              </button>
              <button
                type="button"
                className="test-pill"
                onClick={() => handleAddTestNotif('order')}
                title="Add Test Order Notification (Opens /orders)"
              >
                🛒 Order
              </button>
              <button
                type="button"
                className="test-pill"
                onClick={() => handleAddTestNotif('restock')}
                title="Add Test Restock Notification (Opens /stock-requests)"
              >
                📦 Restock
              </button>
              <button
                type="button"
                className="test-pill"
                onClick={() => handleAddTestNotif('user')}
                title="Add Test User Notification (Opens /users)"
              >
                👤 User
              </button>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                className="clear-btn"
                onClick={handleClearAll}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

