import React, { useEffect, useState } from 'react'
import { MessageSquare, Send, RefreshCw, AlertCircle, Star } from 'lucide-react'
import { API_BASE_URL, getAdminFeedback } from '../api'
import '../styles/management.css'

export default function FeedbackManagement() {
  const [feedback, setFeedback] = useState([])
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const token = localStorage.getItem('jem_api_token')

  const load = async () => {
    try {
      setError('')
      const payload = await getAdminFeedback()
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : []

      const localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('jem_shared_feedbacks') : null
      const localFeedbacks = localRaw ? JSON.parse(localRaw) : []
      const combined = [...localFeedbacks, ...list]
      const uniqueMap = new Map()
      combined.forEach((item) => {
        if (item && item.id) uniqueMap.set(item.id, item)
      })
      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )

      setFeedback(sorted.length > 0 ? sorted : list)
    } catch (err) {
      console.warn('Error loading feedback:', err)
      const localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('jem_shared_feedbacks') : null
      const localFeedbacks = localRaw ? JSON.parse(localRaw) : []
      setFeedback(localFeedbacks)

    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    // 3-second live polling for new customer reviews from mobile
    const timer = setInterval(() => {
      load()
    }, 3000)

    const handleEvent = () => load()
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('jem_notification_update', handleEvent)
      window.addEventListener('jem_orders_update', handleEvent)
    }

    return () => {
      clearInterval(timer)
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('jem_notification_update', handleEvent)
        window.removeEventListener('jem_orders_update', handleEvent)
      }
    }
  }, [])

  const respond = async (event) => {
    event.preventDefault()
    if (!selected || !response.trim()) return
    setSaving(true)
    try {
      const result = await fetch(`${API_BASE_URL}/admin/feedback/${selected.id}/respond`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          admin_response: response,
          status: 'responded'
        })
      })
      if (!result.ok) throw new Error('Unable to save response')
      setSelected(null)
      setResponse('')
      await load()
    } catch (err) {
      alert(err.message || 'Response recorded locally!')
      setSelected(null)
      setResponse('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <div>
          <p className="eyebrow">Customer Voice &amp; Delivery Reviews</p>
          <h1>Customer Feedback</h1>
        </div>
        <button className="btn btn-secondary" onClick={load} title="Refresh feedback">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading && feedback.length === 0 ? (
        <div className="loading" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading customer feedback...
        </div>
      ) : feedback.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <MessageSquare size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No customer feedback yet</p>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Reviews and ratings from the mobile app will automatically appear here in real time.</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Customer / Order</th>
                <th>Subject &amp; Rating</th>
                <th>Feedback Message</th>
                <th>Type</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => {
                const customerName = item.customer_name || item.customer?.user?.name || item.customer?.name || 'Customer'
                const rating = Number(item.rating || 5)
                const isReview = item.type === 'delivery_service_review' || !!item.rating

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{customerName}</strong>
                      {item.order_number && (
                        <div style={{ fontSize: '11.5px', color: '#ea580c', fontWeight: '700' }}>
                          #{item.order_number}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>
                        {item.subject || 'Delivery Review'}
                      </strong>
                      {isReview && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i < rating ? '#f59e0b' : '#e2e8f0'}
                              color={i < rating ? '#f59e0b' : '#cbd5e1'}
                            />
                          ))}
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', marginLeft: '4px' }}>
                            {rating}.0
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: '320px', whiteSpace: 'normal', fontSize: '13px', color: '#334155' }}>
                      {item.message}
                      {item.admin_response && (
                        <div style={{ marginTop: '6px', padding: '6px 10px', background: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #16a34a', fontSize: '12px', color: '#166534' }}>
                          <strong>Store Response:</strong> {item.admin_response}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${isReview ? 'status-delivered' : 'status-in'}`}>
                        {isReview ? '⭐ Review' : (item.type || 'General')}
                      </span>
                    </td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelected(item)
                          setResponse(item.admin_response || '')
                        }}
                      >
                        <Send size={13} /> {item.admin_response ? 'Edit Reply' : 'Respond'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Respond to Customer Feedback</h2>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', margin: '12px 0 16px', border: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px', color: '#0f172a' }}>
                {selected.subject || 'Feedback Message'}
              </strong>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>{selected.message}</p>
            </div>
            <form onSubmit={respond}>
              <textarea
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                placeholder="Write your response to the customer..."
                rows="4"
                required
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Send Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
