'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Input } from '@agendai/ui';
import { Logo } from './Logo';
import { apiResendVerification, apiVerifyEmail } from '@/lib/api/client';

export function EmailVerification({ token, initialEmail }: { token?: string; initialEmail?: string }) {
  const [activeToken, setActiveToken] = useState(token || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    const fragmentToken = new URLSearchParams(url.hash.slice(1)).get('token');
    setActiveToken((current) => current || fragmentToken || url.searchParams.get('token') || '');
    if (url.hash || url.searchParams.has('token')) {
      url.hash = '';
      url.searchParams.delete('token');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);
  return (
    <section data-clarity-mask="true" className="access-page container">
      <div className="access-copy"><p className="eyebrow">Acesso à conta</p><h1>Confirme o<br /><span>seu email.</span></h1><p>Confirme o endereço para proteger o acesso à sua conta.</p></div>
      <div className="card access-card">
        <Logo />
        <h2>{activeToken ? 'Confirmar endereço de email.' : 'Pedir nova ligação de confirmação.'}</h2>
        <p>{activeToken ? 'A ligação de confirmação só pode ser utilizada uma vez.' : 'Introduza o endereço usado ao criar a conta.'}</p>
        <form onSubmit={async (event) => {
          event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage(''); setError(false);
          try {
            if (activeToken) await apiVerifyEmail(activeToken);
            else await apiResendVerification(String(form.get('email')));
            setMessage(token ? 'Email confirmado. Já pode entrar na sua conta.' : 'Se existir uma conta por confirmar, receberá uma nova ligação.');
          } catch (cause) {
            setError(true); setMessage(cause instanceof Error ? cause.message : 'Não foi possível concluir o pedido.');
          } finally { setBusy(false); }
        }}>
          {!activeToken && <label>O seu e-mail<Input name="email" type="email" autoComplete="email" defaultValue={initialEmail} required /></label>}
          <Button type="submit" disabled={busy}>{busy ? 'Aguarde…' : activeToken ? 'Confirmar email' : 'Enviar nova ligação'}<ArrowRight size={17} /></Button>
          {message && <p role={error ? 'alert' : 'status'} className="form-feedback">{message}</p>}
        </form>
        <p className="access-switch"><Link href="/entrar">Voltar a entrar</Link></p>
      </div>
    </section>
  );
}
