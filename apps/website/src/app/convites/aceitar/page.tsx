'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest, hasApiSession } from '@/lib/api/client';

export default function AcceptInvitationPage() {
  const [status, setStatus] = useState('A verificar o convite…');
  const [links, setLinks] = useState<{ login: string; register: string } | null>(null);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setStatus('O link de convite não contém um token válido.'); return; }
    if (!hasApiSession()) {
      const query = `?convite=${encodeURIComponent(token)}`;
      setLinks({ login: `/entrar${query}`, register: `/comecar${query}` });
      setStatus('Entre na sua conta ou crie uma conta para aceitar o convite.');
      return;
    }
    void apiRequest('/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => setStatus('Convite aceite. Já pode abrir o dashboard da escola.'))
      .catch((error) => setStatus(error instanceof Error ? error.message : 'Não foi possível aceitar o convite.'));
  }, []);
  return <main className="access-page container"><section className="card access-card"><h1>Convite para uma escola</h1><p role="status">{status}</p>{links && <div className="dash-form-actions"><Link className="dash-btn" href={links.login}>Entrar</Link><Link className="dash-btn secondary" href={links.register}>Criar conta</Link></div>}<Link href="/">Voltar ao AgendAI</Link></section></main>;
}
