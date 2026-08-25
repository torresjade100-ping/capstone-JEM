import React, { useEffect, useState, lazy, Suspense } from 'react'
import { getStoredUser, logout } from './api'
import LoginPage from './pages/LoginPage'
import LogoutConfirmationModal from './components/LogoutConfirmationModal'
import PageSkeletonLoader from './components/PageSkeletonLoader'
import { Smartphone, LogOut, ShieldAlert, Building, ArrowRight, ExternalLink } from 'lucide-react'
import './App.css'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'))
const CustomerApp = lazy(() => import('./pages/CustomerApp'))

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }
    setLoading(false)
  }, [])

  const handleConfirmLogout = async () => {
    try {
      setLogoutLoading(true)
      await logout()
      setUser(null)
      window.location.reload()
    } catch (error) {
      console.error('Logout error:', error)
      setUser(null)
      window.location.reload()
    } finally {
      setLogoutLoading(false)
      setShowLogoutModal(false)
    }
  }

  if (loading) {
    return <PageSkeletonLoader rows={8} />
  }

  // 1. Unauthenticated -> Web Operations Login Page
  if (!user) {
    return (
      <Suspense fallback={<PageSkeletonLoader rows={4} />}>
        <LoginPage onLaunchMobilePreview={() => setShowMobilePreview(true)} />
      </Suspense>
    )
  }

  // 2. Admin Role -> Admin Web Dashboard
  if (user.role === 'admin') {
    return (
      <Suspense fallback={<PageSkeletonLoader rows={8} />}>
        <AdminDashboard />
      </Suspense>
    )
  }

  // 3. Staff Role -> Staff Web Dashboard
  if (user.role === 'staff') {
    return (
      <Suspense fallback={<PageSkeletonLoader rows={8} />}>
        <StaffDashboard />
      </Suspense>
    )
  }


  // 4. Customer Role -> Dedicated Notice separating Web App from Customer Mobile App
  if (user.role === 'customer') {
    if (showMobilePreview) {
      return (
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'fixed',
            top: 14,
            left: 20,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            padding: '8px 16px',
            borderRadius: '9999px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontSize: '12.5px'
          }}>
            <span>📱 <strong>Customer Mobile App Simulator</strong></span>
            <button
              onClick={() => setShowMobilePreview(false)}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Exit to Portal
            </button>
          </div>
          <CustomerApp />
        </div>
      )
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          maxWidth: '540px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#fff7ed',
            color: '#ea580c',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 18px',
            border: '1.5px solid #fed7aa'
          }}>
            <Smartphone size={32} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#eff6ff',
            color: '#1d4ed8',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '12px'
          }}>
            <Building size={13} /> Customer Account Detected
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px' }}>
            Please Use the Customer Mobile App
          </h2>

          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px' }}>
            The Web Portal is reserved exclusively for <strong>Store Administrators</strong> and <strong>Operations Staff</strong>.
            As a valued JEM customer, you can browse over 5,000+ construction materials and place online orders through the <strong>JEM Mobile Application</strong>.
          </p>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#475569'
          }}>
            <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              🏗️ Customer Mobile Features:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Browse real-time hardware stock &amp; bulk pricing</li>
              <li>Add to cart &amp; checkout via GCash, Maya, or COD</li>
              <li>Real-time visual order tracking with driver details</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowMobilePreview(true)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: '#f97316',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
              }}
            >
              <Smartphone size={18} /> Launch Customer Mobile App <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={15} /> Switch to Staff / Admin Account
            </button>
          </div>
        </div>

        <LogoutConfirmationModal
          isOpen={showLogoutModal}
          onConfirm={handleConfirmLogout}
          onCancel={() => setShowLogoutModal(false)}
          loading={logoutLoading}
          title="Sign Out"
          message="Are you sure you want to log out?"
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center', color: '#f44336' }}>
        <p>Unauthorized role: {user.role}</p>
        <button onClick={() => setShowLogoutModal(true)} style={{ marginTop: '10px', padding: '8px 16px' }}>Sign Out</button>
      </div>
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
        loading={logoutLoading}
        title="Sign Out"
        message="Are you sure you want to log out?"
      />
    </div>
  )
}

