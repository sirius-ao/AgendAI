'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';

type ShareLink = { id: string; createdAt: string; expiresAt: string; revokedAt: string | null };
type CreatedLink = ShareLink & { url: string };
export function SharePlanDialog({
  schoolId,
  planId,
  title,
  notify,
}: {
  schoolId: string;
  planId: string;
  title: string;
  notify: (message: string) => void;
}) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const path = `/schools/${encodeURIComponent(schoolId)}/plans/${encodeURIComponent(planId)}/share-links`;
  const refresh = useCallback(async () => {
    try {
      const next = await apiRequest<ShareLink[]>(path);
      setLinks(next);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os links.');
    }
  }, [path]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<CreatedLink>(path, { method: 'POST' });
      setNewUrl(result.url);
      await refresh();
      try {
        await navigator.clipboard.writeText(result.url);
        notify('Link copiado. Partilhe com outro professor.');
      } catch {
        notify('Link criado. Copie-o na janela de partilha.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o link.');
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (linkId: string) => {
    setBusy(true);
    try {
      await apiRequest(`${path}/${encodeURIComponent(linkId)}`, { method: 'DELETE' });
      if (links.some((link) => link.id === linkId && !link.revokedAt)) setNewUrl('');
      await refresh();
      notify('Link revogado. Já não pode ser aberto.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível revogar o link.');
    } finally {
      setBusy(false);
    }
  };
  const active = links.filter(
    (link) => !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now(),
  );
  return (
    <div className="dash-share-plan">
      <p>
        Crie um link público por 30 dias. Ele mostra o conteúdo pedagógico do plano; não inclui
        observações privadas, anexos nem dados de alunos.
      </p>
      <button className="dash-btn" disabled={busy} onClick={() => void create()}>
        {busy ? 'A preparar…' : 'Criar link e copiar'}
      </button>
      {newUrl && (
        <label className="dash-share-url">
          Link criado
          <input readOnly value={newUrl} onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
      {error && (
        <p role="alert" className="dash-share-error">
          {error}
        </p>
      )}
      {active.length > 0 && (
        <section className="dash-share-links">
          <h3>Links ativos</h3>
          {active.map((link) => (
            <div key={link.id}>
              <span>Expira em {new Date(link.expiresAt).toLocaleDateString('pt-PT')}</span>
              <button disabled={busy} onClick={() => void revoke(link.id)}>
                Revogar
              </button>
            </div>
          ))}
        </section>
      )}
      <small>Quem tiver o link poderá ver este plano até à expiração ou revogação.</small>
      <span className="sr-only">Plano: {title}</span>
    </div>
  );
}
