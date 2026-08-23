import { staff } from '../../data/mockData'

export default function StaffManagement() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Staff management</h2>
          <p style={{ color: '#64748b', marginTop: 6 }}>Manage team roles, shift assignments, and contact details.</p>
        </div>
        <button type="button" className="btn-primary">Add staff member</button>
      </div>

      <div className="stat-card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Shift</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td style={{ fontWeight: 600 }}>{member.name}</td>
                <td>{member.role}</td>
                <td style={{ color: '#64748b' }}>{member.email}</td>
                <td>{member.shift}</td>
                <td><span className={`badge ${member.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{member.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
