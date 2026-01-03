import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequestLite } from '@/api/api-lite';

export const fetchTeamMembers = createAsyncThunk<
  { leader: any; members: any[] },
  { leaderId?: string } | void,
  { rejectValue: string }
>('team/fetchTeamMembers', async (params, { rejectWithValue }) => {
    try {
    const qs = params?.leaderId ? `?leaderId=${params.leaderId}` : '';
    const data = await apiRequestLite(`/teams${qs}`, 'GET', undefined, true);
    return data;
  } catch {
    return rejectWithValue('Failed to fetch team members');
  }
});