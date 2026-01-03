// src/api/apiClient.ts

import { setError } from "@/features/error-slice";
import { store } from "@/store";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  authRequired: boolean = true
) => {
  try {
    const token = localStorage.getItem('token');

    const headers: HeadersInit = {
      Accept: 'application/json',
      ...(authRequired && token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const isFormData = body instanceof FormData;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorMessage =
        typeof data === 'string'
          ? data
          : data.error || data.message || 'Something went wrong';
      store.dispatch(setError(errorMessage));
      throw new Error(errorMessage);
    }

    return data;
  } catch (error: any) {
    console.error('API Request Failed:', error.message);
    store.dispatch(
      setError(error.message || 'An unexpected network error occurred')
    );
    throw error;
  }
};