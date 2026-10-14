import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { HARDWARE_PRODUCTS, CATEGORY_ITEMS } from '../data/initialData';
import { resolveApiBaseUrls, API_MODE } from '../config/apiConfig';

let cachedWorkingBaseUrl = null;

// Dynamic API Base URL resolution for Expo Go, Emulators, Physical Phones, Dev Tunnels, and Web
const getBaseUrls = () => {
  try {
    const urls = [];

    // 1. If we already found a working URL in this session, try it first
    if (cachedWorkingBaseUrl) {
      urls.push(cachedWorkingBaseUrl);
    }

    // 2. Explicit Environment Fallback Variable (e.g. process.env.EXPO_PUBLIC_API_URL)
    const envApiUrl =
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
      (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
      Constants?.expoConfig?.extra?.apiUrl ||
      '';
    if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim().startsWith('http')) {
      const cleanEnv = envApiUrl.trim().replace(/\/+$/, '');
      urls.push(cleanEnv.endsWith('/api') ? cleanEnv : `${cleanEnv}/api`);
    }

    // 3. Safe cross-platform host extraction
    // Web / Browser View: Use typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : ''
    const webHost = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : '';

    // Native / Expo Go: Extract hostUri via Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '', stripping port numbers
    const rawHostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoClient?.hostUri ||
      Constants?.manifest?.debuggerHost ||
      '';
    const nativeHost = rawHostUri ? rawHostUri.split(':')[0] : '';

    // Unified detected host (prioritizing active web host or native debugger host)
    const detectedHost = webHost || nativeHost || '';

    // 4. Dev Tunnel Auto-Mapping (Frontend Port 8081 to Backend Port 8000)
    // If detectedHost contains .devtunnels.ms: dynamically swap the port segment (-8081. to -8000.) and validate resulting URL
    if (detectedHost && detectedHost.includes('.devtunnels.ms')) {
      const tunnelBackend = detectedHost.replace(/-\d+\./, '-8000.');
      const fullTunnelUrl = `https://${tunnelBackend}/api`;
      try {
        const parsed = new URL(fullTunnelUrl);
        if (parsed.protocol === 'https:' && parsed.hostname.includes('.devtunnels.ms')) {
          urls.push(fullTunnelUrl);
        }
      } catch (urlErr) {
        // Skip malformed tunnel URL
      }
    }

    // 5. Add configured URLs from apiConfig (explicit manual toggle / env vars)
    try {
      const configured = resolveApiBaseUrls();
      if (Array.isArray(configured)) {
        urls.push(...configured);
      }
    } catch (cfgErr) {
      // Non-blocking fallback
    }

    const isWeb = Platform.OS === 'web' || !!webHost;
    const isHttpsBrowser = typeof window !== 'undefined' && window.location?.protocol === 'https:';

    // 5. Native / Mobile Devices (Expo Go on physical devices / emulators):
    // Prioritize the developer PC LAN IP (192.168.254.106) and Expo Go's hostUri.
    // NEVER prioritize localhost / 127.0.0.1 on physical phones as it points to the mobile device itself!
    if (!isWeb) {
      if (nativeHost && !nativeHost.includes('exp.direct') && !nativeHost.includes('ngrok') && !nativeHost.includes('.devtunnels.ms') && nativeHost !== 'localhost' && nativeHost !== '127.0.0.1') {
        urls.push(`http://${nativeHost}:8000/api`);
      }
      // Local machine LAN IP (PC IP from ipconfig)
      urls.push('http://192.168.254.106:8000/api');

      // Android emulator loopback
      if (Platform.OS === 'android') {
        urls.push('http://10.0.2.2:8000/api');
      }

      // Trailing localhost loopback fallback only as absolute last resort
      urls.push('http://127.0.0.1:8000/api');
      urls.push('http://localhost:8000/api');
    } else {
      // 6. Web Browser Preview (localhost or 127.0.0.1)
      if (webHost === 'localhost' || webHost === '127.0.0.1') {
        urls.push('http://127.0.0.1:8000/api');
        urls.push('http://localhost:8000/api');
        urls.push('http://192.168.254.106:8000/api');
      } else if (!webHost.includes('.devtunnels.ms') && !isHttpsBrowser) {
        urls.push(`http://${webHost}:8000/api`);
        urls.push('http://192.168.254.106:8000/api');
      }
    }

    const sanitized = Array.from(new Set(urls.filter(Boolean)));
    return sanitized.length > 0 ? sanitized : ['http://192.168.254.106:8000/api'];
  } catch (err) {
    // Ultra-defensive fallback: default to LAN IP for Expo physical devices
    return ['http://192.168.254.106:8000/api'];
  }
};

export const API_BASE_URL = (() => {
  try {
    return getBaseUrls()[0] || 'http://192.168.254.106:8000/api';
  } catch (e) {
    return 'http://192.168.254.106:8000/api';
  }
})();

export const BASE_URL = API_BASE_URL;

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

export async function clearMobileStorage() {
  cachedAuthToken = null;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('jem_mobile_token');
      localStorage.removeItem('jem_mobile_user');
      localStorage.removeItem('jem_mobile_wishlist');
    } catch (e) {}
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const storageObj = AsyncStorage?.default || AsyncStorage;
    if (storageObj && typeof storageObj.clear === 'function') {
      await storageObj.clear();
    }
  } catch (e) {}
}

/**
 * Normalizes and resolves base URL and endpoint concatenation.
 * Prevents duplicate `/api` prefixes (e.g. baseURL ending in /api + endpoint starting with /api/mobile/orders -> /api/mobile/orders)
 * and safely ensures correct leading/trailing slash formatting.
 */
export function buildResolvedApiUrl(baseUrl, endpoint) {
  const cleanBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  let cleanEndpoint = String(endpoint || '').trim();

  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  // Prevent duplicate /api concatenation
  if (cleanBase.endsWith('/api')) {
    if (cleanEndpoint === '/api') {
      cleanEndpoint = '';
    } else if (cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.substring(4);
    }
  } else {
    // If baseUrl doesn't end with /api, ensure endpoint includes /api
    if (!cleanEndpoint.startsWith('/api/') && cleanEndpoint !== '/api') {
      cleanEndpoint = `/api${cleanEndpoint}`;
    }
  }

  return `${cleanBase}${cleanEndpoint}`;
}

/**
 * Universal safe request helper with at least 15,000ms timeout
 */
async function executeFetchOnce(url, options, timeoutMs) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  // Print the full resolved request URL right before the network call
  console.log(`[MobileAPI Request] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller ? controller.signal : undefined,
    });

    let data = null;
    let rawText = '';
    try {
      const textPromise = response.text();
      const bodyTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Body timeout')), 8000)
      );
      rawText = (await Promise.race([textPromise, bodyTimeoutPromise])) || '';
      if (rawText) {
        if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html')) {
          const htmlErr = new Error(
            response.status === 404
              ? `HTTP 404: Endpoint not found (${url})`
              : `HTTP ${response.status}: Server returned an HTML response instead of JSON.`
          );
          htmlErr.status = response.status;
          htmlErr.url = url;
          throw htmlErr;
        }
        data = JSON.parse(rawText);
      }
    } catch (readErr) {
      if (readErr?.status) throw readErr;
      if (readErr?.message?.includes('HTML response') || readErr?.message?.includes('HTTP')) {
        readErr.status = response.status;
        throw readErr;
      }
      if (response.ok) data = { success: true };
    }

    if (response.ok) {
      return data || { success: true };
    } else {
      const errorMsg = data?.message || `HTTP ${response.status}: Request failed`;
      const serverError = new Error(errorMsg);
      serverError.status = response.status;
      serverError.data = data;
      serverError.url = url;
      throw serverError;
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function safeFetch(path, options = {}, maxRetries = 1) {
  const token = getMobileAuthToken();
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-App-Platform': 'mobile',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const reqOptions = { ...options, headers };
  // Configure request timeout with at least 15,000ms (15 seconds) to accommodate dev tunnel latency
  const timeoutMs = Math.max(Number(options.timeout || 0), 15000);
  const urlsToTry = getBaseUrls();

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    for (const base of urlsToTry) {
      const fullUrl = buildResolvedApiUrl(base, path);
      try {
        const result = await executeFetchOnce(fullUrl, reqOptions, timeoutMs);
        cachedWorkingBaseUrl = base;
        return result;
      } catch (e) {
        lastError = e;
        // Hard-stop: when a request fails with an HTTP error (404/500/401/403/422),
        // stop all subsequent automatic retries immediately. Reset and throw.
        const isHttpError =
          (typeof e.status === 'number' && e.status >= 400) ||
          (e.message && (e.message.includes('HTTP 404') || e.message.includes('HTTP 500') || e.message.includes('HTTP ')));

        if (isHttpError) {
          console.warn(`[MobileAPI] HTTP ${e.status || 'error'} received from ${fullUrl}. Stopping all retries immediately.`);
          throw e;
        }
      }
    }

    attempt++;
    if (attempt <= maxRetries) {
      // Automatic retry backoff only for non-HTTP socket/network drops
      await new Promise((resolve) => setTimeout(resolve, attempt * 600));
    }
  }

  if (lastError) {
    const msg = (lastError.message || '').toLowerCase();
    const name = lastError.name || '';
    if (name.includes('Abort') || msg.includes('abort') || msg.includes('cancel') || msg.includes('timeout')) {
      throw new Error('Connection timed out. Dev tunnel or backend latency exceeded 15 seconds.');
    }
    if (msg.includes('failed to fetch') || msg.includes('network request failed') || msg.includes('fetch failed')) {
      throw new Error('Unable to reach backend server. Please verify dev tunnel port 8000 is running.');
    }
    throw lastError;
  }

  throw new Error(`Failed to connect to backend at ${path}`);
}

/**
 * Fetch and validate current authenticated user session (/user)
 * Enforces customer role check.
 */
export async function fetchCurrentUser() {
  const token = getMobileAuthToken();
  if (!token) return null;

  try {
    const res = await safeFetch('/user', {
      method: 'GET',
    });

    const user = res?.user || res?.data?.user || res?.data;
    if (user) {
      if (user.role && user.role !== 'customer') {
        await clearMobileStorage();
        const error = new Error('Access denied. This app is strictly for customer accounts only.');
        error.status = 403;
        throw error;
      }
      saveStoredUser(user);
      return user;
    }
  } catch (err) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('customer accounts only') || msg.includes('access denied') || err?.status === 403) {
      await clearMobileStorage();
      throw err;
    }
    if (err?.status === 401 || msg.includes('401') || msg.includes('unauthenticated')) {
      await clearMobileStorage();
      throw err;
    }
  }

  const localUser = getStoredUser();
  if (localUser && localUser.role && localUser.role !== 'customer') {
    await clearMobileStorage();
    const error = new Error('Access denied. This app is strictly for customer accounts only.');
    error.status = 403;
    throw error;
  }
  return localUser;
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
        source: 'mobile',
        client: 'mobile',
      }),
    });
  } catch (err) {
    const msg = (err?.message || '').toLowerCase();
    if (
      msg.includes('access denied') ||
      msg.includes('customer accounts only') ||
      msg.includes('403') ||
      msg.includes('invalid credentials') ||
      msg.includes('incorrect password') ||
      msg.includes('401')
    ) {
      throw err;
    }
  }

  const backendUser = backendResponse?.data?.user || backendResponse?.user;
  if (backendUser) {
    if (backendUser.role && backendUser.role !== 'customer') {
      await clearMobileStorage();
      const err = new Error('Access denied. This app is strictly for customer accounts only.');
      err.status = 403;
      throw err;
    }
    const token = backendResponse?.data?.token || backendResponse?.token || '';
    if (token) {
      setMobileAuthToken(token);
    }
    saveStoredUser(backendUser);
    return {
      success: true,
      user: backendUser,
      token: token,
      message: backendResponse?.message || 'Login successful',
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

  if (user.role && user.role !== 'customer') {
    await clearMobileStorage();
    const err = new Error('Access denied. This app is strictly for customer accounts only.');
    err.status = 403;
    throw err;
  }

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

  const registeredUser = backendResponse?.data?.user || backendResponse?.user;
  const registeredToken = backendResponse?.data?.token || backendResponse?.token;

  if (registeredToken) {
    setMobileAuthToken(registeredToken);
  }
  if (registeredUser) {
    saveStoredUser(registeredUser);
    saveLocalRegisteredUser(registeredUser, password);
  }

  if (backendResponse?.success || registeredUser) {
    return {
      success: true,
      user: registeredUser || {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || '0917-888-9999',
        role: 'customer',
        status: 'active',
      },
      token: registeredToken || 'local-token-' + Date.now(),
      message: backendResponse?.message || 'Account created successfully',
    };
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
          category_id: p.category_id != null
            ? String(p.category_id)
            : (p.category?.id != null
                ? String(p.category.id)
                : ((p.category?.name || p.category || '')
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '') || 'cement')),
          category_slug: (p.category?.name || p.category || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          base_price: Number(p.base_price || 0),
          unit: p.unit || 'piece',
          stock_quantity: Number(p.stock_quantity ?? 100),
          rating: Number(p.rating || 4.9),
          reviews: Number(p.reviews_count || 128),
          discount_pct: '-10%',
          variants: variants,
          image: p.image || (
            p.name?.toLowerCase().includes('aluminum screen') ? '/images/products/aluminum-screen.png' :
            (p.name?.toLowerCase().includes('hardware cloth') || p.name?.toLowerCase().includes('ayagan')) ? '/images/products/hardware-cloth-3ft.png' :
            (p.name?.toLowerCase().includes('coupling reducer') || p.name?.toLowerCase().includes('reducer')) ? '/images/products/blue-coupling-reducer.png' :
            p.name?.toLowerCase().includes('blue coupling') ? '/images/products/blue-coupling-1-2.png' :
            p.name?.toLowerCase().includes('blue elbow') ? '/images/products/blue-elbow-plain-1-2.png' :
            null
          ),
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
          description: p.description || 'High quality building and hardware supply manufactured strictly to Philippine National Standards (PNS).',
        };
      });
    }
    return [];
  } catch (err) {
    if (allowSeedFallback) {
      console.warn('[MobileAPI] Backend unreachable; fallback to initial products.');
      return HARDWARE_PRODUCTS;
    }
    // Propagate error to let UI display proper offline/error state without silent data masquerade
    throw err;
  }
}

/**
 * Validate mobile cart stock against real-time physical inventory & backorders.
 * Hits dedicated lightweight endpoint: POST /api/mobile/cart/validate-stock
 *
 * @param {Array<{ id?: number, product_id?: number, quantity?: number, qty?: number, requested_qty?: number, product_variant_id?: number }>} items
 * @returns {Promise<{ is_valid: boolean, has_modifications: boolean, items: Array, message: string }>}
 */
export async function validateMobileCartStock(items = []) {
  if (!items || items.length === 0) {
    return {
      is_valid: true,
      has_modifications: false,
      items: [],
      message: 'Cart is empty.',
    };
  }

  const payload = {
    items: items.map((it) => ({
      product_id: Number(it.product_id || it.id),
      requested_qty: Math.max(Number(it.requested_qty || it.quantity || it.qty || 1), 1),
      ...(it.product_variant_id ? { product_variant_id: Number(it.product_variant_id) } : {}),
    })),
  };

  return await safeFetch('/mobile/cart/validate-stock', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch categories from backend with strictly unique identifiers
 */
export async function getMobileCategories() {
  try {
    const data = await safeFetch('/categories');
    const list = Array.isArray(data) ? data : (data?.data?.data || data?.data || []);
    if (list.length > 0) {
      const seenIds = new Set();
      return list.map((c, idx) => {
        const nameSlug = c.name
          ? c.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : `cat-${idx}`;

        // Ensure key is strictly unique across all category items
        let uniqueId = c.id != null ? String(c.id) : nameSlug;
        if (seenIds.has(uniqueId)) {
          uniqueId = `${nameSlug}-${c.id ?? idx}`;
        }
        seenIds.add(uniqueId);

        return {
          id: uniqueId,
          raw_id: c.id,
          category_id: c.id,
          slug: nameSlug,
          name: c.name,
          title: c.name,
          count: c.products_count || 45,
          icon: CATEGORY_ITEMS[idx % CATEGORY_ITEMS.length]?.icon || '🧱',
          bg: CATEGORY_ITEMS[idx % CATEGORY_ITEMS.length]?.bg || '#f1f5f9',
        };
      });
    }
  } catch (e) {}

  return CATEGORY_ITEMS;
}

/**
 * Fetch orders for mobile customer directly from Backend MySQL Database
 */
export async function getMobileOrders() {
  try {
    // Add cache-busting timestamp query parameter to bypass intermediate proxies/dev tunnels
    const data = await safeFetch(`/mobile/orders?_t=${Date.now()}`);
    const rawList = Array.isArray(data)
      ? data
      : (Array.isArray(data?.data)
          ? data.data
          : (Array.isArray(data?.data?.data)
              ? data.data.data
              : null));

    if (Array.isArray(rawList)) {
      const formatted = rawList.map((item) => ({
        id: item.id,
        order_number: item.order_number || `JEM-2026-${item.id}`,
        status: String(item.status || 'pending').toLowerCase().trim(),
        total: Number(item.total || 0),
        subtotal: Number(item.subtotal || 0),
        shipping_fee: Number(item.shipping_fee || 200),
        payment_method: (item.payment_method || 'gcash').toLowerCase(),
        delivery_address: item.delivery_address || 'Zone 1, Mabasa, Brgy. Balulang, Cagayan de Oro City',
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
    // If cached orders exist, fallback to them gracefully
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('jem_shared_orders');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (cacheErr) {}
    }
    // Re-throw so caller (OrdersTab) can catch and display dedicated Error/Retry UI
    throw e;
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
    delivery_address: orderData.delivery_address || 'Zone 1, Mabasa, Brgy. Balulang, Cagayan de Oro City',
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
