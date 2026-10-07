'use client';

import { useState } from 'react';
import { Turnstile } from './Turnstile';

export function TurnstileRegisterReturn() {
  const [token, setToken] = useState('');
  const returnUrl = token ? `agendaki:///criar-conta?turnstileToken=${encodeURIComponent(token)}` : '';
  return (
    <main data-clarity-mask="true" className="container" style={{ maxWidth: 620, paddingTop: 48, paddingBottom: 72 }}>
      <section className="card" style={{ padding: 28 }}>
        <p className="eyebrow">AgendAKI mobile</p>
        <h1>Verificação de segurança</h1>
        <p>Confirme que é uma pessoa. Depois volte à aplicação para concluir o cadastro.</p>
        <Turnstile action="register" onToken={setToken} />
        {returnUrl && <a className="button button-primary" href={returnUrl}>Voltar à aplicação</a>}
      </section>
    </main>
  );
}
