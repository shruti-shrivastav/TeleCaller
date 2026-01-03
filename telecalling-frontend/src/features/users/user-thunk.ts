import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequestLite } from '@/api/api-lite';

// --- TELECALLER DASHBOARD ---
export type TelecallerDashboardArgs =
  | string
  | {
      userId: string;
      range?: 'day' | 'week' | 'month' | 'custom';
      startDate?: string; // 'YYYY-MM-DD'
      endDate?: string; // 'YYYY-MM-DD'
    };

/** 🔹 Fetch users */
export const fetchUsers = createAsyncThunk<
  any[],
  { page?: number; pageSize?: number; role?: string; search?: string },
  { rejectValue: string }
>('users/fetchUsers', async (params = {}, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.pageSize) query.append('pageSize', String(params.pageSize));
    if (params.role) query.append('role', params.role);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    const url = qs ? `/users?${qs}` : '/users';

    const data = await apiRequestLite(url, 'GET', undefined, true);
    return data;
  } catch {
    return rejectWithValue('Failed to fetch users');
  }
});

export const fetchUserById = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>('users/fetchUserById', async (id, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite(`/users/${id}`, 'GET', undefined, true);
    return data;
  } catch {
    return rejectWithValue('Failed to fetch user details');
  }
});

export const createUser = createAsyncThunk<
  any,
  {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
    leaderId?: string;
  },
  { rejectValue: string }
>('users/createUser', async (body, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite('/users', 'POST', body, true);
    return data;
  } catch {
    return rejectWithValue('Failed to create user');
  }
});

export const updateUser = createAsyncThunk<
  any,
  {
    id: string;
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      password?: string;
      role?: string;
      active?: boolean;
    };
  },
  { rejectValue: string }
>('users/updateUser', async ({ id, updates }, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite(`/users/${id}`, 'PATCH', updates, true);
    return data;
  } catch {
    return rejectWithValue('Failed to update user');
  }
});

export const deleteUser = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('users/deleteUser', async (id, { rejectWithValue }) => {
  try {
    const res = await apiRequestLite(`/users/${id}`, 'DELETE', undefined, true);
    return res.id || id;
  } catch {
    return rejectWithValue('Failed to delete user');
  }
});

export const searchTelecallers = createAsyncThunk<
  any[],
  { search: string },
  { rejectValue: string }
>('users/searchTelecallers', async ({ search }, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    query.append('role', 'telecaller');
    query.append('search', search);
    query.append('pageSize', '20');

    const url = `/users?${query.toString()}`;
    const data = await apiRequestLite(url, 'GET', undefined, true);
    return data;
  } catch {
    return rejectWithValue('Failed to search telecallers');
  }
});

// --- TELECALLER LEADS ---
// --- TELECALLER LEADS ---
export const fetchTelecallerLeads = createAsyncThunk<
  any,
  {
    userId: string;
    page?: number;
    pageSize?: number;
    range?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  },
  { rejectValue: string }
>('users/fetchTelecallerLeads', async (params, { rejectWithValue }) => {
  try {
    const { userId, ...filters } = params;
    const query = new URLSearchParams();

    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });

    const url = query.toString()
      ? `/users/${userId}/leads?${query.toString()}`
      : `/users/${userId}/leads`;

    return await apiRequestLite(url, 'GET', undefined, true);
  } catch {
    return rejectWithValue('Failed to fetch telecaller leads');
  }
});

// --- TELECALLER CALLS ---
export const fetchTelecallerCalls = createAsyncThunk<
  any,
  {
    userId: string;
    page?: number;
    pageSize?: number;
    range?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  },
  { rejectValue: string }
>(
  'users/fetchTelecallerCalls',
  async ({ userId, ...filters }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });

      const url = query.toString()
        ? `/users/${userId}/calls?${query.toString()}`
        : `/users/${userId}/calls`;

      return await apiRequestLite(url, 'GET', undefined, true);
    } catch {
      return rejectWithValue('Failed to fetch telecaller calls');
    }
  }
);

// --- TELECALLER GOAL ---
export const fetchTelecallerGoal = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>('users/fetchTelecallerGoal', async (userId, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite(
      `/users/${userId}/goals`,
      'GET',
      undefined,
      true
    );
    return data.weeklyGoal || null;
  } catch {
    return rejectWithValue('Failed to fetch telecaller goal');
  }
});

export const fetchTelecallerDashboard = createAsyncThunk<
  any,
  TelecallerDashboardArgs,
  { rejectValue: string }
>('users/fetchTelecallerDashboard', async (args, { rejectWithValue }) => {
  try {
    const { userId, range, startDate, endDate } =
      typeof args === 'string' ? { userId: args } : args;

    const qs = new URLSearchParams();

    // Default to 'day' if nothing is passed
    if (!range) {
      qs.set('range', 'day');
    } else if (range !== 'custom') {
      qs.set('range', range);
    } else {
      qs.set('range', 'custom');
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
    }

    const url = `/users/${userId}/dashboard${
      qs.toString() ? `?${qs.toString()}` : ''
    }`;
    return await apiRequestLite(url, 'GET', undefined, true);
  } catch {
    return rejectWithValue('Failed to fetch telecaller dashboard');
  }
});
