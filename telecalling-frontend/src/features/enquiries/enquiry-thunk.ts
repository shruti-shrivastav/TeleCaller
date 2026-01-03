import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequestLite } from '@/api/api-lite';

export interface Enquiry {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'new' | 'done';
  createdAt: string;
  updatedAt?: string;
}

export const fetchEnquiries = createAsyncThunk<
  { items: Enquiry[]; total: number; page: number; pageSize: number },
  any,
  { rejectValue: string }
>('enquiries/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      query.set(k, String(v));
    });
    const qs = query.toString();
    const data = await apiRequestLite(
      `/websiteEnquiry/v1/admin/web-enquiries${qs ? `?${qs}` : ''}`,
      'GET',
      undefined,
      true
    );
    return data;
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.message || 'Failed to load enquiries'
    );
  }
});

export const updateEnquiryStatus = createAsyncThunk<
  Enquiry,
  { id: string; status: 'new' | 'done' },
  { rejectValue: string }
>('enquiries/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite(
      `/websiteEnquiry/v1/admin/web-enquiries/${id}`,
      'PATCH',
      { status },
      true
    );
    return data;
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.message || 'Failed to update enquiry'
    );
  }
});
