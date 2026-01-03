import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequestLite } from '@/api/api-lite'

export interface DashboardSummary {
  range: 'day' | 'week' | 'month' | 'custom'
  period: { start: string; end: string }
  role: 'admin' | 'leader' | 'telecaller'

  leadStats: {
    totalLeads: number
    statusBreakdown: {
      new: number
      in_progress: number
      callback: number
      closed: number
      dead: number
    }
    createdInPeriod: number
    startedInPeriod: number
    updatedInPeriod: number
    updatedStatusBreakdown: {
      new: number
      in_progress: number
      callback: number
      closed: number
      dead: number
    }
  }

  callStats: {
    totalCalls: number
    byResult: {
      answered: number
      missed: number
      callback: number
      converted: number
    }
    perTelecaller: Array<{
      userId: string
      fullName: string
      email: string
      totalCalls: number
      converted: number
      byResult: {
        answered: number
        missed: number
        callback: number
        converted: number
      }
    }>
  }

  goalStats?: {
    weeklyTarget: number
    achieved: number
    remaining: number
  }

  teamStats?: {
    totalTelecallers: number
    topTelecallers: Array<{
      userId: string
      fullName: string
      email: string
      totalCalls: number
      converted: number
    }>
  }
}

export const fetchDashboardSummary = createAsyncThunk<
  DashboardSummary,
  { range?: string; startDate?: string; endDate?: string } | void,
  { rejectValue: string }
>('dashboard/fetchSummary', async (params, { rejectWithValue }) => {
  try {
    // Build query string manually to ensure proper triggering
    const queryString = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';

    const data = await apiRequestLite(
      `/dashboard/summary${queryString}`,
      'GET',
      undefined,
      true
    );
    return data as DashboardSummary;
  } catch {
    return rejectWithValue('Failed to load dashboard summary');
  }
});