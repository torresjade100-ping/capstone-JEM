import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, RefreshCw, Printer, AlertTriangle, CheckCircle2,
  X, Filter, Calendar, ShieldCheck, ArrowDownCircle,
  Receipt, RotateCcw, Ban,
  Eye, FileText, Check, AlertCircle, Lock
} from 'lucide-react'
import {
  getTransactions,
  getTransaction,
  getTransactionReceipt,
  refundTransaction,
  voidTransaction,
  getStoredUser
} from '../api'
import '../styles/transactions.css'

export default function TransactionsPage({ role = 'staff' }) {
  const currentUser = getStoredUser()
  const isAdmin = currentUser?.role === 'admin' || role === 'admin'

  // Tab & Filters: 'all' | 'payments' | 'refunds' | 'voids' | 'gcash'
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [orderSourceFilter, setOrderSourceFilter] = useState('all') // 'all' | 'online' | 'walk-in'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(100)

  // Data & Loading state
  const [transactions, setTransactions] = useState([])
  const [meta, setMeta] = useState({
    counts: { all: 0, payments: 0, refunds: 0, voids: 0, gcash: 0, online: 0, walkin: 0 },
    summary: { total_net_sales: 0 }
  })
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  // Modals state
  const [receiptModal, setReceiptModal] = useState({ open: false, data: null, loading: false })
  const [refundModal, setRefundModal] = useState({ open: false, transaction: null, reason: '', submitting: false, error: '' })
  const [voidModal, setVoidModal] = useState({ open: false, transaction: null, reason: '', pin: '', submitting: false, error: '' })

  const receiptPrintRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Helper to extract clean staff name without '(Admin)', '(Cashier)', or '(Staff)'
  const renderStaffName = (tx) => {
    const raw = tx?.cashier_name || tx?.cashier?.name || 'Staff'
    const clean = raw.replace(/\s*\((Admin|Cashier|Staff)\)/gi, '').trim()
    return clean || raw
  }

  // Helper to determine real staff vs admin role
  const renderStaffRole = (tx) => {
    const rawRole = (tx?.cashier_role || tx?.cashier?.role || '').toLowerCase()
    const rawName = (tx?.cashier_name || '').toLowerCase()
    if (rawRole === 'admin' || rawName.includes('admin')) {
      return 'Admin'
    }
    return 'Staff'
  }

  // Fetch transactions from backend
  const fetchTransactionsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await getTransactions({
        tab: activeTab,
        search: searchTerm,
        date: selectedDate,
        order_source: orderSourceFilter,
        payment_method: paymentMethodFilter,
        status: statusFilter,
        page: currentPage,
        per_page: perPage
      })

      if (response && response.success) {
        setTransactions(response.data?.data || [])
        setPagination({
          current_page: response.data?.current_page || 1,
          last_page: response.data?.last_page || 1,
          total: response.data?.total || 0,
          from: response.data?.from || 0,
          to: response.data?.to || 0
        })
        if (response.meta) {
          setMeta(response.meta)
        }
      }
    } catch (err) {
      console.error('Failed to load transactions:', err)
      showToast(err.message || 'Failed to load transaction records', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTransactionsData()
  }, [activeTab, selectedDate, orderSourceFilter, paymentMethodFilter, statusFilter, currentPage])

  // Handle Deep Linking from Global Search
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const targetRef = urlParams.get('ref') || urlParams.get('search')
      const targetTxId = urlParams.get('txId')
      if (targetRef && !searchTerm) {
        setSearchTerm(targetRef)
      }
      if ((targetTxId || targetRef) && transactions.length > 0) {
        const matched = transactions.find(t => 
          (targetTxId && String(t.id) === String(targetTxId)) ||
          (targetRef && (
            String(t.reference_number || '').toLowerCase().includes(targetRef.toLowerCase()) ||
            String(t.transaction_number || '').toLowerCase().includes(targetRef.toLowerCase())
          ))
        )
        if (matched) {
          handleOpenReceipt(matched)
        }
      }
    } catch (e) {}
  }, [transactions])

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchTransactionsData()
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Open Receipt Modal
  const handleOpenReceipt = async (tx) => {
    setReceiptModal({ open: true, data: null, loading: true })
    try {
      const res = await getTransactionReceipt(tx.id || tx.transaction_number)
      if (res && res.success) {
        setReceiptModal({ open: true, data: res.data, loading: false })
      } else {
        throw new Error(res?.message || 'Unable to retrieve receipt')
      }
    } catch (err) {
      console.error('Receipt error:', err)
      showToast(err.message || 'Failed to fetch receipt', 'error')
      setReceiptModal({ open: false, data: null, loading: false })
    }
  }

  // Print Receipt handler
  const handlePrintReceipt = () => {
    if (!receiptModal.data) return
    window.print()
  }

  // Open Refund Modal
  const handleOpenRefund = (tx) => {
    if (tx.status !== 'PAID') {
      showToast(`Cannot refund transaction with status ${tx.status}`, 'error')
      return
    }
    setRefundModal({
      open: true,
      transaction: tx,
      reason: '',
      submitting: false,
      error: ''
    })
  }

  // Submit Refund
  const handleConfirmRefund = async () => {
    if (!refundModal.reason.trim()) {
      setRefundModal(prev => ({ ...prev, error: 'Please enter a valid refund reason.' }))
      return
    }

    setRefundModal(prev => ({ ...prev, submitting: true, error: '' }))
    try {
      const res = await refundTransaction(refundModal.transaction.id, refundModal.reason.trim())
      if (res && res.success) {
        showToast(`Transaction #${refundModal.transaction.transaction_number} was successfully refunded! Inventory restored.`, 'success')
        setRefundModal({ open: false, transaction: null, reason: '', submitting: false, error: '' })
        fetchTransactionsData(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jem_inventory_update'))
        }
      } else {
        throw new Error(res?.message || 'Refund failed')
      }
    } catch (err) {
      setRefundModal(prev => ({ ...prev, submitting: false, error: err.message || 'Failed to process refund.' }))
    }
  }

  // Open Void Modal
  const handleOpenVoid = (tx) => {
    if (tx.status !== 'PAID') {
      showToast(`Cannot void transaction with status ${tx.status}`, 'error')
      return
    }
    setVoidModal({
      open: true,
      transaction: tx,
      reason: '',
      pin: '',
      submitting: false,
      error: ''
    })
  }

  // Submit Void
  const handleConfirmVoid = async () => {
    if (!voidModal.reason.trim()) {
      setVoidModal(prev => ({ ...prev, error: 'Void reason is required.' }))
      return
    }
    if (!/^\d{6}$/.test(voidModal.pin)) {
      setVoidModal(prev => ({ ...prev, error: 'Invalid Void PIN. Please enter exactly 6 digits.' }))
      return
    }

    setVoidModal(prev => ({ ...prev, submitting: true, error: '' }))
    try {
      const res = await voidTransaction(voidModal.transaction.id, voidModal.reason.trim(), voidModal.pin)
      if (res && res.success) {
        showToast(`Transaction #${voidModal.transaction.transaction_number} has been voided and inventory restored.`, 'success')
        setVoidModal({ open: false, transaction: null, reason: '', pin: '', submitting: false, error: '' })
        fetchTransactionsData(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jem_inventory_update'))
        }
      } else {
        throw new Error(res?.message || 'Void authorization failed')
      }
    } catch (err) {
      setVoidModal(prev => ({ ...prev, submitting: false, error: err.message || 'Invalid Void PIN.' }))
    }
  }

  const formatCurrency = (val) => {
    const num = Number(val || 0)
    return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return (
      <div className="tx-datetime-cell">
        <span className="tx-date">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span className="tx-time">{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
      </div>
    )
  }

  const renderStatusBadge = (status) => {
    const normalized = (status || 'PAID').toUpperCase()
    let badgeClass = 'tx-badge-paid'
    let label = 'PAID'

    if (normalized === 'PAID') {
      badgeClass = 'tx-badge-paid'
      label = 'PAID'
    } else if (normalized === 'VOIDED') {
      badgeClass = 'tx-badge-voided'
      label = 'VOIDED'
    } else if (normalized === 'REFUNDED') {
      badgeClass = 'tx-badge-refunded'
      label = 'REFUNDED'
    } else if (normalized === 'PENDING') {
      badgeClass = 'tx-badge-pending'
      label = 'PENDING'
    } else if (normalized === 'FAILED') {
      badgeClass = 'tx-badge-failed'
      label = 'FAILED'
    }

    return (
      <span className={`tx-status-badge ${badgeClass}`}>
        <span className="tx-status-dot"></span>
        {label}
      </span>
    )
  }

  return (
    <div className="transactions-page-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`tx-toast-banner ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="tx-header-panel">
        <div>
          <h1 className="tx-main-title">Transactions &amp; Audit Ledger</h1>
          <p className="tx-subtitle">
            Track customer orders, payments, refunds, voids, and transaction activity.
          </p>
        </div>
        <div className="tx-header-actions">
          <button
            type="button"
            className="tx-refresh-button"
            onClick={() => fetchTransactionsData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'tx-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tx-tabs-bar">
        <button
          type="button"
          className={`tx-tab-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
        >
          <Receipt size={17} />
          <span>All Transactions</span>
          <span className="tx-tab-counter">{meta.counts?.all ?? 0}</span>
        </button>

        <button
          type="button"
          className={`tx-tab-item ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => { setActiveTab('payments'); setCurrentPage(1); }}
        >
          <CheckCircle2 size={17} />
          <span>Payments</span>
          <span className="tx-tab-counter">{meta.counts?.payments ?? 0}</span>
        </button>

        <button
          type="button"
          className={`tx-tab-item ${activeTab === 'refunds' ? 'active' : ''}`}
          onClick={() => { setActiveTab('refunds'); setCurrentPage(1); }}
        >
          <RotateCcw size={17} />
          <span>Refunds</span>
          <span className="tx-tab-counter">{meta.counts?.refunds ?? 0}</span>
        </button>

        <button
          type="button"
          className={`tx-tab-item ${activeTab === 'voids' ? 'active' : ''}`}
          onClick={() => { setActiveTab('voids'); setCurrentPage(1); }}
        >
          <Ban size={17} />
          <span>Voids</span>
          <span className="tx-tab-counter">{meta.counts?.voids ?? 0}</span>
        </button>

        <button
          type="button"
          className={`tx-tab-item ${activeTab === 'gcash' ? 'active' : ''}`}
          onClick={() => { setActiveTab('gcash'); setCurrentPage(1); }}
        >
          <span className="tx-tab-gcash-mark">G</span>
          <span>GCash</span>
          <span className="tx-tab-counter">{meta.counts?.gcash ?? 0}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="tx-toolbar-card">
        <div className="tx-search-box">
          <Search size={18} className="tx-search-icon" />
          <input
            type="text"
            placeholder="Search Order #, Customer, Staff, Reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tx-search-input"
          />
          {searchTerm && (
            <button type="button" className="tx-search-clear" onClick={() => setSearchTerm('')}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="tx-filter-group">
          {/* Date Picker */}
          <div className="tx-filter-control">
            <Calendar size={16} className="tx-control-icon" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
              className="tx-date-input"
            />
            {selectedDate && (
              <button
                type="button"
                className="tx-filter-reset-icon"
                onClick={() => setSelectedDate('')}
                title="Clear date filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Order Source Selector */}
          <div className="tx-filter-control">
            <select
              value={orderSourceFilter}
              onChange={(e) => { setOrderSourceFilter(e.target.value); setCurrentPage(1); }}
              className="tx-select-input"
            >
              <option value="all">All Order Sources</option>
              <option value="Online">Online</option>
              <option value="Walk-in">Walk-in</option>
            </select>
          </div>

          {/* Payment Method Selector */}
          <div className="tx-filter-control">
            <select
              value={paymentMethodFilter}
              onChange={(e) => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
              className="tx-select-input"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="cod">COD</option>
            </select>
          </div>

          {/* Payment Status Selector */}
          <div className="tx-filter-control">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="tx-select-input"
            >
              <option value="all">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="VOIDED">Voided</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content (Desktop/Tablet) */}
      <div className="tx-table-wrapper">
        <table className="tx-data-table">
          <colgroup>
            <col style={{ width: '10.5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10.5%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '7.5%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8.5%' }} />
            <col style={{ width: '8.5%' }} />
            <col style={{ width: '7.5%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>ORDER #</th>
              <th>DATE &amp; TIME</th>
              <th>PROCESSED BY</th>
              <th>CUSTOMER</th>
              <th>ORDER SOURCE</th>
              <th>PAYMENT METHOD</th>
              <th className="text-right">SUBTOTAL</th>
              <th className="text-right">TOTAL</th>
              <th className="text-center">STATUS</th>
              <th className="text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="tx-loading-cell">
                  <div className="tx-table-loader">
                    <RefreshCw size={24} className="tx-spin" />
                    <span>Loading verified transactions from ledger...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="tx-empty-cell">
                  <Receipt size={36} className="tx-empty-icon" />
                  <h4>No transactions found</h4>
                  <p>Try clearing filters or search terms to inspect transaction records.</p>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isVoided = tx.status === 'VOIDED'
                const isRefunded = tx.status === 'REFUNDED'
                const isPaid = tx.status === 'PAID' || tx.status === 'completed'
                const staffName = renderStaffName(tx)
                const staffRole = renderStaffRole(tx)
                const orderSource = tx.order_source || (tx.order_id || tx.type === 'online' ? 'Online' : 'Walk-in')
                const subtotal = tx.gross_subtotal || tx.total_net || 0
                const total = tx.total_net || 0

                return (
                  <tr key={tx.id} className={isVoided ? 'tx-row-voided' : isRefunded ? 'tx-row-refunded' : ''}>
                    <td className="tx-order-number-cell">
                      <span className={isVoided ? 'tx-strikethrough' : 'tx-code-bold'}>
                        {tx.transaction_number}
                      </span>
                    </td>
                    <td>{formatDateTime(tx.date_time || tx.created_at)}</td>
                    <td>
                      <div className="tx-processed-by-cell">
                        <strong className="tx-staff-name">{staffName}</strong>
                        <span className={`tx-staff-role ${staffRole.toLowerCase()}`}>{staffRole}</span>
                      </div>
                    </td>
                    <td className="tx-customer-cell">{tx.customer_name || 'Walk-in'}</td>
                    <td>
                      <span className={`tx-source-pill ${orderSource.toLowerCase().replace(/\s+/g, '-')}`}>
                        {orderSource}
                      </span>
                    </td>
                    <td>
                      <div className="tx-payment-method-cell">
                        <span className={`tx-payment-method-pill ${(tx.payment_method || 'CASH').toLowerCase()}`}>
                          {(tx.payment_method || 'CASH').toUpperCase()}
                        </span>
                        {tx.reference_number && (
                          <span className="tx-ref-subtext" title={tx.reference_number}>
                            Ref: {tx.reference_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right tx-subtotal-cell">
                      {formatCurrency(subtotal)}
                    </td>
                    <td className="text-right tx-amount-bold">
                      {formatCurrency(total)}
                    </td>
                    <td className="text-center">{renderStatusBadge(tx.status)}</td>
                    <td className="text-center">
                      <div className="tx-action-buttons">
                        <button
                          type="button"
                          className="tx-btn-action tx-btn-receipt tx-btn-icon-only"
                          onClick={() => handleOpenReceipt(tx)}
                          title="Print Receipt"
                          aria-label="Print Receipt"
                        >
                          <Printer size={13} />
                        </button>
                        {isPaid && (
                          <button
                            type="button"
                            className="tx-btn-action tx-btn-refund"
                            onClick={() => handleOpenRefund(tx)}
                            title="Process Refund"
                          >
                            <RotateCcw size={12} />
                            <span>Refund</span>
                          </button>
                        )}
                        {isPaid && (
                          <button
                            type="button"
                            className="tx-btn-action tx-btn-void"
                            onClick={() => handleOpenVoid(tx)}
                            title="Authorize Void (Requires 6-Digit PIN)"
                          >
                            <Ban size={12} />
                            <span>Void</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Responsive Card Layout (Mobile <= 900px) */}
      {!loading && transactions.length > 0 && (
        <div className="tx-mobile-cards">
          {transactions.map((tx) => {
            const isVoided = tx.status === 'VOIDED'
            const isRefunded = tx.status === 'REFUNDED'
            const isPaid = tx.status === 'PAID' || tx.status === 'completed'
            const staffName = renderStaffName(tx)
            const staffRole = renderStaffRole(tx)
            const orderSource = tx.order_source || (tx.order_id || tx.type === 'online' ? 'Online' : 'Walk-in')
            const subtotal = tx.gross_subtotal || tx.total_net || 0
            const total = tx.total_net || 0

            return (
              <div key={`m-${tx.id}`} className={`tx-mobile-card ${isVoided ? 'tx-card-voided' : ''}`}>
                <div className="tx-mobile-card-header">
                  <div className="tx-order-number-cell">
                    <span className={isVoided ? 'tx-strikethrough' : 'tx-code-bold'}>
                      {tx.transaction_number}
                    </span>
                  </div>
                  {renderStatusBadge(tx.status)}
                </div>

                <div className="tx-mobile-card-row">
                  <div className="tx-mobile-meta">
                    <span className="tx-mobile-label">Date &amp; Time</span>
                    {formatDateTime(tx.date_time || tx.created_at)}
                  </div>
                  <div className="tx-mobile-meta" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                    <span className="tx-mobile-label">Processed By</span>
                    <span className="tx-staff-name" style={{ fontWeight: 600 }}>{staffName}</span>
                    <span className={`tx-staff-role ${staffRole.toLowerCase()}`}>{staffRole}</span>
                  </div>
                </div>

                <div className="tx-mobile-card-row">
                  <div className="tx-mobile-meta">
                    <span className="tx-mobile-label">Customer</span>
                    <span style={{ color: '#ffffff' }}>{tx.customer_name || 'Walk-in'}</span>
                  </div>
                  <div className="tx-mobile-meta" style={{ alignItems: 'flex-end' }}>
                    <span className="tx-mobile-label">Order Source</span>
                    <span className={`tx-source-pill ${orderSource.toLowerCase().replace(/\s+/g, '-')}`}>
                      {orderSource}
                    </span>
                  </div>
                </div>

                <div className="tx-mobile-card-row">
                  <div className="tx-mobile-meta">
                    <span className="tx-mobile-label">Payment Method</span>
                    <div className="tx-payment-method-cell">
                      <span className={`tx-payment-method-pill ${(tx.payment_method || 'CASH').toLowerCase()}`}>
                        {(tx.payment_method || 'CASH').toUpperCase()}
                      </span>
                      {tx.reference_number && (
                        <span className="tx-ref-subtext">Ref: {tx.reference_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="tx-mobile-meta" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                    <span className="tx-mobile-label">Subtotal</span>
                    <span className="tx-subtotal-cell">{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                <div className="tx-mobile-card-row tx-mobile-card-totals">
                  <span className="tx-mobile-label" style={{ fontSize: '12px', alignSelf: 'center' }}>Total</span>
                  <strong className="tx-mobile-total">{formatCurrency(total)}</strong>
                </div>

                <div className="tx-mobile-card-actions">
                  <button
                    type="button"
                    className="tx-btn-action tx-btn-receipt tx-btn-icon-only"
                    onClick={() => handleOpenReceipt(tx)}
                    title="Print Receipt"
                    aria-label="Print Receipt"
                  >
                    <Printer size={14} />
                  </button>
                  {isPaid && (
                    <button
                      type="button"
                      className="tx-btn-action tx-btn-refund"
                      onClick={() => handleOpenRefund(tx)}
                      title="Process Refund"
                    >
                      <RotateCcw size={14} />
                      <span>Refund</span>
                    </button>
                  )}
                  {isPaid && (
                    <button
                      type="button"
                      className="tx-btn-action tx-btn-void"
                      onClick={() => handleOpenVoid(tx)}
                    >
                      <Ban size={14} />
                      <span>Void</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. OFFICIAL RECEIPT PREVIEW MODAL                        */}
      {/* ======================================================== */}
      {receiptModal.open && (
        <div className="tx-modal-overlay" onClick={() => setReceiptModal({ open: false, data: null, loading: false })}>
          <div className="tx-receipt-modal" onClick={e => e.stopPropagation()}>
            <div className="tx-receipt-modal-header">
              <div className="tx-modal-title-wrap">
                <Receipt size={20} className="tx-receipt-header-icon" />
                <h3>OFFICIAL RECEIPT PREVIEW</h3>
              </div>
              <div className="tx-receipt-header-actions">
                <button
                  type="button"
                  className="tx-receipt-print-btn"
                  onClick={handlePrintReceipt}
                >
                  <Printer size={16} />
                  Print Receipt
                </button>
                <button
                  type="button"
                  className="tx-modal-close-btn"
                  onClick={() => setReceiptModal({ open: false, data: null, loading: false })}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="tx-receipt-modal-body">
              {receiptModal.loading ? (
                <div className="tx-receipt-loading">
                  <RefreshCw size={26} className="tx-spin" />
                  <p>Generating Official Receipt...</p>
                </div>
              ) : receiptModal.data ? (
                <div className="thermal-receipt-paper" ref={receiptPrintRef} id="printable-receipt">
                  {/* Store Header */}
                  <div className="receipt-store-header">
                    <h2 className="receipt-store-name">{receiptModal.data.store?.name || 'JEM HARDWARE AND CONSTRUCTIONS SUPPLY'}</h2>
                    <p className="receipt-store-branch">{receiptModal.data.store?.branch || 'National Highway, Brgy. Dila, City of Santa Rosa, Laguna'}</p>
                    <p className="receipt-store-meta">VAT Reg. TIN: {receiptModal.data.store?.vat_reg_tin || '245-891-304-000'}</p>
                    <p className="receipt-store-meta">Tel: {receiptModal.data.store?.contact || '0917-892-4512 / (049) 534-1189'}</p>
                    <p className="receipt-store-permits">{receiptModal.data.store?.permits || 'BIR Perm: 2026-089-91823-POS • SN: JEM20260901-01'}</p>
                    <div className="receipt-divider-dashed"></div>
                  </div>

                  {/* Transaction Metadata */}
                  <div className="receipt-info-grid">
                    <div className="receipt-info-row">
                      <span>Order #:</span>
                      <strong>{receiptModal.data.transaction?.transaction_number}</strong>
                    </div>
                    <div className="receipt-info-row">
                      <span>Date & Time:</span>
                      <span>{new Date(receiptModal.data.transaction?.date_time || receiptModal.data.transaction?.created_at).toLocaleString()}</span>
                    </div>
                    <div className="receipt-info-row">
                      <span>Processed By:</span>
                      <span>{renderStaffName({ cashier_name: receiptModal.data.transaction?.cashier_name })} ({renderStaffRole({ cashier_name: receiptModal.data.transaction?.cashier_name, cashier_role: receiptModal.data.transaction?.cashier_role })})</span>
                    </div>
                    <div className="receipt-info-row">
                      <span>Customer:</span>
                      <span>{receiptModal.data.transaction?.customer_name || 'Walk-in'}</span>
                    </div>
                    <div className="receipt-info-row">
                      <span>Status:</span>
                      <strong className={`receipt-status-${(receiptModal.data.transaction?.status || 'PAID').toLowerCase()}`}>
                        {receiptModal.data.transaction?.status}
                      </strong>
                    </div>
                  </div>

                  <div className="receipt-divider-dashed"></div>

                  {/* Items List */}
                  <div className="receipt-items-container">
                    <div className="receipt-items-header">
                      <span className="col-desc">ITEM DESCRIPTION</span>
                      <span className="col-qty">QTY</span>
                      <span className="col-price">PRICE</span>
                      <span className="col-total">TOTAL</span>
                    </div>

                    <div className="receipt-items-list">
                      {(receiptModal.data.transaction?.items || []).map((it, idx) => (
                        <div className="receipt-item-row" key={it.id || idx}>
                          <div className="receipt-item-name">
                            {it.product_name || it.product?.name || 'Hardware Product'}
                            {it.sku && <span className="receipt-item-sku"> [{it.sku}]</span>}
                          </div>
                          <div className="receipt-item-cols">
                            <span className="col-qty">{it.quantity}</span>
                            <span className="col-price">₱{Number(it.unit_price).toFixed(2)}</span>
                            <span className="col-total">₱{Number(it.line_total || (it.unit_price * it.quantity)).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="receipt-divider-dashed"></div>

                  {/* Financial Totals */}
                  <div className="receipt-totals-box">
                    <div className="receipt-totals-row">
                      <span>SUBTOTAL</span>
                      <span>₱{Number(receiptModal.data.transaction?.gross_subtotal || receiptModal.data.transaction?.total_net || 0).toFixed(2)}</span>
                    </div>
                    <div className="receipt-totals-row receipt-grand-total">
                      <span>TOTAL</span>
                      <span>₱{Number(receiptModal.data.transaction?.total_net || 0).toFixed(2)}</span>
                    </div>

                    <div className="receipt-divider-solid"></div>

                    <div className="receipt-totals-row">
                      <span>PAYMENT METHOD</span>
                      <span>{(receiptModal.data.transaction?.payment_method || 'CASH').toUpperCase()}</span>
                    </div>

                    {receiptModal.data.transaction?.reference_number && (
                      <div className="receipt-totals-row">
                        <span>REF NO.</span>
                        <span>{receiptModal.data.transaction?.reference_number}</span>
                      </div>
                    )}

                    <div className="receipt-totals-row">
                      <span>AMOUNT RECEIVED</span>
                      <span>₱{Number(receiptModal.data.transaction?.amount_tendered || receiptModal.data.transaction?.total_net || 0).toFixed(2)}</span>
                    </div>

                    <div className="receipt-totals-row">
                      <span>CHANGE DUE</span>
                      <span>₱{Number(receiptModal.data.transaction?.change_due || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="receipt-divider-dashed"></div>

                  {/* Receipt Footer */}
                  <div className="receipt-footer-text">
                    <p className="thank-you">THANK YOU FOR YOUR PURCHASE!</p>
                    <p className="record-note">*** REPRINT / AUDIT COPY ***</p>
                    <p className="warranty-note">Please retain this receipt for warranty and returns within 7 days.</p>
                    <p className="system-tag">JEM POS & AUDIT SYSTEM v2.6</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. REFUND CONFIRMATION MODAL                            */}
      {/* ======================================================== */}
      {refundModal.open && refundModal.transaction && (
        <div className="tx-modal-overlay" onClick={() => setRefundModal({ open: false, transaction: null, reason: '', submitting: false, error: '' })}>
          <div className="tx-action-modal" onClick={e => e.stopPropagation()}>
            <div className="tx-action-modal-header refund-header">
              <div className="tx-modal-icon-title">
                <RotateCcw size={22} className="tx-icon-refund" />
                <h3>Process Refund</h3>
              </div>
              <button
                type="button"
                className="tx-modal-close-btn"
                onClick={() => setRefundModal({ open: false, transaction: null, reason: '', submitting: false, error: '' })}
              >
                <X size={20} />
              </button>
            </div>

            <div className="tx-action-modal-body">
              <div className="tx-alert-banner warning">
                <AlertTriangle size={18} />
                <span>
                  Are you sure you want to refund this transaction? This will restore product inventory and mark the ledger record as REFUNDED.
                </span>
              </div>

              {refundModal.error && (
                <div className="tx-alert-banner danger">
                  <AlertCircle size={18} />
                  <span>{refundModal.error}</span>
                </div>
              )}

              {/* Transaction Summary Card */}
              <div className="tx-summary-card">
                <div className="tx-summary-grid">
                  <div>
                    <label>Order #</label>
                    <strong>{refundModal.transaction.transaction_number}</strong>
                  </div>
                  <div>
                    <label>Processed By</label>
                    <span>{renderStaffName(refundModal.transaction)} ({renderStaffRole(refundModal.transaction)})</span>
                  </div>
                  <div>
                    <label>Customer</label>
                    <span>{refundModal.transaction.customer_name || 'Walk-in'}</span>
                  </div>
                  <div>
                    <label>Total Refund Amount</label>
                    <strong className="tx-highlight-amount">{formatCurrency(refundModal.transaction.total_net)}</strong>
                  </div>
                </div>

                {/* Items to be Restored Preview */}
                <div className="tx-items-preview-box">
                  <label className="tx-preview-label">Purchased Items to Restore:</label>
                  <ul className="tx-preview-items-list">
                    {(refundModal.transaction.items || []).map((it, i) => (
                      <li key={i}>
                        <span>{it.product_name || it.product?.name || 'Item'}</span>
                        <strong className="tx-stock-restored-tag">+{it.quantity} pcs</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Refund Reason */}
              <div className="tx-form-group">
                <label htmlFor="refund-reason">Refund Reason <span className="required">*</span></label>
                <textarea
                  id="refund-reason"
                  rows={3}
                  placeholder="Specify why this sale is being refunded (e.g., defective item, customer change of mind, incorrect spec)..."
                  value={refundModal.reason}
                  onChange={e => setRefundModal(prev => ({ ...prev, reason: e.target.value, error: '' }))}
                  className="tx-textarea"
                />
              </div>
            </div>

            <div className="tx-action-modal-footer">
              <button
                type="button"
                className="tx-btn-secondary"
                onClick={() => setRefundModal({ open: false, transaction: null, reason: '', submitting: false, error: '' })}
                disabled={refundModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tx-btn-confirm-refund"
                onClick={handleConfirmRefund}
                disabled={refundModal.submitting}
              >
                {refundModal.submitting ? (
                  <>
                    <RefreshCw size={16} className="tx-spin" />
                    Processing Refund...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    Continue Refund
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. VOID AUTHORIZATION MODAL (SECURE 6-DIGIT PIN)          */}
      {/* ======================================================== */}
      {voidModal.open && voidModal.transaction && (
        <div className="tx-modal-overlay" onClick={() => setVoidModal({ open: false, transaction: null, reason: '', pin: '', submitting: false, error: '' })}>
          <div className="tx-action-modal" onClick={e => e.stopPropagation()}>
            <div className="tx-action-modal-header void-header">
              <div className="tx-modal-icon-title">
                <Ban size={22} className="tx-icon-void" />
                <h3>Authorize Void Transaction</h3>
              </div>
              <button
                type="button"
                className="tx-modal-close-btn"
                onClick={() => setVoidModal({ open: false, transaction: null, reason: '', pin: '', submitting: false, error: '' })}
              >
                <X size={20} />
              </button>
            </div>

            <div className="tx-action-modal-body">
              <div className="tx-alert-banner danger">
                <Lock size={18} />
                <span>
                  SECURITY AUTHORIZATION REQUIRED. Voiding reverses the sale, returns inventory, and locks the transaction ledger record.
                </span>
              </div>

              {voidModal.error && (
                <div className="tx-alert-banner danger">
                  <AlertCircle size={18} />
                  <span>{voidModal.error}</span>
                </div>
              )}

              {/* Transaction Summary Card */}
              <div className="tx-summary-card">
                <div className="tx-summary-grid">
                  <div>
                    <label>Order #</label>
                    <strong>{voidModal.transaction.transaction_number}</strong>
                  </div>
                  <div>
                    <label>Processed By</label>
                    <span>{renderStaffName(voidModal.transaction)} ({renderStaffRole(voidModal.transaction)})</span>
                  </div>
                  <div>
                    <label>Customer</label>
                    <span>{voidModal.transaction.customer_name || 'Walk-in'}</span>
                  </div>
                  <div>
                    <label>Total</label>
                    <strong className="tx-highlight-amount">{formatCurrency(voidModal.transaction.total_net)}</strong>
                  </div>
                </div>

                {/* Items to Restore */}
                <div className="tx-items-preview-box">
                  <label className="tx-preview-label">Affected Stock Quantities to Reverse:</label>
                  <ul className="tx-preview-items-list">
                    {(voidModal.transaction.items || []).map((it, i) => (
                      <li key={i}>
                        <span>{it.product_name || it.product?.name || 'Item'}</span>
                        <strong className="tx-stock-restored-tag">+{it.quantity} pcs</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Void Reason */}
              <div className="tx-form-group">
                <label htmlFor="void-reason">Void Reason <span className="required">*</span></label>
                <textarea
                  id="void-reason"
                  rows={2}
                  placeholder="Required explanation for voiding this transaction..."
                  value={voidModal.reason}
                  onChange={e => setVoidModal(prev => ({ ...prev, reason: e.target.value, error: '' }))}
                  className="tx-textarea"
                />
              </div>

              {/* 6-Digit Void PIN Input */}
              <div className="tx-form-group">
                <label htmlFor="void-pin">
                  Enter 6-Digit Void PIN <span className="required">*</span>
                  <span className="tx-pin-hint">(Configured by Administrator)</span>
                </label>
                <div className="tx-pin-input-container">
                  <Lock size={18} className="tx-pin-lock-icon" />
                  <input
                    id="void-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={voidModal.pin}
                    onChange={e => {
                      const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setVoidModal(prev => ({ ...prev, pin: cleanVal, error: '' }))
                    }}
                    className="tx-pin-input"
                    autoFocus
                  />
                </div>
                <small className="tx-pin-note">Must contain exactly 6 digits (numbers only).</small>
              </div>
            </div>

            <div className="tx-action-modal-footer">
              <button
                type="button"
                className="tx-btn-secondary"
                onClick={() => setVoidModal({ open: false, transaction: null, reason: '', pin: '', submitting: false, error: '' })}
                disabled={voidModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tx-btn-confirm-void"
                onClick={handleConfirmVoid}
                disabled={voidModal.submitting || voidModal.pin.length !== 6 || !voidModal.reason.trim()}
              >
                {voidModal.submitting ? (
                  <>
                    <RefreshCw size={16} className="tx-spin" />
                    Authorizing Void...
                  </>
                ) : (
                  <>
                    <Ban size={16} />
                    Confirm Void
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
