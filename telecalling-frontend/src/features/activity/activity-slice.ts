import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { fetchActivityLogs } from './activity-thunk'

interface Activity{ id:string; user?:any; action:string; targetId?:string; createdAt:string }
interface ActivityState{ items:Activity[]; loading:boolean; error:string|null }

const initialState:ActivityState={items:[],loading:false,error:null}

const activitySlice=createSlice({
 name:'activity',initialState,reducers:{},
 extraReducers:(b)=>{
  b.addCase(fetchActivityLogs.pending,(s)=>{s.loading=true})
   .addCase(fetchActivityLogs.fulfilled,(s,a:PayloadAction<any[]>)=>{
     s.loading=false
     s.items=(a.payload||[]).map((x:any)=>({id:x._id||x.id,action:x.action,createdAt:x.createdAt,user:x.userId}))
   })
   .addCase(fetchActivityLogs.rejected,(s,a)=>{s.loading=false;s.error=a.payload||'Failed to load'})
 }
})
export default activitySlice.reducer