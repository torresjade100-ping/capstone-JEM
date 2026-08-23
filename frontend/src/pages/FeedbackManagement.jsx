import { useEffect, useState } from 'react'
import { MessageSquare, Send, Star } from 'lucide-react'
import { API_BASE_URL, getAdminFeedback } from '../api'
import '../styles/management.css'

export default function FeedbackManagement() {
  const [feedback, setFeedback] = useState([])
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const token = localStorage.getItem('jem_api_token')

  const load = async () => {
    try {
      const payload = await getAdminFeedback()
      setFeedback(Array.isArray(payload) ? payload : payload?.data || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load().catch(() => setFeedback([])) }, [])

  const respond = async (event) => {
    event.preventDefault()
    if (!selected || !response.trim()) return
    setSaving(true)
    try {
      const result = await fetch(`${API_BASE_URL}/admin/feedback/${selected.id}/respond`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ admin_response: response, status: 'responded' }) })
      if (!result.ok) throw new Error('Unable to save response')
      setSelected(null); setResponse(''); await load()
    } catch (error) { window.alert(error.message) } finally { setSaving(false) }
  }

  return <div className="management-container"><div className="management-header"><div><p className="eyebrow">Customer voice</p><h1>Customer Feedback</h1></div></div>{loading ? <div className="loading">Loading feedback...</div> : feedback.length === 0 ? <div className="empty-state"><MessageSquare size={28} /><p>No feedback yet</p></div> : <div className="table-responsive"><table className="management-table"><thead><tr><th>Subject</th><th>Message</th><th>Type</th><th>Date</th><th>Action</th></tr></thead><tbody>{feedback.map((item) => <tr key={item.id}><td><strong>{item.subject || 'Feedback'}</strong></td><td>{item.message}</td><td><span className="badge status-in">{item.type || 'General'}</span></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td><button className="btn btn-primary btn-sm" onClick={() => { setSelected(item); setResponse(item.admin_response || '') }}><Send size={14} /> Respond</button></td></tr>)}</tbody></table></div>}{selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal-content" onClick={(event) => event.stopPropagation()}><h2>Respond to feedback</h2><p>{selected.message}</p><form onSubmit={respond}><textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Write a response" required /><div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save response'}</button><button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button></div></form></div></div>}</div>
}
