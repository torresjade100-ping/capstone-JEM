export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

let authToken = localStorage.getItem('jem_api_token')

async function request(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.errors = payload.errors
    throw error
  }
  return payload
}

function setSession(token, user) {
  authToken = token
  if (token) localStorage.setItem('jem_api_token', token)
  if (user) localStorage.setItem('jem_user', JSON.stringify(user))
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('jem_user')) } catch { return null }
}

export async function login(credentials) {
  const payload = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
  setSession(payload.data.token, payload.data.user)
  return payload.data
}

export async function register(values) {
  const payload = await request('/auth/register', { method: 'POST', body: JSON.stringify(values) })
  setSession(payload.data.token, payload.data.user)
  return payload.data
}

export async function logout() {
  try { await request('/auth/logout', { method: 'POST' }) } finally {
    authToken = null
    localStorage.removeItem('jem_api_token')
    localStorage.removeItem('jem_user')
  }
}

export function getProducts(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/products${query ? `?${query}` : ''}`).then((payload) => payload.data)
}

export function getProduct(id) { return request(`/products/${id}`).then((payload) => payload.data) }
export function getCategories() { return request('/categories').then((payload) => payload.data) }
export function getBrands() { return request('/brands').then((payload) => payload.data) }
export function getInventory() { return request('/admin/inventory').then((payload) => payload.data) }
export function getLowStock() { return request('/admin/inventory/low-stock').then((payload) => payload.data) }
export function getUsers(params = {}) { const query = new URLSearchParams(params).toString(); return request(`/admin/users${query ? `?${query}` : ''}`).then((payload) => payload.data) }
export function createUser(user) { return request('/admin/users', { method: 'POST', body: JSON.stringify(user) }).then((payload) => payload.data) }
export function updateUser(id, user) { return request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }).then((payload) => payload.data) }
export function archiveUser(id) { return request(`/admin/users/${id}/archive`, { method: 'PATCH' }).then((payload) => payload.data) }
export function activateUser(id) { return request(`/admin/users/${id}/activate`, { method: 'PATCH' }).then((payload) => payload.data) }
export function changeUserRole(id, role) { return request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }).then((payload) => payload.data) }
export function getAdminOrders(params = {}) { const query = new URLSearchParams(params).toString(); return request(`/admin/orders${query ? `?${query}` : ''}`).then((payload) => payload.data) }
export function updateOrderStatus(id, status) { return request(`/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }).then((payload) => payload.data) }
export function getStaffOrders(params = {}) { const query = new URLSearchParams(params).toString(); return request(`/staff/orders${query ? `?${query}` : ''}`).then((payload) => payload.data) }
export function updateStaffOrderStatus(id, action) { return request(`/staff/orders/${id}/${action}`, { method: 'PUT' }).then((payload) => payload.data) }
export function getRestockRequests() { return request('/restock-requests').then((payload) => payload.data) }
export function createRestockRequest(requestData) { return request('/restock-requests', { method: 'POST', body: JSON.stringify(requestData) }).then((payload) => payload.data) }
export function updateRestockRequest(id, requestData) { return request(`/restock-requests/${id}`, { method: 'PUT', body: JSON.stringify(requestData) }).then((payload) => payload.data) }
export function getStaffRestockRequests() { return request('/staff/restock-requests').then((payload) => payload.data) }
export function createStaffRestockRequest(requestData) { return request('/staff/restock-requests', { method: 'POST', body: JSON.stringify(requestData) }).then((payload) => payload.data) }
export function getOrderAdjustments() { return request('/staff/order-adjustments').then((payload) => payload.data) }
export function createOrderAdjustment(requestData) { return request('/staff/order-adjustments', { method: 'POST', body: JSON.stringify(requestData) }).then((payload) => payload.data) }
export function createPosCheckout(transaction) { return request('/staff/walk-in-orders', { method: 'POST', body: JSON.stringify({ ...transaction, payment_method: transaction.payment_method === 'cash' ? 'cod' : transaction.payment_method }) }).then((payload) => payload.data) }
export function createProduct(product) { return request('/admin/products', { method: 'POST', body: JSON.stringify(product) }).then((payload) => payload.data) }
export function updateProduct(id, product) { return request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(product) }).then((payload) => payload.data) }
export function archiveProduct(id) { return request(`/admin/products/${id}/deactivate`, { method: 'POST' }).then((payload) => payload.data) }
export function createStockAdjustment(adjustment) { return request('/admin/stock-adjustments', { method: 'POST', body: JSON.stringify(adjustment) }).then((payload) => payload.data) }
export function getSalesReport(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/admin/reports/sales${query ? `?${query}` : ''}`).then((payload) => payload.data)
}
export function getPeriodReport(period, params = {}) { const query = new URLSearchParams(params).toString(); return request(`/admin/reports/${period}${query ? `?${query}` : ''}`).then((payload) => payload.data) }
export function reportCsvUrl(period, params = {}) { const query = new URLSearchParams(params).toString(); return `${API_BASE_URL}/admin/reports/${period}/csv${query ? `?${query}` : ''}` }
export function getSuppliers() { return request('/admin/suppliers').then((payload) => payload.data) }
export function createSupplier(supplier) { return request('/admin/suppliers', { method: 'POST', body: JSON.stringify(supplier) }).then((payload) => payload.data) }
export function getPurchaseOrders() { return request('/admin/purchase-orders').then((payload) => payload.data) }
export function createPurchaseOrder(order) { return request('/admin/purchase-orders', { method: 'POST', body: JSON.stringify(order) }).then((payload) => payload.data) }
export function approvePurchaseOrder(id) { return request(`/admin/purchase-orders/${id}/approve`, { method: 'POST' }).then((payload) => payload.data) }
export function receivePurchaseOrder(id, receipt) { return request(`/admin/purchase-orders/${id}/receive`, { method: 'POST', body: JSON.stringify(receipt) }).then((payload) => payload.data) }
export function getBackorders() { return request('/admin/backorders').then((payload) => payload.data) }
export function fulfillBackorder(id, details) { return request(`/admin/backorders/${id}/fulfill`, { method: 'POST', body: JSON.stringify(details) }).then((payload) => payload.data) }
export function createAdminPosCheckout(transaction) { return request('/pos/checkout', { method: 'POST', body: JSON.stringify(transaction) }).then((payload) => payload.data) }
export function createQuickSale(transaction) { return request('/express/quick-sale', { method: 'POST', body: JSON.stringify(transaction) }).then((payload) => payload.data) }
export function getNotifications() { return request('/notifications').then((payload) => payload.data) }
export function createNotification(notification) { return request('/notifications', { method: 'POST', body: JSON.stringify(notification) }).then((payload) => payload.data) }
export function markNotificationRead(id) { return request(`/notifications/${id}/read`, { method: 'POST' }).then((payload) => payload.data) }
export function submitFeedback(feedback) { return request('/feedback', { method: 'POST', body: JSON.stringify(feedback) }).then((payload) => payload.data) }
export function getFeedback() { return request('/feedback').then((payload) => payload.data) }
export function getPayments() { return request('/payments').then((payload) => payload.data) }
export function getStaffFeedback() { return request('/staff/feedback').then((payload) => payload.data) }
export function getAdminFeedback() { return request('/admin/feedback').then((payload) => payload.data) }

export function getCart() { return request('/cart').then((payload) => payload.data) }
export function addToCart(productId, quantity, productVariantId = null) {
  return request('/cart', { method: 'POST', body: JSON.stringify({ product_id: productId, product_variant_id: productVariantId, quantity }) }).then((payload) => payload.data)
}
export function updateCartItem(id, quantity) { return request(`/cart/items/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }).then((payload) => payload.data) }
export function removeCartItem(id) { return request(`/cart/items/${id}`, { method: 'DELETE' }).then((payload) => payload.data) }
export function checkout(order) { return request('/orders/checkout', { method: 'POST', body: JSON.stringify(order) }).then((payload) => payload.data) }
export function getOrders() { return request('/orders').then((payload) => payload.data) }
export function getOrder(id) { return request(`/orders/${id}`).then((payload) => payload.data) }
export function initiatePayment(payment) { return request('/payments/initiate', { method: 'POST', body: JSON.stringify(payment) }).then((payload) => payload.data) }

export function apiUrl() { return API_BASE_URL }
