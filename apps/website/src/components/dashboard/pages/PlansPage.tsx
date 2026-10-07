'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
  StatusBadge,
  Tabs,
} from '../ui/Primitives';
import { formatDate, normalize } from '@/lib/dashboard/selectors';
import { exportCSV } from '@/lib/dashboard/export';
import { printLessonPlan } from '@/lib/dashboard/print-lesson-plan';
import type { LessonPlan } from '@/types/dashboard';
import { PlanModels } from '../PlanModels';
import { planModels, planRows } from '@/lib/dashboard/plan-models';
import { SharePlanDialog } from '../SharePlanDialog';

type Entry = { key: string; plan: LessonPlan; saved: boolean; unfinished: boolean };
export function PlansPage({
  initialQuery = '',
  initialPlan = '',
}: {
  initialQuery?: string;
  initialPlan?: string;
}) {
  const { state, update, openModal, notify, ready, apiMode } = useDashboard();
  const [openedInitial, setOpenedInitial] = useState(false);
  useEffect(() => {
    if (!ready || openedInitial || !initialPlan) return;
    if (state.plans.some((p) => p.id === initialPlan)) openModal({ kind: 'plan', id: initialPlan });
    setOpenedInitial(true);
  }, [ready, openedInitial, initialPlan, state.plans, openModal]);
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState('Todos');
  const [subject, setSubject] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [collection, setCollection] = useState('Todos');
  const [gallery, setGallery] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [sharingEntry, setSharingEntry] = useState<Entry | null>(null);
  const availableSubjects = state.subjects.filter(
    (item) => state.user.role !== 'Professor' || state.teacherSubjectIds.includes(item.id),
  );
  const incomplete = (plan: LessonPlan) =>
    plan.status === 'Rascunho' ||
    !plan.title.trim() ||
    !plan.classId ||
    !plan.subjectId ||
    !plan.objectives.trim() ||
    !plan.methodology.trim();
  const entries: Entry[] = [
    ...state.plans.map((saved) => ({
      key: saved.id,
      saved: true,
      plan: state.planDrafts?.[saved.id] || saved,
      unfinished: Boolean(state.planDrafts?.[saved.id]) || incomplete(saved),
    })),
    ...Object.entries(state.planDrafts || {})
      .filter(([key]) => !state.plans.some((p) => p.id === key))
      .map(([key, plan]) => ({ key, plan, saved: false, unfinished: true })),
  ];
  const status = (entry: Entry) =>
    entry.unfinished
      ? 'Por terminar'
      : entry.plan.status === 'Concluído'
        ? 'Concluídos'
        : 'Preparados';
  const className = (plan: LessonPlan) =>
    state.classes.find((c) => c.id === plan.classId)?.name || 'Turma por escolher';
  const subjectName = (plan: LessonPlan) =>
    state.subjects.find((s) => s.id === plan.subjectId)?.name || 'Disciplina por escolher';
  const modelName = (plan: LessonPlan) =>
    planModels.find((model) => model.id === (plan.modelId || 'simple'))?.name || 'Simplificado';
  const dateLabel = (plan: LessonPlan) => (plan.date ? formatDate(plan.date) : 'Data por escolher');
  const resume = (entry: Entry) =>
    openModal({
      kind: 'plan',
      ...(entry.saved
        ? { id: entry.key }
        : entry.key === 'new'
          ? {}
          : entry.key.startsWith('resource-')
            ? { resourceId: entry.key.slice(9) }
            : entry.key.startsWith('copy-')
              ? { copyFrom: entry.key.slice(5) }
              : entry.key.startsWith('example-')
                ? { example: entry.key.slice(8) as 'math' | 'portuguese' }
                : { id: entry.key }),
    });
  const filtered = entries.filter((entry) => {
    const p = entry.plan;
    return (
      normalize(`${p.title} ${className(p)} ${subjectName(p)}`).includes(normalize(query)) &&
      (state.user.role !== 'Professor' || state.teacherSubjectIds.includes(p.subjectId)) &&
      (!teacherId || p.teacherId === teacherId) &&
      (!subject || p.subjectId === subject) &&
      (!classId || p.classId === classId) &&
      (tab === 'Todos' || status(entry) === tab) &&
      (collection === 'Todos' ||
        (collection === 'Favoritos' && p.favorite) ||
        (collection === 'Reutilizáveis' && p.template) ||
        (collection === 'Partilhados' && p.shared))
    );
  });
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  const visible = filtered.slice((current - 1) * 8, current * 8);
  const primary = (entry: Entry) => (
    <button
      className="dash-btn secondary"
      onClick={() => (entry.unfinished ? resume(entry) : setSelected(entry))}
    >
      {entry.unfinished ? 'Continuar' : 'Abrir'}
    </button>
  );
  const menu = (entry: Entry) => (
    <ActionMenu
      label={`Opções: ${entry.plan.title || 'Plano sem título'}`}
      items={[
        { label: 'Pré-visualizar', action: () => setSelected(entry) },
        { label: 'Editar', action: () => resume(entry) },
        ...(entry.saved
          ? [
              ...(apiMode
                ? [{ label: 'Partilhar com outro professor', action: () => setSharingEntry(entry) }]
                : []),
              {
                label: 'Usar noutra turma / duplicar',
                action: () => openModal({ kind: 'plan', copyFrom: entry.key }),
              },
              {
                label: entry.plan.favorite ? 'Remover favorito' : 'Favoritar',
                action: () =>
                  update((s) => ({
                    ...s,
                    plans: s.plans.map((p) =>
                      p.id === entry.key ? { ...p, favorite: !entry.plan.favorite } : p,
                    ),
                    planDrafts: s.planDrafts?.[entry.key]
                      ? {
                          ...s.planDrafts,
                          [entry.key]: {
                            ...s.planDrafts[entry.key],
                            favorite: !entry.plan.favorite,
                          },
                        }
                      : s.planDrafts,
                  })),
              },
            ]
          : []),
        {
          label: 'Imprimir A4 / PDF',
          action: () => {
            if (!printLessonPlan(entry.plan, state))
              notify('Permita janelas para imprimir o plano.');
          },
        },
        {
          label: entry.saved ? 'Eliminar plano' : 'Descartar rascunho',
          danger: true,
          action: () => setDeleting(entry),
        },
      ]}
    />
  );
  return (
    <>
      <PageHeader
        title={gallery ? 'Escolher modelo de plano' : 'Planos de Aula'}
        description={
          gallery
            ? 'Escolha uma estrutura e adapte-a à sua aula.'
            : 'Encontre a sua aula e continue de onde ficou.'
        }
        actions={
          gallery ? (
            <button className="dash-btn secondary" onClick={() => setGallery(false)}>
              Voltar aos meus planos
            </button>
          ) : (
            <>
              <button className="dash-btn secondary" onClick={() => setGallery(true)}>
                Criar com modelo
              </button>
              <button className="dash-btn" onClick={() => openModal({ kind: 'plan' })}>
                <Plus size={18} />
                Novo plano
              </button>
            </>
          )
        }
      />
      {gallery ? (
        <PlanModels />
      ) : (
        <>
          <div className="dash-plans-summary">
            {['Por terminar', 'Preparados', 'Concluídos'].map((label) => (
              <button
                key={label}
                aria-pressed={tab === label}
                onClick={() => {
                  setTab(label);
                  setPage(1);
                }}
              >
                <strong>{entries.filter((entry) => status(entry) === label).length}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <Panel className="dash-table-panel">
            <div className="dash-toolbar">
              <Tabs
                items={['Todos', 'Por terminar', 'Preparados', 'Concluídos']}
                value={tab}
                onChange={(value) => {
                  setTab(value);
                  setPage(1);
                }}
              />
              <div className="dash-filters">
                <SearchInput
                  value={query}
                  onChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  placeholder="Pesquisar título, turma ou disciplina..."
                />
                <SelectField
                  label="Turma"
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'Todas' },
                    ...state.classes.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
                <SelectField
                  label="Disciplina"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'Todas' },
                    ...availableSubjects.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <SelectField
                  label="Professor"
                  value={teacherId}
                  onChange={(e) => {
                    setTeacherId(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'Todos' },
                    ...(
                      state.teacherDirectory || [{ id: state.user.id, name: state.user.name }]
                    ).map((teacher) => ({ value: teacher.id, label: teacher.name })),
                  ]}
                />
                <SelectField
                  label="Coleção"
                  value={collection}
                  onChange={(e) => {
                    setCollection(e.target.value);
                    setPage(1);
                  }}
                  options={['Todos', 'Favoritos', 'Reutilizáveis', 'Partilhados']}
                />
                <button
                  className="dash-btn secondary"
                  onClick={() =>
                    exportCSV('planos.csv', [
                      ['Título', 'Turma', 'Disciplina', 'Data', 'Estado'],
                      ...filtered.map((entry) => [
                        entry.plan.title,
                        className(entry.plan),
                        subjectName(entry.plan),
                        entry.plan.date,
                        status(entry),
                      ]),
                    ])
                  }
                >
                  Exportar
                </button>
              </div>
            </div>
            <div className="dash-table-scroll dash-plans-desktop">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Plano de aula</th>
                    <th>Turma / Disciplina</th>
                    <th>Data / Horário</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <tr key={entry.key}>
                      <td>
                        <strong>{entry.plan.title || 'Plano sem título'}</strong>
                        <small className="dash-plan-secondary">
                          {modelName(entry.plan)} · {entry.plan.duration} min
                        </small>
                      </td>
                      <td>
                        {className(entry.plan)}
                        <small className="dash-plan-secondary">{subjectName(entry.plan)}</small>
                      </td>
                      <td>
                        {dateLabel(entry.plan)}
                        <small className="dash-plan-secondary">
                          {entry.plan.startTime || '08:00'}
                        </small>
                      </td>
                      <td>
                        <StatusBadge tone={entry.unfinished ? 'amber' : 'green'}>
                          {status(entry)}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="dash-guide-actions">
                          {primary(entry)}
                          {menu(entry)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dash-plans-mobile">
              {visible.map((entry) => (
                <article key={entry.key}>
                  <StatusBadge tone={entry.unfinished ? 'amber' : 'green'}>
                    {status(entry)}
                  </StatusBadge>
                  <h2>{entry.plan.title || 'Plano sem título'}</h2>
                  <p>
                    {className(entry.plan)} · {subjectName(entry.plan)}
                  </p>
                  <p>
                    {dateLabel(entry.plan)} · {entry.plan.startTime || '08:00'}
                  </p>
                  <small>
                    {modelName(entry.plan)} · {entry.plan.duration} min
                  </small>
                  <div className="dash-guide-actions">
                    {primary(entry)}
                    {menu(entry)}
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <>
                <EmptyState />
                <div className="dash-plans-empty">
                  <button
                    className="dash-btn secondary"
                    onClick={() => {
                      setQuery('');
                      setClassId('');
                      setSubject('');
                      setCollection('Todos');
                      setTab('Todos');
                      setPage(1);
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>
              </>
            )}
            <Pagination page={current} total={filtered.length} pageSize={8} onChange={setPage} />
          </Panel>
        </>
      )}
      {selected && (
        <Modal title={selected.plan.title || 'Plano sem título'} onClose={() => setSelected(null)}>
          <div className="dash-modal-simple">
            <StatusBadge>{status(selected)}</StatusBadge>
            {planRows(selected.plan, state).map(([label, text], index) => (
              <section key={index}>
                <h3>{label}</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{text || 'Por preencher'}</p>
              </section>
            ))}
            <button
              className="dash-btn"
              onClick={() => {
                resume(selected);
                setSelected(null);
              }}
            >
              Editar plano
            </button>
          </div>
        </Modal>
      )}
      {sharingEntry && state.activeSchoolId && (
        <Modal
          title="Partilhar plano"
          description="Ajude outro professor a conhecer o AgendAKI."
          onClose={() => setSharingEntry(null)}
        >
          <SharePlanDialog
            schoolId={state.activeSchoolId}
            planId={sharingEntry.key}
            title={sharingEntry.plan.title}
            notify={notify}
          />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title={deleting.saved ? 'Eliminar plano?' : 'Descartar rascunho?'}
          description={
            deleting.saved
              ? 'Remove o plano, o seu rascunho e a aula ligada no calendário.'
              : 'Remove apenas este trabalho por terminar.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            update((s) => ({
              ...s,
              plans: deleting.saved ? s.plans.filter((p) => p.id !== deleting.key) : s.plans,
              events: deleting.saved
                ? s.events.filter((e) => e.sourceId !== deleting.key)
                : s.events,
              planDrafts: Object.fromEntries(
                Object.entries(s.planDrafts || {}).filter(([key]) => key !== deleting.key),
              ),
            }))
          }
        />
      )}
    </>
  );
}
