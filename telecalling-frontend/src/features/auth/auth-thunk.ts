// src/features/auth/auth-thunk.ts
import { apiRequestLite } from '@/api/api-lite';
import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });
      return data;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error || 'Login failed');
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequestLite('/auth/me', 'GET', undefined, true);
    } catch {
      return rejectWithValue('Session expired or invalid token');
    }
  }
);
