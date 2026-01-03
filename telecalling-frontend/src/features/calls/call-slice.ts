import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchCallLogs,
  createCallLog,
  type Paged,
  type CallLogDto,
} from './call-thunk';

export interface CallState {
  items: CallLogDto[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const initialState: CallState = {
  items: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

// in callSlice.ts
const normalize = (c: any): CallLogDto => {
  if (!c) return c;

  const getId = (v: any) =>
    typeof v === 'string' ? v : v?.id ?? v?._id ?? undefined;

  const leadObj =
    c?.lead ?? (typeof c?.leadId === 'object' ? c.leadId : undefined);
  const teleObj =
    c?.telecaller ?? (typeof c?.telecallerId === 'object' ? c.telecallerId : undefined);

  return {
    ...c,
    id: c?.id ?? c?._id,

    // keep id-only fields for filters/joins:
    leadId: getId(c?.leadId),
    telecallerId: getId(c?.telecallerId),

    // ALSO keep normalized objects for UI:
    lead: leadObj
      ? {
          id: getId(leadObj),
          name: leadObj.name,
          phone: leadObj.phone,
          email: leadObj.email,
          status: leadObj.status,
        }
      : undefined,

    telecaller: teleObj
      ? {
        id: getId(teleObj),
        fullName: teleObj.fullName,
        email: teleObj.email,
      }
      : undefined,
  };
};

const callSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCallLogs.pending, (s) => {
      s.loading = true;
      s.error = null;
    });

    b.addCase(
      fetchCallLogs.fulfilled,
      (s, a: PayloadAction<Paged<CallLogDto>>) => {
        s.loading = false;
        const payload = a.payload || {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        };
        s.items = (payload.items || []).filter(Boolean).map(normalize); // <— filter + safe normalize
        s.total = payload.total ?? 0;
        s.page = payload.page ?? 1;
        s.pageSize = payload.pageSize ?? 20;
        s.totalPages = payload.totalPages ?? 1;
      }
    );

    b.addCase(fetchCallLogs.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || 'Failed to load calls';
    });

    b.addCase(createCallLog.fulfilled, (s, a: PayloadAction<CallLogDto>) => {
      const raw = (a.payload as any)?.call ?? a.payload;
      const item = normalize(raw);
      s.items.unshift(item);
      s.total += 1;
    });
  },
});

export default callSlice.reducer;
