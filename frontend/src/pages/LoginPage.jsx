import React, { useState } from 'react'
import { ArrowUpRight, AlertCircle, Smartphone, ArrowRight } from 'lucide-react'
import { login } from '../api'
import '../styles/login.css'

export default function LoginPage({ onLaunchMobilePreview }) {
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

            {/* Quick Demo Fill Buttons */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              padding: '10px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => {
                  setEmail('staff@jemlumber.com')
                  setPassword('Password123!')
                  setError('')
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                👷 Fill Staff Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@jemlumber.com')
                  setPassword('Password123!')
                  setError('')
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                🛡️ Fill Admin Account
              </button>
            </div>

            <button className="btn-login" type="submit" disabled={loading} style={{ background: '#f97316', color: '#fff' }}>
              {loading ? 'Signing in...' : 'Sign in to Dashboard'} <ArrowUpRight size={16} />
            </button>



            {/* Customer Mobile App Notice */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 8px' }}>
                Customer ordering is exclusively on the JEM Mobile Application.
              </p>
              {onLaunchMobilePreview && (
                <button
                  type="button"
                  onClick={onLaunchMobilePreview}
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Smartphone size={14} /> Launch JEM Customer Mobile App <ArrowRight size={13} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
