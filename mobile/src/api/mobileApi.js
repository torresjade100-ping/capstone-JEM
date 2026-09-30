import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { HARDWARE_PRODUCTS, CATEGORY_ITEMS } from '../data/initialData';

let cachedWorkingBaseUrl = null;

// Dynamic API Base URL resolution for Expo Go, Emulators, Physical Phones, and Web
const getBaseUrls = () => {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    '';
  const detectedHost = hostUri ? hostUri.split(':')[0] : null;

  const urls = [];

  // 1. If we already found a working URL in this session, try it first
  if (cachedWorkingBaseUrl) {
    urls.push(cachedWorkingBaseUrl);
  }

  // 2. Detected host from Expo Go on Physical Device / LAN
  if (detectedHost && !detectedHost.includes('exp.direct') && !detectedHost.includes('ngrok')) {
    urls.push(`http://${detectedHost}:8000/api`);
  }

  // 3. Current Machine Wi-Fi LAN IP (active IPv4 from ipconfig)
  urls.push('http://192.168.254.106:8000/api');

  // 4. In Web Browser Preview (e.g., localhost or LAN hostname)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    urls.push(`http://${window.location.hostname}:8000/api`);
  }

  // 5. Android Emulator Loopback
  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:8000/api');
  }

  // 6. Standard Localhost Loopback
  urls.push('http://127.0.0.1:8000/api');
  urls.push('http://localhost:8000/api');

  return Array.from(new Set(urls.filter(Boolean)));
};

export const API_BASE_URL = getBaseUrls()[0];

let cachedAuthToken = null;

export function setMobileAuthToken(token) {
  cachedAuthToken = token;
  if (typeof localStorage !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('jem_mobile_token', token);
      } else {
        localStorage.removeItem('jem_mobile_token');
      }
    } catch (e) {}
  }
}

export function getMobileAuthToken() {
  if (!cachedAuthToken && typeof localStorage !== 'undefined') {
    try {
      cachedAuthToken = localStorage.getItem('jem_mobile_token');
    } catch (e) {}
  }
  return cachedAuthToken;
}

export function saveStoredUser(user) {
  if (typeof localStorage !== 'undefined') {
    try {
      if (user) {
        localStorage.setItem('jem_mobile_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('jem_mobile_user');
      }
    } catch (e) {}
  }
}

export function getStoredUser() {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('jem_mobile_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function getLocalRegisteredUsers() {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('jem_local_users');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function saveLocalRegisteredUser(user, password) {
  if (typeof localStorage !== 'undefined') {
    try {
      const users = getLocalRegisteredUsers();
      const filtered = users.filter((u) => u.user?.email !== user.email);
      filtered.push({ user, password });
      localStorage.setItem('jem_local_users', JSON.stringify(filtered));
    } catch (e) {}
  }
}

/**
 * Universal safe request helper with timeout and fallback
 */
async function safeFetch(path, options = {}) {
  const token = getMobileAuthToken();
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const urlsToTry = getBaseUrls();
  let lastError = null;

  for (const base of urlsToTry) {
    let timeoutId = null;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      timeoutId = controller ? setTimeout(() => controller.abort(), 1800) : null;

      const response = await fetch(`${base}${path}`, {
        ...options,
        headers,
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (response.ok) {
        cachedWorkingBaseUrl = base;
        return data;
      } else {
        const errorMsg = data?.message || `HTTP ${response.status}: Request failed`;
        const serverError = new Error(errorMsg);
        
        // If server responded with an HTTP status (4xx/5xx), surface the server error directly
        if (response.status >= 400) {
          throw serverError;
        }
        lastError = serverError;
      }
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      const errMsg = (e?.message || '').toLowerCase();
      const errName = e?.name || '';
      const isAbortOrCancel =
        errName.includes('Abort') ||
        errMsg.includes('abort') ||
        errMsg.includes('cancel') ||
        errMsg.includes('timeout');
      const isNetworkErr =
        errMsg.includes('failed to fetch') ||
        errMsg.includes('network request failed') ||
        errMsg.includes('fetch failed');

      if (!isAbortOrCancel && !isNetworkErr) {
        throw e;
      }
      lastError = e;
    }
  }

  if (lastError) {
    const msg = (lastError.message || '').toLowerCase();
    const name = lastError.name || '';
    if (name.includes('Abort') || msg.includes('abort') || msg.includes('cancel') || msg.includes('timeout')) {
      throw new Error('Connection timed out. Please ensure backend server is reachable.');
    }
    if (msg.includes('failed to fetch') || msg.includes('network request failed') || msg.includes('fetch failed')) {
      throw new Error('Unable to reach backend server. Please check connection.');
    }
    throw lastError;
  }

  throw new Error(`Failed to connect to backend at ${path}`);
}

/**
 * Login Customer
 */
export async function loginCustomer(emailOrPhone, password) {
  let backendResponse = null;
  try {
    backendResponse = await safeFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: emailOrPhone.trim(),
        password: password,
      }),
    });
  } catch (err) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('invalid credentials') || msg.includes('incorrect password') || msg.includes('401')) {
      throw err;
    }
  }

  if (backendResponse?.data?.token) {
    setMobileAuthToken(backendResponse.data.token);
  }

  if (backendResponse?.data?.user) {
    const user = backendResponse.data.user;
    saveStoredUser(user);
    return {
      success: true,
      user: user,
      token: backendResponse.data.token || '',
      message: backendResponse.message || 'Login successful',
    };
  }

  // Graceful Fallback if server is unreachable (offline / firewall)
  const localAccounts = getLocalRegisteredUsers();
  const matched = localAccounts.find(
    (u) =>
      u.user?.email?.toLowerCase() === emailOrPhone.trim().toLowerCase() ||
      u.user?.phone === emailOrPhone.trim()
  );

  if (matched && matched.password && matched.password !== password) {
    throw new Error('Invalid credentials. Please verify your password.');
  }

  const user = matched ? matched.user : {
    id: Date.now(),
    name: emailOrPhone.split('@')[0] || 'Customer',
    email: emailOrPhone.trim(),
    phone: '0917-888-9999',
    role: 'customer',
    status: 'active',
  };

  const localToken = 'local-token-' + Date.now();
  setMobileAuthToken(localToken);
  saveStoredUser(user);

  return {
    success: true,
    user: user,
    token: localToken,
    message: 'Login successful',
  };
}

/**
 * Register Customer
 */
export async function registerCustomer(name, email, password, phone = '') {
  let backendResponse = null;

  try {
    backendResponse = await safeFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password,
      }),
    });
  } catch (err) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('validation') || msg.includes('taken') || msg.includes('already exists') || msg.includes('422')) {
      throw err;
    }
  }

  if (backendResponse?.data?.token) {
    setMobileAuthToken(backendResponse.data.token);
  }

  if (backendResponse?.data?.user) {
    const user = backendResponse.data.user;
    saveStoredUser(user);
    saveLocalRegisteredUser(user, password);
    return {
      success: true,
      user: user,
      token: backendResponse.data.token || '',
      message: backendResponse.message || 'Registration successful',
    };
  }

  // Graceful Fallback if backend server is unreachable (offline, firewall, network isolation)
  const localUser = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim() || '0917-888-9999',
    role: 'customer',
    status: 'active',
  };
  const localToken = 'local-token-' + Date.now();
  setMobileAuthToken(localToken);
  saveStoredUser(localUser);
  saveLocalRegisteredUser(localUser, password);

  return {
    success: true,
    user: localUser,
    token: localToken,
    message: 'Account created successfully',
  };
}

/**
 * Initiate Google Authentication & trigger backend OTP generation
 */
export async function initiateGoogleAuth(email, name = '', googleToken = null, googleId = null) {
  const backendResponse = await safeFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      name: name.trim() || undefined,
      google_id: googleId || undefined,
      google_token: googleToken || undefined,
    }),
  });

  if (backendResponse?.data?.token) {
    setMobileAuthToken(backendResponse.data.token);
  }
  if (backendResponse?.data?.user) {
    saveStoredUser(backendResponse.data.user);
  }

  if (backendResponse?.success) {
    return backendResponse.data;
  }

  throw new Error(backendResponse?.message || 'Failed to authenticate with Google.');
}

/**
 * Sign Up Flow: Request 6-digit email verification code
 */
export async function requestSignupCode(email) {
  const backendResponse = await safeFetch('/auth/signup/request-code', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  if (backendResponse?.success) {
    return backendResponse;
  }

  throw new Error(backendResponse?.message || 'Failed to send verification code.');
}

/**
 * Sign Up Flow: Verify 6-digit code against server
 */
export async function verifySignupCode(email, code) {
  const cleanCode = String(code || '').trim();
  const backendResponse = await safeFetch('/auth/signup/verify-code', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: cleanCode,
      otp: cleanCode,
    }),
  });

  if (backendResponse?.success) {
    return backendResponse;
  }

  throw new Error(backendResponse?.message || 'Invalid verification code. Please try again.');
}

/**
 * Sign Up Flow: Resend verification code with cooldown
 */
export async function resendSignupCode(email) {
  const backendResponse = await safeFetch('/auth/signup/resend-code', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  if (backendResponse?.success) {
    return backendResponse;
  }

  throw new Error(backendResponse?.message || 'Failed to resend verification code.');
}

/**
 * Sign Up Flow: Finalize user account creation ONLY after email verification
 */
export async function completeSignup({ email, name, password, phone = '' }) {
  const backendResponse = await safeFetch('/auth/signup/complete', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password: password,
      phone: phone?.trim() || undefined,
    }),
  });

  if (backendResponse?.data?.token) {
    setMobileAuthToken(backendResponse.data.token);
  }
  if (backendResponse?.data?.user) {
    saveStoredUser(backendResponse.data.user);
    saveLocalRegisteredUser(backendResponse.data.user, password);
  }

  if (backendResponse?.success) {
    return backendResponse.data;
  }

  throw new Error(backendResponse?.message || 'Failed to complete registration.');
}

/**
 * Verify 6-digit OTP code with backend
 */
export async function verifyEmailOtp(email, code) {
  const cleanCode = String(code || '').trim();
  const backendResponse = await safeFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      otp: cleanCode,
      code: cleanCode,
    }),
  });

  if (backendResponse?.success && backendResponse.data?.token) {
    setMobileAuthToken(backendResponse.data.token);
    if (backendResponse.data.user) {
      saveStoredUser(backendResponse.data.user);
    }
    return backendResponse.data;
  }

  throw new Error(backendResponse?.message || 'Invalid or expired verification code.');
}

/**
 * Resend 6-digit OTP code with backend cooldown rate-limiting
 */
export async function resendEmailOtp(email) {
  const backendResponse = await safeFetch('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
    }),
  });

  if (backendResponse?.success) {
    return backendResponse.data;
  }

  throw new Error(backendResponse?.message || 'Failed to resend verification code.');
}

/**
 * Update Customer Profile (Name, Phone, Password)
 */
export async function updateCustomerProfile(profileData) {
  const data = await safeFetch('/customer/profile', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });

  if (data?.data?.user) {
    saveStoredUser(data.data.user);
  }

  return data?.data?.user || profileData;
}

/**
 * Fetch products from Laravel backend including variants
 */
export async function getMobileProducts() {
  try {
    const data = await safeFetch('/products');
    const list = Array.isArray(data) ? data : (data?.data?.data || data?.data || []);

    if (list.length > 0) {
      return list.map((p) => {
        const variants = (p.variants || []).map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          grade: v.grade,
          thickness: v.thickness,
          price: Number(v.price || p.base_price || 0),
          stock_quantity: Number(v.stock_quantity ?? 100),
          label: [v.size, v.thickness, v.grade, v.color].filter(Boolean).join(' - ') || `Variant #${v.id}`,
        }));

        return {
          id: p.id,
          name: p.name,
          brand: p.brand?.name || p.brand || 'JEM Hardware',
          category: p.category?.name || p.category || 'Cement & Materials',
          category_id: p.category?.name
            ? p.category.name.toLowerCase().split(' ')[0]
            : 'cement',
          base_price: Number(p.base_price || 0),
          unit: p.unit || 'piece',
          stock_quantity: Number(p.stock_quantity ?? 100),
          rating: Number(p.rating || 4.9),
          reviews: Number(p.reviews_count || 128),
          discount_pct: '-10%',
          variants: variants,
          emoji:
            p.emoji ||
            (p.category?.name?.toLowerCase().includes('cement')
              ? '🧱'
              : p.category?.name?.toLowerCase().includes('tool')
              ? '🔧'
              : p.category?.name?.toLowerCase().includes('roof')
              ? '🏠'
              : p.category?.name?.toLowerCase().includes('plumb')
              ? '🚿'
              : p.category?.name?.toLowerCase().includes('paint')
              ? '🎨'
              : p.category?.name?.toLowerCase().includes('elec')
              ? '⚡'
              : '🪵'),
          description: p.description || 'Contractor-grade building and hardware supply manufactured strictly to Philippine National Standards (PNS).',
        };
      });
    }
  } catch (err) {
    // Gracefully fallback to seed products without console noise
  }

  return HARDWARE_PRODUCTS;
}

/**
 * Fetch categories from backend
 */
export async function getMobileCategories() {
  try {
    const data = await safeFetch('/categories');
    const list = Array.isArray(data) ? data : (data?.data?.data || data?.data || []);
    if (list.length > 0) {
      return list.map((c, idx) => ({
        id: c.name ? c.name.toLowerCase().split(' ')[0] : `cat-${idx}`,
        name: c.name,
        title: c.name,
        count: c.products_count || 45,
        icon: CATEGORY_ITEMS[idx % CATEGORY_ITEMS.length]?.icon || '🧱',
        bg: CATEGORY_ITEMS[idx % CATEGORY_ITEMS.length]?.bg || '#f1f5f9',
      }));
    }
  } catch (e) {}

  return CATEGORY_ITEMS;
}

/**
 * Fetch orders for mobile customer directly from Backend MySQL Database
 */
export async function getMobileOrders() {
  try {
    const data = await safeFetch('/mobile/orders');
    const rawList = Array.isArray(data)
      ? data
      : (Array.isArray(data?.data)
          ? data.data
          : (Array.isArray(data?.data?.data)
              ? data.data.data
              : []));

    if (rawList.length > 0) {
      const formatted = rawList.map((item) => ({
        id: item.id,
        order_number: item.order_number || `JEM-2026-${item.id}`,
        status: item.status || 'pending',
        total: Number(item.total || 0),
        subtotal: Number(item.subtotal || 0),
        shipping_fee: Number(item.shipping_fee || 200),
        payment_method: (item.payment_method || 'gcash').toLowerCase(),
        delivery_address: item.delivery_address || 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
        delivery_type: item.delivery_type || 'delivery',
        driver: 'Kuya Mark (Isuzu Elf Plate NCI-8921)',
        created_at: item.created_at || new Date().toISOString(),
        date: item.created_at ? new Date(item.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        items: (item.items || []).map((i) => ({
          product_id: i.product_id || i.product?.id,
          product_variant_id: i.product_variant_id,
          name: i.product?.name || i.name || 'Portland Cement Type 1P (40kg)',
          quantity: Number(i.quantity || i.qty || 1),
          qty: Number(i.quantity || i.qty || 1),
          ordered_quantity: Number(i.ordered_quantity || i.quantity || i.qty || 1),
          fulfilled_quantity: Number(i.fulfilled_quantity !== undefined ? i.fulfilled_quantity : (i.quantity || i.qty || 1)),
          backordered_quantity: Number(i.backordered_quantity || 0),
          available_quantity_at_order: Number(i.available_quantity_at_order || 0),
          fulfillment_status: i.fulfillment_status || 'fulfilled',
          unit_price: Number(i.unit_price || i.price || i.product?.base_price || 285),
          price: Number(i.unit_price || i.price || i.product?.base_price || 285),
        })),
        backorders: item.backorders || [],
      }));

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('jem_shared_orders', JSON.stringify(formatted));
        } catch (e) {}
      }

      return formatted;
    }
  } catch (e) {
    // Gracefully fallback to cached local orders without console noise
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('jem_shared_orders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
  }

  return [];
}

/**
 * Submit mobile customer order to Backend Database
 */
export async function submitMobileOrder(orderData) {
  const payload = {
    order_number: orderData.order_number,
    customer_name: orderData.customer_name || 'Customer',
    customer_email: orderData.customer_email || '',
    customer_phone: orderData.customer_phone || '',
    items: (orderData.items || []).map((it) => ({
      product_id: it.product_id || it.id || 1,
      product_variant_id: it.product_variant_id || null,
      quantity: Number(it.quantity || it.qty || 1),
      unit_price: Number(it.unit_price || it.price || 0),
      name: it.name,
    })),
    payment_method: (orderData.payment_method || 'cod').toLowerCase(),
    delivery_address: orderData.delivery_address || 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
    delivery_type: orderData.delivery_type || 'delivery',
    delivery_date: new Date().toISOString().split('T')[0],
    subtotal: Number(orderData.subtotal || 0),
    shipping_fee: Number(orderData.shipping_fee ?? (orderData.delivery_type === 'pickup' ? 0 : 200)),
    total: Number(orderData.total || 0),
    reference_number: orderData.reference_number || '',
  };

  let backendResponse = null;
  try {
    backendResponse = await safeFetch('/mobile/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw err;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('jem_shared_orders');
      const current = raw ? JSON.parse(raw) : [];
      localStorage.setItem(
        'jem_shared_orders',
        JSON.stringify([orderData, ...(Array.isArray(current) ? current : [])])
      );
    } catch (e) {}

    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('jem_notification_pop', { detail: {
          title: 'New Customer Mobile Order 🛒',
          message: `Order #${orderData.order_number} (₱${Number(orderData.total).toLocaleString()}) placed via ${String(orderData.payment_method).toUpperCase()}`,
          targetRole: 'all',
        }}));
        window.dispatchEvent(new CustomEvent('jem_orders_update', { detail: orderData }));
        window.dispatchEvent(new CustomEvent('jem_notification_update', { detail: { targetRole: 'all' } }));
      }
    } catch (e) {}
  }

  return backendResponse?.data || orderData;
}

/**
 * Cancel customer mobile order and restore inventory
 */
export async function cancelMobileOrder(orderId) {
  const data = await safeFetch(`/mobile/orders/${orderId}/cancel`, {
    method: 'POST',
  });

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('jem_orders_update', { detail: { id: orderId, status: 'cancelled' } }));
  }

  return data;
}

/**
 * Multiple Delivery Addresses CRUD
 */
export async function getCustomerAddresses(customerEmail) {
  try {
    const data = await safeFetch(`/customer/addresses?customer_email=${encodeURIComponent(customerEmail || '')}`);
    return data?.data || [];
  } catch (e) {
    return [];
  }
}

export async function saveCustomerAddress(addressData, customerEmail) {
  const data = await safeFetch('/customer/addresses', {
    method: 'POST',
    body: JSON.stringify({ ...addressData, customer_email: customerEmail }),
  });
  return data?.data;
}

export async function updateCustomerAddress(id, addressData) {
  const data = await safeFetch(`/customer/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(addressData),
  });
  return data?.data;
}

export async function deleteCustomerAddress(id) {
  return await safeFetch(`/customer/addresses/${id}`, {
    method: 'DELETE',
  });
}

export async function setDefaultCustomerAddress(id) {
  return await safeFetch(`/customer/addresses/${id}/default`, {
    method: 'PATCH',
  });
}

/**
 * Notifications
 */
export async function getMobileNotifications(email) {
  try {
    const data = await safeFetch(`/mobile/notifications?email=${encodeURIComponent(email || '')}`);
    return data?.data || [];
  } catch (e) {
    return [];
  }
}

export async function markMobileNotificationsRead(email) {
  try {
    return await safeFetch('/mobile/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  } catch (e) {
    return null;
  }
}

export async function markMobileNotificationRead(id) {
  try {
    return await safeFetch(`/mobile/notifications/${id}/read`, {
      method: 'POST',
    });
  } catch (e) {
    return null;
  }
}

/**
 * Submit customer feedback / rating or support inquiry
 */
export async function submitMobileFeedback(feedbackData) {
  const payload = {
    order_number: feedbackData.order_number || '',
    rating: Number(feedbackData.rating || 5),
    message: feedbackData.message || '',
    subject: feedbackData.subject || `Order #${feedbackData.order_number || 'Delivery'} - ${feedbackData.rating || 5} Stars Review`,
    customer_name: feedbackData.customer_name || 'Customer',
    customer_email: feedbackData.customer_email || '',
  };

  let backendRes = null;
  try {
    backendRes = await safeFetch('/mobile/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Backend feedback notice:', err.message);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('jem_shared_feedbacks');
      const current = raw ? JSON.parse(raw) : [];
      const newFb = {
        id: Date.now(),
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        order_number: payload.order_number,
        rating: payload.rating,
        subject: payload.subject,
        message: payload.message,
        status: 'open',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('jem_shared_feedbacks', JSON.stringify([newFb, ...(Array.isArray(current) ? current : [])]));
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('jem_notification_pop', { detail: {
          title: `New ⭐ ${payload.rating}-Star Customer Review!`,
          message: `Order #${payload.order_number}: "${payload.message}"`,
          targetRole: 'all',
        }}));
        window.dispatchEvent(new CustomEvent('jem_notification_update', { detail: { targetRole: 'all' } }));
      }
    } catch (e) {}
  }

  return backendRes?.data || payload;
}
