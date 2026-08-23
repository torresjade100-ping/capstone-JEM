import { useEffect, useState } from 'react'
import { getStoredUser } from './api'
import AdminDashboard from './pages/AdminDashboard'
import StaffDashboard from './pages/StaffDashboard'
import CustomerApp from './pages/CustomerApp'
import LoginPage from './pages/LoginPage'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#666' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (user.role === 'admin') {
    return <AdminDashboard />
  }

  if (user.role === 'staff') {
    return <StaffDashboard />
  }

  if (user.role === 'customer') {
    return <CustomerApp />
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center', color: '#f44336' }}>
        <p>Unauthorized role: {user.role}</p>
        <p style={{ fontSize: '12px', color: '#888' }}>Contact administrator for access.</p>
      </div>
    </div>
  )
}
