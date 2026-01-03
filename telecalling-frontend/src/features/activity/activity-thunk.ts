import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequestLite } from '@/api/api-lite'

export const fetchActivityLogs = createAsyncThunk<any[], void, {rejectValue:string}>(
 'activity/fetch', async(_, {rejectWithValue})=>{
  try{ return await apiRequestLite('/activity','GET',undefined,true) }
  catch{ return rejectWithValue('Failed to fetch activity logs') }
})