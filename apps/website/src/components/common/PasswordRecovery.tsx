'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Input } from '@agendai/ui';
import { Logo } from './Logo';
import { apiForgotPassword, apiResetPassword } from '@/lib/api/client';

export function PasswordRecovery({ token }: { token?: string }) {
  const [activeToken, setActiveToken] = useState(token || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = Boolean(activeToken);
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
      <div className="access-copy"><p className="eyebrow">Acesso à conta</p><h1>Recupere o<br /><span>seu acesso.</span></h1><p>Vamos ajudar a voltar à sua conta AgendAKI.</p></div>
      <div className="card access-card">
        <Logo />
        <h2>{reset ? 'Escolha uma nova palavra-passe.' : 'Esqueceu-se da palavra-passe?'}</h2>
        <p>{reset ? 'Use uma palavra-passe com pelo menos 10 caracteres.' : 'Enviaremos uma ligação de recuperação para o endereço associado à conta.'}</p>
        <form onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true); setMessage(''); setError(false);
          const data = new FormData(event.currentTarget);
          try {
            if (reset) await apiResetPassword(activeToken, String(data.get('password')));
            else await apiForgotPassword(String(data.get('email')));
            setMessage(reset ? 'Palavra-passe alterada. Já pode entrar com a nova palavra-passe.' : 'Se existir uma conta com esse endereço, receberá uma ligação para redefinir a palavra-passe.');
          } catch (cause) {
            setError(true);
            setMessage(cause instanceof Error ? cause.message : 'Não foi possível concluir o pedido. Tente novamente.');
          } finally { setBusy(false); }
        }}>
          {reset ? <label>Nova palavra-passe<Input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" required /></label> : <label>O seu e-mail<Input name="email" type="email" autoComplete="email" required /></label>}
          <Button type="submit" disabled={busy || (reset && !activeToken)}>{busy ? 'Aguarde…' : reset ? 'Guardar nova palavra-passe' : 'Enviar ligação'}<ArrowRight size={17} /></Button>
          {message && <p role={error ? 'alert' : 'status'} className="form-feedback">{message}</p>}
        </form>
        <p className="access-switch"><Link href="/entrar">Voltar a entrar</Link></p>
      </div>
    </section>
  );
}
