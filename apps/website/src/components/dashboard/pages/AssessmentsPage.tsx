'use client';
import { useState } from 'react';
import { Users, FileText, ChartColumn, Trophy, Plus, Lightbulb } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import {
  ActionMenu,
  Avatar,
  EmptyState,
  PageHeader,
  Panel,
  QuickActions,
  SelectField,
  StatCard,
  StatusBadge,
  Tabs,
} from '../ui/Primitives';
import { Donut } from '../ui/Charts';
import { classStudents, formatDate, formatNumber, studentAverage } from '@/lib/dashboard/selectors';
import { exportCSV, printDocument } from '@/lib/dashboard/export';
export function AssessmentsPage({ initialClass = '10a' }: { initialClass?: string }) {
  const { state, update, notify, openModal } = useDashboard();
  const [classId, setClassId] = useState(
      state.classes.some((c) => c.id === initialClass) ? initialClass : state.classes[0].id,
    ),
    [subject, setSubject] = useState('mat'),
    [term, setTerm] = useState('1º Trimestre'),
    [tab, setTab] = useState('Notas');
  const students = classStudents(state, classId);
  const assessments = state.assessments.filter(
    (a) =>
      a.classId === classId &&
      a.subjectId === subject &&
      (term === 'Todos' ||
        (term === '1º Trimestre'
          ? ['09', '10', '11', '12']
          : term === '2º Trimestre'
            ? ['01', '02', '03']
            : ['04', '05', '06', '07', '08']
        ).includes(a.date.slice(5, 7))),
  );
  const averages = students.map((s) => studentAverage(assessments, s.id));
  const numeric = averages.filter((v): v is number => v !== null);
  const mean = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : 0;
  const pass = numeric.filter((n) => n >= 10).length,
    excellent = numeric.filter((n) => n >= 18).length;
  const rows = students.map((s, i) => [
    s.name,
    ...assessments.map((a) => a.grades[s.id] ?? ''),
    averages[i] === null ? '—' : formatNumber(averages[i]!),
  ]);
  const headers = ['Aluno', ...assessments.map((a) => `${a.title} (${a.weight}%)`), 'Média'];
  const list = assessments.filter((a) =>
    tab === 'Trabalhos'
      ? a.type === 'Trabalho'
      : tab === 'Testes'
        ? a.type === 'Prova/Teste'
        : tab === 'Projetos'
          ? a.type === 'Projeto'
          : tab === 'Exames'
            ? a.type === 'Exame'
            : tab === 'Competências'
              ? a.type === 'Competências'
              : true,
  );
  return (
    <>
      <PageHeader
        title="Avaliações"
        description="Registe, acompanhe e analise o desempenho dos seus alunos."
        actions={
          <>
            <SelectField
              label="Turma"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={state.classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <button className="dash-btn" onClick={() => openModal({ kind: 'assessment', classId })}>
              <Plus size={18} />
              Nova avaliação
            </button>
          </>
        }
      />
      <div className="dash-filters">
        <SelectField
          label="Disciplina"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          options={state.subjects.map((s) => ({ value: s.id, label: s.name }))}
        />
        <SelectField
          label="Período"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          options={['1º Trimestre', '2º Trimestre', '3º Trimestre', 'Todos']}
        />
      </div>
      <Tabs
        items={['Notas', 'Trabalhos', 'Testes', 'Projetos', 'Exames', 'Competências', 'Relatórios']}
        value={tab}
        onChange={setTab}
      />
      <div className="dash-content-sidebar">
        <div>
          <div className="dash-stats">
            <StatCard icon={Users} value={students.length} label="Alunos" />
            <StatCard icon={FileText} value={assessments.length} label="Avaliações" />
            <StatCard icon={ChartColumn} value={formatNumber(mean)} label="Média (0–20)" />
            <StatCard icon={Trophy} value={excellent} label="Alunos de excelência" tone="amber" />
          </div>
          {tab === 'Notas' ? (
            <Panel
              title="Notas por avaliação"
              action={<small>Guardadas automaticamente · escala 0–20</small>}
            >
              <div className="dash-table-scroll dash-grade-table">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Nome do aluno</th>
                      {assessments.map((a) => (
                        <th key={a.id}>
                          <button onClick={() => openModal({ kind: 'assessment', id: a.id })}>
                            {a.title}
                            <small>
                              ({a.weight}%) ·{' '}
                              {formatDate(a.date, { day: '2-digit', month: 'short' })}
                            </small>
                          </button>
                        </th>
                      ))}
                      <th>Média</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td>
                          <span className="dash-person">
                            <Avatar src={s.avatar} name={s.name} />
                            {s.name}
                          </span>
                        </td>
                        {assessments.map((a) => (
                          <td key={a.id}>
                            <input
                              aria-label={`${a.title} de ${s.name}`}
                              type="number"
                              min="0"
                              max="20"
                              step="0.1"
                              value={a.grades[s.id] ?? ''}
                              className="dash-grade-input"
                              onChange={(e) => {
                                const v = e.target.value === '' ? null : Number(e.target.value);
                                if (v !== null && (!Number.isFinite(v) || v < 0 || v > 20)) return;
                                update((st) => ({
                                  ...st,
                                  assessments: st.assessments.map((x) =>
                                    x.id === a.id
                                      ? { ...x, grades: { ...x.grades, [s.id]: v } }
                                      : x,
                                  ),
                                }));
                              }}
                            />
                          </td>
                        ))}
                        <td>
                          <strong>{averages[i] === null ? '—' : formatNumber(averages[i]!)}</strong>
                        </td>
                        <td>
                          <StatusBadge
                            tone={
                              averages[i] === null ? 'gray' : averages[i]! >= 10 ? 'green' : 'red'
                            }
                          >
                            {averages[i] === null
                              ? 'Por avaliar'
                              : averages[i]! >= 10
                                ? 'Aprovado'
                                : 'Em risco'}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!assessments.length && <EmptyState title="Sem avaliações neste período" />}
            </Panel>
          ) : tab === 'Relatórios' ? (
            <Panel title="Relatório da turma">
              <p>Exporte as notas e médias do período e disciplina selecionados.</p>
              <button
                className="dash-btn"
                onClick={() => exportCSV('avaliacoes.csv', [headers, ...rows])}
              >
                Exportar notas (CSV)
              </button>
            </Panel>
          ) : (
            <Panel title={tab}>
              {list.map((a) => (
                <div className="dash-list-row" key={a.id}>
                  <span className="dash-icon green">
                    <FileText />
                  </span>
                  <span>
                    <strong>{a.title}</strong>
                    <small>
                      {formatDate(a.date)} · Peso {a.weight}%
                    </small>
                  </span>
                  <StatusBadge tone={a.published ? 'green' : 'gray'}>
                    {a.published ? 'Publicada (local)' : 'Rascunho'}
                  </StatusBadge>
                  <ActionMenu
                    items={[
                      {
                        label: 'Editar avaliação',
                        action: () => openModal({ kind: 'assessment', id: a.id }),
                      },
                    ]}
                  />
                </div>
              ))}
              {!list.length && <EmptyState />}
            </Panel>
          )}
          <div className="dash-tip">
            <Lightbulb />
            <div>
              <strong>Dica AgendAI</strong>
              <p>
                As médias são ponderadas pelos pesos das avaliações com nota. Use critérios claros e
                consistentes.
              </p>
            </div>
          </div>
        </div>
        <aside>
          <Panel title="Resumo da avaliação">
            <Donut
              value={formatNumber(mean)}
              label="média da turma"
              segments={[
                { label: 'Aprovados', value: pass, tone: 'green' },
                { label: 'Em risco', value: numeric.length - pass, tone: 'red' },
                { label: 'Por avaliar', value: students.length - numeric.length, tone: 'gray' },
              ]}
            />
          </Panel>
          <Panel title="Estatísticas das notas">
            <div className="dash-progress-list">
              {[
                [18, 20],
                [14, 17.99],
                [10, 13.99],
                [0, 9.99],
              ].map(([min, max]) => {
                const n = numeric.filter((v) => v >= min && v <= max).length;
                return (
                  <div key={min}>
                    <span>
                      {min} – {Math.floor(max)}
                    </span>
                    <progress value={n} max={Math.max(1, numeric.length)} />
                    <b>{numeric.length ? Math.round((n / numeric.length) * 100) : 0}%</b>
                  </div>
                );
              })}
            </div>
          </Panel>
          <QuickActions
            items={[
              {
                label: 'Lançar nova avaliação',
                icon: Plus,
                onClick: () => openModal({ kind: 'assessment', classId }),
              },
              {
                label: 'Exportar notas (CSV)',
                icon: FileText,
                onClick: () => exportCSV('notas.csv', [headers, ...rows]),
              },
              {
                label: 'Gerar boletim da turma',
                icon: FileText,
                onClick: () => {
                  if (!printDocument('Boletim da turma', headers, rows))
                    notify('Permita janelas para imprimir.');
                },
              },
              {
                label: 'Ver análise de desempenho',
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
