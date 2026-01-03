import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequestLite } from '@/api/api-lite';

export interface  CallLogDto {
  _id?: string;
  id?: string;
  leadId: any;
  telecallerId: any;
  duration?: number;
  result: string;
  remarks?: string;
  createdAt: string;
}

export interface FetchCallLogsParams {
  page?: number;
  pageSize?: number;
  leadId?: string;
  telecallerId?: string;   // optional (admins/leaders)
  start?: string;          // ISO date (inclusive)
  end?: string;            // ISO date (inclusive)
  result?: string;         // e.g. 'completed' | 'no-answer' | ...
  q?: string;              // search (lead name/phone OR remarks/result)
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch call logs with pagination (and optional filters).
 * If server still returns an array (legacy), wrap it into a paged shape.
 */
export const fetchCallLogs = createAsyncThunk<
  Paged<CallLogDto>,
  FetchCallLogsParams | void,
  { rejectValue: string }
>(
  'calls/fetch',
  async (params, { rejectWithValue }) => {
    try {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('pageSize', String(params.pageSize));
      if (params?.leadId) q.set('leadId', params.leadId);
      if (params?.telecallerId) q.set('telecallerId', params.telecallerId);
      if (params?.start) q.set('start', params.start);
      if (params?.end) q.set('end', params.end);
      if (params?.result) q.set('result', params.result);
      if (params?.q) q.set('q', params.q);

      const url = `/calls${q.toString() ? `?${q.toString()}` : ''}`;
      const resp = await apiRequestLite(url, 'GET', undefined, true);

      // Backward compatibility with legacy array response
      if (Array.isArray(resp)) {
        return {
          items: resp,
          total: resp.length,
          page: 1,
          pageSize: resp.length,
          totalPages: 1,
        };
      }

      // Normal paginated response
      return {
        items: resp.items ?? [],
        total: Number(resp.total ?? 0),
        page: Number(resp.page ?? params?.page ?? 1),
        pageSize: Number(resp.pageSize ?? params?.pageSize ?? (resp.items?.length ?? 0)),
        totalPages: Number(resp.totalPages ?? 1),
      };
    } catch {
      return rejectWithValue('Failed to fetch call logs');
    }
  }
);

/**
 * Create a new call log
 */
export const createCallLog = createAsyncThunk<
  CallLogDto,
  { leadId: string; duration?: number; result: string; remarks?: string },
  { rejectValue: string }
>(
  'calls/create',
  async (body, { rejectWithValue }) => {
    try {
      const resp = await apiRequestLite('/calls', 'POST', body, true);
      // Support both {call: {...}} and direct object
      const call = resp?.call ?? resp;
      return call as CallLogDto;
    } catch {
      return rejectWithValue('Failed to create call log');
    }
  }
);