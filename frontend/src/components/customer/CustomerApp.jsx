import { useState } from 'react'
import { Home, ShoppingBag, Heart, User, X } from 'lucide-react'
import { products } from '../../data/mockData'

export default function CustomerApp({ onClose }) {
  const [activeTab, setActiveTab] = useState('browse')

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 420, width: '100%', background: '#f8fafc', borderRadius: 20, paddingBottom: 60 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Customer View</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Browse products and quick order.</div>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ minWidth: 36, padding: 10 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {activeTab === 'browse' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Available products</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Shop hardware items and supplies.</div>
                </div>
              </div>
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="product-card-mobile" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{product.name}</div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>{product.category}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{product.price}</div>
                  </div>
                  <button type="button" className="btn-primary" style={{ width: '100%' }}>Buy now</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Order history</div>
              <div style={{ color: '#64748b' }}>No orders yet. Place an order to get started.</div>
            </div>
          )}

          {activeTab === 'account' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Account</div>
              <div style={{ color: '#64748b' }}>Manage your profile and shipping preferences.</div>
            </div>
          )}
        </div>

        <div className="mobile-bottom-nav">
          {[
            { id: 'browse', label: 'Browse', icon: Home },
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'wishlist', label: 'Wishlist', icon: Heart },
            { id: 'account', label: 'Account', icon: User },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-nav-item${activeTab === item.id ? ' active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
