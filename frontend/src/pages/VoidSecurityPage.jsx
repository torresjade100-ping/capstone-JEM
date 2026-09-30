import React, { useState, useEffect } from 'react'
import {
  ShieldAlert, ShieldCheck, KeyRound, Lock, CheckCircle2,
  AlertTriangle, RefreshCw, Check, ArrowRight, Eye, EyeOff
} from 'lucide-react'
import {
  getVoidSecurityStatus,
  setupVoidPin,
  changeVoidPin,
  getStoredUser
} from '../api'
import '../styles/void-security.css'

export default function VoidSecurityPage() {
  const currentUser = getStoredUser()
  const isAdmin = currentUser?.role === 'admin'

  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)
  const [configuredAt, setConfiguredAt] = useState(null)

  // Setup Form State (Initial PIN)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [setupSubmitting, setSetupSubmitting] = useState(false)

  // Change Form State (Existing PIN)
  const [currentPin, setCurrentPin] = useState('')
  const [changeNewPin, setChangeNewPin] = useState('')
  const [changeConfirmPin, setChangeConfirmPin] = useState('')
  const [changeSubmitting, setChangeSubmitting] = useState(false)

  // UI / Feedback
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [noticeMsg, setNoticeMsg] = useState('')

  const fetchStatus = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await getVoidSecurityStatus()
      if (res && res.success) {
        setIsConfigured(Boolean(res.data?.configured))
        setConfiguredAt(res.data?.configured_at)
      } else {
        throw new Error(res?.message || 'Unable to retrieve status')
      }
    } catch (err) {
      console.error('Void security status error:', err)
      setErrorMsg(err.message || 'Failed to check Void PIN security status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    try {
      const params = new URLSearchParams(window.location.search)
      const vId = params.get('voidId')
      if (vId) {
        setNoticeMsg(`Void Audit Record #${vId} located. Supervisor Void Security PIN is active for auditing and authorizing cancellations.`)
      }
    } catch (e) {}
  }, [])

  // Handle Initial PIN Setup
  const handleSetupPin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!/^\d{6}$/.test(newPin)) {
      setErrorMsg('Void PIN must be exactly 6 digits (numbers only, no spaces or letters).')
      return
    }

    if (newPin !== confirmPin) {
      setErrorMsg('New PIN and confirmation PIN do not match.')
      return
    }

    setSetupSubmitting(true)
    try {
      const res = await setupVoidPin(newPin, confirmPin)
      if (res && res.success) {
        setSuccessMsg('Void PIN successfully configured.')
        setNewPin('')
        setConfirmPin('')
        fetchStatus()
      } else {
        throw new Error(res?.message || 'Failed to configure Void PIN.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to setup Void PIN.')
    } finally {
      setSetupSubmitting(false)
    }
  }

  // Handle PIN Change
  const handleChangePin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!/^\d{6}$/.test(currentPin)) {
      setErrorMsg('Current Void PIN must be exactly 6 digits.')
      return
    }

    if (!/^\d{6}$/.test(changeNewPin)) {
      setErrorMsg('New Void PIN must be exactly 6 digits (numbers only).')
      return
    }

    if (changeNewPin !== changeConfirmPin) {
      setErrorMsg('New PIN and confirmation PIN do not match.')
      return
    }

    setChangeSubmitting(true)
    try {
      const res = await changeVoidPin(currentPin, changeNewPin, changeConfirmPin)
      if (res && res.success) {
        setSuccessMsg('Void PIN successfully updated. The old PIN is now deactivated.')
        setCurrentPin('')
        setChangeNewPin('')
        setChangeConfirmPin('')
        fetchStatus()
      } else {
        throw new Error(res?.message || 'Failed to change Void PIN.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change Void PIN.')
    } finally {
      setChangeSubmitting(false)
    }
  }

  // Security guard for non-admins
  if (!isAdmin) {
    return (
      <div className="void-sec-unauthorized">
        <ShieldAlert size={48} className="void-sec-warn-icon" />
        <h2>Access Restricted</h2>
        <p>Void PIN settings are strictly reserved for System Administrators.</p>
      </div>
    )
  }

  return (
    <div className="void-sec-page-container">
      {/* Header */}
      <div className="void-sec-header">
        <div className="void-sec-header-title">
          <KeyRound size={26} className="void-sec-icon-accent" />
          <div>
            <h1>Void Security Settings</h1>
            <p>Configure and manage the 6-digit administrative authorization PIN required for all transaction voids.</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {noticeMsg && (
        <div className="void-sec-alert success" style={{ background: 'rgba(59, 130, 246, 0.12)', borderColor: '#3b82f6', color: '#60a5fa' }}>
          <ShieldCheck size={18} />
          <span>{noticeMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="void-sec-alert success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="void-sec-alert error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="void-sec-loading-card">
          <RefreshCw size={24} className="void-sec-spin" />
          <p>Verifying secure PIN settings...</p>
        </div>
      ) : (
        <div className="void-sec-content-grid">
          {/* Status Overview Card */}
          <div className="void-sec-status-card">
            <div className="void-sec-card-header">
              <ShieldCheck size={20} className="void-sec-icon-shield" />
              <h3>VOID PIN STATUS</h3>
            </div>
            <div className="void-sec-status-body">
              <div className="void-sec-status-badge-wrap">
                <span className={`void-sec-status-pill ${isConfigured ? 'configured' : 'unconfigured'}`}>
                  <span className="void-sec-status-dot"></span>
                  {isConfigured ? 'Void PIN configured' : 'Void PIN has not been configured.'}
                </span>
              </div>

              <div className="void-sec-security-notice">
                <h4>Security Guidelines</h4>
                <ul>
                  <li>PIN must contain <strong>exactly 6 digits</strong> (numbers 0-9 only).</li>
                  <li>No letters, spaces, or special symbols are accepted.</li>
                  <li>The Void PIN is stored as a <strong>one-way bcrypt cryptographic hash</strong> and is never exposed in plain text.</li>
                  <li>Staff cashiers cannot view, change, or reset this PIN, but must request and enter it to authorize transaction cancellations.</li>
                </ul>
              </div>

              {configuredAt && (
                <div className="void-sec-meta-date">
                  <span>Last configured: <strong>{new Date(configuredAt).toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Form Action Card */}
          <div className="void-sec-form-card">
            {!isConfigured ? (
              /* Case 1: Initial Setup */
              <div className="void-sec-form-wrapper">
                <div className="void-sec-card-header">
                  <Lock size={20} />
                  <h3>CREATE INITIAL VOID PIN</h3>
                </div>
                <p className="void-sec-form-desc">
                  No Void PIN currently exists. Set up the 6-digit PIN to enable void operations across store terminals.
                </p>

                <form onSubmit={handleSetupPin} className="void-sec-form">
                  <div className="void-sec-input-group">
                    <label htmlFor="setup-new-pin">New 6-Digit Void PIN</label>
                    <input
                      id="setup-new-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="void-sec-pin-input"
                    />
                  </div>

                  <div className="void-sec-input-group">
                    <label htmlFor="setup-confirm-pin">Confirm New 6-Digit Void PIN</label>
                    <input
                      id="setup-confirm-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={confirmPin}
                      onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="void-sec-pin-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="void-sec-submit-btn"
                    disabled={setupSubmitting || newPin.length !== 6 || confirmPin.length !== 6}
                  >
                    {setupSubmitting ? (
                      <>
                        <RefreshCw size={16} className="void-sec-spin" />
                        Configuring PIN...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Create Void PIN
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Case 2: Change Existing PIN */
              <div className="void-sec-form-wrapper">
                <div className="void-sec-card-header">
                  <KeyRound size={20} />
                  <h3>CHANGE VOID PIN</h3>
                </div>
                <p className="void-sec-form-desc">
                  Enter the current 6-digit Void PIN to authorize and save a new PIN.
                </p>

                <form onSubmit={handleChangePin} className="void-sec-form">
                  <div className="void-sec-input-group">
                    <label htmlFor="change-current-pin">Current Void PIN</label>
                    <input
                      id="change-current-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={currentPin}
                      onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="void-sec-pin-input"
                    />
                  </div>

                  <div className="void-sec-input-group">
                    <label htmlFor="change-new-pin">New 6-Digit Void PIN</label>
                    <input
                      id="change-new-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={changeNewPin}
                      onChange={e => setChangeNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="void-sec-pin-input"
                    />
                  </div>

                  <div className="void-sec-input-group">
                    <label htmlFor="change-confirm-pin">Confirm New 6-Digit Void PIN</label>
                    <input
                      id="change-confirm-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={changeConfirmPin}
                      onChange={e => setChangeConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="void-sec-pin-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="void-sec-submit-btn"
                    disabled={changeSubmitting || currentPin.length !== 6 || changeNewPin.length !== 6 || changeConfirmPin.length !== 6}
                  >
                    {changeSubmitting ? (
                      <>
                        <RefreshCw size={16} className="void-sec-spin" />
                        Updating Void PIN...
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        Change Void PIN
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
