'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  CalendarDays,
  Plus,
  ClipboardCheck,
  FileText,
  MessagesSquare,
} from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import {
  ActionMenu,
  Avatar,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  QuickActions,
  SearchInput,
  StatCard,
  StatusBadge,
  Tabs,
} from '../ui/Primitives';
import { classStudents, localId, normalize } from '@/lib/dashboard/selectors';
import { exportCSV } from '@/lib/dashboard/export';
import { avatar } from '@/data/dashboard/seed';
export function ClassesPage({ id, initialQuery = '' }: { id?: string; initialQuery?: string }) {
  const { state, update, notify, openModal } = useDashboard();
  const [query, setQuery] = useState(initialQuery),
    [tab, setTab] = useState('Alunos'),
    [page, setPage] = useState(1),
    [dialog, setDialog] = useState('');
  const c = state.classes.find((c) => c.id === id);
  const students = classStudents(state, id || '');
  const filtered = students.filter((s) => normalize(s.name).includes(normalize(query)));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (n: string) => String(f.get(n) || '').trim();
    if (!get('name')) return;
    if (dialog === 'student' && c) {
      const newId = localId('student');
      update((s) => ({
        ...s,
        students: [
          ...s.students,
          {
            id: newId,
            name: get('name'),
            classId: c.id,
            avatar: avatar(s.students.length),
            contact: get('contact') || '—',
            status: 'Ativo',
          },
        ],
        conversations: s.conversations.map((cv) =>
          cv.classId === c.id ? { ...cv, memberIds: [...cv.memberIds, newId] } : cv,
        ),
      }));
    } else if (dialog === 'class') {
      const classId = localId('class');
      update((s) => ({
        ...s,
        classes: [
          ...s.classes,
          {
            id: classId,
            name: get('name'),
            year: get('year'),
            level: 'Ensino Secundário',
            room: get('room'),
            shift: get('shift'),
            director: state.user.name,
            subjectIds: state.subjects.slice(0, 5).map((x) => x.id),
          },
        ],
        conversations: [
          ...s.conversations,
          {
            id: `chat-${classId}`,
            title: get('name'),
            subtitle: `Turma · Ano letivo ${get('year')}`,
            classId,
            tone: 'green',
            memberIds: [s.user.id],
            unread: 0,
            favorite: false,
            archived: false,
            notifications: true,
            messages: [],
          },
        ],
      }));
    } else if (c) {
      update((s) => ({
        ...s,
        classes: s.classes.map((x) =>
          x.id === c.id
            ? { ...x, name: get('name'), room: get('room'), year: get('year'), shift: get('shift') }
            : x,
        ),
        conversations: s.conversations.map((cv) =>
          cv.classId === c.id
            ? { ...cv, title: get('name'), subtitle: `Turma · Ano letivo ${get('year')}` }
            : cv,
        ),
      }));
    }
    notify('Dados guardados.');
    setDialog('');
  }
  const modal = dialog && (
    <Modal
      title={
        dialog === 'student'
          ? 'Adicionar aluno'
          : dialog === 'class'
            ? 'Nova turma'
            : 'Editar turma'
      }
      onClose={() => setDialog('')}
      className="dash-dialog-small"
    >
      <form className="dash-modal-simple" onSubmit={submit}>
        <Field label={dialog === 'student' ? 'Nome do aluno' : 'Nome da turma'} required>
          <input name="name" required defaultValue={dialog === 'edit' ? c?.name : ''} />
        </Field>
        {dialog === 'student' ? (
          <Field label="Contacto (opcional)">
            <input name="contact" type="tel" />
          </Field>
        ) : (
          <>
            <Field label="Sala">
              <input name="room" defaultValue={c?.room || 'Sala 1'} />
            </Field>
            <Field label="Ano letivo">
              <input name="year" defaultValue={c?.year || '2026'} required />
            </Field>
            <Field label="Turno">
              <select name="shift" defaultValue={c?.shift || 'Manhã'}>
                <option>Manhã</option>
                <option>Tarde</option>
                <option>Noite</option>
              </select>
            </Field>
          </>
        )}
        <div className="dash-form-actions">
          <button type="button" className="dash-btn secondary" onClick={() => setDialog('')}>
            Cancelar
          </button>
          <button className="dash-btn">Guardar</button>
        </div>
      </form>
    </Modal>
  );
  if (!id)
    return (
      <>
        <PageHeader
          title="As minhas turmas"
          description="Acompanhe cada turma e ajude cada aluno a alcançar o seu potencial."
          actions={
            <button className="dash-btn" onClick={() => setDialog('class')}>
              <Plus />
              Nova turma
            </button>
          }
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar turmas..." />
        <div className="dash-class-grid">
          {state.classes
            .filter((c) => normalize(c.name).includes(normalize(query)))
            .map((c) => (
              <Panel key={c.id}>
                <span className="dash-icon green">
                  <Users />
                </span>
                <h2>{c.name}</h2>
                <p>
                  {c.level} · {c.year}
                </p>
                <div className="dash-class-data">
                  <span>
                    <strong>{classStudents(state, c.id).length}</strong> alunos
                  </span>
                  <span>
                    <strong>{c.subjectIds.length}</strong> disciplinas
                  </span>
                </div>
                <p>
                  {c.room} · {c.shift}
                </p>
                <Link className="dash-btn secondary" href={`/dashboard/turmas/${c.id}`}>
                  Ver turma →
                </Link>
              </Panel>
            ))}
        </div>
        {modal}
      </>
    );
  if (!c)
    return (
      <EmptyState
        title="Turma não encontrada"
        action={<Link href="/dashboard/turmas">Voltar às turmas</Link>}
      />
    );
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/dashboard/turmas">Turmas　›　{c.name}</Link>}
        title={c.name}
        description={`Ano letivo ${c.year}　•　${c.level}`}
        actions={
          <button className="dash-btn" onClick={() => setDialog('edit')}>
            Editar turma
          </button>
        }
      />
      <div className="dash-content-sidebar">
        <div>
          <div className="dash-stats three">
            <StatCard icon={Users} value={students.length} label="Alunos" />
            <StatCard icon={BookOpen} value={c.subjectIds.length} label="Disciplinas" />
            <StatCard
              icon={CalendarDays}
              value="Seg – Sex"
              label={`Horário · ${c.shift}`}
              tone="blue"
            />
          </div>
          <Tabs
            items={[
              'Alunos',
              'Disciplinas',
              'Horário',
              'Avaliações',
              'Presenças',
              'Notas',
              'Relatórios',
              'Configurações',
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'Alunos' ? (
            <Panel
              title={`Lista de alunos (${students.length})`}
              action={
                <button className="dash-btn secondary" onClick={() => setDialog('student')}>
                  <Plus size={17} />
                  Adicionar aluno
                </button>
              }
            >
              <SearchInput
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  setPage(1);
                }}
                placeholder="Pesquisar aluno..."
              />
              <div className="dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Nome do aluno</th>
                      <th>Contacto (opcional)</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((current - 1) * 8, current * 8).map((s, i) => (
                      <tr key={s.id}>
                        <td>{(current - 1) * 8 + i + 1}</td>
                        <td>
                          <span className="dash-person">
                            <Avatar src={s.avatar} name={s.name} />
                            {s.name}
                          </span>
                        </td>
                        <td>{s.contact}</td>
                        <td>
                          <StatusBadge tone={s.status === 'Ativo' ? 'green' : 'gray'}>
                            {s.status}
                          </StatusBadge>
                        </td>
                        <td>
                          <ActionMenu
                            label={`Ações: ${s.name}`}
                            items={[
                              {
                                label:
                                  s.status === 'Ativo'
                                    ? 'Marcar como transferido'
                                    : 'Reativar aluno',
                                action: () =>
                                  update((st) => ({
                                    ...st,
                                    students: st.students.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            status: x.status === 'Ativo' ? 'Transferido' : 'Ativo',
                                          }
                                        : x,
                                    ),
                                  })),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filtered.length && <EmptyState />}
              <Pagination page={current} total={filtered.length} pageSize={8} onChange={setPage} />
            </Panel>
          ) : tab === 'Disciplinas' ? (
            <Panel title="Disciplinas da turma">
              {state.subjects
                .filter((s) => c.subjectIds.includes(s.id))
                .map((s) => (
                  <div className="dash-list-row" key={s.id}>
                    <span className={`dash-icon ${s.tone}`}>
                      <BookOpen />
                    </span>
                    <strong>{s.name}</strong>
                  </div>
                ))}
            </Panel>
          ) : (
            <Panel title={tab}>
              <p>Aceda à área de {tab.toLowerCase()} desta turma.</p>
              {tab === 'Configurações' ? (
                <button className="dash-btn" onClick={() => setDialog('edit')}>
                  Editar informações da turma
                </button>
              ) : (
                <Link
                  className="dash-btn"
                  href={`/dashboard/${({ Horário: 'calendario', Avaliações: 'avaliacoes', Presenças: 'presencas', Notas: 'avaliacoes', Relatórios: 'relatorios' } as Record<string, string>)[tab]}?turma=${c.id}`}
                >
                  Abrir {tab.toLowerCase()} →
                </Link>
              )}
            </Panel>
          )}
        </div>
        <aside>
          <Panel title="Informações da turma">
            <dl className="dash-info">
              {Object.entries({
                Nome: c.name,
                'Nível de ensino': c.level,
                'Ano letivo': c.year,
                Turno: c.shift,
                Sala: c.room,
                'Direção de turma': c.director,
                'Total de alunos': students.length,
                'Alunos ativos': students.filter((s) => s.status === 'Ativo').length,
                Transferidos: students.filter((s) => s.status === 'Transferido').length,
              }).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <QuickActions
            items={[
              {
                label: 'Registar presenças',
                icon: ClipboardCheck,
                href: `/dashboard/presencas?turma=${c.id}`,
              },
              {
                label: 'Lançar avaliação',
                icon: FileText,
                onClick: () => openModal({ kind: 'assessment', classId: c.id }),
              },
              {
                label: 'Gerar relatório',
                icon: FileText,
                href: `/dashboard/relatorios?turma=${c.id}`,
              },
              {
                label: 'Enviar mensagem à turma',
                icon: MessagesSquare,
                href: `/dashboard/mensagens?conversa=chat-${c.id}`,
              },
            ]}
          />
          <Panel title="Documentos da turma">
            <button
              className="dash-btn secondary"
              onClick={() =>
                exportCSV('alunos.csv', [
                  ['Nome', 'Contacto', 'Estado'],
                  ...students.map((s) => [s.name, s.contact, s.status]),
                ])
              }
            >
              <FileText size={18} />
              Exportar lista de alunos (CSV)
            </button>
          </Panel>
        </aside>
      </div>
      {modal}
    </>
  );
}
