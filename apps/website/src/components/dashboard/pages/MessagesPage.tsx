'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Archive, FileText, Plus, Send, Users, Paperclip } from 'lucide-react';
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
export function MessagesPage({
  initialConversation = 'chat-10a',
}: {
  initialConversation?: string;
}) {
  const { state, update, notify } = useDashboard();
  const [active, setActive] = useState(initialConversation),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('Todas'),
    [text, setText] = useState(''),
    [files, setFiles] = useState<string[]>([]),
    [dialog, setDialog] = useState('');
  const conversation = state.conversations.find((c) => c.id === active) || state.conversations[0];
  const messageList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = messageList.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [conversation?.id, conversation?.messages.length]);
  const conversations = state.conversations.filter(
    (c) =>
      normalize(c.title).includes(normalize(query)) &&
      (tab === 'Arquivadas' ? c.archived : !c.archived) &&
      (tab !== 'Não lidas' || c.unread > 0) &&
      (tab !== 'Favoritas' || c.favorite),
  );
  const person = (id: string) =>
    id === state.user.id ? state.user : state.students.find((s) => s.id === id);
  const members = conversation?.memberIds.map(person).filter((p) => !!p) || [];
  const select = (id: string) => {
    setActive(id);
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
    notify('Mensagem adicionada à conversa local. Não foi enviada externamente.');
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const target = String(f.get('target'));
    const c = state.classes.find((c) => c.id === target);
    const student = state.students.find((s) => s.id === target);
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
    setDialog('');
  }
  return (
    <>
      <PageHeader
        title="Mensagens"
        description="Converse com a sua comunidade escolar neste espaço de demonstração local."
        quote="Uma boa comunicação constrói melhores resultados."
        actions={
          <button className="dash-btn" onClick={() => setDialog('new')}>
            <Plus />
            Nova mensagem
          </button>
        }
      />
      <div className="dash-messaging">
        <Panel className="dash-conversation-list">
          <Tabs
            items={['Todas', 'Não lidas', 'Favoritas', 'Arquivadas']}
            value={tab}
            onChange={setTab}
          />
          <div className="dash-chat-search">
            <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar conversas..." />
          </div>
          {conversations.map((c) => (
            <button
              className={`dash-conversation ${conversation?.id === c.id ? 'active' : ''}`}
              key={c.id}
              onClick={() => select(c.id)}
            >
              {c.avatar ? (
                <Avatar src={c.avatar} name={c.title} size={46} />
              ) : (
                <span className="dash-icon green">
                  <Users />
                </span>
              )}
              <span>
                <strong>{c.title}</strong>
                <small>{c.subtitle}</small>
                <small>{c.messages.at(-1)?.text || 'Inicie uma conversa'}</small>
              </span>
              {c.unread > 0 && <b>{c.unread}</b>}
            </button>
          ))}
          {!conversations.length && (
            <EmptyState
              title="Nenhuma conversa"
              description="Experimente outra secção ou inicie uma conversa."
            />
          )}
        </Panel>
        {conversation ? (
          <>
            <section className="dash-chat-panel">
              <header>
                <span className="dash-icon green">
                  <Users />
                </span>
                <div>
                  <h2>{conversation.title}</h2>
                  <small>{members.length} membros · mensagens locais</small>
                </div>
                <button className="dash-btn secondary" onClick={() => setDialog('members')}>
                  Ver membros
                </button>
              </header>
              <div
                ref={messageList}
                className="dash-chat-messages"
                role="log"
                aria-label="Histórico da conversa"
                tabIndex={0}
              >
                <span className="dash-chat-date">Conversa de demonstração</span>
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
                    description="As mensagens ficam apenas neste navegador."
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
            <aside className="dash-chat-details">
              <Panel title="Detalhes da conversa">
                <div className="dash-person">
                  <span className="dash-icon green">
                    <Users />
                  </span>
                  <strong>{conversation.title}</strong>
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
                      <small>{p.id === state.user.id ? 'Professor · Você' : 'Aluno'}</small>
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
          <EmptyState />
        )}
      </div>
      {dialog && (
        <Modal
          title={dialog === 'members' ? 'Membros da conversa' : 'Nova conversa'}
          onClose={() => setDialog('')}
          className="dash-dialog-small"
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
            <form className="dash-modal-simple" onSubmit={create}>
              <Field label="Destinatário" required>
                <select name="target" required>
                  <optgroup label="Turmas">
                    {state.classes.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Alunos">
                    {state.students.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name} · {state.classes.find((c) => c.id === s.classId)?.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              <p>Esta conversa fica apenas neste navegador.</p>
              <button className="dash-btn">Abrir conversa</button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
