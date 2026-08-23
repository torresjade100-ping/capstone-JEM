import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { ShoppingCart, DollarSign, Layers, TrendingUp, AlertTriangle } from 'lucide-react'
import { orders, salesByChannel, orderStatusShare, topSellingProducts, products } from '../../data/mockData'

const kpiCards = [
  { title: 'Total Sales', value: '₱142.8K', icon: DollarSign, color: '#f97316' },
  { title: 'Orders', value: '1,248', icon: ShoppingCart, color: '#0f2744' },
  { title: 'Stock Value', value: '₱86.3K', icon: Layers, color: '#2563eb' },
  { title: 'Growth', value: '+18.2%', icon: TrendingUp, color: '#059669' },
]

const statusColors = ['#f97316', '#38bdf8', '#84cc16', '#6366f1', '#ef4444']

export default function Dashboard() {
  const lowStockCount = products.filter((item) => item.stock <= 20).length

  return (
    <div style={{ padding: 24, display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div className="stat-card" key={card.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{card.title}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{card.value}</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 16, background: `${card.color}20`, display: 'grid', placeItems: 'center' }}>
                <Icon size={22} color={card.color} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <div className="stat-card" style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Weekly sales by channel</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Online versus cash sales for the current week.</div>
            </div>
            <div className="badge badge-green">Healthy mix</div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={salesByChannel} margin={{ top: 0, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="online" fill="#0f2744" radius={[10, 10, 0, 0]} />
                <Bar dataKey="cash" fill="#f97316" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Order status breakdown</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Status distribution from the last 30 days.</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={orderStatusShare} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={4}>
                    {orderStatusShare.map((entry, index) => (
                      <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              {orderStatusShare.map((item, index) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: statusColors[index % statusColors.length], display: 'inline-block' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.value}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-card" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 14, background: '#fee2e2', color: '#b91c1c' }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Low stock alert</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Items that need restocking this week.</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                <span>Products below reorder threshold</span>
                <strong>{lowStockCount}</strong>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {products.filter((item) => item.stock <= 20).slice(0, 3).map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: '#f8fafc' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{item.category}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#dc2626' }}>{item.stock}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr', gap: 20 }}>
        <div className="stat-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Recent orders</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Latest sales and fulfillment status.</div>
            </div>
          </div>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>{order.id}</td>
                  <td>{order.customer}</td>
                  <td><span className={`badge ${order.status === 'Delivered' ? 'badge-green' : order.status === 'Processing' ? 'badge-yellow' : order.status === 'Cancelled' ? 'badge-red' : 'badge-orange'}`}>{order.status}</span></td>
                  <td>{order.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stat-card" style={{ display: 'grid', gap: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Top selling products</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Best-selling inventory across the store.</div>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {topSellingProducts.map((item) => (
              <div key={item.name} style={{ display: 'grid', gap: 6, padding: '14px 16px', borderRadius: 16, background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{item.revenue}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{item.sold} units sold</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
