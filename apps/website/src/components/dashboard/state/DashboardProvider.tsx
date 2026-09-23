'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createDashboardSeed } from '@/data/dashboard/seed';
import { localDashboardRepository } from '@/lib/dashboard/repository';
import type { DashboardState } from '@/types/dashboard';
type ModalRequest={kind:'plan'|'assessment'|'event';classId?:string;id?:string;ai?:boolean;date?:string;type?:string}|null;
type Context={state:DashboardState;ready:boolean;error:string;update:(fn:(state:DashboardState)=>DashboardState)=>void;notify:(message:string)=>void;modal:ModalRequest;openModal:(modal:ModalRequest)=>void;reset:()=>void;clearError:()=>void};
const DashboardContext=createContext<Context|null>(null);
export function DashboardProvider({children}:{children:ReactNode}){const [state,setState]=useState<DashboardState>(createDashboardSeed);const [ready,setReady]=useState(false);const [error,setError]=useState('');const [toast,setToast]=useState('');const [modal,openModal]=useState<ModalRequest>(null);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{let active=true;Promise.resolve().then(()=>{if(!active)return;try{setState(localDashboardRepository.load());}catch{setError('Não foi possível recuperar os dados locais. Pode continuar nesta sessão ou repor a demonstração.');}setReady(true);});return()=>{active=false;if(timer.current)clearTimeout(timer.current);};},[]);
 useEffect(()=>{if(!ready)return;try{localDashboardRepository.save(state);}catch{Promise.resolve().then(()=>setError('O navegador não permitiu guardar as alterações. Os dados desta sessão continuam disponíveis; exporte-os antes de sair.'));}},[state,ready]);
 const update=useCallback((fn:(state:DashboardState)=>DashboardState)=>setState(fn),[]);
 const notify=useCallback((message:string)=>{setToast(message);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),5000);},[]);
 const reset=()=>{try{setState(localDashboardRepository.reset());setError('');notify('Demonstração reposta.');}catch{setError('Não foi possível limpar o armazenamento local.');}};
 return <DashboardContext.Provider value={{state,ready,error,update,notify,modal,openModal,reset,clearError:()=>setError('')}}>{children}{toast&&<div className="dash-toast" role="status"><span>✓</span>{toast}<button onClick={()=>setToast('')} aria-label="Fechar notificação">×</button></div>}</DashboardContext.Provider>;
}
export function useDashboard(){const value=useContext(DashboardContext);if(!value)throw new Error('DashboardProvider em falta.');return value;}
