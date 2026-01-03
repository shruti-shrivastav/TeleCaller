import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser,
  searchTelecallers,
  fetchTelecallerLeads,
  fetchTelecallerCalls,
  fetchTelecallerGoal,
  fetchTelecallerDashboard,
} from './user-thunk';

interface GoalInfo {
  _id?: string;
  // Backend uses "weekly_calls", but keep generic for safety
  type: string;
  target: number;
  achieved: number;
  progress?: number;
  startDate: string;
  endDate: string;
}

interface User {
  id: string;
  _id?: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: string;
  active?: boolean;
  leaderId?: any;

  // From backend listUsers / getUser / getTelecallerGoal
  weeklyGoal?: GoalInfo | null;

  // Extra analytics payloads
  leadsData?: any;
  callsData?: any;
  dashboard?: any;
}

interface UserState {
  all: User[];
  leaders: User[];
  telecallers: User[];
  telecallerSearch: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  telecallerLeads: Record<string, any>;
  telecallerCalls: Record<string, any>;
  telecallerDashboard: Record<string, any>;
}

const initialState: UserState = {
  all: [],
  leaders: [],
  telecallers: [],
  telecallerSearch: [],
  selectedUser: null,
  loading: false,
  error: null,
  telecallerLeads: {},
  telecallerCalls: {},
  telecallerDashboard: {},
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearSelectedUser(state) {
      state.selectedUser = null;
    },
    resetTelecallerData(state) {
      state.telecallerLeads = {};
      state.telecallerCalls = {};
      state.telecallerDashboard = {};
    },
  },
  extraReducers: (builder) => {
    builder
      /* 🟦 FETCH USERS */
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload as any;
        const rawItems = Array.isArray(payload?.items)
          ? payload.items
          : payload;

        const normalized: User[] = rawItems.map((u: any) => ({
          ...u,
          id: u._id || u.id,
          weeklyGoal: (u.weeklyGoal ?? null) as GoalInfo | null,
        }));

        const role = (action as any).meta?.arg?.role;

        if (role === 'leader') {
          state.leaders = [...normalized];
        } else if (role === 'telecaller') {
          state.telecallers = [...normalized];
        } else {
          state.all = [...normalized];
        }
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch users';
      })

      /* 👤 FETCH SINGLE USER */
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchUserById.fulfilled,
        (state, action: PayloadAction<User>) => {
          state.loading = false;
          const user = action.payload as any;
          const id = user._id || user.id;

          state.selectedUser = {
            ...user,
            id,
            weeklyGoal: (user.weeklyGoal ?? null) as GoalInfo | null,
            // hydrate from caches to avoid flicker
            leadsData: state.telecallerLeads[id] ?? user.leadsData,
            callsData: state.telecallerCalls[id] ?? user.callsData,
            dashboard: state.telecallerDashboard[id] ?? user.dashboard,
          };
        }
      )
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load user';
      })

      /* ➕ CREATE USER */
      .addCase(createUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        const payload = action.payload as any;
        const newUser: User = {
          ...payload,
          id: payload._id || payload.id,
          weeklyGoal: (payload.weeklyGoal ?? null) as GoalInfo | null,
        };
        state.all.unshift(newUser);
        if (newUser.role === 'leader') state.leaders.unshift(newUser);
        if (newUser.role === 'telecaller') state.telecallers.unshift(newUser);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to create user';
      })

      /* ✏️ UPDATE USER */
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        const payload = action.payload as any;
        const updatedId = payload._id || payload.id;

        const applyUpdate = (arr: User[]) =>
          arr.map((u) =>
            u.id === updatedId
              ? {
                  ...u,
                  ...payload,
                  id: updatedId,
                  weeklyGoal: (payload.weeklyGoal ??
                    u.weeklyGoal ??
                    null) as GoalInfo | null,
                }
              : u
          );

        state.all = applyUpdate(state.all);
        state.leaders = applyUpdate(state.leaders);
        state.telecallers = applyUpdate(state.telecallers);

        if (state.selectedUser?.id === updatedId) {
          state.selectedUser = {
            ...state.selectedUser,
            ...payload,
            id: updatedId,
            weeklyGoal: (payload.weeklyGoal ??
              //@ts-expect-error spam

              state.selectedUser.weeklyGoal ??
              null) as GoalInfo | null,
          };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update user';
      })

      /* 🗑️ DELETE USER */
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        const id = action.payload;
        state.all = state.all.filter((u) => u.id !== id);
        state.leaders = state.leaders.filter((u) => u.id !== id);
        state.telecallers = state.telecallers.filter((u) => u.id !== id);
        if (state.selectedUser?.id === id) {
          state.selectedUser = null;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to delete user';
      })

      /* 🔍 SEARCH TELECALLERS */
      .addCase(searchTelecallers.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchTelecallers.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload as any;
        const rawItems = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.items)
          ? payload.items
          : [];

        state.telecallerSearch = rawItems.map((u: any) => ({
          ...u,
          id: u._id || u.id,
        }));
      })
      .addCase(searchTelecallers.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || 'Failed to search telecallers';
      })

      /* 📊 TELECALLER LEADS */
      /* 📊 TELECALLER LEADS */
      .addCase(fetchTelecallerLeads.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTelecallerLeads.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, ...queryParams } = (action as any).meta.arg;

        const data = action.payload;
        const key = userId || state.selectedUser?.id;

        if (key) {
          state.telecallerLeads[key] = {
            ...data,
            query: queryParams, // 🔥 stores last used query
          };
        }

       if (state.selectedUser && state.selectedUser.id === key) {
  state.selectedUser.leadsData = state.telecallerLeads[key];
}
      })
      .addCase(fetchTelecallerLeads.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || 'Failed to load telecaller leads';
      })
      .addCase(fetchTelecallerCalls.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTelecallerCalls.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, ...queryParams } = (action as any).meta.arg;

        const data = action.payload;
        const key = userId || state.selectedUser?.id;

        if (key) {
          state.telecallerCalls[key] = {
            ...data,
            query: queryParams,
          };
        }

       if (state.selectedUser && state.selectedUser?.id === key) {
  state.selectedUser.callsData = state.telecallerCalls[key];
}
      })
      .addCase(fetchTelecallerCalls.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || 'Failed to load telecaller calls';
      })

      /* 🎯 TELECALLER GOAL (weekly_calls) */
      .addCase(fetchTelecallerGoal.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTelecallerGoal.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload as any; // { success, weeklyGoal }
        if (state.selectedUser) {
          state.selectedUser = {
            ...state.selectedUser,
            weeklyGoal: (data?.weeklyGoal ?? null) as GoalInfo | null,
          };
        }
      })
      .addCase(fetchTelecallerGoal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      /* 🧩 TELECALLER DASHBOARD */
      /* 🧩 TELECALLER DASHBOARD */
      .addCase(fetchTelecallerDashboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTelecallerDashboard.fulfilled, (state, action) => {
        state.loading = false;
        const key =
          (action as any).meta?.arg?.userId ??
          (action as any).meta?.arg ??
          (state.selectedUser?.id || '');

        if (key) state.telecallerDashboard[key] = action.payload;

        if (state.selectedUser?.id === key) {
          //@ts-expect-error spam
          state.selectedUser = {
            ...state.selectedUser,
            dashboard: action.payload,
            // keep weekly goal from dashboard if present (since we won't call goal API separately)
            weeklyGoal:
              (action.payload as any)?.weeklyGoal ??
              //@ts-expect-error spam
              state.selectedUser.weeklyGoal ??
              null,
          };
        }
      })
      .addCase(fetchTelecallerDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || 'Failed to load telecaller dashboard';
      });
  },
});

export const { clearSelectedUser } = userSlice.actions;
export default userSlice.reducer;
