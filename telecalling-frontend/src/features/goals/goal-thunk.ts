import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequestLite } from '@/api/api-lite'

export const fetchGoals = createAsyncThunk<any[], void, { rejectValue: string }>(
  'goals/fetchGoals',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequestLite('/goals', 'GET', undefined, true)
    } catch {
      return rejectWithValue('Failed to fetch goals')
    }
  }
)

export const createGoal = createAsyncThunk<
  any,
  { userId?: string; type: string; target: number; startDate: string; endDate: string },
  { rejectValue: string }
>('goals/createGoal', async (body, { rejectWithValue }) => {
  try {
    return await apiRequestLite('/goals', 'POST', body, true)
  } catch {
    return rejectWithValue('Failed to create goal')
  }
})