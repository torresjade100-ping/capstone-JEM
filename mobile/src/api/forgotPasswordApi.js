import axios from 'axios';
import { resolveApiBaseUrls } from '../config/apiConfig';

let activeBaseUrl = null;

/**
 * Returns candidate API base URLs
 */
function getCandidateBaseUrls() {
  try {
    const list = resolveApiBaseUrls();
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch (e) {}

  return [
    'http://127.0.0.1:8000/api',
    'http://192.168.254.106:8000/api',
    'http://10.0.2.2:8000/api',
  ];
}

/**
 * Helper to execute an Axios request with intelligent URL fallback
 */
async function callApi(endpoint, payload) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If we already resolved a working base URL, attempt it first
  if (activeBaseUrl) {
    try {
      const response = await axios.post(`${activeBaseUrl}${cleanEndpoint}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      });
      return response.data;
    } catch (err) {
      // If it's a 4xx validation or business error, don't fallback to other URLs
      if (err.response && err.response.status < 500) {
        throw extractAxiosError(err);
      }
      activeBaseUrl = null;
    }
  }

  // Iterate candidate base URLs
  const candidates = getCandidateBaseUrls();
  let lastError = null;

  for (const base of candidates) {
    const cleanBase = base.replace(/\/+$/, '');
    try {
      const url = `${cleanBase}${cleanEndpoint}`;
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      });
      activeBaseUrl = cleanBase;
      return response.data;
    } catch (err) {
      lastError = err;
      // If server responded with 422, 404, 401, 403, the endpoint was reached and returned a valid API response
      if (err.response && err.response.status) {
        activeBaseUrl = cleanBase;
        throw extractAxiosError(err);
      }
    }
  }

  throw extractAxiosError(lastError);
}

/**
 * Formats Axios error into a clear, user-friendly message
 */
function extractAxiosError(err) {
  if (!err) {
    return new Error('Network error. Unable to reach the server.');
  }

  const resData = err.response?.data;
  if (resData) {
    if (resData.message) {
      const error = new Error(resData.message);
      error.status = err.response?.status;
      error.data = resData;
      return error;
    }

    if (resData.errors && typeof resData.errors === 'object') {
      const firstKey = Object.keys(resData.errors)[0];
      const firstMsg = Array.isArray(resData.errors[firstKey])
        ? resData.errors[firstKey][0]
        : resData.errors[firstKey];
      const error = new Error(firstMsg || 'Validation error.');
      error.status = err.response?.status;
      return error;
    }
  }

  if (err.message && err.message.toLowerCase().includes('network')) {
    return new Error('Cannot connect to server. Please check your network connection.');
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return new Error('Connection timed out. Please try again.');
  }

  return new Error(err.message || 'An unexpected error occurred. Please try again.');
}

/**
 * Step 1: Request 6-digit OTP code sent to user's registered Gmail
 * Endpoint: POST /api/forgot-password
 */
export async function requestPasswordResetOtp(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address.');
  }

  return await callApi('/forgot-password', { email: cleanEmail });
}

/**
 * Step 2: Verify 6-digit OTP code against server
 * Endpoint: POST /api/verify-otp
 */
export async function verifyPasswordResetOtp(email, otpCode) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOtp = String(otpCode || '').trim();

  if (!cleanEmail) {
    throw new Error('Email is required.');
  }
  if (!cleanOtp || cleanOtp.length !== 6) {
    throw new Error('Please enter a valid 6-digit verification code.');
  }

  return await callApi('/verify-otp', {
    email: cleanEmail,
    otp: cleanOtp,
    code: cleanOtp,
    otp_code: cleanOtp,
  });
}

/**
 * Step 3: Reset password with new password and verification token / OTP
 * Endpoint: POST /api/reset-password
 */
export async function resetPassword({
  email,
  password,
  password_confirmation,
  reset_token,
  otp,
}) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();
  const cleanConfirm = String(password_confirmation || '').trim();

  if (!cleanEmail) {
    throw new Error('Email is required.');
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (cleanPassword !== cleanConfirm) {
    throw new Error('Password confirmation does not match.');
  }

  return await callApi('/reset-password', {
    email: cleanEmail,
    password: cleanPassword,
    password_confirmation: cleanConfirm,
    reset_token: reset_token || undefined,
    otp: otp || undefined,
  });
}

export default {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
};
