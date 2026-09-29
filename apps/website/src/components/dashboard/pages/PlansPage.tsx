'use client';
import { useState } from 'react';
import { BookOpen, Clock, FileText, Sparkles, Plus, Star } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import {
  ActionMenu,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  SearchInput,
  SelectField,
  StatCard,
  StatusBadge,
  Tabs,
} from '../ui/Primitives';
import { formatDate, normalize } from '@/lib/dashboard/selectors';
import { exportCSV } from '@/lib/dashboard/export';
import { printLessonPlan } from '@/lib/dashboard/print-lesson-plan';
import type { LessonPlan } from '@/types/dashboard';
import { PlanModels } from '../PlanModels';
import { planRows } from '@/lib/dashboard/plan-models';
export function PlansPage({ initialQuery = '' }: { initialQuery?: string }) {
  const { state, update, openModal, notify } = useDashboard();
  const [query, setQuery] = useState(initialQuery),
    [tab, setTab] = useState('Todos'),
    [subject, setSubject] = useState(''),
    [classId, setClassId] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<LessonPlan | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const plans = state.plans.filter(
    (p) =>
      normalize(p.title + ' ' + p.description).includes(normalize(query)) &&
      (!subject || p.subjectId === subject) &&
      (!classId || p.classId === classId) &&
      (tab === 'Todos' ||
        (tab === 'Meus planos' && p.teacherId === state.user.id) ||
        (tab === 'Reutilizáveis' && p.template) ||
        (tab === 'Partilhados' && p.shared) ||
        (tab === 'Favoritos' && p.favorite)),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(plans.length / 8)));
  const rows = (list: LessonPlan[]) =>
    list.map((p) => [
      p.title,
      state.subjects.find((s) => s.id === p.subjectId)?.name || '',
      state.classes.find((c) => c.id === p.classId)?.name || '',
      p.date,
      p.status,
    ]);
  return (
    <>
      <PageHeader
        title="Planos de Aula"
        description="Crie, organize e gerencie os seus planos de aula de forma simples e eficiente."
        actions={
          <>
          <button className="dash-btn secondary" onClick={() => setTab('Modelos')}>Escolher modelo</button>
          <button className="dash-btn neon" onClick={() => openModal({ kind: 'plan' })}>
            <Plus />
            Novo plano de aula
          </button>
          </>
        }
      />
      <div className="dash-stats">
        <StatCard icon={BookOpen} value={state.plans.length} label="Planos criados" />
        <StatCard
          icon={Clock}
          value={state.plans.filter((p) => p.status === 'Em utilização').length}
          label="Em utilização"
          tone="purple"
        />
        <StatCard
          icon={FileText}
          value={state.plans.filter((p) => p.template).length}
          label="Planos reutilizáveis"
          tone="blue"
        />
        <StatCard
          icon={Sparkles}
          value={state.plans.filter((p) => p.ai).length}
          label="Com estrutura IA"
          tone="amber"
        />
      </div>
      {Object.keys(state.planDrafts || {}).length > 0 && <Panel title="Continuar a preparar">
        <div className="dash-guide-actions">{Object.entries(state.planDrafts || {}).map(([key, draft]) => <button className="dash-btn secondary" key={key} onClick={() => openModal({ kind: 'plan', ...(key === 'new' ? {} : key.startsWith('copy-') ? { copyFrom: key.slice(5) } : key.startsWith('example-') ? { example: key.slice(8) as 'math' | 'portuguese' } : { id: key }) })}>{draft.title || 'Plano sem título'} · Retomar rascunho</button>)}</div>
      </Panel>}
      <Panel className="dash-table-panel">
        <div className="dash-toolbar">
          <Tabs
            items={['Todos', 'Meus planos', 'Modelos', 'Reutilizáveis', 'Partilhados', 'Favoritos']}
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
          />
          {tab !== 'Modelos' && <div className="dash-filters">
            <SelectField
              label="Disciplina"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              options={[
                { value: '', label: 'Todas' },
                ...state.subjects.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <SelectField
              label="Turma"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={[
                { value: '', label: 'Todas' },
                ...state.classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Pesquisar planos..."
            />
            <button
              className="dash-btn secondary"
              onClick={() =>
                exportCSV('planos.csv', [
                  ['Título', 'Disciplina', 'Turma', 'Data', 'Estado'],
                  ...rows(plans),
                ])
              }
            >
              Exportar
            </button>
          </div>}
        </div>
        {tab === 'Modelos' ? <PlanModels /> : <>
        <div className="dash-table-scroll">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Disciplina</th>
                <th>Turma</th>
                <th>Data</th>
                <th>Duração</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {plans.slice((current - 1) * 8, current * 8).map((p) => (
                <tr key={p.id}>
                  <td>
                    <button className="dash-title-cell" onClick={() => setSelected(p)}>
                      <span
                        className={`dash-icon ${state.subjects.find((s) => s.id === p.subjectId)?.tone || 'green'}`}
                      >
                        <BookOpen />
                      </span>
                      <span>
                        <strong>{p.title}</strong>
                        <small>{p.description}</small>
                      </span>
                      {p.favorite && <Star size={14} />}
                    </button>
                  </td>
                  <td>{state.subjects.find((s) => s.id === p.subjectId)?.name}</td>
                  <td>{state.classes.find((c) => c.id === p.classId)?.name}</td>
                  <td>{formatDate(p.date)}</td>
                  <td>
                    <Clock size={14} /> {p.duration} min
                  </td>
                  <td>
                    <StatusBadge
                      tone={
                        p.status === 'Rascunho'
                          ? 'gray'
                          : p.status === 'Planeado'
                            ? 'blue'
                            : 'green'
                      }
                    >
                      {p.status}
                    </StatusBadge>
                  </td>
                  <td>
                    <ActionMenu
                      label={`Ações: ${p.title}`}
                      items={[
                        { label: 'Ver plano', action: () => setSelected(p) },
                        { label: 'Editar', action: () => openModal({ kind: 'plan', id: p.id }) },
                        { label: 'Usar noutra turma', action: () => openModal({ kind: 'plan', copyFrom: p.id }) },
                        {
                          label: p.favorite ? 'Remover favorito' : 'Favoritar',
                          action: () =>
                            update((s) => ({
                              ...s,
                              plans: s.plans.map((x) =>
                                x.id === p.id ? { ...x, favorite: !x.favorite } : x,
                              ),
                            })),
                        },
                        {
                          label: 'Duplicar e rever',
                          action: () => openModal({ kind: 'plan', copyFrom: p.id }),
                        },
                        {
                          label: 'Exportar PDF / imprimir',
                          action: () => {
                            if (
                              !printLessonPlan(p, state)
                            )
                              notify('Permita janelas para imprimir o plano.');
                          },
                        },
                        { label: 'Eliminar', danger: true, action: () => setDeleting(p.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!plans.length && <EmptyState />}
        <Pagination page={current} total={plans.length} pageSize={8} onChange={setPage} />
        </>}
      </Panel>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="dash-modal-simple">
            <StatusBadge>{selected.status}</StatusBadge>
            {planRows(selected, state).map(([label, text], index) => (
              <section key={index}>
                <h3>{label}</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{text || 'Por preencher'}</p>
              </section>
            ))}
            <button
              className="dash-btn"
              onClick={() => {
                openModal({ kind: 'plan', id: selected.id });
                setSelected(null);
              }}
            >
              Editar plano
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar plano?"
          description="Remove o plano, o seu rascunho automático e a aula ligada no calendário."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            update((s) => ({ ...s, plans: s.plans.filter((p) => p.id !== deleting), events: s.events.filter((e) => e.sourceId !== deleting), planDrafts: Object.fromEntries(Object.entries(s.planDrafts || {}).filter(([key]) => key !== deleting)) }))
          }
        />
      )}
    </>
  );
}
