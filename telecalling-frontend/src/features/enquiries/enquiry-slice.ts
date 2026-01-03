import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchEnquiries, updateEnquiryStatus, type Enquiry } from './enquiry-thunk';

interface EnquiryState {
  list: Enquiry[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

const initialState: EnquiryState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,
};

const enquiriesSlice = createSlice({
  name: 'enquiries',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnquiries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchEnquiries.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          const {
            items = [],
            total = 0,
            page = 1,
            pageSize = 20,
          } = action.payload || {};
          state.list = items.map((e: any) => ({
            ...e,
            id: e._id || e.id,
          }));
          state.total = total;
          state.page = page;
          state.pageSize = pageSize;
        }
      )
      .addCase(fetchEnquiries.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load enquiries';
      })
      .addCase(updateEnquiryStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateEnquiryStatus.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          const updated = action.payload;
          const idx = state.list.findIndex(
            (e) => e.id === (updated.id || updated._id)
          );
          if (idx !== -1) state.list[idx] = { ...state.list[idx], ...updated };
        }
      )
      .addCase(
        updateEnquiryStatus.rejected,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload || 'Failed to update enquiry';
        }
      );
  },
});

export default enquiriesSlice.reducer;
