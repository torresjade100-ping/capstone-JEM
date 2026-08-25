import CustomerApp from '../../pages/CustomerApp'

export default function CustomerModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.85)', overflowY: 'auto' }}>
      <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 99999 }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              padding: '8px 16px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            ✕ Close Preview
          </button>
        )}
      </div>
      <CustomerApp />
    </div>
  )
}
