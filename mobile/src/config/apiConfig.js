import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * ============================================================================
 * JEM HARDWARE - FULL-STACK API & DEV TUNNELS CONFIGURATION
 * ============================================================================
 * 
 * Use this central configuration to toggle easily between:
 *  - 'tunnel' : VS Code Port Forwarding (Dev Tunnels) for separate physical devices & external networks
 *  - 'lan'    : Local Wi-Fi network (when phone and PC share the exact same Wi-Fi)
 *  - 'local'  : Localhost loopback (web browser preview or local emulator)
 *  - 'auto'   : Intelligent detection (Expo hostUri, devtunnels.ms, LAN, and fallbacks)
 */

// 1. ACTIVE API MODE TOGGLE: 'tunnel' | 'lan' | 'local' | 'auto'
export const API_MODE = 'auto'; // Set to 'tunnel' when testing across separate internet connections!

// 2. DEV TUNNEL PUBLIC BACKEND URL (Port 8000 Dev Tunnel in VS Code)
// Set EXPO_PUBLIC_API_URL or provide your active VS Code Dev Tunnel URL
export const DEV_TUNNEL_URL =
  process.env.EXPO_PUBLIC_API_URL || '';

// 3. LOCAL WI-FI LAN IP (PC IP from `ipconfig`)
export const LAN_API_URL = 'http://192.168.254.106:8000/api';

// 4. LOCALHOST LOOPBACK (Web browser preview / Local PC)
export const LOCAL_API_URL = 'http://127.0.0.1:8000/api';

// 5. ANDROID EMULATOR LOOPBACK
export const ANDROID_EMULATOR_URL = 'http://10.0.2.2:8000/api';

/**
 * Resolves a prioritized candidate list of API Base URLs based on
 * the active configuration mode, environment variables, and runtime host.
 */
export function resolveApiBaseUrls() {
  const urls = [];

  // Priority A: EXPO_PUBLIC_API_URL environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    urls.push(envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`);
  }

  // Priority B: Explicit Manual Mode
  if (API_MODE === 'tunnel' && DEV_TUNNEL_URL) {
    urls.push(DEV_TUNNEL_URL.replace(/\/+$/, ''));
  } else if (API_MODE === 'lan' && LAN_API_URL) {
    urls.push(LAN_API_URL.replace(/\/+$/, ''));
  } else if (API_MODE === 'local' && LOCAL_API_URL) {
    urls.push(LOCAL_API_URL.replace(/\/+$/, ''));
  }

  // Priority C: Web Browser Context Auto-Detection
  const isWeb = typeof window !== 'undefined' && window.location?.hostname;
  const isHttpsBrowser = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const isDevTunnelHost = isWeb && window.location.hostname.includes('.devtunnels.ms');

  if (isDevTunnelHost) {
    // Web app is loaded directly from a Dev Tunnel (e.g. port 8081 or 5173 tunnel)
    const webHost = window.location.hostname;
    const tunnelBackend = webHost.replace(/-\d+\./, '-8000.');
    urls.push(`https://${tunnelBackend}/api`);
  } else if (isWeb && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    urls.push('http://127.0.0.1:8000/api');
    urls.push('http://localhost:8000/api');
  }

  // Priority D: Expo Go hostUri on Physical Devices
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    '';
  const detectedHost = hostUri ? hostUri.split(':')[0] : null;

  if (detectedHost && detectedHost.includes('.devtunnels.ms')) {
    const tunnelBackend = detectedHost.replace(/-\d+\./, '-8000.');
    urls.push(`https://${tunnelBackend}/api`);
  }

  // Priority E: Dev Tunnel Default Fallback (always included for cross-network access)
  if (DEV_TUNNEL_URL) {
    urls.push(DEV_TUNNEL_URL.replace(/\/+$/, ''));
  }

  // Priority F: Local LAN IP (only for non-HTTPS environments)
  if (!isHttpsBrowser) {
    if (detectedHost && !detectedHost.includes('exp.direct') && !detectedHost.includes('.devtunnels.ms') && detectedHost !== 'localhost' && detectedHost !== '127.0.0.1') {
      urls.push(`http://${detectedHost}:8000/api`);
    }
    urls.push(LAN_API_URL);
    if (isWeb) {
      urls.push('http://127.0.0.1:8000/api');
      urls.push('http://localhost:8000/api');
    }
  }

  // Priority G: Android Emulator
  if (Platform.OS === 'android') {
    urls.push(ANDROID_EMULATOR_URL);
  }

  // Trailing loopback fallback for non-web environments
  if (!isWeb && !isHttpsBrowser) {
    urls.push('http://127.0.0.1:8000/api');
    urls.push('http://localhost:8000/api');
  }

  // Filter unique valid URLs
  return Array.from(new Set(urls.filter(Boolean)));
}

/**
 * Lightweight health check helper to verify connectivity to a candidate base URL.
 * Detects whether the tunnel returned valid JSON or a Microsoft Login / Error HTML page.
 */
export async function testBackendApiHealth(baseUrl = null) {
  const target = (baseUrl || resolveApiBaseUrls()[0] || '').replace(/\/+$/, '');
  const testUrl = target.endsWith('/api') ? `${target}/products` : `${target}/api/products`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-App-Platform': 'mobile',
      },
      signal: controller ? controller.signal : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      return {
        ok: false,
        isHtml: true,
        status: response.status,
        url: testUrl,
        message: 'Dev Tunnel is set to Private or returned an HTML error page. Set Port 8000 visibility to Public.',
      };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // not JSON
    }

    return {
      ok: response.ok,
      status: response.status,
      isJson: !!parsed,
      url: testUrl,
      message: response.ok ? 'Connection successful!' : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      url: testUrl,
      message: `Failed to reach backend: ${err.message}`,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
