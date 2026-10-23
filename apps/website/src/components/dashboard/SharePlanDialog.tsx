'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, Link2, MessageCircle, Search, ShieldCheck, UserRound } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { localId } from '@/lib/dashboard/selectors';
import { useDashboard } from './state/DashboardProvider';
import type { Conversation } from '@/types/dashboard';

type ShareLink = { id: string; createdAt: string; expiresAt: string; revokedAt: string | null };
type CreatedLink = ShareLink & { url: string };
type Teacher = { id: string; name: string; email: string };
type ShareMode = 'teacher' | 'link';

function currentSiteUrl(serverUrl: string) {
  const parsed = new URL(serverUrl, window.location.origin);
  return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, window.location.origin).toString();
}

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
  const { state, update } = useDashboard();
  const [mode, setMode] = useState<ShareMode>('teacher');
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherQuery, setTeacherQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [teacherLoadError, setTeacherLoadError] = useState(false);
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
    setLoadingTeachers(true);
    void apiRequest<Teacher[]>(`/schools/${encodeURIComponent(schoolId)}/messaging/participants`)
      .then((rows) => { setTeachers(rows); setTeacherLoadError(false); })
      .catch(() => { setTeachers([]); setTeacherLoadError(true); })
      .finally(() => setLoadingTeachers(false));
  }, [refresh, schoolId]);

  const active = useMemo(() => links.filter(
    (link) => !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now(),
  ), [links]);
  const filteredTeachers = teachers.filter((teacher) =>
    `${teacher.name} ${teacher.email}`.toLocaleLowerCase().includes(teacherQuery.trim().toLocaleLowerCase()),
  );

  const createLink = async () => {
    const result = await apiRequest<CreatedLink>(path, { method: 'POST' });
    const url = currentSiteUrl(result.url);
    setNewUrl(url);
    await refresh();
    return url;
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify('Link copiado. Já pode partilhá-lo.');
    } catch {
      setNewUrl(url);
      notify('Selecione e copie o link apresentado.');
    }
  };

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const url = await createLink();
      await copyLink(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o link.');
    } finally {
      setBusy(false);
    }
  };

  const sendToTeacher = async () => {
    const recipient = teachers.find((teacher) => teacher.id === selectedTeacher);
    if (!recipient) return;
    setBusy(true);
    setError('');
    let shareUrl = newUrl;
    try {
      shareUrl = shareUrl || await createLink();
      const conversation = await apiRequest<Conversation>(
        `/schools/${encodeURIComponent(schoolId)}/messaging/conversations`,
        { method: 'POST', body: JSON.stringify({ recipientId: recipient.id }) },
      );
      const message = {
        id: localId('msg'),
        senderId: state.user.id,
        text: `Partilhou consigo o plano “${title}”.\n\nVer o plano: ${shareUrl}`,
        time: new Date().toLocaleTimeString('pt-PT', {
          hour: '2-digit', minute: '2-digit', timeZone: state.settings.timezone,
        }),
        attachments: [],
      };
      const updated: Conversation = {
        ...conversation,
        schoolId,
        unread: 0,
        messages: [...(conversation.messages || []), message],
      };
      update((current) => ({
        ...current,
        conversations: [updated, ...current.conversations.filter((item) => item.id !== updated.id)],
      }));
      setSelectedTeacher('');
      notify(`Plano enviado a ${recipient.name} pelas Mensagens.`);
    } catch (cause) {
      if (shareUrl) setMode('link');
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o plano.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (linkId: string) => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`${path}/${encodeURIComponent(linkId)}`, { method: 'DELETE' });
      await refresh();
      notify('Link revogado. Já não pode ser aberto.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível revogar o link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-share-plan">
      <div className="dash-share-intro"><span><ShieldCheck size={18} /></span><p>Escolha como quer partilhar <strong>{title}</strong>.</p></div>
      <div className="dash-share-tabs" role="tablist" aria-label="Forma de partilha">
        <button type="button" role="tab" aria-selected={mode === 'teacher'} className={mode === 'teacher' ? 'is-active' : ''} onClick={() => setMode('teacher')}><MessageCircle size={17} /> Enviar a professor</button>
        <button type="button" role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'is-active' : ''} onClick={() => setMode('link')}><Link2 size={17} /> Criar link</button>
      </div>

      {mode === 'teacher' ? (
        <section className="dash-share-panel" role="tabpanel">
          <h3>Enviar a um professor da escola</h3>
          <p>O AgendAKI envia uma mensagem privada pelas Mensagens com um link para o plano. O link é válido por 30 dias e pode ser reencaminhado por quem o receber.</p>
          <label className="dash-share-search"><Search size={17} /><input type="search" value={teacherQuery} onChange={(event) => setTeacherQuery(event.target.value)} placeholder="Pesquisar por nome ou email" /></label>
          <div className="dash-share-teachers" role="listbox" aria-label="Professores da escola">
            {filteredTeachers.map((teacher) => <button key={teacher.id} type="button" role="option" aria-selected={selectedTeacher === teacher.id} className={selectedTeacher === teacher.id ? 'is-selected' : ''} onClick={() => setSelectedTeacher(teacher.id)}>
              <span className="dash-share-teacher-avatar"><UserRound size={17} /></span><span><strong>{teacher.name}</strong><small>{teacher.email}</small></span>{selectedTeacher === teacher.id && <Check size={17} />}
            </button>)}
            {!filteredTeachers.length && <p>{loadingTeachers ? 'A carregar professores…' : teacherLoadError ? 'Não foi possível carregar a lista de professores. Pode partilhar um link.' : teachers.length ? 'Nenhum professor corresponde à pesquisa.' : 'Não há outros professores registados nesta escola.'}</p>}
          </div>
          <button className="dash-btn" type="button" disabled={busy || !selectedTeacher} onClick={() => void sendToTeacher()}>{busy ? 'A enviar…' : 'Enviar plano pelas Mensagens'}</button>
        </section>
      ) : (
        <section className="dash-share-panel" role="tabpanel">
          <h3>Criar um link partilhável</h3>
          <p>Qualquer pessoa com o link pode ver os objetivos e o conteúdo pedagógico. O link expira em 30 dias ou pode ser revogado a qualquer momento.</p>
          <div className="dash-share-privacy"><ShieldCheck size={17} /><span>Não inclui dados dos alunos, observações privadas nem ficheiros anexados.</span></div>
          <button className="dash-btn" type="button" disabled={busy} onClick={() => void create()}>{busy ? 'A preparar…' : 'Criar link e copiar'}</button>
          {newUrl && <div className="dash-share-url"><span>Link partilhável</span><input aria-label="Link partilhável" readOnly value={newUrl} onFocus={(event) => event.currentTarget.select()} /><button type="button" className="dash-btn secondary" onClick={() => void copyLink(newUrl)}><Clipboard size={16} /> Copiar link</button></div>}
        </section>
      )}

      {error && <p role="alert" className="dash-share-error">{error}</p>}
      {active.length > 0 && <section className="dash-share-links"><h3>Links ativos</h3>{active.map((link) => <div key={link.id}>
        <span>Expira em {new Date(link.expiresAt).toLocaleDateString('pt-PT')}</span>
        <button disabled={busy} type="button" onClick={() => void revoke(link.id)}>Revogar</button>
      </div>)}</section>}
      <small>O link abre o plano no site público do AgendAKI; só os dados pedagógicos selecionados ficam visíveis.</small>
    </div>
  );
}
