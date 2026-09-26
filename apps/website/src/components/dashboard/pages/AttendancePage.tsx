'use client';
import { useState } from 'react';
import {
  Users,
  Check,
  X,
  Clock,
  Save,
  FileText,
  ChartColumn,
  MessagesSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Avatar, PageHeader, Panel, QuickActions, SelectField, StatCard } from '../ui/Primitives';
import { Donut } from '../ui/Charts';
import { DEMO_DATE } from '@/data/dashboard/seed';
import { classStudents, formatDate } from '@/lib/dashboard/selectors';
import { exportCSV, printDocument } from '@/lib/dashboard/export';
import type { Attendance, DashboardState } from '@/types/dashboard';
export function AttendancePage({ initialClass = '10a', initialDate = DEMO_DATE }: { initialClass?: string; initialDate?: string }) {
  const { state, update, notify, error } = useDashboard();
  const [classId, setClassId] = useState(
      state.classes.some((c) => c.id === initialClass) ? initialClass : state.classes[0].id,
    ),
    [date, setDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initialDate) && !Number.isNaN(Date.parse(initialDate)) ? initialDate : DEMO_DATE);
  const draftKey = `${classId}:${date}`;
  const draft = state.attendanceDrafts?.[draftKey];
  function setDraft(next: NonNullable<DashboardState['attendanceDrafts']>[string] | null) {
    update((s) => {
      const drafts = { ...s.attendanceDrafts };
      if (next) drafts[draftKey] = next;
      else delete drafts[draftKey];
      return { ...s, attendanceDrafts: drafts };
    });
  }
  const students = classStudents(state, classId);
  const saved = state.attendance.find((a) => a.classId === classId && a.date === date);
  const records =
    draft ||
    saved?.records ||
    Object.fromEntries(students.map((s) => [s.id, { status: '' as const, note: '' }]));
  const entries = students.map((s) => records[s.id] || { status: '' as const, note: '' });
  const present = entries.filter((r) => r.status === 'Presente').length,
    missing = entries.filter((r) => r.status === 'Falta').length,
    justified = entries.filter((r) => r.status === 'Justificada').length;
  const percentage = students.length ? Math.round((present / students.length) * 100) : 0;
  const rows = students.map((s) => [
    s.name,
    records[s.id]?.status || 'Por marcar',
    records[s.id]?.note || '',
  ]);
  function changeDate(next: string) {
    setDate(next);
  }
  function step(amount: number) {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + amount);
    changeDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return (
    <>
      <PageHeader
        title="Registo de Presenças"
        description="Registe e acompanhe a presença dos seus alunos de forma rápida e simples."
        quote="Disciplina hoje, mais oportunidades amanhã."
        actions={
          <div className="dash-filters">
            <SelectField
              label="Turma"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
              }}
              options={state.classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <button className="dash-icon-button" aria-label="Dia anterior" onClick={() => step(-1)}>
              <ChevronLeft />
            </button>
            <label className="dash-select">
              <span>Data da chamada</span>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && changeDate(e.target.value)}
              />
            </label>
            <button className="dash-icon-button" aria-label="Dia seguinte" onClick={() => step(1)}>
              <ChevronRight />
            </button>
          </div>
        }
      />
      <div className="dash-content-sidebar">
        <div>
          <div className="dash-stats">
            <StatCard icon={Users} value={students.length} label="Total de alunos" />
            <StatCard icon={Check} value={present} label="Presentes" />
            <StatCard icon={X} value={missing} label="Faltas" tone="red" />
            <StatCard icon={Clock} value={justified} label="Justificadas" tone="amber" />
          </div>
          <Panel
            title="Lista de alunos"
            action={
              <small>
                {error ? 'Armazenamento indisponível — mantenha esta página aberta' : draft ? 'Rascunho automático neste dispositivo' : saved ? 'Chamada confirmada neste dispositivo' : 'Nova chamada'}
              </small>
            }
          >
            <p role="status">{students.length - present - missing - justified} por marcar. O rascunho é recuperado ao voltar à mesma turma e data.</p>
            <div className="dash-attendance-mobile">
              {students.map((student, index) => {
                const record = records[student.id] || { status: '', note: '' };
                return <article key={student.id}>
                  <strong>{index + 1}. {student.name}</strong>
                  <div className="dash-attendance-choices" role="group" aria-label={`Presença de ${student.name}`}>
                    {(['Presente', 'Falta', 'Justificada'] as const).map((status) => <button key={status} type="button" aria-pressed={record.status === status} onClick={() => setDraft({ ...records, [student.id]: { ...record, status } })}>{status}</button>)}
                  </div>
                  <details><summary>Observação{record.note ? ' adicionada' : ' (opcional)'}</summary>
                    <input aria-label={`Observação de ${student.name}`} value={record.note} onChange={(e) => setDraft({ ...records, [student.id]: { ...record, note: e.target.value } })} />
                  </details>
                </article>;
              })}
            </div>
            <div className="dash-table-scroll dash-attendance-table">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Nome do aluno</th>
                    <th>Presença</th>
                    <th>Observações (opcional)</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const r = records[s.id] || { status: '' as const, note: '' };
                    return (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td>
                          <span className="dash-person">
                            <Avatar name={s.name} src={s.avatar} />
                            {s.name}
                          </span>
                        </td>
                        <td>
                          <select
                            aria-label={`Presença de ${s.name}`}
                            className={`dash-attendance-status ${r.status === 'Falta' ? 'red' : r.status === 'Justificada' ? 'amber' : 'green'}`}
                            value={r.status}
                            onChange={(e) =>
                              setDraft({
                                ...records,
                                [s.id]: {
                                  ...r,
                                  status: e.target.value as 'Presente' | 'Falta' | 'Justificada',
                                },
                              })
                            }
                          >
                            <option value="">Por marcar</option>
                            <option>Presente</option>
                            <option>Falta</option>
                            <option>Justificada</option>
                          </select>
                        </td>
                        <td>
                          <input
                            aria-label={`Observação de ${s.name}`}
                            placeholder="Adicionar observação..."
                            value={r.note}
                            onChange={(e) =>
                              setDraft({ ...records, [s.id]: { ...r, note: e.target.value } })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="dash-form-actions spread dash-attendance-actions">
              <small aria-live="polite">{present} presentes · {missing} faltas · {justified} justificadas · {students.length - present - missing - justified} por marcar</small>
              <button
                className="dash-btn secondary"
                onClick={() =>
                  setDraft(
                    Object.fromEntries(
                      students.map((s) => [
                        s.id,
                        { status: 'Presente', note: records[s.id]?.note || '' },
                      ]),
                    ),
                  )
                }
              >
                Marcar todos como presentes
              </button>
              <div>
                <button className="dash-btn secondary" onClick={() => { if (window.confirm('Descartar o rascunho e recuperar a última chamada confirmada?')) setDraft(null); }}>
                  Descartar rascunho
                </button>
                <button
                  className="dash-btn"
                  disabled={students.length === 0 || present + missing + justified !== students.length}
                  onClick={() => {
                    if (!students.length || students.some((student) => !records[student.id]?.status)) return;
                    update((s) => ({
                      ...s,
                      attendance: [
                        ...s.attendance.filter((a) => !(a.classId === classId && a.date === date)),
                        {
                          classId,
                          date,
                          records: Object.fromEntries(
                            students.map((s) => [
                              s.id,
                              records[s.id] as Attendance['records'][string],
                            ]),
                          ),
                        },
                      ],
                    }));
                    setDraft(null);
                    notify('Chamada confirmada. Consulte o estado de armazenamento acima.');
                  }}
                >
                  <Save size={17} />
                  Guardar presenças
                </button>
              </div>
            </div>
          </Panel>
        </div>
        <aside>
          <Panel title={`Resumo da turma (${formatDate(date)})`}>
            <Donut
              value={`${percentage}%`}
              label="presença"
              segments={[
                { label: 'Presentes', value: present, tone: 'green' },
                { label: 'Faltas', value: missing, tone: 'red' },
                { label: 'Justificadas', value: justified, tone: 'amber' },
              ]}
            />
          </Panel>
          <Panel title="Histórico desta turma">
            {state.attendance
              .filter((a) => a.classId === classId)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((a) => (
                <button className="dash-list-row" key={a.date} onClick={() => changeDate(a.date)}>
                  <span>{formatDate(a.date)}</span>
                  <span>
                    {Object.values(a.records).filter((r) => r.status === 'Presente').length}{' '}
                    presentes
                  </span>
                </button>
              ))}
          </Panel>
          <QuickActions
            items={[
              {
                label: 'Gerar relatório de presenças',
                icon: FileText,
                onClick: () => {
                  if (
                    !printDocument(
                      `Presenças · ${formatDate(date)}`,
                      ['Aluno', 'Presença', 'Observação'],
                      rows,
                    )
                  )
                    notify('Permita janelas para imprimir.');
                },
              },
              {
                label: 'Exportar para Excel (CSV)',
                icon: FileText,
                onClick: () =>
                  exportCSV(`presencas-${date}.csv`, [
                    ['Aluno', 'Presença', 'Observação'],
                    ...rows,
                  ]),
              },
              {
                label: 'Abrir mensagens da turma',
                icon: MessagesSquare,
                href: `/dashboard/mensagens?conversa=chat-${classId}`,
              },
              {
                label: 'Ver estatísticas detalhadas',
                icon: ChartColumn,
                href: `/dashboard/relatorios?turma=${classId}`,
              },
            ]}
          />
        </aside>
      </div>
    </>
  );
}
