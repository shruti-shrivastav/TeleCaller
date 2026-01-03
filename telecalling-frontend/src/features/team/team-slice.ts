import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { fetchTeamMembers } from './team-thunk'

interface TeamUser {
  id: string
  _id?: string
  firstName: string
  lastName?: string
  fullName?: string
  email: string
  phone?: string
  role: string
  active?: boolean
  leaderId?: any
}

interface TeamState {
  leader: TeamUser | null
  members: TeamUser[]
  loading: boolean
  error: string | null
}

const initialState: TeamState = {
  leader: null,
  members: [],
  loading: false,
  error: null,
}

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    clearTeam(state) {
      state.leader = null
      state.members = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading = false
        const { leader, members } = action.payload
        state.leader = leader
        state.members = Array.isArray(members)
          ? members.map((m: any) => ({
              ...m,
              id: m._id || m.id,
            }))
          : []
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to fetch team'
      })
  },
})

export const { clearTeam } = teamSlice.actions
export default teamSlice.reducer