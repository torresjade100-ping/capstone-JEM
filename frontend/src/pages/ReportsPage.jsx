import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../api'
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

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to fetch report')
      const data = await response.json()
      setReportData(data.data || data)
    } catch (error) {
      console.error('Error fetching report:', error)
      alert('Failed to load report')
    } finally {
      setLoading(false)
    }
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

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      let url = ''
      
      if (reportType === 'daily') {
        params.append('date', selectedDate)
        url = `${API_BASE_URL}/admin/reports/daily/csv?${params.toString()}`
      } else if (reportType === 'inventory') {
        url = `${API_BASE_URL}/admin/reports/inventory/csv`
      } else {
        alert('Export not available for this report type')
        return
      }
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Failed to export report')
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `${reportType}-report.csv`
      anchor.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report')
    }
  }

  const renderDailyReport = () => {
    if (!reportData) return null
    return (
      <div className="report-content">
        <div className="report-section">
          <h3>Daily Sales Report - {selectedDate}</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Sales</h4>
              <p className="metric-value">₱{reportData.total_sales?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="metric-card">
              <h4>Total Orders</h4>
              <p className="metric-value">{reportData.total_orders}</p>
            </div>
            <div className="metric-card">
              <h4>Total Items Sold</h4>
              <p className="metric-value">{reportData.total_items_sold}</p>
            </div>
            <div className="metric-card">
              <h4>Average Order Value</h4>
              <p className="metric-value">₱{reportData.average_order_value?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {reportData.payment_methods && (
            <div className="report-section">
              <h4>Payment Methods Breakdown</h4>
              <ul>
                {Object.entries(reportData.payment_methods).map(([method, count]) => (
                  <li key={method}>{method}: {count} transactions</li>
                ))}
              </ul>
            </div>
          )}

          {reportData.top_products && (
            <div className="report-section">
              <h4>Top 5 Products</h4>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.top_products.map((product, idx) => (
                    <tr key={idx}>
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>₱{product.revenue?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportData.orders && (
            <div className="report-section">
              <h4>Orders ({reportData.orders.length})</h4>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.orders.map(order => (
                    <tr key={order.id}>
                      <td>{order.order_number}</td>
                      <td>{order.customer_name || 'Walk-in'}</td>
                      <td>₱{order.total?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                      <td>{order.status}</td>
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
    return (
      <div className="report-content">
        <div className="report-section">
          <h3>Inventory Report</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Products</h4>
              <p className="metric-value">{reportData.total_products}</p>
            </div>
            <div className="metric-card">
              <h4>Inventory Value</h4>
              <p className="metric-value">₱{reportData.total_inventory_value?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="metric-card">
              <h4>Low Stock Items</h4>
              <p className="metric-value" style={{ color: '#ff9800' }}>{reportData.low_stock_count}</p>
            </div>
            <div className="metric-card">
              <h4>Out of Stock</h4>
              <p className="metric-value" style={{ color: '#d32f2f' }}>{reportData.out_of_stock_count}</p>
            </div>
          </div>

          {reportData.products && (
            <div className="report-section">
              <h4>Product Details</h4>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.products.map(product => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{product.quantity}</td>
                      <td>₱{product.unit_price?.toFixed(2)}</td>
                      <td>₱{(product.quantity * product.unit_price)?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`badge ${product.quantity === 0 ? 'status-out' : product.quantity <= product.low_stock_threshold ? 'status-low' : 'status-in'}`}>
                          {product.quantity === 0 ? 'Out' : product.quantity <= product.low_stock_threshold ? 'Low' : 'In Stock'}
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

  const renderPeriodReport = () => {
    if (!reportData) return null
    const rows = reportType === 'monthly' ? reportData.daily_breakdown || [] : reportData.monthly_breakdown || []
    const label = reportType === 'monthly' ? 'Day' : 'Month'
    return <div className="report-content"><div className="report-section"><h3>{reportType === 'monthly' ? reportData.month : `Year ${reportData.year}`}</h3><div className="metrics-grid"><div className="metric-card"><h4>Total Sales</h4><p className="metric-value">₱{Number(reportData.total_sales || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p></div><div className="metric-card"><h4>Total Orders</h4><p className="metric-value">{reportData.total_orders || 0}</p></div><div className="metric-card"><h4>Tax</h4><p className="metric-value">₱{Number(reportData.total_tax || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p></div></div><h4>{label} breakdown</h4><div className="table-responsive"><table className="report-table"><thead><tr><th>{label}</th><th>Sales</th><th>Orders</th></tr></thead><tbody>{rows.map((row) => <tr key={row.date || row.month}><td>{row.date || row.month}</td><td>₱{Number(row.sales || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td><td>{row.orders}</td></tr>)}</tbody></table></div></div></div>
  }

  const renderProfitLossReport = () => {
    if (!reportData) return null
    return (
      <div className="report-content">
        <div className="report-section">
          <h3>Profit & Loss Report - {selectedYear}-{String(selectedMonth).padStart(2, '0')}</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Revenue</h4>
              <p className="metric-value">₱{reportData.total_revenue?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="metric-card">
              <h4>Cost of Goods</h4>
              <p className="metric-value">₱{reportData.cogs?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="metric-card">
              <h4>Total Expenses</h4>
              <p className="metric-value">₱{reportData.total_expenses?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="metric-card">
              <h4>Net Profit</h4>
              <p className="metric-value" style={{ color: reportData.net_profit >= 0 ? '#4caf50' : '#d32f2f' }}>
                ₱{reportData.net_profit?.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="report-section">
            <h4>Margin Analysis</h4>
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Gross Margin %</h4>
                <p className="metric-value">{reportData.gross_margin_percent?.toFixed(2)}%</p>
              </div>
              <div className="metric-card">
                <h4>Net Profit Margin %</h4>
                <p className="metric-value">{reportData.net_profit_margin_percent?.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Reports & Analytics</h1>
        <button className="btn btn-primary" onClick={handleExport}>
          📥 Export to CSV
        </button>
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
          <option value="inventory">Inventory Report</option>
          <option value="profit-loss">Profit & Loss Report</option>
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
