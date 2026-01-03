import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchGoals, createGoal } from './goal-thunk';

interface Goal {
  id: string;
  userId: string;
  type: 'daily_calls' | 'weekly_calls' | 'conversions';
  period: 'daily' | 'weekly';
  target: number;
  achieved: number;
  startDate: string;
  endDate: string;
}

interface GoalState {
  items: Goal[];
  loading: boolean;
  error: string | null;
}

const initialState: GoalState = {
  items: [],
  loading: false,
  error: null,
};

const goalSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchGoals.pending, (s) => {
      s.loading = true;
    });
    b.addCase(fetchGoals.fulfilled, (s, a: PayloadAction<any[]>) => {
      s.loading = false;
      s.items = (a.payload || []).map((g: any) => ({
        ...g,
        id: g._id || g.id,
      }));
    });
    b.addCase(fetchGoals.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload || 'Failed to fetch goals';
    });
    b.addCase(createGoal.fulfilled, (s, a: PayloadAction<any>) => {
      s.items.unshift({ ...a.payload, id: a.payload._id || a.payload.id });
    });
  },
});

export default goalSlice.reducer;
