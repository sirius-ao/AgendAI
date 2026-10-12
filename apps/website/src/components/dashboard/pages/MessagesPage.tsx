'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Archive, ChevronLeft, FileText, GraduationCap, MessageSquarePlus, Plus, School, Send, Star, UserRound, Users, Paperclip } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import {
  Avatar,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Switch,
  Tabs,
} from '../ui/Primitives';
import { localId, normalize } from '@/lib/dashboard/selectors';
import { downloadText } from '@/lib/dashboard/export';
import { apiRequest } from '@/lib/api/client';
import type { Conversation } from '@/types/dashboard';
export function MessagesPage({
  initialConversation,
}: {
  initialConversation?: string;
}) {
  const { state, update, notify, apiMode } = useDashboard();
  const [participants, setParticipants] = useState<{ id: string; name: string; email: string; avatar?: string }[]>([]);
  const [active, setActive] = useState(initialConversation || 'chat-10a'),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('Todas'),
    [text, setText] = useState(''),
    [files, setFiles] = useState<string[]>([]),
    [dialog, setDialog] = useState(''),
    [targetQuery, setTargetQuery] = useState(''),
    [targetType, setTargetType] = useState<'turma' | 'aluno' | 'professor'>('turma'),
    [mobileView, setMobileView] = useState<'list' | 'chat'>(initialConversation ? 'chat' : 'list'),
    [showMobileDetails, setShowMobileDetails] = useState(false);
  const messageList = useRef<HTMLDivElement>(null);
  const activeConversation = useRef(active);
  const conversationSnapshot = useRef(state.conversations);
  useEffect(() => {
    activeConversation.current = active;
    conversationSnapshot.current = state.conversations;
  }, [active, state.conversations]);
  const conversations = state.conversations.filter(
    (c) =>
      [conversationTitle(c), c.subtitle, c.messages.at(-1)?.text || ''].some((value) => normalize(value).includes(normalize(query))) &&
      (tab === 'Arquivadas' ? c.archived : !c.archived) &&
      (tab !== 'Não lidas' || c.unread > 0) &&
      (tab !== 'Favoritas' || c.favorite),
  );
  const conversation = conversations.find((c) => c.id === active) || conversations[0];
  useEffect(() => {
    const list = messageList.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [conversation?.id, conversation?.messages.length]);
  useEffect(() => {
    if (!apiMode || !state.activeSchoolId) return;
    let current = true;
    void apiRequest<{ id: string; name: string; email: string; avatar?: string }[]>(`/schools/${encodeURIComponent(state.activeSchoolId)}/messaging/participants`)
      .then((rows) => { if (current) setParticipants(rows); })
      .catch(() => { if (current) setParticipants([]); });
    return () => { current = false; };
  }, [apiMode, state.activeSchoolId]);
  useEffect(() => {
    if (!apiMode || !state.activeSchoolId) return;
    let current = true;
    const schoolId = state.activeSchoolId;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const rows = await apiRequest<{ recordId: string; payload: Conversation }[]>(`/schools/${encodeURIComponent(schoolId)}/data/conversations`);
        if (!current) return;
        const remote = rows.map(({ recordId, payload }) => ({ ...payload, id: recordId }));
        const localById = new Map(conversationSnapshot.current.map((item) => [item.id, item]));
        if (!remote.some((item) => !localById.has(item.id) || item.messages.length > (localById.get(item.id)?.messages.length || 0))) return;
        update((s) => {
          let changed = false;
          const next = [...s.conversations];
          for (const incoming of remote) {
            const index = next.findIndex((item) => item.id === incoming.id);
            if (index < 0) { next.unshift(incoming); changed = true; continue; }
            const local = next[index];
            if (incoming.messages.length > local.messages.length) {
              const added = incoming.messages.slice(local.messages.length);
              next[index] = {
                ...incoming,
                favorite: local.favorite,
                archived: local.archived,
                notifications: local.notifications,
                unread: added.some((message) => message.senderId !== s.user.id)
                  ? (activeConversation.current === local.id ? 0 : local.unread + added.filter((message) => message.senderId !== s.user.id).length)
                  : local.unread,
              };
              changed = true;
            }
          }
          return changed ? { ...s, conversations: next } : s;
        });
      } catch { /* A falha temporária será recuperada na próxima consulta. */ }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => { current = false; window.clearInterval(timer); };
  }, [apiMode, state.activeSchoolId, update]);
  function conversationTitle(c: Conversation) {
    if (c.direct) {
      const otherId = c.participantIds?.find((id) => id !== state.user.id);
      return participants.find((item) => item.id === otherId)?.name || c.title;
    }
    return c.title;
  }
  const person = (id: string) =>
    id === state.user.id ? state.user : state.students.find((s) => s.id === id) || participants.find((p) => p.id === id);
  const members = conversation?.memberIds.map(person).filter((p) => !!p) || [];
  const openChatOnMobile = () => {
    setMobileView('chat');
    setShowMobileDetails(false);
    if (window.matchMedia('(max-width: 700px)').matches)
      window.setTimeout(() => document.getElementById('dash-chat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const openListOnMobile = () => {
    setMobileView('list');
    setShowMobileDetails(false);
    if (window.matchMedia('(max-width: 700px)').matches)
      window.setTimeout(() => document.querySelector('.dash-conversation-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const select = (id: string) => {
    setActive(id);
    openChatOnMobile();
    setText('');
    setFiles([]);
    update((s) => ({
      ...s,
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    }));
  };
  const change = (key: 'notifications' | 'favorite' | 'archived', value: boolean) =>
    update((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === conversation?.id ? { ...c, [key]: value } : c,
      ),
    }));
  function send(e: FormEvent) {
    e.preventDefault();
    if (!conversation || (!text.trim() && !files.length)) return;
    const message = {
      id: localId('msg'),
      senderId: state.user.id,
      text: text.trim(),
      time: new Date().toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: state.settings.timezone,
      }),
      attachments: files,
    };
    update((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === conversation.id ? { ...c, messages: [...c.messages, message], unread: 0 } : c,
      ),
    }));
    setText('');
    setFiles([]);
    notify(apiMode ? 'Mensagem enviada.' : 'Mensagem adicionada à conversa local. Não foi enviada externamente.');
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const target = String(f.get('target'));
    const recipientType = f.get('targetType');
    if (recipientType === 'professor') {
      const recipient = participants.find((p) => p.id === target);
      if (!recipient) return;
      if (apiMode && state.activeSchoolId) {
        try {
          const created = await apiRequest<Conversation>(`/schools/${encodeURIComponent(state.activeSchoolId)}/messaging/conversations`, { method: 'POST', body: JSON.stringify({ recipientId: target }) });
          update((s) => ({ ...s, conversations: [created, ...s.conversations.filter((c) => c.id !== created.id)] }));
          setActive(created.id); openChatOnMobile(); setDialog('');
        } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível iniciar a conversa.'); }
        return;
      }
      const existingDirect = state.conversations.find((cv) => cv.direct && cv.participantIds?.includes(target));
      if (existingDirect) { select(existingDirect.id); setDialog(''); return; }
      const id = localId('chat');
      update((s) => ({ ...s, conversations: [{ id, direct: true, participantIds: [s.user.id, target].sort(), title: recipient.name, subtitle: 'Conversa direta · Professor', tone: 'green', memberIds: [s.user.id, target], unread: 0, favorite: false, archived: false, notifications: true, messages: [] }, ...s.conversations] }));
      setActive(id); openChatOnMobile(); setDialog('');
      return;
    }
    const c = recipientType === 'turma' ? state.classes.find((c) => c.id === target) : undefined;
    const student = recipientType === 'aluno' ? state.students.find((s) => s.id === target) : undefined;
    const existing = state.conversations.find((cv) =>
      c ? cv.classId === c.id : !cv.classId && cv.memberIds.includes(target),
    );
    if (existing) {
      select(existing.id);
      setDialog('');
      return;
    }
    const id = localId('chat');
    update((s) => ({
      ...s,
      conversations: [
        {
          id,
          title: c?.name || student?.name || 'Conversa',
          subtitle: c ? 'Conversa da turma' : 'Conversa individual',
          classId: c?.id,
          tone: 'green',
          memberIds: [
            state.user.id,
            ...(c ? state.students.filter((s) => s.classId === c.id).map((s) => s.id) : [target]),
          ],
          unread: 0,
          favorite: false,
          archived: false,
          notifications: true,
          messages: [],
        },
        ...s.conversations,
      ],
    }));
    setActive(id);
    openChatOnMobile();
    setDialog('');
  }
  return (
    <>
      <PageHeader
        title="Mensagens"
        description={apiMode ? 'Converse com professores da sua escola. As mensagens são sincronizadas com a escola.' : 'Converse com a comunidade escolar. As mensagens desta demonstração ficam guardadas neste navegador.'}
        actions={
          <button className="dash-btn" onClick={() => { setTargetType('turma'); setDialog('new'); }}>
            <Plus />
            Nova mensagem
          </button>
        }
      />
      <div className="dash-messaging" data-mobile-view={mobileView}>
        <Panel className="dash-conversation-list">
          <Tabs
            items={['Todas', 'Não lidas', 'Favoritas', 'Arquivadas']}
            value={tab}
            onChange={setTab}
          />
          <div className="dash-chat-search">
            <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar conversas..." />
          </div>
          <div className="dash-conversation-results">
          {conversations.map((c) => {
            const lastMessage = c.messages.at(-1);
            return (
            <button
              className={`dash-conversation ${conversation?.id === c.id ? 'active' : ''}`}
              key={c.id}
              onClick={() => select(c.id)}
            >
              {c.avatar ? (
                <Avatar src={c.avatar} name={conversationTitle(c)} size={46} />
              ) : (
                <span className="dash-icon green">
                  <Users />
                </span>
              )}
              <span className="dash-conversation-copy">
                <span className="dash-conversation-heading"><strong>{conversationTitle(c)}</strong>{c.favorite && <Star size={14} fill="currentColor" aria-label="Favorita" />}{lastMessage && <time>{lastMessage.time}</time>}</span>
                <small>{c.subtitle}</small>
                <small className="dash-conversation-preview">{lastMessage ? `${lastMessage.senderId === state.user.id ? 'Você: ' : ''}${lastMessage.text || (lastMessage.attachments.length ? 'Ficheiro mencionado' : '')}` : 'Ainda sem mensagens · iniciar conversa'}</small>
              </span>
              {c.unread > 0 && <b>{c.unread}</b>}
            </button>
          );})}
          {!conversations.length && (
            <EmptyState
              title="Nenhuma conversa"
              description={query ? 'Não encontrámos conversas para esta pesquisa.' : 'Experimente outro filtro ou crie uma nova conversa.'}
              action={!query ? <button className="dash-btn secondary" onClick={() => setDialog('new')}><Plus size={16} /> Nova conversa</button> : undefined}
            />
          )}
          </div>
        </Panel>
        {conversation ? (
          <>
            <section className="dash-chat-panel" id="dash-chat-panel">
              <header>
                <button className="dash-chat-back" type="button" onClick={openListOnMobile}><ChevronLeft size={19} /> Conversas</button>
                <span className="dash-icon green">
                  <Users />
                </span>
                <div>
                  <h2>{conversationTitle(conversation)}</h2>
                  <small>{members.length} participantes · {apiMode ? 'sincronizadas com a escola' : 'mensagens locais'}</small>
                </div>
                <button className="dash-btn secondary" onClick={() => setDialog('members')}>
                  Ver membros
                </button>
                <button className="dash-btn secondary dash-chat-toggle-details" aria-expanded={showMobileDetails} aria-controls="conversation-details" onClick={() => setShowMobileDetails((value) => !value)}>{showMobileDetails ? 'Fechar detalhes' : 'Detalhes'}</button>
              </header>
              <div
                ref={messageList}
                className="dash-chat-messages"
                role="log"
                aria-label="Histórico da conversa"
                tabIndex={0}
              >
                <span className="dash-chat-date">{apiMode ? 'Conversa sincronizada com a escola' : 'Mensagens guardadas neste navegador'}</span>
                {conversation.messages.map((m) => {
                  const sender = person(m.senderId);
                  return (
                    <div
                      className={`dash-message ${m.senderId === state.user.id ? 'outgoing' : ''}`}
                      key={m.id}
                    >
                      {m.senderId !== state.user.id && (
                        <Avatar
                          src={sender?.avatar}
                          name={sender?.name || 'Participante'}
                          size={32}
                        />
                      )}
                      <div>
                        {m.senderId !== state.user.id && (
                          <strong>{sender?.name || 'Participante'}</strong>
                        )}
                        <p>{m.text}</p>
                        {m.attachments.map((name, i) => (
                          <span className="dash-local-attachment" key={`${name}-${i}`}>
                            <Paperclip size={14} />
                            {name} (referência local)
                          </span>
                        ))}
                        <small>
                          {m.time} {m.senderId === state.user.id ? '✓' : ''}
                        </small>
                      </div>
                    </div>
                  );
                })}
                {!conversation.messages.length && (
                  <EmptyState
                    title="Comece a conversa"
                    description={apiMode ? 'Envie a primeira mensagem para iniciar a conversa.' : 'As mensagens ficam apenas neste navegador.'}
                  />
                )}
              </div>
              <form className="dash-chat-compose" onSubmit={send}>
                {files.length > 0 && (
                  <small>
                    {files.join(', ')}
                    <button type="button" onClick={() => setFiles([])}>
                      {' '}
                      Remover ×
                    </button>
                  </small>
                )}
                <div>
                  <label className="dash-icon-button" title="Adicionar referência de ficheiro">
                    <Paperclip />
                    <input
                      className="sr-only"
                      type="file"
                      aria-label="Anexar referência de ficheiro"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.size <= 10 * 1024 * 1024) setFiles([f.name]);
                        else notify('Escolha um ficheiro até 10 MB.');
                      }}
                    />
                  </label>
                  <input
                    aria-label="Mensagem"
                    placeholder="Escreva uma mensagem..."
                    value={text}
                    maxLength={4000}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button
                    className="dash-btn"
                    aria-label="Enviar mensagem local"
                    disabled={!text.trim() && !files.length}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </section>
          <aside id="conversation-details" className={`dash-chat-details ${showMobileDetails ? 'is-mobile-open' : ''}`}>
              <Panel title="Detalhes da conversa">
                <div className="dash-person">
                  <span className="dash-icon green">
                    <Users />
                  </span>
                  <strong>{conversationTitle(conversation)}</strong>
                </div>
                <p>{conversation.subtitle}</p>
                <Switch
                  label="Notificações locais"
                  checked={conversation.notifications}
                  onChange={(v) => change('notifications', v)}
                />
                <Switch
                  label="Favoritar"
                  checked={conversation.favorite}
                  onChange={(v) => change('favorite', v)}
                />
                <button
                  className="dash-list-row"
                  onClick={() => {
                    change('archived', !conversation.archived);
                    notify(conversation.archived ? 'Conversa restaurada.' : 'Conversa arquivada.');
                  }}
                >
                  <Archive size={17} />
                  {conversation.archived ? 'Desarquivar conversa' : 'Arquivar conversa'}
                </button>
              </Panel>
              <Panel
                title={`Membros (${members.length})`}
                action={<button onClick={() => setDialog('members')}>Ver todos</button>}
              >
                {members.slice(0, 5).map((p) => (
                  <div className="dash-list-row" key={p.id}>
                    <Avatar name={p.name} src={p.avatar} />
                    <span>
                      {p.name}
                      <small>{p.id === state.user.id ? 'Professor · Você' : participants.some((member) => member.id === p.id) ? 'Professor' : 'Aluno'}</small>
                    </span>
                  </div>
                ))}
              </Panel>
              <Panel title="Ficheiros mencionados">
                {conversation.messages.flatMap((m) => m.attachments).length ? (
                  conversation.messages
                    .flatMap((m) => m.attachments)
                    .map((name, i) => (
                      <div className="dash-list-row" key={`${name}-${i}`}>
                        <FileText size={18} />
                        <span>
                          {name}
                          <small>Referência local, sem ficheiro armazenado</small>
                        </span>
                      </div>
                    ))
                ) : (
                  <small>Nenhuma referência anexada.</small>
                )}
                <button
                  className="dash-btn secondary"
                  onClick={() =>
                    downloadText(
                      'conversa.txt',
                      conversation.messages
                        .map(
                          (m) =>
                            `${person(m.senderId)?.name || 'Participante'} (${m.time}): ${m.text}`,
                        )
                        .join('\n\n'),
                    )
                  }
                >
                  Exportar conversa
                </button>
              </Panel>
            </aside>
          </>
        ) : (
          <EmptyState
            title={query || tab !== 'Todas' ? 'Nenhuma conversa encontrada' : 'Selecione uma conversa'}
            description={query || tab !== 'Todas' ? 'Limpe a pesquisa ou escolha outro filtro para voltar a ver conversas.' : 'Escolha uma conversa na lista ou inicie uma nova.'}
            action={query || tab !== 'Todas' ? <button className="dash-btn secondary" onClick={() => { setQuery(''); setTab('Todas'); }}>Limpar filtros</button> : undefined}
          />
        )}
      </div>
      {dialog && (
        <Modal
          title={dialog === 'members' ? 'Membros da conversa' : 'Nova conversa'}
          description={dialog === 'new' ? 'Escolha com quem pretende falar e abra a conversa.' : undefined}
          icon={dialog === 'new' ? MessageSquarePlus : undefined}
          onClose={() => setDialog('')}
          className={dialog === 'new' ? 'dash-dialog-small dash-new-conversation-dialog' : 'dash-dialog-small'}
        >
          {dialog === 'members' ? (
            <div className="dash-modal-simple">
              {members.map((p) => (
                <div className="dash-list-row" key={p.id}>
                  <Avatar src={p.avatar} name={p.name} />
                  {p.name}
                </div>
              ))}
            </div>
          ) : (
            <form className="dash-modal-simple dash-new-conversation-form" onSubmit={create}>
              <fieldset className="dash-recipient-type">
                <legend>Quem deve participar?</legend>
                <label className={targetType === 'turma' ? 'is-selected' : ''}>
                  <input type="radio" name="targetType" value="turma" checked={targetType === 'turma'} onChange={() => { setTargetType('turma'); setTargetQuery(''); }} />
                  <School aria-hidden="true" />
                  <span><strong>Uma turma</strong><small>Partilhe com os alunos</small></span>
                </label>
                <label className={targetType === 'aluno' ? 'is-selected' : ''}>
                  <input type="radio" name="targetType" value="aluno" checked={targetType === 'aluno'} onChange={() => { setTargetType('aluno'); setTargetQuery(''); }} />
                  <UserRound aria-hidden="true" />
                  <span><strong>Um aluno</strong><small>Conversa individual</small></span>
                </label>
                <label className={targetType === 'professor' ? 'is-selected' : ''}>
                  <input type="radio" name="targetType" value="professor" checked={targetType === 'professor'} onChange={() => { setTargetType('professor'); setTargetQuery(''); }} />
                  <GraduationCap aria-hidden="true" />
                  <span><strong>Um professor</strong><small>Da mesma escola</small></span>
                </label>
              </fieldset>
              <div className="dash-recipient-picker">
                <div className="dash-recipient-picker-heading">
                  <strong>{targetType === 'turma' ? 'Selecionar turma' : targetType === 'aluno' ? 'Selecionar aluno' : 'Selecionar professor'}</strong>
                  <small>{targetType === 'turma' ? state.classes.length : targetType === 'aluno' ? state.students.length : participants.length} disponíveis</small>
                </div>
                <SearchInput value={targetQuery} onChange={setTargetQuery} placeholder={targetType === 'turma' ? 'Pesquisar turma...' : targetType === 'aluno' ? 'Pesquisar aluno...' : 'Pesquisar professor...'} />
                <Field label={targetType === 'turma' ? 'Turma destinatária' : targetType === 'aluno' ? 'Aluno destinatário' : 'Professor destinatário'} required>
                  <select key={targetType} name="target" required defaultValue="">
                    <option value="" disabled>{targetType === 'turma' ? 'Escolha uma turma' : targetType === 'aluno' ? 'Escolha um aluno' : 'Escolha um professor'}</option>
                    {targetType === 'turma'
                      ? state.classes.filter((c) => normalize(c.name).includes(normalize(targetQuery))).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)
                      : targetType === 'aluno'
                        ? state.students.filter((s) => normalize(`${s.name} ${state.classes.find((c) => c.id === s.classId)?.name || ''}`).includes(normalize(targetQuery))).map((s) => <option value={s.id} key={s.id}>{s.name} · {state.classes.find((c) => c.id === s.classId)?.name}</option>)
                        : participants.filter((p) => normalize(p.name).includes(normalize(targetQuery))).map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
              <p className="dash-recipient-help">{targetType === 'turma'
                ? 'Todos os alunos da turma participam nesta conversa.'
                : targetType === 'aluno' ? 'A conversa inclui apenas o aluno selecionado.' : 'Apenas professores ativos da mesma escola aparecem nesta lista.'}</p>
              {!apiMode && <p className="dash-demo-message-note">Esta demonstração guarda as mensagens apenas neste navegador.</p>}
              {targetType === 'professor' && !participants.length && apiMode && <p className="dash-recipient-empty">Não há outros professores ativos nesta escola.</p>}
              <button className="dash-btn dash-new-conversation-submit" disabled={targetType === 'turma' ? !state.classes.length : targetType === 'aluno' ? !state.students.length : !participants.length}><Plus size={18} />{targetType === 'turma' ? 'Criar conversa da turma' : targetType === 'aluno' ? 'Iniciar conversa individual' : 'Iniciar conversa'}</button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
