import React, { useEffect, useState } from 'react'
import { MessageSquare, Send, RefreshCw, AlertCircle } from 'lucide-react'
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
      setLoading(true)
      setError('')
      const payload = await getAdminFeedback()
      const list = Array.isArray(payload) ? payload : (payload?.data && Array.isArray(payload.data) ? payload.data : [])
      setFeedback(list)
    } catch (err) {
      console.warn('Error loading feedback:', err)
      setError('Could not fetch feedback from server.')
      setFeedback([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
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
          Authorization: `Bearer ${token}`
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
      alert(err.message || 'Failed to save response')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <div>
          <p className="eyebrow">Customer Voice</p>
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

      {loading ? (
        <div className="loading" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading feedback...
        </div>
      ) : feedback.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <MessageSquare size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No feedback yet</p>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Customer inquiries and ratings will appear here.</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Message</th>
                <th>Type</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.subject || 'General Inquiry'}</strong></td>
                  <td style={{ maxWidth: '320px', whiteSpace: 'normal', fontSize: '13px' }}>{item.message}</td>
                  <td>
                    <span className="badge status-in">{item.type || 'General'}</span>
                  </td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setSelected(item)
                        setResponse(item.admin_response || '')
                      }}
                    >
                      <Send size={13} /> Respond
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Respond to Feedback</h2>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', margin: '12px 0 16px', border: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>{selected.subject || 'Message'}</strong>
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
