'use client';
import { useState } from 'react';
import { Users, Check, ChartColumn, Trophy, FileText, Download, TriangleAlert } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import {
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
import { BarChart, Donut, LineChart } from '../ui/Charts';
import {
  classStudents,
  formatDate,
  formatNumber,
  localId,
  studentAverage,
} from '@/lib/dashboard/selectors';
import { exportCSV, printDocument } from '@/lib/dashboard/export';
import { DEMO_DATE } from '@/data/dashboard/seed';
function belongsToPeriod(date: string, period: string) {
  if (period === 'all') return true;
  if (/^\d{4}-\d{2}$/.test(period)) return date.startsWith(period);
  if (period === 'Setembro 2026') return date.startsWith('2026-09');
  if (period === '1º Trimestre 2026') return date >= '2026-09-01' && date <= '2026-12-31';
  return false;
}
export function ReportsPage({ initialClass = '10a' }: { initialClass?: string }) {
  const { state, update, notify } = useDashboard();
  const [classId, setClassId] = useState(
      state.classes.some((c) => c.id === initialClass) ? initialClass : state.classes[0].id,
    ),
    [period, setPeriod] = useState('2026-10'),
    [tab, setTab] = useState('Visão Geral');
  const students = classStudents(state, classId);
  const attendance = state.attendance
    .filter((a) => a.classId === classId && (period === 'all' || a.date.startsWith(period)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const assessments = state.assessments.filter(
    (a) => a.classId === classId && (period === 'all' || a.date.startsWith(period)),
  );
  const averages = students.map((s) => ({ student: s, mean: studentAverage(assessments, s.id) }));
  const numbers = averages.filter((a) => a.mean !== null);
  const mean = numbers.length ? numbers.reduce((n, a) => n + a.mean!, 0) / numbers.length : 0;
  const entries = attendance.flatMap((a) => Object.values(a.records));
  const attendanceRate = entries.length
    ? Math.round((entries.filter((r) => r.status === 'Presente').length / entries.length) * 100)
    : 0;
  const excellent = numbers.filter((a) => a.mean! >= 18);
  const risk = numbers.filter((a) => a.mean! < 10);
  const dates = attendance.slice(-5);
  const frequency = dates.map((a) => {
    const records = Object.values(a.records);
    return records.length
      ? Math.round((records.filter((r) => r.status === 'Presente').length / records.length) * 100)
      : 0;
  });
  const rows = averages.map(({ student, mean }) => [
    student.name,
    mean === null ? 'Sem nota' : formatNumber(mean),
    ...attendance.map((a) => a.records[student.id]?.status || 'Sem registo'),
  ]);
  const headers = ['Aluno', 'Média', ...attendance.map((a) => a.date)];
  const exportReport = (pdf = false) => {
    if (pdf) {
      if (
        !printDocument(
          `Relatório · ${state.classes.find((c) => c.id === classId)?.name}`,
          headers,
          rows,
        )
      )
        notify('Permita janelas para imprimir.');
    } else exportCSV('relatorio-turma.csv', [headers, ...rows]);
  };
  const showAttendance = ['Visão Geral', 'Presenças', 'Comparativos'].includes(tab),
    showGrades = ['Visão Geral', 'Avaliações', 'Desempenho', 'Comparativos'].includes(tab);
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Acompanhe o progresso das suas turmas e tome decisões com base nos seus registos."
        actions={
          <>
            <SelectField
              label="Turma"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={state.classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <SelectField
              label="Período"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: '2026-10', label: 'Outubro 2026' },
                { value: '2026-09', label: 'Setembro 2026' },
                { value: 'all', label: 'Todo o período' },
              ]}
            />
            <button
              className="dash-btn"
              onClick={() => {
                update((s) => ({
                  ...s,
                  reports: [
                    {
                      id: localId('report'),
                      name: `Relatório de ${tab}`,
                      classId,
                      type: tab,
                      period,
                      date: DEMO_DATE,
                    },
                    ...s.reports,
                  ],
                }));
                notify('Relatório registado. Use as opções de exportação para guardar os dados.');
              }}
            >
              <FileText size={18} />
              Gerar relatório
            </button>
          </>
        }
      />
      <Tabs
        items={[
          'Visão Geral',
          'Presenças',
          'Avaliações',
          'Desempenho',
          'Atividades',
          'Comparativos',
          'Personalizado',
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="dash-stats">
        <StatCard icon={Users} value={students.length} label="Alunos" />
        <StatCard icon={Check} value={`${attendanceRate}%`} label="Presença média" />
        <StatCard icon={ChartColumn} value={formatNumber(mean)} label="Média geral (0–20)" />
        <StatCard icon={Trophy} value={excellent.length} label="Alunos em destaque" tone="amber" />
      </div>
      <div className="dash-report-grid">
        {showAttendance && (
          <Panel title="Frequência por dia">
            {dates.length ? (
              <BarChart
                values={frequency}
                labels={dates.map((a) => formatDate(a.date, { day: '2-digit', month: 'short' }))}
              />
            ) : (
              <EmptyState title="Sem chamadas neste período" />
            )}
          </Panel>
        )}
        {showGrades && (
          <>
            <Panel title="Distribuição das notas">
              <Donut
                value={String(numbers.length)}
                label="alunos avaliados"
                segments={[
                  {
                    label: '14 – 20',
                    value: numbers.filter((a) => a.mean! >= 14).length,
                    tone: 'green',
                  },
                  {
                    label: '10 – 13',
                    value: numbers.filter((a) => a.mean! >= 10 && a.mean! < 14).length,
                    tone: 'amber',
                  },
                  { label: '0 – 9', value: risk.length, tone: 'red' },
                ]}
              />
            </Panel>
            <Panel title="Desempenho por disciplina">
              <div className="dash-progress-list">
                {state.subjects.map((subject) => {
                  const aa = assessments.filter((a) => a.subjectId === subject.id);
                  const nn = students
                    .map((s) => studentAverage(aa, s.id))
                    .filter((n): n is number => n !== null);
                  const value = nn.length ? nn.reduce((a, b) => a + b, 0) / nn.length : 0;
                  return (
                    <div key={subject.id}>
                      <span>{subject.name}</span>
                      <progress value={value} max={20} />
                      <b>{nn.length ? formatNumber(value) : '—'}</b>
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Panel title="Média por avaliação">
              {assessments.length ? (
                <LineChart
                  values={assessments.map((a) => {
                    const n = Object.values(a.grades).filter((v): v is number => v !== null);
                    return n.length
                      ? Number((n.reduce((x, y) => x + y, 0) / n.length).toFixed(1))
                      : 0;
                  })}
                  labels={assessments.map((a) => a.title)}
                />
              ) : (
                <EmptyState title="Sem avaliações" />
              )}
            </Panel>
            <Panel
              title={
                <>
                  <TriangleAlert size={18} /> Alunos em risco
                </>
              }
            >
              {risk.length ? (
                risk.slice(0, 4).map((a) => (
                  <div className="dash-list-row" key={a.student.id}>
                    <Avatar name={a.student.name} src={a.student.avatar} />
                    <span>{a.student.name}</span>
                    <StatusBadge tone="red">{formatNumber(a.mean!)}</StatusBadge>
                  </div>
                ))
              ) : (
                <p>Nenhum aluno com média inferior a 10 neste período.</p>
              )}
            </Panel>
            <Panel title="🏆 Alunos em destaque">
              {excellent.length ? (
                excellent.slice(0, 4).map((a) => (
                  <div className="dash-list-row" key={a.student.id}>
                    <Avatar name={a.student.name} src={a.student.avatar} />
                    <span>{a.student.name}</span>
                    <StatusBadge>{formatNumber(a.mean!)}</StatusBadge>
                  </div>
                ))
              ) : (
                <p>Sem médias iguais ou superiores a 18 neste período.</p>
              )}
            </Panel>
          </>
        )}
        {tab === 'Atividades' && (
          <Panel title="Atividades planeadas">
            {state.events
              .filter(
                (e) => e.classId === classId && (period === 'all' || e.date.startsWith(period)),
              )
              .map((e) => (
                <div className="dash-list-row" key={e.id}>
                  <strong>{e.title}</strong>
                  <span>
                    {formatDate(e.date)} · {e.start}
                  </span>
                </div>
              ))}
          </Panel>
        )}
        {tab === 'Personalizado' && (
          <Panel title="Relatório personalizado">
            <p>
              A exportação inclui as médias ponderadas e todas as chamadas da turma no período
              selecionado acima.
            </p>
            <button className="dash-btn" onClick={() => exportReport()}>
              Exportar seleção (CSV)
            </button>
          </Panel>
        )}
      </div>
      <div className="dash-content-sidebar">
        <Panel title="Relatórios recentes">
          <div className="dash-table-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Nome do relatório</th>
                  <th>Tipo</th>
                  <th>Período</th>
                  <th>Gerado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {state.reports
                  .filter((r) => r.classId === classId)
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <FileText size={17} /> {r.name}
                      </td>
                      <td>{r.type}</td>
                      <td>{r.period}</td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <button
                          className="dash-icon-button"
                          aria-label={`Exportar ${r.name}`}
                          onClick={() => {
                            const aa = state.assessments.filter(
                              (a) => a.classId === r.classId && belongsToPeriod(a.date, r.period),
                            );
                            const calls = state.attendance.filter(
                              (a) => a.classId === r.classId && belongsToPeriod(a.date, r.period),
                            );
                            exportCSV(`${r.id}.csv`, [
                              ['Aluno', 'Média atual', ...calls.map((a) => a.date)],
                              ...classStudents(state, r.classId).map((s) => [
                                s.name,
                                studentAverage(aa, s.id) ?? 'Sem nota',
                                ...calls.map((a) => a.records[s.id]?.status || 'Sem registo'),
                              ]),
                            ]);
                          }}
                        >
                          <Download size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <small>
            Os relatórios exportam os registos atuais; não são cópias históricas imutáveis.
          </small>
        </Panel>
        <QuickActions
          items={[
            {
              label: 'Exportar relatório (PDF / imprimir)',
              icon: FileText,
              onClick: () => exportReport(true),
            },
            { label: 'Exportar para Excel (CSV)', icon: FileText, onClick: () => exportReport() },
            {
              label: 'Relatório personalizado',
              icon: ChartColumn,
              onClick: () => setTab('Personalizado'),
            },
          ]}
        />
      </div>
    </>
  );
}
