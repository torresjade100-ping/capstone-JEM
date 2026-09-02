export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `http://${window.location.hostname}:8000/api`
    : 'http://127.0.0.1:8000/api')
).replace(/\/$/, '')

export function getStoredToken() {
  return localStorage.getItem('jem_api_token')
}

// Central Order Storage Manager (Syncs user-placed orders)
export function getSharedOrders() {
  try {
    const raw = localStorage.getItem('jem_shared_orders')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {}
  return []
}

export function saveSharedOrders(orders) {
  try {
    localStorage.setItem('jem_shared_orders', JSON.stringify(orders || []))
  } catch (e) {}
}

export function addSharedMobileOrder(orderData) {
  const currentOrders = getSharedOrders()
  const newOrder = {
    id: orderData.id || Date.now(),
    order_number: orderData.order_number || `JEM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    customer_id: orderData.customer_id || null,
    customer_name: orderData.customer_name || 'Customer',
    customer_phone: orderData.customer_phone || '',
    customer_email: orderData.customer_email || '',
    customer: {
      id: orderData.customer_id || null,
      user: {
        name: orderData.customer_name || 'Customer',
        email: orderData.customer_email || '',
        phone: orderData.customer_phone || ''
      }
    },
    items: orderData.items || [],
    status: orderData.status || 'pending',
    payment_method: orderData.payment_method || 'cod',
    payment_status: orderData.payment_method === 'cod' ? 'pending_collection' : 'verified',
    payments: [{
      method: orderData.payment_method || 'cod',
      status: orderData.payment_method === 'cod' ? 'pending' : 'completed',
      amount: orderData.total || 0,
      transaction_reference: orderData.payment_method === 'cod' ? null : `${orderData.payment_method?.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
    }],
    subtotal: orderData.subtotal || orderData.total || 0,
    shipping_fee: orderData.shipping_fee ?? 0,
    total: orderData.total || 0,
    delivery_type: orderData.delivery_type || 'delivery',
    delivery_address: orderData.delivery_address || '',
    delivery_date: orderData.delivery_date || new Date().toISOString().split('T')[0],
    notes: orderData.notes || '',
    order_source: orderData.order_source || 'Mobile App',
    created_at: new Date().toISOString()
  }

  const updated = [newOrder, ...currentOrders]
  saveSharedOrders(updated)

  // Send Notification to both Staff (to process) and Admin (to view/audit)
  const notifObj = {
    targetRole: 'all',
    title: 'New Customer Mobile Order 🛒',
    message: `Order #${newOrder.order_number} (₱${Number(newOrder.total).toLocaleString()}) placed by ${newOrder.customer_name} via ${(newOrder.payment_method || 'COD').toUpperCase()}`,
    type: 'order',
    data: {
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      total: newOrder.total,
      customer_name: newOrder.customer_name,
    }
  }
  addSharedNotification(notifObj)

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jem_notification_pop', { detail: notifObj }))
      window.dispatchEvent(new CustomEvent('jem_notification_update', { detail: notifObj }))
      window.dispatchEvent(new CustomEvent('jem_orders_update', { detail: newOrder }))
    }
  } catch (e) {}

  return newOrder
}


export function updateSharedOrderStatus(orderId, newStatus) {
  const currentOrders = getSharedOrders()
  let targetOrder = null
  const updated = currentOrders.map(ord => {
    if (ord.id === orderId || ord.order_number === orderId || String(ord.id) === String(orderId)) {
      targetOrder = {
        ...ord,
        status: newStatus,
        updated_at: new Date().toISOString()
      }
      return targetOrder
    }
    return ord
  })
  saveSharedOrders(updated)

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jem_orders_update', { detail: targetOrder || { id: orderId, status: newStatus } }))
      window.dispatchEvent(new CustomEvent('jem_notification_update', { detail: { targetRole: 'all' } }))
    }
  } catch (e) {}

  return updated
}


// Lightweight In-Memory Cache & In-Flight Request Deduplication Map
const apiCache = new Map()
const inFlightRequests = new Map()

export function clearApiCache(prefix = '') {
  if (!prefix) {
    apiCache.clear()
    return
  }
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) {
      apiCache.delete(key)
    }
  }
}

async function request(path, options = {}, cacheTtlMs = 0) {
  const token = getStoredToken()
  const isGet = !options.method || options.method === 'GET'
  const cacheKey = `${path}:${token || 'anon'}`

  // 1. Check cache for GET requests with TTL
  if (isGet && cacheTtlMs > 0) {
    const cached = apiCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      return cached.data
    }
  }

  // 2. In-flight request deduplication for concurrent identical GET calls
  if (isGet && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)
  }

  const execute = async () => {
    const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 401) {
      localStorage.removeItem('jem_api_token')
      localStorage.removeItem('jem_user')
    }
    if (!response.ok) {
      const error = new Error(payload.message || `Request failed with status ${response.status}`)
      error.status = response.status
      error.errors = payload.errors
      throw error
    }

    if (isGet && cacheTtlMs > 0) {
      apiCache.set(cacheKey, { timestamp: Date.now(), data: payload })
    }

    return payload
  }

  if (isGet) {
    const promise = execute().finally(() => {
      inFlightRequests.delete(cacheKey)
    })
    inFlightRequests.set(cacheKey, promise)
    return promise
  }

  // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
  clearApiCache()
  return execute()
}

function setSession(token, user) {
  if (token) localStorage.setItem('jem_api_token', token)
  if (user) localStorage.setItem('jem_user', JSON.stringify(user))
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('jem_user')) } catch { return null }
}

export async function login(credentials) {
  const payload = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
  if (!payload?.data?.token || !payload?.data?.user) {
    throw new Error(payload?.message || 'Login failed. Please check your credentials.')
  }
  setSession(payload.data.token, payload.data.user)
  clearApiCache()
  return payload.data
}

export async function register(values) {
  const payload = await request('/auth/register', { method: 'POST', body: JSON.stringify(values) })
  setSession(payload.data.token, payload.data.user)
  clearApiCache()
  return payload.data
}

export async function logout() {
  try { await request('/auth/logout', { method: 'POST' }) } finally {
    localStorage.removeItem('jem_api_token')
    localStorage.removeItem('jem_user')
    clearApiCache()
  }
}

export function getProducts(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/products${query ? `?${query}` : ''}`, {}, 10000).then((payload) => payload.data)
}

export function getProduct(id) { return request(`/products/${id}`, {}, 15000).then((payload) => payload.data) }
export function getCategories() { return request('/categories', {}, 30000).then((payload) => payload.data) }
export function getBrands() { return request('/brands', {}, 30000).then((payload) => payload.data) }
export function getInventory() { clearApiCache('/admin/inventory'); return request('/admin/inventory', {}, 5000).then((payload) => payload.data) }
export function getLowStock() { return request('/admin/inventory/low-stock', {}, 5000).then((payload) => payload.data) }

export function getSharedStockAdjustments(productId = null) {
  try {
    const raw = localStorage.getItem('jem_stock_adjustments')
    const list = raw ? JSON.parse(raw) : []
    if (productId) {
      return list.filter(item => String(item.product_id) === String(productId))
    }
    return list
  } catch (e) {
    return []
  }
}

export function addSharedStockAdjustment(record) {
  try {
    const raw = localStorage.getItem('jem_stock_adjustments')
    const list = raw ? JSON.parse(raw) : []
    const updated = [record, ...list].slice(0, 300)
    localStorage.setItem('jem_stock_adjustments', JSON.stringify(updated))
  } catch (e) {}
}

export async function adjustStock(payload) {
  clearApiCache('/admin/inventory')
  clearApiCache('/products')
  
  // Record in shared storage
  addSharedStockAdjustment({
    id: Date.now(),
    product_id: payload.product_id,
    product_name: payload.product_name || 'Product',
    quantity_before: payload.quantity_before ?? 0,
    quantity_changed: payload.quantity_change,
    quantity_after: payload.quantity_after ?? (Math.max(0, Number(payload.quantity_before || 0) + Number(payload.quantity_change))),
    adjustment_type: payload.adjustment_type || (payload.quantity_change > 0 ? 'add' : 'deduct'),
    reason: payload.reason || 'Manual Adjustment',
    notes: payload.notes || '',
    user: { name: 'Admin / Inventory Manager' },
    created_at: new Date().toISOString()
  })

  // Update local POS catalog cache
  try {
    const rawPos = localStorage.getItem('jem_pos_catalog')
    if (rawPos) {
      const list = JSON.parse(rawPos)
      const updated = list.map(p => {
        if (p.id === payload.product_id) {
          const nextStock = Math.max(0, Number(p.stock_quantity ?? p.stock ?? 0) + Number(payload.quantity_change))
          return { ...p, stock_quantity: nextStock, stock: nextStock }
        }
        return p
      })
      localStorage.setItem('jem_pos_catalog', JSON.stringify(updated))
    }
  } catch (e) {}

  try {
    await request('/admin/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('Backend stock adjustment failed, saved locally:', err)
  }

  window.dispatchEvent(new CustomEvent('jem_inventory_update', { detail: payload }))
  return { success: true }
}

export async function getStockAdjustments(productId = null) {
  const localList = getSharedStockAdjustments(productId)
  try {
    const url = productId ? `/admin/stock-adjustments/product/${productId}` : '/admin/stock-adjustments'
    const res = await request(url, {}, 4000)
    const backendList = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    
    // Merge backend + local history
    const map = new Map()
    localList.forEach(item => map.set(String(item.id), item))
    backendList.forEach(item => map.set(String(item.id), item))
    const merged = Array.from(map.values())
    merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    return merged
  } catch (e) {
    return localList
  }
}

export async function toggleProductStatus(productId, currentStatus) {
  const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
  clearApiCache('/admin/inventory')
  clearApiCache('/products')
  
  try {
    const endpoint = nextStatus === 'active' ? `/admin/products/${productId}/activate` : `/admin/products/${productId}/deactivate`
    await request(endpoint, { method: 'POST' })
  } catch (err) {
    try {
      await request(`/admin/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      })
    } catch (e) {}
  }

  // Update local storage caches
  try {
    const rawPos = localStorage.getItem('jem_pos_catalog')
    if (rawPos) {
      const list = JSON.parse(rawPos)
      const updated = list.map(p => p.id === productId ? { ...p, status: nextStatus } : p)
      localStorage.setItem('jem_pos_catalog', JSON.stringify(updated))
    }
  } catch (e) {}

  // Record status change in stock adjustment history
  addSharedStockAdjustment({
    id: Date.now(),
    product_id: productId,
    quantity_changed: 0,
    adjustment_type: nextStatus === 'active' ? 'activated' : 'deactivated',
    reason: `Product status switched to ${nextStatus}`,
    user: { name: 'Admin' },
    created_at: new Date().toISOString()
  })

  window.dispatchEvent(new CustomEvent('jem_inventory_update', { detail: { product_id: productId, status: nextStatus } }))
  return { nextStatus }
}

export function getUsers(params = {}) { const query = new URLSearchParams(params).toString(); return request(`/admin/users${query ? `?${query}` : ''}`, {}, 5000).then((payload) => payload.data) }
export function createUser(user) { return request('/admin/users', { method: 'POST', body: JSON.stringify(user) }).then((payload) => payload.data) }
export function updateUser(id, user) { return request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }).then((payload) => payload.data) }
export function archiveUser(id) { return request(`/admin/users/${id}/archive`, { method: 'PATCH' }).then((payload) => payload.data) }
export function activateUser(id) { return request(`/admin/users/${id}/activate`, { method: 'PATCH' }).then((payload) => payload.data) }
export function deleteUser(id) { clearApiCache('/admin/users'); return request(`/admin/users/${id}`, { method: 'DELETE' }).then((payload) => payload.data) }
export function changeUserRole(id, role) { return request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }).then((payload) => payload.data) }


export async function getAdminOrders(params = {}) {
  const shared = getSharedOrders()
  try {
    const query = new URLSearchParams(params).toString()
    const payload = await request(`/admin/orders${query ? `?${query}` : ''}`, {}, 3000)
    const backendList = Array.isArray(payload.data) ? payload.data : payload.data?.data || []
    
    // Merge backend MySQL orders and shared orders by order_number or id
    const mergedMap = new Map()
    shared.forEach((item) => mergedMap.set(String(item.order_number || item.id), item))
    backendList.forEach((item) => {
      mergedMap.set(String(item.order_number || item.id), {
        id: item.id,
        order_number: item.order_number,
        customer_name: item.customer?.user?.name || item.customer_name || 'Customer',
        customer_phone: item.customer?.user?.phone || item.customer_phone || '',
        customer_email: item.customer?.user?.email || item.customer_email || '',
        customer: item.customer || null,
        items: (item.items || []).map(i => ({
          product_id: i.product_id,
          name: i.product?.name || i.name || 'Hardware Material',
          quantity: i.quantity,
          unit_price: i.unit_price || i.product?.base_price || 0,
        })),
        status: item.status || 'pending',
        payment_method: item.payment_method || 'cod',
        subtotal: item.subtotal || 0,
        shipping_fee: item.shipping_fee || 0,
        total: item.total || 0,
        delivery_type: item.delivery_type || 'delivery',
        delivery_address: item.delivery_address || '',
        delivery_date: item.delivery_date || '',
        order_source: 'Mobile App',
        created_at: item.created_at || new Date().toISOString()
      })
    })
    return Array.from(mergedMap.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  } catch (err) {
    return shared
  }
}


export async function updateOrderStatus(id, status) {
  try {
    await request(`/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
  } catch (e) {}
  return updateSharedOrderStatus(id, status)
}

export async function getStaffOrders(params = {}) {
  try {
    const query = new URLSearchParams(params).toString()
    const payload = await request(`/staff/orders${query ? `?${query}` : ''}`)
    const list = Array.isArray(payload.data) ? payload.data : payload.data?.data || []
    if (list.length > 0) return list
    return getSharedOrders()
  } catch (err) {
    return getSharedOrders()
  }
}

export async function updateStaffOrderStatus(id, action) {
  try {
    await request(`/staff/orders/${id}/${action}`, { method: 'PUT' })
  } catch (e) {}
  return updateSharedOrderStatus(id, action)
}

// Central Stock Request Storage Manager (Shared across Staff and Admin)
export function getSharedStockRequests() {
  try {
    const raw = localStorage.getItem('jem_shared_stock_requests')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Enforce strict uniqueness by ID
        const map = new Map()
        parsed.forEach(item => {
          if (item && item.id) {
            map.set(String(item.id), item)
          }
        })
        return Array.from(map.values())
      }
    }
  } catch (e) {}
  return []
}

export function saveSharedStockRequests(requests) {
  try {
    const map = new Map()
    if (Array.isArray(requests)) {
      requests.forEach(item => {
        if (item && item.id) {
          map.set(String(item.id), item)
        }
      })
    }
    const cleanList = Array.from(map.values())
    localStorage.setItem('jem_shared_stock_requests', JSON.stringify(cleanList))
  } catch (e) {}
}

export function addSharedStockRequest(requestData, user) {
  const current = getSharedStockRequests()
  const newReq = {
    id: requestData.id || Date.now(),
    product_id: requestData.product_id,
    product_name: requestData.product_name || requestData.product?.name || 'Product',
    sku: requestData.sku || requestData.product?.sku || 'SKU-REQ',
    quantity_requested: Number(requestData.quantity_requested || requestData.requested_quantity || 1),
    requested_quantity: Number(requestData.quantity_requested || requestData.requested_quantity || 1),
    current_quantity: Number(requestData.current_quantity || requestData.product?.stock_quantity || 0),
    requested_by: user?.name || requestData.requested_by || 'Staff Member',
    requested_by_id: user?.id || null,
    urgency: requestData.urgency || 'normal',
    staff_notes: requestData.notes || requestData.staff_notes || '',
    admin_notes: requestData.admin_notes || '',
    status: requestData.status || 'pending',
    created_at: requestData.created_at || new Date().toISOString()
  }

  // Deduplicate before saving
  const filtered = current.filter(r => String(r.id) !== String(newReq.id))
  const updated = [newReq, ...filtered]
  saveSharedStockRequests(updated)

  // Dispatch live browser event so UI tables and badges immediately update without duplicate notification entries
  try {
    window.dispatchEvent(new CustomEvent('jem_stock_request_created', { detail: newReq }))
    window.dispatchEvent(new CustomEvent('jem_notification_update'))
  } catch (e) {}

  return newReq
}

export function updateSharedStockRequest(id, status, notes, adminUser) {
  const current = getSharedStockRequests()
  let targetReq = null
  const updated = current.map(req => {
    if (req.id === id || String(req.id) === String(id)) {
      targetReq = {
        ...req,
        status,
        admin_notes: notes || req.admin_notes || '',
        updated_at: new Date().toISOString()
      }
      return targetReq
    }
    return req
  })
  saveSharedStockRequests(updated)

  return updated
}

// Central Notifications Manager
export function getSharedNotifications(role = 'all') {
  try {
    const raw = localStorage.getItem('jem_shared_notifications')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const seenMap = new Map()
        const deduplicated = []
        parsed.forEach(n => {
          if (!n || !n.id) return
          const reqId = n.data?.request_id || ''
          const key = reqId ? `${n.type || 'stock_request'}_${reqId}_${n.data?.status || ''}` : `notif_${n.id}`
          if (!seenMap.has(key)) {
            seenMap.set(key, true)
            deduplicated.push(n)
          }
        })
        if (role === 'all') return deduplicated
        return deduplicated.filter(n => !n.targetRole || n.targetRole === role || n.targetRole === 'all')
      }
    }
  } catch (e) {}
  return []
}

export function saveSharedNotifications(notifications) {
  try {
    const seenMap = new Map()
    const cleanList = []
    if (Array.isArray(notifications)) {
      notifications.forEach(n => {
        if (!n || !n.id) return
        const reqId = n.data?.request_id || ''
        const key = reqId ? `${n.type || 'stock_request'}_${reqId}_${n.data?.status || ''}` : `notif_${n.id}`
        if (!seenMap.has(key)) {
          seenMap.set(key, true)
          cleanList.push(n)
        }
      })
    }
    localStorage.setItem('jem_shared_notifications', JSON.stringify(cleanList))
  } catch (e) {}
}

export function addSharedNotification({ targetRole = 'admin', title, message, type = 'stock_request', data = {} }) {
  const current = getSharedNotifications('all')
  const newNotif = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    targetRole,
    title: title || 'Notification',
    message: message || '',
    type,
    data,
    read: false,
    created_at: new Date().toISOString()
  }
  const updated = [newNotif, ...current]
  saveSharedNotifications(updated)

  // Dispatch live browser event for real-time notification pop-ups
  try {
    window.dispatchEvent(new CustomEvent('jem_notification_update', { detail: newNotif }))
    window.dispatchEvent(new CustomEvent('jem_notification_pop', { detail: newNotif }))
  } catch (e) {}

  return newNotif
}

export async function getRestockRequests() {
  clearApiCache('/restock-requests')
  try {
    const payload = await request('/restock-requests', {}, 0)
    const backendRaw = Array.isArray(payload.data) ? payload.data : payload.data?.data || []
    
    // Normalize backend database records
    const cleanList = backendRaw.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product?.name || item.product_name || 'Product',
      sku: item.product?.sku || item.sku || '-',
      quantity_requested: item.requested_quantity ?? item.quantity_requested ?? item.quantity ?? 1,
      requested_quantity: item.requested_quantity ?? item.quantity_requested ?? item.quantity ?? 1,
      current_quantity: item.product?.stock_quantity ?? item.current_quantity ?? 0,
      requested_by: item.requester?.name || item.requested_by || 'Staff',
      requester: item.requester || null,
      product: item.product || null,
      urgency: item.urgency || 'normal',
      status: item.status || 'pending',
      staff_notes: item.notes || item.staff_notes || '',
      admin_notes: item.admin_notes || '',
      created_at: item.created_at,
    }))

    // Save accurate database list to shared cache for offline fallback
    saveSharedStockRequests(cleanList)
    return cleanList
  } catch (err) {
    // Offline fallback to stored requests
    return getSharedStockRequests()
  }
}

export async function createRestockRequest(requestData, user) {
  clearApiCache('/restock-requests')
  try {
    const qty = Number(requestData.requested_quantity || requestData.quantity_requested || requestData.quantity || 1)
    const res = await request('/restock-requests', {
      method: 'POST',
      body: JSON.stringify({
        product_id: requestData.product_id,
        product_variant_id: requestData.product_variant_id || null,
        requested_quantity: qty,
        quantity_requested: qty,
        notes: requestData.notes || requestData.staff_notes || '',
        urgency: requestData.urgency || 'normal'
      })
    })

    const createdRecord = res?.data || res
    if (createdRecord && createdRecord.id) {
      // Sync into shared storage with real database ID
      addSharedStockRequest({
        ...requestData,
        ...createdRecord,
        id: createdRecord.id
      }, user)
      clearApiCache('/restock-requests')
      return createdRecord
    }
    return addSharedStockRequest(requestData, user)
  } catch (err) {
    console.warn('Backend stock request error, fallback to shared storage:', err)
    return addSharedStockRequest(requestData, user)
  }
}

export async function updateRestockRequest(id, requestData, adminUser) {
  updateSharedStockRequest(id, requestData.status, requestData.notes, adminUser)
  clearApiCache('/restock-requests')
  clearApiCache('/admin/inventory')
  clearApiCache('/products')
  try {
    const res = await request(`/restock-requests/${id}`, { method: 'PUT', body: JSON.stringify(requestData) }).then((p) => p.data)
    clearApiCache('/restock-requests')
    try {
      window.dispatchEvent(new CustomEvent('jem_inventory_update', { detail: { id, status: requestData.status } }))
    } catch (e) {}
    return res
  } catch (err) {
    try {
      window.dispatchEvent(new CustomEvent('jem_inventory_update', { detail: { id, status: requestData.status } }))
    } catch (e) {}
    return requestData
  }
}

export function getStaffRestockRequests() { return getRestockRequests() }
export function createStaffRestockRequest(requestData, user) { return createRestockRequest(requestData, user) }
export function getOrderAdjustments() { return request('/staff/order-adjustments').then((payload) => payload.data) }
export function createOrderAdjustment(requestData) { return request('/staff/order-adjustments', { method: 'POST', body: JSON.stringify(requestData) }).then((payload) => payload.data) }
export async function createPosCheckout(transaction) {

  clearApiCache()
  
  const backendItems = (transaction.items || []).map(item => ({
    product_id: item.product_id || item.id,
    product_variant_id: item.product_variant_id || null,
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.unit_price || item.price || 0)
  }))

  const payload = {
    items: backendItems,
    payment_method: transaction.payment_method === 'cash' ? 'cod' : (transaction.payment_method || 'cod'),
    discount: Number(transaction.discount || 0)
  }

  // Also log into shared orders as a Walk-in POS completed sale
  try {
    addSharedMobileOrder({
      id: Date.now(),
      order_number: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
      customer_name: 'Walk-in Customer',
      customer_phone: 'N/A',
      customer_email: 'walkin@store.local',
      items: (transaction.items || []).map(i => ({
        product_id: i.product_id || i.id,
        name: i.name || 'Product',
        product_name: i.name || 'Product',
        quantity: Number(i.quantity || 1),
        price: Number(i.unit_price || i.price || 0),
        unit_price: Number(i.unit_price || i.price || 0),
        total: Number((i.unit_price || i.price || 0) * (i.quantity || 1))
      })),
      status: 'completed',
      payment_method: transaction.payment_method || 'cash',
      payment_status: 'paid',
      total: Number(transaction.total || backendItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0)),
      subtotal: Number(transaction.total || backendItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0)),
      shipping_fee: 0,
      delivery_type: 'pickup',
      order_source: 'Walk-in POS'
    })
  } catch (e) {}

  try {
    const res = await request('/staff/walk-in-orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    }).then((p) => p.data)

    clearApiCache()
    try {
      window.dispatchEvent(new CustomEvent('jem_inventory_update'))
    } catch (e) {}

    return res
  } catch (err) {
    clearApiCache()
    try {
      window.dispatchEvent(new CustomEvent('jem_inventory_update'))
    } catch (e) {}
    return { transaction: { transaction_number: `POS-${Date.now()}` } }
  }
}

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

export async function getNotifications(role = 'all') {
  clearApiCache('/notifications')
  try {
    const payload = await request('/notifications', {}, 0)
    const list = Array.isArray(payload.data) ? payload.data : payload.data?.data || []
    
    // Deduplicate database notifications by ID and semantic request_id
    const seenMap = new Map()
    const cleanList = []

    list.forEach((item) => {
      if (!item || !item.id) return
      const id = item.id
      const type = item.type || 'general'
      const reqId = item.data?.request_id || ''
      const dedupeKey = reqId ? `${type}_${reqId}_${item.data?.status || ''}` : `id_${id}`
      
      if (!seenMap.has(dedupeKey) && !seenMap.has(`id_${id}`)) {
        seenMap.set(dedupeKey, true)
        seenMap.set(`id_${id}`, true)
        cleanList.push({
          id: item.id,
          title: item.title || item.data?.title || 'Notification',
          message: item.message || item.data?.message || '',
          type: type,
          read: Boolean(item.read),
          created_at: item.created_at,
          data: item.data || {}
        })
      }
    })

    const sorted = cleanList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    saveSharedNotifications(sorted)
    return sorted
  } catch (err) {
    return getSharedNotifications(role)
  }
}


export async function createNotification(notification) {
  addSharedNotification(notification)
  try {
    return await request('/notifications', { method: 'POST', body: JSON.stringify(notification) }).then((payload) => payload.data)
  } catch (err) {
    return notification
  }
}

export function markNotificationRead(id) {
  const current = getSharedNotifications('all')
  const updated = current.map(n => n.id === id || String(n.id) === String(id) ? { ...n, read: true } : n)
  saveSharedNotifications(updated)
  return request(`/notifications/${id}/read`, { method: 'POST' }).then((payload) => payload.data).catch(() => updated)
}

export function markAllNotificationsRead() {
  const current = getSharedNotifications('all')
  const updated = current.map(n => ({ ...n, read: true }))
  saveSharedNotifications(updated)
  return request('/notifications/read-all', { method: 'POST' }).then((payload) => payload.data).catch(() => updated)
}

export function clearAllNotifications() {
  saveSharedNotifications([])
  return request('/notifications/clear-all', { method: 'DELETE' }).then((payload) => payload.data).catch(() => [])
}

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
export function checkout(order) {
  addSharedMobileOrder(order)
  return request('/orders/checkout', { method: 'POST', body: JSON.stringify(order) })
}
export function getOrders() { return request('/orders').then((payload) => payload.data).catch(() => getSharedOrders()) }
export function getOrder(id) { return request(`/orders/${id}`).then((payload) => payload.data) }
export function initiatePayment(payment) { return request('/payments/initiate', { method: 'POST', body: JSON.stringify(payment) }).then((payload) => payload.data) }

export function apiUrl() { return API_BASE_URL }
