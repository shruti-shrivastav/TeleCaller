// src/features/auth/auth-slice.ts
import { createSlice } from '@reduxjs/toolkit';
import { loginUser, fetchMe } from './auth-thunk';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user')!)
    : null,
  token: localStorage.getItem('token'),
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    setUser(state, action) {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      // ✅ LOGIN
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;

        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state) => {
        state.loading = false;
      })

      // ✅ FETCH /auth/me
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        if (action.payload)
          localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(fetchMe.rejected, (state) => {
        // Clear invalid session
        state.loading = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
