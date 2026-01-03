import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { fetchNotifications, markNotificationRead } from './notification-thunk'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  type?: string
}

interface NotificationState {
  items: Notification[]
  loading: boolean
  error: string | null
}

const initialState: NotificationState = {
  items: [],
  loading: false,
  error: null,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotifications(state) {
      state.items = []
    },
  },
  extraReducers: (builder) => {
    builder
      // 🔹 Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false
        const data = action.payload || []
        state.items = Array.isArray(data)
          ? data.map((n: any) => ({
              id: n._id || n.id,
              title: n.title || 'Notification',
              message: n.message || '',
              read: n.read || false,
              createdAt: n.createdAt,
              type: n.type,
            }))
          : []
      })
      .addCase(fetchNotifications.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload || 'Failed to load notifications'
      })

      // 🔹 Mark Read
      .addCase(markNotificationRead.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        const idx = state.items.findIndex((n) => n.id === action.payload.id)
        if (idx !== -1) state.items[idx].read = true
      })
  },
})

export const { clearNotifications } = notificationSlice.actions
export default notificationSlice.reducer