import React, { useState, useEffect, useRef } from 'react'
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
  Plus
} from 'lucide-react'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  createNotification,
  getStoredUser
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

function getNotificationIcon(type) {
  switch (type) {
    case 'stock_alert':
      return <AlertTriangle size={17} />
    case 'order':
      return <ShoppingCart size={17} />
    case 'stock_request_confirmed':
      return <CheckCircle2 size={17} style={{ color: '#16a34a' }} />
    case 'stock_request':
    case 'stock_request_update':
    case 'restock':
      return <ClipboardList size={17} />
    case 'payment':
      return <CreditCard size={17} />
    case 'feedback':
      return <MessageSquare size={17} />
    default:
      return <Info size={17} />
  }
}

export default function NotificationDropdown({
  role = 'admin',
  buttonClassName = '',
  iconSize = 18,
  onNotificationSelect = null,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | 'read'
  const [loading, setLoading] = useState(false)
  const [toastNotif, setToastNotif] = useState(null)
  const dropdownRef = useRef(null)

  const user = getStoredUser()
  const effectiveRole = role || user?.role || 'admin'

  // Load notifications from API
  const fetchNotifs = async () => {
    try {
      const res = await getNotifications(effectiveRole)
      const raw = Array.isArray(res) ? res : res?.data || []
      const items = Array.isArray(raw) ? raw : raw?.data || []
      setNotifications(items)
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

  // Mark single notification as read
  const handleMarkAsRead = async (item, event) => {
    event?.stopPropagation()
    if (item.read) {
      if (onNotificationSelect) onNotificationSelect(item)
      return
    }

    // Update local state immediately
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === item.id ? { ...notif, read: true } : notif))
    )

    // Call API if not a local sample id
    if (typeof item.id === 'number' || (typeof item.id === 'string' && !item.id.startsWith('sample-'))) {
      try {
        await markNotificationRead(item.id)
      } catch (err) {
        console.warn('Failed to mark notification as read on backend:', err)
      }
    }

    if (onNotificationSelect) {
      onNotificationSelect(item)
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

  // Add sample test notification
  const handleAddTestNotif = async () => {
    const testTypes = ['stock_alert', 'order', 'payment', 'restock', 'feedback']
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)]
    const randomTitles = {
      stock_alert: 'Stock Alert: Coco Lumber 2×3×10',
      order: `New Walk-in Order #${Math.floor(1000 + Math.random() * 9000)}`,
      payment: `Payment Received (₱${Math.floor(500 + Math.random() * 4000)}.00)`,
      restock: 'Restock Request Received',
      feedback: 'New Customer Review (5 stars)',
    }

    const newNotif = {
      id: 'sample-' + Date.now(),
      title: randomTitles[randomType],
      message: `System notification generated at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      type: randomType,
      read: false,
      created_at: new Date().toISOString(),
    }

    setNotifications((prev) => [newNotif, ...prev])

    // Try saving to backend
    try {
      await createNotification({
        type: randomType,
        data: {
          title: newNotif.title,
          message: newNotif.message,
        },
      })
    } catch (err) {
      // ignore
    }
  }

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.read
    if (filter === 'read') return item.read
    return true
  })

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      {/* Real-time Floating Pop-up Toast for Staff & Admin */}
      {toastNotif && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 999999,
            background: '#ffffff',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 20px 25px -5px rgba(22, 163, 74, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            maxWidth: '380px',
            borderLeft: '5px solid #16a34a',
            animation: 'slideIn 0.3s ease-out'
          }}
          onClick={() => {
            setIsOpen(true)
            setToastNotif(null)
          }}
        >
          <div style={{ background: '#dcfce7', color: '#16a34a', padding: '8px', borderRadius: '50%', display: 'flex', flexShrink: 0, marginTop: '2px' }}>
            <CheckCircle2 size={18} />
          </div>
          <div style={{ flex: 1, cursor: 'pointer' }}>
            <h4 style={{ margin: '0 0 3px', fontSize: '13.5px', color: '#0f172a', fontWeight: 800 }}>
              {toastNotif.title}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              {toastNotif.message}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setToastNotif(null)
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex' }}
          >
            <X size={16} />
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

          {/* Notification List */}
          <div className="notification-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${!item.read ? 'unread' : 'read'}`}
                  onClick={(e) => handleMarkAsRead(item, e)}
                  title={!item.read ? 'Click to mark as read' : undefined}
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
                    </div>
                  </div>

                  {/* Unread indicator dot */}
                  {!item.read && <div className="unread-indicator-dot" />}
                </div>
              ))
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
                    : "When new orders, stock alerts, or store updates occur, they'll appear here."}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer">
            <button type="button" onClick={handleAddTestNotif}>
              + Add test alert
            </button>
            {notifications.length > 0 && (
              <button type="button" onClick={handleClearAll} style={{ color: '#94a3b8' }}>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Real-Time Floating Popup Toast Banner */}
      {toastNotif && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          background: '#17293a',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.35), 0 0 0 1px rgba(249,115,22,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '420px',
          cursor: 'pointer'
        }}
        onClick={() => {
          setToastNotif(null)
          if (window.location.pathname !== '/orders') {
            window.location.href = '/orders'
          }
        }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '20px',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
          }}>
            🛒
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <strong style={{ fontSize: '13.5px', color: '#ffb17e' }}>{toastNotif.title}</strong>
              <span style={{ fontSize: '9.5px', fontWeight: '800', background: '#f97316', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>NEW ORDER</span>
            </div>
            <p style={{ fontSize: '12px', margin: 0, color: '#e2e8f0', lineHeight: 1.35 }}>
              {toastNotif.message}
            </p>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
              Click to open Orders Management ›
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setToastNotif(null) }}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              borderRadius: '6px',
              padding: '4px',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

