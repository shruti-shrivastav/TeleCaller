import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { fetchDashboardSummary, type DashboardSummary } from './dashboard-thunk'

interface DashboardState {
  summary: DashboardSummary | null
  loading: boolean
  error: string | null
}

const initialState: DashboardState = {
  summary: null,
  loading: false,
  error: null,
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboard(state) {
      state.summary = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        fetchDashboardSummary.fulfilled,
        (state, action: PayloadAction<DashboardSummary>) => {
          state.loading = false
          state.summary = action.payload
        }
      )
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.loading = false
        state.error =
          (action.payload as string) || 'Failed to fetch dashboard summary'
      })
  },
})

export const { clearDashboard } = dashboardSlice.actions
export default dashboardSlice.reducer