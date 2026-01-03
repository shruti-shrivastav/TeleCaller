import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/auth-slice';
import dashboardReducer from './features/dashboard/dashboard-slice';
import userReducer from './features/users/user-slice';
import errorReducer from './features/error-slice';
import notificationReducer from './features/notifications/notification-slice';
import goalReducer from './features/goals/goal-slice';
import activityReducer from './features/activity/activity-slice';
import callsReducer from './features/calls/call-slice';
import leadReducer from './features/leads/lead-slice';
import teamReducer from './features/team/team-slice';
import enquiriesReducer from './features/enquiries/enquiry-slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    users: userReducer,
    leads: leadReducer,
    notifications: notificationReducer,
    error: errorReducer,
    goals: goalReducer,
    activity: activityReducer,
    calls: callsReducer,
    team : teamReducer,
    enquiries: enquiriesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
