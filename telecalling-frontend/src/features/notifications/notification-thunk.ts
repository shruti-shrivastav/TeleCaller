import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequestLite } from '@/api/api-lite'

/** 🔹 Fetch all notifications */
export const fetchNotifications = createAsyncThunk<
  any[], // return type
  void,
  { rejectValue: string }
>('notifications/fetchNotifications', async (_, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite('/notifications', 'GET', undefined, true)
    return data
  } catch {
    return rejectWithValue('Failed to fetch notifications')
  }
})

/** 🔹 Mark a notification as read */
export const markNotificationRead = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>('notifications/markNotificationRead', async (id, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite(`/notifications/${id}/read`, 'PATCH', undefined, true)
    return { id, data }
  } catch {
    return rejectWithValue('Failed to mark notification as read')
  }
})