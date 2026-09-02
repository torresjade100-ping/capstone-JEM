/**
 * JEM Hardware & Construction Supply - Report Exporter
 * Generates high-fidelity printable PDFs and Excel-compatible CSVs
 */

export function exportReportToPDF(reportType, reportData, meta = {}) {
  if (!reportData) {
    alert('No report data available to export.')
    return
  }

  const dateStr = meta.selectedDate || new Date().toISOString().split('T')[0]
  const periodStr = reportType === 'monthly'
    ? `${meta.selectedMonth || ''}/${meta.selectedYear || ''}`
    : reportType === 'yearly'
    ? `${meta.selectedYear || ''}`
    : reportType === 'profit-loss'
    ? `${meta.selectedYear || ''}-${String(meta.selectedMonth || '').padStart(2, '0')}`
    : dateStr

  const reportTitles = {
    daily: `Daily Sales Report (${dateStr})`,
    monthly: `Monthly Sales Report (${periodStr})`,
    yearly: `Yearly Sales Report (${periodStr})`,
    inventory: 'Inventory Valuation & Stock Status Report',
    'profit-loss': `Profit & Loss Statement (${periodStr})`,
  }

  const title = reportTitles[reportType] || 'Business Operations Report'
  const generatedAt = new Date().toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  // Build report body HTML based on report type
  let bodyHtml = ''

  if (reportType === 'daily') {
    const totalSales = Number(reportData.total_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const aov = Number(reportData.average_order_value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    bodyHtml += `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="label">Total Sales</div>
          <div class="val">₱${totalSales}</div>
        </div>
        <div class="metric-card">
          <div class="label">Total Orders</div>
          <div class="val">${reportData.total_orders || 0}</div>
        </div>
        <div class="metric-card">
          <div class="label">Items Sold</div>
          <div class="val">${reportData.total_items_sold || 0}</div>
        </div>
        <div class="metric-card">
          <div class="label">Avg Order Value</div>
          <div class="val">₱${aov}</div>
        </div>
      </div>
    `

    if (reportData.payment_methods && Object.keys(reportData.payment_methods).length > 0) {
      bodyHtml += `
        <h3>Payment Methods Breakdown</h3>
        <table class="report-table">
          <thead>
            <tr><th>Payment Method</th><th>Transaction Count</th></tr>
          </thead>
          <tbody>
            ${Object.entries(reportData.payment_methods).map(([method, val]) => {
              const count = typeof val === 'object' && val !== null ? (val.count ?? 0) : val
              const total = typeof val === 'object' && val !== null && val.total ? ` (₱${Number(val.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''
              return `
              <tr>
                <td><strong>${String(method).toUpperCase()}</strong></td>
                <td>${count} transactions${total}</td>
              </tr>
            `}).join('')}
          </tbody>

        </table>
      `
    }

    if (reportData.top_products && reportData.top_products.length > 0) {
      bodyHtml += `
        <h3>Top Selling Products</h3>
        <table class="report-table">
          <thead>
            <tr><th>Product Name</th><th>Quantity Sold</th><th>Total Revenue</th></tr>
          </thead>
          <tbody>
            ${reportData.top_products.map(p => `
              <tr>
                <td>${p.name || 'Product'}</td>
                <td>${p.quantity || 0}</td>
                <td>₱${Number(p.revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }

    if (reportData.itemized_sales && reportData.itemized_sales.length > 0) {
      bodyHtml += `
        <h3>Itemized Products Purchased by Timestamp (${reportData.itemized_sales.length} items)</h3>
        <table class="report-table">
          <thead>
            <tr><th>Time</th><th>Order/Tx #</th><th>Source</th><th>Product Name</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th></tr>
          </thead>
          <tbody>
            ${reportData.itemized_sales.map(item => `
              <tr>
                <td>${item.time || '—'}</td>
                <td><strong>${item.order_number}</strong></td>
                <td>${item.source}</td>
                <td><strong>${item.product_name}</strong></td>
                <td>${item.quantity}</td>
                <td>₱${Number(item.unit_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td>₱${Number(item.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }

    if (reportData.orders && reportData.orders.length > 0) {
      bodyHtml += `
        <h3>Sales Transactions & Orders Record (${reportData.orders.length})</h3>
        <table class="report-table">
          <thead>
            <tr><th>Time</th><th>Order / Tx #</th><th>Customer / Source</th><th>Products Purchased at this Time</th><th>Payment</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${reportData.orders.map(o => {
              const itemsSummary = (o.items && o.items.length > 0)
                ? o.items.map(it => `${it.quantity}x ${it.name} (₱${Number(it.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`).join('<br>')
                : 'General Purchase'
              return `
              <tr>
                <td>${o.time || (o.created_at ? new Date(o.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—')}</td>
                <td><strong>${o.order_number || `#${o.id}`}</strong></td>
                <td>${o.customer_name || 'Walk-in Customer'}<br><small style="color: #64748b;">${o.type || 'Walk-In POS'}</small></td>
                <td style="font-size: 11px;">${itemsSummary}</td>
                <td>${(o.payment_method || 'Cash').toUpperCase()}</td>
                <td><strong>₱${Number(o.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                <td><span class="badge ${String(o.status || 'completed').toLowerCase()}">${o.status || 'Completed'}</span></td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      `
    }
  } else if (reportType === 'inventory') {
    const totalVal = Number(reportData.total_inventory_value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
    bodyHtml += `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="label">Total Products</div>
          <div class="val">${reportData.total_products || 0}</div>
        </div>
        <div class="metric-card">
          <div class="label">Total Inventory Value</div>
          <div class="val">₱${totalVal}</div>
        </div>
        <div class="metric-card">
          <div class="label">Low Stock Items</div>
          <div class="val text-amber">${reportData.low_stock_count || 0}</div>
        </div>
        <div class="metric-card">
          <div class="label">Out of Stock</div>
          <div class="val text-red">${reportData.out_of_stock_count || 0}</div>
        </div>
      </div>
    `

    if (reportData.products && reportData.products.length > 0) {
      bodyHtml += `
        <h3>Inventory Stock List</h3>
        <table class="report-table">
          <thead>
            <tr><th>Product Name</th><th>SKU</th><th>Stock Qty</th><th>Unit Price</th><th>Total Value</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${reportData.products.map(p => {
              const qty = Number(p.quantity ?? p.stock_quantity ?? 0)
              const price = Number(p.unit_price ?? p.base_price ?? 0)
              const val = qty * price
              const statusText = qty === 0 ? 'Out of Stock' : qty <= (p.low_stock_threshold || 5) ? 'Low Stock' : 'In Stock'
              return `
                <tr>
                  <td>${p.name || 'Product'}</td>
                  <td><code>${p.sku || '-'}</code></td>
                  <td><strong>${qty}</strong></td>
                  <td>₱${price.toFixed(2)}</td>
                  <td>₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td><span class="badge ${statusText.toLowerCase().replace(/\s+/g, '-')}">${statusText}</span></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      `
    }
  } else if (reportType === 'monthly' || reportType === 'yearly') {
    const totalSales = Number(reportData.total_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
    const rows = reportType === 'monthly' ? reportData.daily_breakdown || [] : reportData.monthly_breakdown || []
    const label = reportType === 'monthly' ? 'Day / Date' : 'Month'

    bodyHtml += `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="label">Total Sales</div>
          <div class="val">₱${totalSales}</div>
        </div>
        <div class="metric-card">
          <div class="label">Total Orders</div>
          <div class="val">${reportData.total_orders || 0}</div>
        </div>
        <div class="metric-card">
          <div class="label">Total Tax</div>
          <div class="val">₱${Number(reportData.total_tax || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <h3>${label} Sales Breakdown</h3>
      <table class="report-table">
        <thead>
          <tr><th>${label}</th><th>Sales Amount</th><th>Orders Count</th></tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td><strong>${r.date || r.month}</strong></td>
              <td>₱${Number(r.sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              <td>${r.orders || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  } else if (reportType === 'profit-loss') {
    const revenue = Number(reportData.total_revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
    const cogs = Number(reportData.cogs || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
    const expenses = Number(reportData.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
    const netProfit = Number(reportData.net_profit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

    bodyHtml += `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="label">Total Revenue</div>
          <div class="val">₱${revenue}</div>
        </div>
        <div class="metric-card">
          <div class="label">Cost of Goods (COGS)</div>
          <div class="val">₱${cogs}</div>
        </div>
        <div class="metric-card">
          <div class="label">Total Expenses</div>
          <div class="val">₱${expenses}</div>
        </div>
        <div class="metric-card">
          <div class="label">Net Profit</div>
          <div class="val ${reportData.net_profit >= 0 ? 'text-green' : 'text-red'}">₱${netProfit}</div>
        </div>
      </div>

      <h3>Margin Analysis</h3>
      <table class="report-table">
        <thead>
          <tr><th>Financial Ratio</th><th>Percentage</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Gross Margin</strong></td>
            <td>${Number(reportData.gross_margin_percent || 0).toFixed(2)}%</td>
          </tr>
          <tr>
            <td><strong>Net Profit Margin</strong></td>
            <td><strong>${Number(reportData.net_profit_margin_percent || 0).toFixed(2)}%</strong></td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Construct full HTML document for print/PDF export
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title} - JEM Hardware</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          body {
            color: #17293a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #ea580c;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .brand h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #ea580c;
            letter-spacing: -0.02em;
          }
          .brand p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }
          .report-meta {
            text-align: right;
          }
          .report-meta h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
          }
          .report-meta p {
            margin: 3px 0 0 0;
            font-size: 11px;
            color: #64748b;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 22px;
          }
          .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
          }
          .metric-card .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            font-weight: 700;
          }
          .metric-card .val {
            margin-top: 4px;
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
          }
          .text-green { color: #16a34a !important; }
          .text-red { color: #dc2626 !important; }
          .text-amber { color: #d97706 !important; }
          h3 {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            margin: 18px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .report-table th,
          .report-table td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          .report-table th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .report-table tr:nth-child(even) td {
            background: #fafbfc;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge.in-stock, .badge.completed { background: #dcfce7; color: #15803d; }
          .badge.low-stock, .badge.pending { background: #fef3c7; color: #b45309; }
          .badge.out-of-stock, .badge.cancelled { background: #fee2e2; color: #b91c1c; }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>JEM HARDWARE & COCO LUMBER</h1>
            <p>Construction Supply &amp; Order Management System</p>
          </div>
          <div class="report-meta">
            <h2>${title}</h2>
            <p>Generated: ${generatedAt}</p>
          </div>
        </div>

        ${bodyHtml}

        <div class="footer">
          <span>Official System Generated Report · JEM Hardware</span>
          <span>Confidential &amp; Proprietary</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=900,height=750')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  } else {
    // Fallback if popup blocked: create hidden iframe
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(htmlContent)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 500)
  }
}

export function exportReportToCSV(reportType, reportData, meta = {}) {
  if (!reportData) {
    alert('No report data available to export.')
    return
  }

  const dateStr = meta.selectedDate || new Date().toISOString().split('T')[0]
  let csvContent = '\uFEFF' // UTF-8 BOM for Excel

  if (reportType === 'daily') {
    csvContent += `JEM HARDWARE - DAILY SALES REPORT\n`
    csvContent += `Report Date:,${dateStr}\n`
    csvContent += `Generated At:,${new Date().toLocaleString()}\n\n`
    csvContent += `METRICS SUMMARY\n`
    csvContent += `Total Sales,₱${Number(reportData.total_sales || 0).toFixed(2)}\n`
    csvContent += `Total Orders,${reportData.total_orders || 0}\n`
    csvContent += `Items Sold,${reportData.total_items_sold || 0}\n`
    csvContent += `Average Order Value,₱${Number(reportData.average_order_value || 0).toFixed(2)}\n\n`

    if (reportData.orders && reportData.orders.length > 0) {
      csvContent += `SALES TRANSACTIONS & ORDERS BREAKDOWN\n`
      csvContent += `Time,Order/Tx #,Source,Customer,Products Purchased,Payment Method,Total Amount,Status\n`
      reportData.orders.forEach(o => {
        const time = o.time || (o.created_at ? new Date(o.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '')
        const num = o.order_number || o.id || ''
        const source = o.type || 'Walk-In POS'
        const cust = o.customer_name || 'Walk-in Customer'
        const itemsList = (o.items && o.items.length > 0)
          ? o.items.map(it => `${it.quantity}x ${it.name} (PHP ${Number(it.total || 0).toFixed(2)})`).join('; ')
          : 'General purchase'
        const itemsClean = itemsList.replace(/"/g, '""')
        const pay = o.payment_method || 'Cash'
        const tot = Number(o.total || 0).toFixed(2)
        const st = o.status || 'Completed'
        csvContent += `"${time}","${num}","${source}","${cust}","${itemsClean}","${pay}",${tot},"${st}"\n`
      })
    }
  } else if (reportType === 'inventory') {
    csvContent += `JEM HARDWARE - INVENTORY REPORT\n`
    csvContent += `Generated At:,${new Date().toLocaleString()}\n`
    csvContent += `Total Products:,${reportData.total_products || 0}\n`
    csvContent += `Total Inventory Value:,₱${Number(reportData.total_inventory_value || 0).toFixed(2)}\n`
    csvContent += `Low Stock Count:,${reportData.low_stock_count || 0}\n`
    csvContent += `Out of Stock Count:,${reportData.out_of_stock_count || 0}\n\n`

    if (reportData.products && reportData.products.length > 0) {
      csvContent += `PRODUCT DETAILS\n`
      csvContent += `Product Name,SKU,Quantity,Unit Price,Total Valuation,Status\n`
      reportData.products.forEach(p => {
        const qty = Number(p.quantity ?? p.stock_quantity ?? 0)
        const price = Number(p.unit_price ?? p.base_price ?? 0)
        const val = qty * price
        const status = qty === 0 ? 'Out of Stock' : qty <= (p.low_stock_threshold || 5) ? 'Low Stock' : 'In Stock'
        csvContent += `"${p.name || ''}","${p.sku || ''}",${qty},${price.toFixed(2)},${val.toFixed(2)},"${status}"\n`
      })
    }
  } else if (reportType === 'monthly' || reportType === 'yearly') {
    const label = reportType === 'monthly' ? 'Day' : 'Month'
    const rows = reportType === 'monthly' ? reportData.daily_breakdown || [] : reportData.monthly_breakdown || []
    csvContent += `JEM HARDWARE - ${reportType.toUpperCase()} SALES REPORT\n`
    csvContent += `Period:,${reportType === 'monthly' ? `${meta.selectedMonth}/${meta.selectedYear}` : meta.selectedYear}\n`
    csvContent += `Total Sales:,₱${Number(reportData.total_sales || 0).toFixed(2)}\n`
    csvContent += `Total Orders:,${reportData.total_orders || 0}\n`
    csvContent += `Total Tax:,₱${Number(reportData.total_tax || 0).toFixed(2)}\n\n`
    csvContent += `${label},Sales,Orders Count\n`
    rows.forEach(r => {
      csvContent += `"${r.date || r.month}",${Number(r.sales || 0).toFixed(2)},${r.orders || 0}\n`
    })
  } else if (reportType === 'profit-loss') {
    csvContent += `JEM HARDWARE - PROFIT & LOSS STATEMENT\n`
    csvContent += `Period:,${meta.selectedYear}-${String(meta.selectedMonth).padStart(2, '0')}\n`
    csvContent += `Total Revenue:,₱${Number(reportData.total_revenue || 0).toFixed(2)}\n`
    csvContent += `Cost of Goods Sold (COGS):,₱${Number(reportData.cogs || 0).toFixed(2)}\n`
    csvContent += `Total Expenses:,₱${Number(reportData.total_expenses || 0).toFixed(2)}\n`
    csvContent += `Net Profit:,₱${Number(reportData.net_profit || 0).toFixed(2)}\n`
    csvContent += `Gross Margin %:,${Number(reportData.gross_margin_percent || 0).toFixed(2)}%\n`
    csvContent += `Net Profit Margin %:,${Number(reportData.net_profit_margin_percent || 0).toFixed(2)}%\n`
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `${reportType}-report-${dateStr}.csv`
  link.click()
  URL.revokeObjectURL(downloadUrl)
}
