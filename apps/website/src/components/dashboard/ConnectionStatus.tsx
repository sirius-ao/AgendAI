'use client';
import { AlertCircle, CheckCircle2, LoaderCircle, WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useDashboard } from './state/DashboardProvider';
const subscribe = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};
export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const { apiMode, ready, error, syncStatus } = useDashboard();
  const state = apiMode && syncStatus === 'syncing' && ready ? 'syncing' : error || syncStatus === 'error' ? 'error' : !online && apiMode ? 'offline' : apiMode && !ready ? 'syncing' : apiMode ? 'synced' : 'demo';
  const labels = {
    offline: 'Sem ligação ao servidor',
    error: apiMode ? 'Falha ao sincronizar' : 'Falha ao guardar neste dispositivo',
    syncing: 'A sincronizar com o servidor…',
    synced: 'Sincronizado com o servidor',
    demo: 'Demonstração · dados guardados neste dispositivo',
  } as const;
  const Icon = state === 'offline' ? WifiOff : state === 'error' ? AlertCircle : state === 'syncing' ? LoaderCircle : CheckCircle2;
  return <div className={`dash-connection is-${state}`} role={state === 'error' ? 'alert' : 'status'} aria-live={state === 'error' ? 'assertive' : 'polite'}>
    <Icon size={17} aria-hidden="true" className={state === 'syncing' ? 'dash-connection-spinner' : undefined} />
    <span className="dash-connection-copy">
      <strong>{labels[state]}</strong>
      {(state === 'error' || state === 'syncing') && error && <span className="dash-connection-error">{error}</span>}
    </span>
  </div>;
}
