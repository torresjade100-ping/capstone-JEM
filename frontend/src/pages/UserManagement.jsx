import { useEffect, useState } from 'react'
import { API_BASE_URL, getStoredUser } from '../api'
import '../styles/management.css'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    status: 'active'
  })

  const currentUser = getStoredUser()
  const token = localStorage.getItem('jem_api_token')

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [filter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('role', filter)
      
      const response = await fetch(
        `${API_BASE_URL}/admin/users?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      const payload = data.data || []
      setUsers(Array.isArray(payload) ? payload : payload.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      alert('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Filter users by search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  )

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      alert('Name and email are required')
      return
    }

    try {
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser 
        ? `${API_BASE_URL}/admin/users/${editingUser.id}`
        : `${API_BASE_URL}/admin/users`

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingUser ? { ...formData, ...(formData.password ? { password: formData.password } : {}) } : formData)
      })

      if (!response.ok) throw new Error('Failed to save user')
      
      alert(editingUser ? 'User updated successfully' : 'User created successfully')
      setShowForm(false)
      setEditingUser(null)
      setFormData({ name: '', email: '', phone: '', password: '', role: 'customer', status: 'active' })
      fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Failed to save user')
    }
  }

  // Edit user
  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
      status: user.status
    })
    setShowForm(true)
  }

  // Change user role
  const handleChangeRole = async (userId, newRole) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${userId}/role`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: newRole })
        }
      )
      
      if (!response.ok) throw new Error('Failed to change role')
      alert('Role updated successfully')
      fetchUsers()
    } catch (error) {
      console.error('Error changing role:', error)
      alert('Failed to change role')
    }
  }

  // Archive user
  const handleArchive = async (userId) => {
    if (!confirm('Are you sure you want to archive this user?')) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${userId}/archive`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      
      if (!response.ok) throw new Error('Failed to archive user')
      alert('User archived successfully')
      fetchUsers()
    } catch (error) {
      console.error('Error archiving user:', error)
      alert('Failed to archive user')
    }
  }

  // Activate user
  const handleActivate = async (userId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${userId}/activate`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      
      if (!response.ok) throw new Error('Failed to activate user')
      alert('User activated successfully')
      fetchUsers()
    } catch (error) {
      console.error('Error activating user:', error)
      alert('Failed to activate user')
    }
  }

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: '#d32f2f',
      staff: '#1976d2',
      customer: '#388e3c'
    }
    return colors[role] || '#666'
  }

  const getStatusBadgeColor = (status) => {
    return status === 'active' ? '#4caf50' : '#ff9800'
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>User Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingUser(null)
            setFormData({ name: '', email: '', phone: '', password: '', role: 'customer', status: 'active' })
            setShowForm(true)
          }}
        >
          + Add User
        </button>
      </div>

      {/* Search and Filter */}
      <div className="management-controls">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="customer">Customer</option>
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {!editingUser && <input type="password" placeholder="Temporary password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} minLength={8} required />}
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required={!editingUser}
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="customer">Customer</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="form-actions">
                <button type="submit" className="btn btn-success">Save</button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">No users found</div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    <span 
                      className="badge"
                      style={{ backgroundColor: getRoleBadgeColor(user.role) }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ backgroundColor: getStatusBadgeColor(user.status) }}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                    <select
                      defaultValue={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="btn btn-sm btn-warning"
                      title="Change role"
                    >
                      <option value="">Change Role</option>
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="customer">Customer</option>
                    </select>
                    {user.status === 'active' ? (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleArchive(user.id)}
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleActivate(user.id)}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
