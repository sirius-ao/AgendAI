import type { DashboardState } from '@/types/dashboard';
import { createDashboardSeed } from '@/data/dashboard/seed';
const KEY='agendai-dashboard-demo-v1';
export interface DashboardRepository {load():DashboardState;save(state:DashboardState):void;reset():DashboardState;}
// Replace this adapter with an API implementation when authentication and endpoints exist.
export const localDashboardRepository:DashboardRepository={
 load(){const raw=localStorage.getItem(KEY);if(!raw)return createDashboardSeed();const stored=JSON.parse(raw) as {version?:number;state?:DashboardState};if(stored.version!==1||!stored.state||!Array.isArray(stored.state.classes)||!Array.isArray(stored.state.students)||!Array.isArray(stored.state.plans))throw new Error('Os dados locais não são compatíveis.');return {...createDashboardSeed(),...stored.state};},
 save(state){localStorage.setItem(KEY,JSON.stringify({version:1,state}));},
 reset(){const state=createDashboardSeed();localStorage.removeItem(KEY);return state;}
};
