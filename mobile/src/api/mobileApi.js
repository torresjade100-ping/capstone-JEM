import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { HARDWARE_PRODUCTS, CATEGORY_ITEMS } from '../data/initialData';

let cachedWorkingBaseUrl = null;

// Dynamic API Base URL resolution for Expo Go, Emulators, Physical Phones, and Web
const getBaseUrls = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || '';
  const detectedHost = hostUri ? hostUri.split(':')[0] : null;

  const urls = [];

  // 1. If we already found a working URL in this session, try it first
  if (cachedWorkingBaseUrl) {
    urls.push(cachedWorkingBaseUrl);
  }

  // 2. In Web Browser Preview (e.g., localhost or LAN hostname)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    urls.push(`http://${window.location.hostname}:8000/api`);
  }

  // 3. Expo Go on Physical Device / LAN detected host
  if (detectedHost && !detectedHost.includes('exp.direct') && !detectedHost.includes('ngrok')) {
    urls.push(`http://${detectedHost}:8000/api`);
  }

  // 4. Current Wi-Fi / Local Machine LAN IP
  urls.push('http://192.168.254.106:8000/api');

  // 5. Standard Localhost Loopback
  urls.push('http://127.0.0.1:8000/api');
  urls.push('http://localhost:8000/api');

  // 6. Android Emulator Loopback
  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:8000/api');
  }

  return Array.from(new Set(urls.filter(Boolean)));
};

export const API_BASE_URL = getBaseUrls()[0];

let cachedAuthToken = null;

export function setMobileAuthToken(token) {
  cachedAuthToken = token;
}

export function getMobileAuthToken() {
  return cachedAuthToken;
}

/**
 * Universal safe request helper with timeout and fallback
 */
async function safeFetch(path, options = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(cachedAuthToken ? { Authorization: `Bearer ${cachedAuthToken}` } : {}),
    ...(options.headers || {}),
  };

  const urlsToTry = getBaseUrls();
  let lastError = null;

  for (const base of urlsToTry) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;

      const response = await fetch(`${base}${path}`, {
        ...options,
        headers,
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (response.ok) {
        cachedWorkingBaseUrl = base; // Cache successful endpoint for instant future requests
        return data;
      } else {
        const errorMsg = data?.message || `HTTP ${response.status}: Request failed`;
        const serverError = new Error(errorMsg);
        
        // If it's a definite server response (e.g. 401, 422, 403), do not continue trying other URLs
        if (response.status === 401 || response.status === 422 || response.status === 403) {
          throw serverError;
        }
        lastError = serverError;
      }
    } catch (e) {
      // If error is authentication/validation rejection from server, throw directly
      if (
        e.message &&
        !e.name?.includes('Abort') &&
        !e.message?.toLowerCase().includes('abort') &&
        !e.message?.includes('Failed to fetch') &&
        !e.message?.includes('Network request failed')
      ) {
        throw e;
      }
      lastError = e;
    }
  }

  if (lastError && lastError.name?.includes('Abort')) {
    throw new Error('Connection timed out. Please ensure the backend server is running and accessible.');
  }

  if (lastError && (lastError.message?.includes('Failed to fetch') || lastError.message?.includes('Network request failed'))) {
    throw new Error('Unable to reach server. Please check your network connection.');
  }

  throw lastError || new Error(`Failed to connect to backend at ${path}`);
}

/**
 * Login Customer
 */
export async function loginCustomer(emailOrPhone, password) {
  try {
    const data = await safeFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: emailOrPhone.trim(),
        password: password,
      }),
    });

    if (data?.data?.token) {
      setMobileAuthToken(data.data.token);
    }

    return {
      success: true,
      user: data?.data?.user || { email: emailOrPhone, name: emailOrPhone.split('@')[0] },
      token: data?.data?.token || '',
      message: data?.message || 'Login successful',
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Register Customer
 */
export async function registerCustomer(name, email, password) {
  try {
    const data = await safeFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password: password,
      }),
    });

    if (data?.data?.token) {
      setMobileAuthToken(data.data.token);
    }

    return {
      success: true,
      user: data?.data?.user || { name, email },
      token: data?.data?.token || '',
      message: data?.message || 'Account created successfully',
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Fetch products from Laravel backend
 */
export async function getMobileProducts() {
  try {
    const data = await safeFetch('/products');
    const list = Array.isArray(data) ? data : data?.data || [];

    if (list.length > 0) {
      return list.map((p) => ({
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
        description: p.description || 'Contractor-grade building and hardware supply.',
      }));
    }
  } catch (err) {
    console.warn('Using local products fallback:', err.message);
  }

  return HARDWARE_PRODUCTS;
}

/**
 * Fetch categories from backend
 */
export async function getMobileCategories() {
  try {
    const data = await safeFetch('/categories');
    const list = Array.isArray(data) ? data : data?.data || [];
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
          product_id: i.product_id,
          name: i.product?.name || i.name || 'Portland Cement Type 1P (40kg)',
          quantity: Number(i.quantity || i.qty || 1),
          qty: Number(i.quantity || i.qty || 1),
          unit_price: Number(i.unit_price || i.price || i.product?.base_price || 285),
          price: Number(i.unit_price || i.price || i.product?.base_price || 285),
        })),
      }));

      // Update shared local storage so browser preview reflects live database
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('jem_shared_orders', JSON.stringify(formatted));
        } catch (e) {}
      }

      return formatted;
    }
  } catch (e) {
    if (e.name !== 'AbortError' && !e.message?.includes('aborted')) {
      console.warn('Backend mobile orders notice:', e.message);
    }
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
      quantity: Number(it.quantity || it.qty || 1),
      unit_price: Number(it.unit_price || it.price || 0),
      name: it.name,
    })),
    payment_method: (orderData.payment_method || 'cod').toLowerCase(),
    delivery_address: orderData.delivery_address || 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
    delivery_type: orderData.delivery_type || 'delivery',
    delivery_date: new Date().toISOString().split('T')[0],
    subtotal: Number(orderData.subtotal || 0),
    shipping_fee: Number(orderData.shipping_fee ?? 200),
    total: Number(orderData.total || 0),
  };

  let backendResponse = null;
  try {
    backendResponse = await safeFetch('/mobile/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Backend order post notice:', err.message);
  }

  // Sync to shared browser storage if previewing in browser
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
 * Submit customer feedback / rating for completed delivery service
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
