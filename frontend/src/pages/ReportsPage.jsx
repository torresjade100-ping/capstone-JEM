import { useEffect, useState, useMemo } from 'react'
import { FileText, Download, ShoppingBag, Clock, Tag, RefreshCw, Layers, CheckCircle2 } from 'lucide-react'
import { API_BASE_URL, getSharedOrders } from '../api'
import { exportReportToPDF, exportReportToCSV } from '../utils/exportReports'
import '../styles/management.css'

export default function ReportsPage() {
  const [reportType, setReportType] = useState('daily')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const token = localStorage.getItem('jem_api_token')

  const fetchReport = async (type, params = {}) => {
    try {
      setLoading(true)
      
      let url = `${API_BASE_URL}/admin/reports/${type}`
      const queryParams = new URLSearchParams()
      
      Object.keys(params).forEach(key => {
        if (params[key]) queryParams.append(key, params[key])
      })
      
      if (queryParams.toString()) url += `?${queryParams.toString()}`

      let data = null
      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const res = await response.json()
          data = res.data || res
        }
      } catch (err) {
        console.warn('Backend report fetch error, compiling from shared store:', err)
      }

      // Merge / enrich with shared orders (including walk-in POS transactions)
      const shared = getSharedOrders()
      const enriched = mergeReportWithShared(type, data, shared, params)
      setReportData(enriched)
    } catch (error) {
      console.warn('Error compiling report:', error)
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  // Merges backend data and local shared store for real-time instantaneous reporting
  const mergeReportWithShared = (type, backendData, sharedOrders, params) => {
    if (type === 'daily') {
      const targetDate = params.date || selectedDate
      const dayOrders = sharedOrders.filter(ord => {
        if (!ord?.created_at) return true
        const d = new Date(ord.created_at).toISOString().split('T')[0]
        return d === targetDate
      })

      // If backend gave complete orders list, check if any shared POS orders are missing
      const existingOrders = backendData?.orders || []
      const orderNumberSet = new Set(existingOrders.map(o => String(o.order_number || o.id)))

      const mergedOrders = [...existingOrders]

      dayOrders.forEach(sharedOrd => {
        const num = String(sharedOrd.order_number || sharedOrd.id)
        if (!orderNumberSet.has(num)) {
          mergedOrders.push({
            id: sharedOrd.id,
            order_number: sharedOrd.order_number || `POS-${sharedOrd.id}`,
            type: sharedOrd.order_source || 'Walk-In POS',
            customer_name: sharedOrd.customer_name || 'Walk-in Customer',
            total: Number(sharedOrd.total || 0),
            payment_method: sharedOrd.payment_method === 'cod' ? 'Cash' : (sharedOrd.payment_method || 'Cash'),
            status: sharedOrd.status || 'completed',
            created_at: sharedOrd.created_at || new Date().toISOString(),
            time: sharedOrd.created_at ? new Date(sharedOrd.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            items: (sharedOrd.items || []).map(i => ({
              product_id: i.product_id || i.id,
              name: i.name || i.product_name || 'Product',
              quantity: Number(i.quantity || 1),
              unit_price: Number(i.unit_price || i.price || 0),
              total: Number(i.total || ((i.unit_price || i.price || 0) * (i.quantity || 1)))
            }))
          })
        }
      })

      // Sort newest first
      mergedOrders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

      const totalSales = mergedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
      const totalOrders = mergedOrders.length
      const totalItems = mergedOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0), 0)

      // Payment methods breakdown
      const paymentMethods = {}
      mergedOrders.forEach(o => {
        let m = String(o.payment_method || 'Cash').toLowerCase()
        if (m === 'cod') m = 'cash'
        if (!paymentMethods[m]) {
          paymentMethods[m] = { count: 0, total: 0 }
        }
        paymentMethods[m].count++
        paymentMethods[m].total += Number(o.total || 0)
      })

      // Top products sold
      const prodMap = {}
      const itemizedSales = []
      mergedOrders.forEach(o => {
        const timeStr = o.time || (o.created_at ? new Date(o.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '')
        ;(o.items || []).forEach(it => {
          const pName = it.name || 'Product'
          const qty = Number(it.quantity || 1)
          const sub = Number(it.total || (qty * (it.unit_price || 0)))

          if (!prodMap[pName]) {
            prodMap[pName] = { name: pName, quantity: 0, revenue: 0 }
          }
          prodMap[pName].quantity += qty
          prodMap[pName].revenue += sub

          itemizedSales.push({
            time: timeStr,
            order_number: o.order_number,
            source: o.type || (String(o.order_number).startsWith('POS') ? 'Walk-In POS' : 'Online Order'),
            product_name: pName,
            quantity: qty,
            unit_price: Number(it.unit_price || 0),
            total: sub
          })
        })
      })

      const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue)

      return {
        date: targetDate,
        total_sales: totalSales,
        total_orders: totalOrders,
        total_items_sold: totalItems,
        average_order_value: totalOrders > 0 ? (totalSales / totalOrders) : 0,
        payment_methods: paymentMethods,
        top_products: topProducts.slice(0, 5),
        all_products_sold: topProducts,
        itemized_sales: itemizedSales,
        orders: mergedOrders
      }
    }

    return backendData || {}
  }

  useEffect(() => {
    if (reportType === 'daily') {
      fetchReport('daily', { date: selectedDate })
    } else if (reportType === 'monthly') {
      fetchReport('monthly', { year: selectedYear, month: selectedMonth })
    } else if (reportType === 'yearly') {
      fetchReport('yearly', { year: selectedYear })
    } else if (reportType === 'inventory') {
      fetchReport('inventory')
    } else if (reportType === 'profit-loss') {
      fetchReport('profit-loss', { year: selectedYear, month: selectedMonth })
    }
  }, [reportType, selectedDate, selectedMonth, selectedYear])

  // Real-time automatic listener for Walk-In POS transactions & inventory changes
  useEffect(() => {
    const handleSync = () => {
      if (reportType === 'daily') {
        fetchReport('daily', { date: selectedDate })
      } else if (reportType === 'monthly') {
        fetchReport('monthly', { year: selectedYear, month: selectedMonth })
      } else if (reportType === 'inventory') {
        fetchReport('inventory')
      }
    }

    window.addEventListener('jem_orders_update', handleSync)
    window.addEventListener('jem_inventory_update', handleSync)
    return () => {
      window.removeEventListener('jem_orders_update', handleSync)
      window.removeEventListener('jem_inventory_update', handleSync)
    }
  }, [reportType, selectedDate, selectedMonth, selectedYear])

  const handleExportPDF = () => {
    if (!reportData) {
      alert('Please wait for report data to load before exporting.')
      return
    }
    exportReportToPDF(reportType, reportData, { selectedDate, selectedMonth, selectedYear })
  }

  const handleExportCSV = () => {
    if (!reportData) {
      alert('Please wait for report data to load before exporting.')
      return
    }
    exportReportToCSV(reportType, reportData, { selectedDate, selectedMonth, selectedYear })
  }

  const renderDailyReport = () => {
    if (!reportData) return null

    return (
      <div className="report-content">
        <div className="report-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Daily Sales Report — {selectedDate}</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} color="#16a34a" /> Auto-synchronized with Store Counter POS
            </span>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Sales</h4>
              <p className="metric-value" style={{ color: '#ea580c' }}>
                ₱{Number(reportData.total_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="metric-card">
              <h4>Total Orders / Transactions</h4>
              <p className="metric-value">{reportData.total_orders || 0}</p>
            </div>
            <div className="metric-card">
              <h4>Total Items Sold</h4>
              <p className="metric-value">{reportData.total_items_sold || 0}</p>
            </div>
            <div className="metric-card">
              <h4>Average Order Value</h4>
              <p className="metric-value">
                ₱{Number(reportData.average_order_value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          {reportData.payment_methods && Object.keys(reportData.payment_methods).length > 0 && (
            <div className="report-section" style={{ marginTop: 20 }}>
              <h4>Payment Methods Breakdown</h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                {Object.entries(reportData.payment_methods).map(([method, val]) => {
                  const count = typeof val === 'object' && val !== null ? (val.count ?? 0) : val
                  const total = typeof val === 'object' && val !== null && val.total ? ` (₱${Number(val.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''
                  return (
                    <div
                      key={method}
                      style={{
                        padding: '10px 16px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{method === 'cash' ? '💵' : method === 'gcash' ? '📱' : '💳'}</span>
                      <div>
                        <strong style={{ textTransform: 'uppercase', color: '#0f172a' }}>{method}</strong>:{' '}
                        <span style={{ color: '#475569' }}>{count} transactions</span>
                        <strong style={{ color: '#ea580c', marginLeft: 4 }}>{total}</strong>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top Selling Products */}
          {reportData.top_products && reportData.top_products.length > 0 && (
            <div className="report-section" style={{ marginTop: 24 }}>
              <h4>Top Selling Products Today</h4>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Units Sold</th>
                    <th>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.top_products.map((product, idx) => (
                    <tr key={idx}>
                      <td><strong>{product.name}</strong></td>
                      <td>{product.quantity} units</td>
                      <td style={{ fontWeight: 700, color: '#ea580c' }}>
                        ₱{Number(product.revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Itemized Products Bought by Time Table */}
          {reportData.itemized_sales && reportData.itemized_sales.length > 0 && (
            <div className="report-section" style={{ marginTop: 24 }}>
              <h4>Itemized Products Purchased by Timestamp ({reportData.itemized_sales.length} items)</h4>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Order / Tx #</th>
                    <th>Channel</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.itemized_sales.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {item.time || '—'}
                        </span>
                      </td>
                      <td><strong>{item.order_number}</strong></td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: item.source.includes('POS') ? '#fff7ed' : '#eff6ff',
                          color: item.source.includes('POS') ? '#ea580c' : '#2563eb',
                          border: item.source.includes('POS') ? '1px solid #fdba74' : '1px solid #bfdbfe'
                        }}>
                          {item.source}
                        </span>
                      </td>
                      <td><strong>{item.product_name}</strong></td>
                      <td>{item.quantity}</td>
                      <td>₱{Number(item.unit_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td style={{ fontWeight: 700, color: '#17293a' }}>
                        ₱{Number(item.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transactions Record with Products Bought */}
          {reportData.orders && reportData.orders.length > 0 && (
            <div className="report-section" style={{ marginTop: 24 }}>
              <h4>All Sales Transactions &amp; Orders Record ({reportData.orders.length})</h4>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Order / Tx #</th>
                    <th>Source / Customer</th>
                    <th>Products Purchased at this Time</th>
                    <th>Payment</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.orders.map(order => (
                    <tr key={order.id || order.order_number}>
                      <td style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {order.time || (order.created_at ? new Date(order.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—')}
                      </td>
                      <td><strong>{order.order_number}</strong></td>
                      <td>
                        <div>
                          <strong style={{ fontSize: '13px' }}>{order.customer_name || 'Walk-in Customer'}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{order.type || 'Walk-In POS'}</div>
                        </div>
                      </td>
                      <td style={{ maxWidth: '340px' }}>
                        {order.items && order.items.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {order.items.map((it, iIdx) => (
                              <div
                                key={iIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: '#f1f5f9',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  color: '#1e293b'
                                }}
                              >
                                <span><strong>{it.quantity}x</strong> {it.name}</span>
                                <span style={{ color: '#64748b', marginLeft: 8 }}>₱{Number(it.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>General store purchase</span>
                        )}
                      </td>
                      <td>
                        <span style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '12px' }}>
                          {order.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#ea580c', fontSize: '14px' }}>
                          ₱{Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${String(order.status || 'completed').toLowerCase()}`}>
                          {order.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderInventoryReport = () => {
    if (!reportData) return null
    const list = reportData.all_products || reportData.products || []
    return (
      <div className="report-content">
        <div className="report-section">
          <h3>Inventory Valuation &amp; Stock Report</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Products</h4>
              <p className="metric-value">{reportData.total_products || list.length}</p>
            </div>
            <div className="metric-card">
              <h4>Total Inventory Value</h4>
              <p className="metric-value" style={{ color: '#059669' }}>
                ₱{Number(reportData.total_inventory_value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="metric-card">
              <h4>Low Stock Items</h4>
              <p className="metric-value" style={{ color: '#f59e0b' }}>{reportData.low_stock_count || 0}</p>
            </div>
            <div className="metric-card">
              <h4>Out of Stock</h4>
              <p className="metric-value" style={{ color: '#dc2626' }}>{reportData.out_of_stock_count || 0}</p>
            </div>
          </div>

          {list.length > 0 && (
            <div className="report-section" style={{ marginTop: 20 }}>
              <h4>Current Inventory Stock Status</h4>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Available Stock</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Stock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(product => {
                    const qty = Number(product.current_stock ?? product.quantity ?? 0)
                    const price = Number(product.unit_price ?? product.base_price ?? 0)
                    const val = qty * price
                    const isOut = qty <= 0
                    const isLow = qty > 0 && qty <= Number(product.low_stock_threshold || 10)

                    return (
                      <tr key={product.id || product.name}>
                        <td><strong>{product.name}</strong></td>
                        <td>{product.category || 'General'}</td>
                        <td><strong>{qty}</strong></td>
                        <td>₱{price.toFixed(2)}</td>
                        <td>₱{val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <span className={`badge ${isOut ? 'status-out' : isLow ? 'status-low' : 'status-in'}`}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderPeriodReport = () => {
    if (!reportData) return null
    const rows = reportType === 'monthly' ? reportData.daily_breakdown || [] : reportData.monthly_breakdown || []
    const label = reportType === 'monthly' ? 'Day' : 'Month'
    return (
      <div className="report-content">
        <div className="report-section">
          <h3>{reportType === 'monthly' ? reportData.month : `Year ${reportData.year}`} Sales Breakdown</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Sales</h4>
              <p className="metric-value" style={{ color: '#ea580c' }}>
                ₱{Number(reportData.total_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="metric-card">
              <h4>Total Orders / Transactions</h4>
              <p className="metric-value">{reportData.total_orders || 0}</p>
            </div>
            <div className="metric-card">
              <h4>Tax</h4>
              <p className="metric-value">₱{Number(reportData.total_tax || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <h4 style={{ marginTop: 20 }}>{label} Breakdown</h4>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{label}</th>
                  <th>Sales Revenue</th>
                  <th>Orders &amp; POS Sales</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date || row.month}>
                    <td><strong>{row.date || row.month}</strong></td>
                    <td>₱{Number(row.sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td>{row.orders || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderProfitLossReport = () => {
    if (!reportData) return null
    return (
      <div className="report-content">
        <div className="report-section">
          <h3>Profit &amp; Loss Report — {selectedYear}-{String(selectedMonth).padStart(2, '0')}</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Revenue (Sales)</h4>
              <p className="metric-value" style={{ color: '#ea580c' }}>
                ₱{Number(reportData.revenue || reportData.total_revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="metric-card">
              <h4>Estimated COGS</h4>
              <p className="metric-value">
                ₱{Number(reportData.cost_of_goods_sold || reportData.cogs || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="metric-card">
              <h4>Gross Profit</h4>
              <p className="metric-value" style={{ color: '#059669' }}>
                ₱{Number(reportData.gross_profit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="metric-card">
              <h4>Net Profit</h4>
              <p className="metric-value" style={{ color: Number(reportData.net_profit || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                ₱{Number(reportData.net_profit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="report-section" style={{ marginTop: 20 }}>
            <h4>Margin Analysis</h4>
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Gross Margin %</h4>
                <p className="metric-value">{Number(reportData.gross_margin_percent || 0).toFixed(2)}%</p>
              </div>
              <div className="metric-card">
                <h4>Net Profit Margin %</h4>
                <p className="metric-value">{Number(reportData.net_profit_margin_percent || 0).toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="management-container">
      <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Automatic real-time business performance records including Walk-In POS &amp; Online Orders
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-export-pdf"
            onClick={handleExportPDF}
            disabled={loading || !reportData}
            title="Export standard printable PDF report"
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13.5px',
              background: '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading || !reportData ? 'not-allowed' : 'pointer',
              opacity: loading || !reportData ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={16} />
            <span>Export to PDF</span>
          </button>
          <button
            type="button"
            className="btn btn-export-csv"
            onClick={handleExportCSV}
            disabled={loading || !reportData}
            title="Export Excel-compatible CSV spreadsheet"
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13.5px',
              background: '#f97316',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading || !reportData ? 'not-allowed' : 'pointer',
              opacity: loading || !reportData ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(249, 115, 22, 0.22)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={16} />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="report-controls">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="report-select"
        >
          <option value="daily">Daily Sales Report</option>
          <option value="monthly">Monthly Sales Report</option>
          <option value="yearly">Yearly Sales Report</option>
          <option value="inventory">Inventory Valuation Report</option>
          <option value="profit-loss">Profit &amp; Loss Report</option>
        </select>

        {/* Date/Period Selectors */}
        {reportType === 'daily' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        )}

        {reportType === 'monthly' && (
          <>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="month-select"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="2020"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="year-input"
            />
          </>
        )}

        {(reportType === 'yearly' || reportType === 'profit-loss') && (
          <input
            type="number"
            min="2020"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="year-input"
          />
        )}

        {reportType === 'profit-loss' && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="month-select"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="loading">Loading report...</div>
      ) : reportType === 'daily' ? (
        renderDailyReport()
      ) : reportType === 'inventory' ? (
        renderInventoryReport()
      ) : reportType === 'profit-loss' ? (
        renderProfitLossReport()
      ) : (
        renderPeriodReport()
      )}
    </div>
  )
}
