import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchLeads,
  fetchLeadById,
  createLead,
  updateLead,
  deleteLead,
  bulkAssignLeads,
  updateLeadStatus,
  bulkUploadLeads,
  // ⬇️ NEW
  exportLeadsFile,
} from './lead-thunk';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  notes?: string;
  assignedTo?: any;
  leaderId?: any;
  createdBy?: any;
  lastCallAt?: string;
  nextCallDate?: string;
  callCount?: number;
  source?: string;
  active?: boolean;
  behaviour?: string;
  project?: string;
}

interface LeadState {
  list: Lead[];
  selectedLead: Lead | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;

  // ⬇️ NEW: export UX state
  exporting: boolean;
  exportError: string | null;
  lastExportMeta?: { filename: string; size: number; contentType: string };
}

const initialState: LeadState = {
  list: [],
  selectedLead: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,

  // ⬇️ NEW
  exporting: false,
  exportError: null,
  lastExportMeta: undefined,
};

const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    clearSelectedLead(state) {
      state.selectedLead = null;
    },
    // ⬇️ Optional: clear export error/meta from UI
    clearExportState(state) {
      state.exporting = false;
      state.exportError = null;
      state.lastExportMeta = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------------- EXISTING CASES ----------------
      .addCase(fetchLeads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const {
          items = [],
          total = 0,
          page = 1,
          pageSize = 20,
        } = action.payload;
        state.list = items.map((l: any) => ({ ...l, id: l._id || l.id }));
        state.total = total;
        state.page = page;
        state.pageSize = pageSize;
      })
      .addCase(fetchLeads.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load leads';
      })
      .addCase(fetchLeadById.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchLeadById.fulfilled,
        (state, action: PayloadAction<Lead>) => {
          state.loading = false;
          state.selectedLead = action.payload;
        }
      )
      .addCase(fetchLeadById.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load lead';
      })
      .addCase(createLead.pending, (state) => {
        state.loading = true;
      })
      .addCase(createLead.fulfilled, (state, action: PayloadAction<Lead>) => {
        state.loading = false;
        state.list.unshift({
          ...action.payload,
          id: action.payload.id || action.payload.id,
        });
      })
      .addCase(createLead.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create lead';
      })
      .addCase(updateLead.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateLead.fulfilled, (state, action: PayloadAction<Lead>) => {
        state.loading = false;
        const idx = state.list.findIndex(
          (l) => l.id === (action.payload.id || action.payload.id)
        );
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.selectedLead?.id === action.payload.id) {
          state.selectedLead = action.payload;
        }
      })
      .addCase(updateLead.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update lead';
      })
      .addCase(deleteLead.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteLead.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.list = state.list.filter((l) => l.id !== action.payload);
        if (state.selectedLead?.id === action.payload)
          state.selectedLead = null;
      })
      .addCase(deleteLead.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete lead';
      })
      .addCase(bulkAssignLeads.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkAssignLeads.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(
        bulkAssignLeads.rejected,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload || 'Failed to assign leads';
        }
      )
      .addCase(updateLeadStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        updateLeadStatus.fulfilled,
        (state, action: PayloadAction<Lead>) => {
          state.loading = false;
          const updated = action.payload;
          const idx = state.list.findIndex((l) => l.id === updated.id);
          if (idx !== -1) state.list[idx] = updated;
          if (state.selectedLead?.id === updated.id) {
            state.selectedLead = updated;
          }
        }
      )
      .addCase(
        updateLeadStatus.rejected,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload || 'Failed to update lead status';
        }
      )
      .addCase(bulkUploadLeads.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkUploadLeads.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(
        bulkUploadLeads.rejected,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload || 'Failed to upload CSV';
        }
      )

      // ============== NEW: Export UX ==============
      .addCase(exportLeadsFile.pending, (state) => {
        state.exporting = true;
        state.exportError = null;
      })
      .addCase(
        exportLeadsFile.fulfilled,
        (
          state,
          action: PayloadAction<{
            filename: string;
            size: number;
            contentType: string;
          }>
        ) => {
          state.exporting = false;
          state.lastExportMeta = action.payload;
        }
      )
      .addCase(
        exportLeadsFile.rejected,
        (state, action: PayloadAction<any>) => {
          state.exporting = false;
          state.exportError = action.payload || 'Failed to export leads';
        }
      );
  },
});

export const { clearSelectedLead, clearExportState } = leadSlice.actions;
export default leadSlice.reducer;
