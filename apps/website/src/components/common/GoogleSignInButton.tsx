'use client';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGoogleNonce } from '@/lib/api/client';

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: { theme: string; size: string; text: string; shape: string; width: number }) => void;
    } } };
  }
}

export function GoogleSignInButton({ mode, onCredential, disabled }: {
  mode: 'LOGIN' | 'REGISTER';
  onCredential: (credential: string) => Promise<boolean>;
  disabled?: boolean;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const localPreview = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_GOOGLE_PREVIEW === 'true';
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { callback.current = onCredential; }, [onCredential]);
  const onReady = useCallback(() => setScriptReady(true), []);
  useEffect(() => {
    let cancelled = false;
    const target = container.current;
    if (!clientId || !scriptReady || !target || !window.google) return;
    target.replaceChildren();
    setError('');
    const initialize = async () => {
      try {
        const { nonce } = await apiGoogleNonce();
        if (cancelled || !container.current || !window.google) return;
        window.google.accounts.id.initialize({ client_id: clientId, nonce, callback: async ({ credential }) => {
          const keepNonce = await callback.current(credential);
          if (keepNonce) return;
          if (cancelled || !container.current || !window.google) return;
          container.current.replaceChildren();
          await initialize();
        } });
        window.google.accounts.id.renderButton(container.current, { theme: 'outline', size: 'large', text: mode === 'LOGIN' ? 'signin_with' : 'signup_with', shape: 'rectangular', width: Math.min(400, Math.max(220, Math.floor(container.current.clientWidth))) });
      } catch {
        if (!cancelled) setError('Não foi possível carregar o acesso Google. Tente novamente.');
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [clientId, mode, scriptReady]);
  if (!clientId && localPreview) return <div className="google-signin">
    <button type="button" className="google-preview-button" onClick={() => setError('Pré-visualização local: configure um Google Client ID válido para autenticar.')}>
      <span className="google-preview-mark" aria-hidden="true">G</span>
      {mode === 'LOGIN' ? 'Continuar com Google' : 'Criar conta com Google'}
    </button>
    {error && <small role="status">{error}</small>}
  </div>;
  if (!clientId) return null;
  return <div className={`google-signin${disabled ? ' is-disabled' : ''}`} aria-label={mode === 'LOGIN' ? 'Entrar com Google' : 'Criar conta com Google'}>
    <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={onReady} />
    <div ref={container} />
    {disabled && <div className="google-signin-blocker" aria-hidden="true" />}
    {error && <small role="alert">{error}</small>}
  </div>;
}
