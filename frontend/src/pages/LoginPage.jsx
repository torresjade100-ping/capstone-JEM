import React, { useState } from 'react'
import { ArrowUpRight, AlertCircle } from 'lucide-react'
import { login } from '../api'
import '../styles/login.css'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@jemlumber.com')
  const [password, setPassword] = useState('Password123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (type) => {
    const demos = {
      admin: { email: 'admin@jemlumber.com', password: 'Password123!' },
      staff: { email: 'staff@jemlumber.com', password: 'Password123!' },
      customer: { email: 'customer@jemlumber.com', password: 'Password123!' }
    }
    const demo = demos[type]
    setEmail(demo.email)
    setPassword(demo.password)
    setError('')
  }

  return (
    <div className="login-container">
      <div className="login-panel">
        {/* Left side - Branding */}
        <div className="login-art">
          <div className="art-content">
            <div className="brand-logo-large">J</div>
            <p className="art-subtitle">EST. 2014 • SAN PABLO CITY</p>
            <h1>Build it right.<br /><em>Build it with JEM.</em></h1>
            <p className="art-description">Your reliable source for quality hardware, construction materials, and coco lumber.</p>
            
            <div className="art-stats">
              <Stat>
                <strong>1,248</strong>
                <span>products tracked</span>
              </Stat>
              <Stat>
                <strong>₱2.4M</strong>
                <span>inventory value</span>
              </Stat>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="login-form-section">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <div className="brand-row">
                <div className="brand-icon">J</div>
                <div>
                  <strong>JEM Hardware</strong>
                  <small>Coco Lumber & Construction Supply</small>
                </div>
              </div>
              <div className="login-heading">
                <p className="eyebrow">Operations Portal</p>
                <h2>Welcome back.</h2>
                <p>Sign in to keep the store moving.</p>
              </div>
            </div>

            {error && (
              <div className="alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked disabled={loading} />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="forgot-link">Forgot password?</a>
            </div>

            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'} <ArrowUpRight size={16} />
            </button>

            <div className="demo-section">
              <p className="demo-label">Demo accounts:</p>
              <div className="demo-buttons">
                <button type="button" className="btn-demo" onClick={() => fillDemo('admin')} disabled={loading}>
                  Admin
                </button>
                <button type="button" className="btn-demo" onClick={() => fillDemo('staff')} disabled={loading}>
                  Staff
                </button>
                <button type="button" className="btn-demo" onClick={() => fillDemo('customer')} disabled={loading}>
                  Customer
                </button>
              </div>
            </div>

            <p className="login-footer">
              Don't have an account? <a href="#signup" className="signup-link">Create one here</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function Stat({ children }) {
  return <div className="stat">{children}</div>
}
