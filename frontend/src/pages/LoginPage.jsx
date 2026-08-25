import React, { useState } from 'react'
import { ArrowUpRight, AlertCircle } from 'lucide-react'
import { login } from '../api'
import '../styles/login.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password, remember: rememberMe })
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg-blur" />
      <div className="login-bg-overlay" />

      <div className="login-panel">
        {/* Left side - Branding */}
        <div className="login-art">
          <div className="art-content">
            <div className="brand-logo-large">J</div>
            <h1>Build it right.<br /><em>Build it with JEM.</em></h1>
            <p className="art-description">
              Internal Operations Portal for JEM Hardware, Coco Lumber &amp; Construction Supply.
            </p>
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
                  <small>Coco Lumber &amp; Construction Supply</small>
                </div>
              </div>
              <div className="login-heading">
                <p className="eyebrow" style={{ color: '#f97316', fontWeight: '800' }}>Internal Operations Portal</p>
                <h2>Staff &amp; Admin Sign In</h2>
                <p>Access inventory management, POS, and customer mobile orders.</p>
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
                placeholder="Enter your email"
                required
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
                required
                disabled={loading}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
            </div>

            <button className="btn-login" type="submit" disabled={loading} style={{ background: '#f97316', color: '#fff' }}>
              {loading ? 'Signing in...' : 'Sign in to Dashboard'} <ArrowUpRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
