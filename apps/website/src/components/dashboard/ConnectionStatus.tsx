'use client';
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
  const { apiMode } = useDashboard();
  return <div className="dash-connection" role="status">
    {online
      ? apiMode ? 'Conta ligada. Os dados são sincronizados com o servidor.' : 'Modo de demonstração neste dispositivo. Sem sincronização com servidor.'
      : apiMode ? 'Sem ligação ao servidor. As alterações não serão guardadas até a ligação voltar.' : 'Sem ligação. A demonstração continua neste navegador; não recarregue a página.'}
  </div>;
}
