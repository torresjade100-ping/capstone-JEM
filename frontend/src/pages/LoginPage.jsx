import React, { useState } from 'react'
import { ArrowUpRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { login } from '../api'
import ThemeToggle from '../components/ThemeToggle'
import '../styles/login.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 100 }}>
        <ThemeToggle variant="pill" />
      </div>

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
            </div>

            {error && (
              <div className="alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>Email or Username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder=""
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder=""
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
