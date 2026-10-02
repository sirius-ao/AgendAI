'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@agendai/ui';
import { apiNewsletterConfirm, apiNewsletterUnsubscribe } from '@/lib/api/client';

export function NewsletterAction({ mode, token }: { mode: 'confirm' | 'cancel'; token?: string }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="access-page container">
      <div className="access-copy"><p className="eyebrow">Newsletter AgendAI</p><h1>{mode === 'confirm' ? <>Confirme a sua<br /><span>subscrição.</span></> : <>Cancele a sua<br /><span>subscrição.</span></>}</h1><p>Gerimos as suas preferências de email com o seu consentimento.</p></div>
      <div className="card access-card">
        <h2>{mode === 'confirm' ? 'Quer receber os nossos artigos?' : 'Deixar de receber a newsletter?'}</h2>
        <p>{mode === 'confirm' ? 'Confirme para ativar a subscrição.' : 'Pode voltar a subscrever a qualquer momento.'}</p>
        <Button type="button" disabled={busy || !token} onClick={async () => {
          if (!token) return;
          setBusy(true); setMessage(''); setError(false);
          try {
            if (mode === 'confirm') await apiNewsletterConfirm(token);
            else await apiNewsletterUnsubscribe(token);
            setMessage(mode === 'confirm' ? 'Subscrição confirmada. Pode cancelar através do link em qualquer email da newsletter.' : 'Subscrição cancelada. Não enviaremos mais emails da newsletter.');
          } catch (cause) {
            setError(true); setMessage(cause instanceof Error ? cause.message : 'Ligação inválida ou expirada.');
          } finally { setBusy(false); }
        }}>{busy ? 'Aguarde…' : mode === 'confirm' ? 'Confirmar subscrição' : 'Cancelar subscrição'}</Button>
        {!token && <p role="alert" className="form-feedback">A ligação está incompleta.</p>}
        {message && <p role={error ? 'alert' : 'status'} className="form-feedback">{message}</p>}
        <p className="access-switch"><Link href="/blog">Voltar ao blog</Link></p>
      </div>
    </section>
  );
}
