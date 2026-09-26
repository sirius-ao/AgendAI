'use client';
import { useSyncExternalStore } from 'react';
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
  return <div className="dash-connection" role="status">
    {online
      ? 'Modo local neste dispositivo. Sem sincronização com servidor.'
      : 'Sem ligação. Pode continuar nesta página em modo local. Não recarregue: abrir a aplicação offline ainda não está disponível.'}
  </div>;
}
