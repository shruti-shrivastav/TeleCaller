// src/api/apiLite.ts
import { forceLogout } from '@/utils/session-utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * A lightweight API helper with automatic token expiry handling.
 */
export const apiRequestLite = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  authRequired = true
) => {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(authRequired && token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  // 🔴 Handle invalid token globally
  if (res.status === 401 && data?.error === 'Invalid token') {
    forceLogout();
    return;
  }

  // 🔴 Generic error handler
  if (!res.ok) {
    const message =
      typeof data === 'string'
        ? data
        : data.error || data.message || 'Something went wrong';
    throw new Error(message);
  }

  return data;
};
