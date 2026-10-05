'use client';
import { gradePending } from '@/lib/dashboard/assessment-grades';
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
import type { DashboardState, Report } from '@/types/dashboard';
function belongsToPeriod(date: string, period: string) {
  if (period === 'all') return true;
  if (/^\d{4}-\d{2}$/.test(period)) return date.startsWith(period);
  if (period === 'Setembro 2026') return date.startsWith('2026-09');
  if (period === '1º Trimestre 2026') return date >= '2026-09-01' && date <= '2026-12-31';
  return false;
}
type ReportData = { title: string; headers: string[]; rows: (string | number)[][] };
type ReportFilters = { subjectId?: string; teacherId?: string; studentId?: string; startDate?: string; endDate?: string };
const reportFilename = (title: string) => `${title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`;
function buildReportData(
  state: DashboardState,
  classId: string,
  period: string,
  type: string,
  sections: string[] = [],
  filters: ReportFilters = {},
): ReportData {
  const schoolClass = state.classes.find((item) => item.id === classId);
  const allStudents = classStudents(state, classId);
  const students = allStudents.filter((student) => !filters.studentId || student.id === filters.studentId);
  const inPeriod = (date: string) => ((filters.startDate || filters.endDate) ? true : belongsToPeriod(date, period))
    && (!filters.startDate || date >= filters.startDate)
    && (!filters.endDate || date <= filters.endDate);
  const calls = state.attendance
    .filter((item) => item.classId === classId && inPeriod(item.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const assessments = state.assessments
    .filter((item) => item.classId === classId && inPeriod(item.date) && (!filters.subjectId || item.subjectId === filters.subjectId) && (!filters.teacherId || item.teacherId === filters.teacherId))
    .sort((a, b) => a.date.localeCompare(b.date));
  const activities = state.events
    .filter((item) => item.classId === classId && inPeriod(item.date) && (!filters.subjectId || item.subjectId === filters.subjectId) && (!filters.teacherId || item.teacherId === filters.teacherId)
      && (!filters.studentId || item.participants === classId || item.participants.includes(students[0]?.name || '\u0000')))
    .sort((a, b) => a.date.localeCompare(b.date));
  const periodLabel = filters.startDate || filters.endDate
    ? 'Intervalo personalizado'
    : period === 'all'
      ? 'Todo o período'
      : /^\d{4}-\d{2}$/.test(period)
        ? formatDate(`${period}-01`, { month: 'long', year: 'numeric' })
        : period;
  const subjectLabel = filters.subjectId ? state.subjects.find((subject) => subject.id === filters.subjectId)?.name : undefined;
  const studentLabel = filters.studentId ? students[0]?.name : undefined;
  const teacherLabel = filters.teacherId ? state.teacherDirectory?.find((teacher) => teacher.id === filters.teacherId)?.name : undefined;
  const dateLabel = filters.startDate || filters.endDate
    ? ` · ${filters.startDate ? formatDate(filters.startDate) : 'sem início'}–${filters.endDate ? formatDate(filters.endDate) : 'sem fim'}`
    : '';
  const title = `${type} · ${schoolClass?.name || 'Turma'} · ${periodLabel}${subjectLabel ? ` · ${subjectLabel}` : ''}${teacherLabel ? ` · ${teacherLabel}` : ''}${studentLabel ? ` · ${studentLabel}` : ''}${dateLabel}`;
  const attendanceFor = (studentId: string) =>
    calls.map((call) => call.records[studentId]?.status).filter(Boolean);
  const attendanceMetrics = (studentId: string) => {
    const statuses = attendanceFor(studentId);
    const present = statuses.filter((status) => status === 'Presente').length;
    const missing = statuses.filter((status) => status === 'Falta').length;
    const justified = statuses.filter((status) => status === 'Justificada').length;
    const marked = present + missing + justified;
    return { present, missing, justified, marked, rate: marked ? (present / marked) * 100 : null };
  };
  const averageFor = (studentId: string) => studentAverage(assessments, studentId);

  if (type === 'Presenças') {
    if (!calls.length) return { title, headers: ['Aluno', 'Presenças', 'Faltas', 'Justificadas', 'Registos', 'Presença (%)'], rows: [] };
    return {
      title,
      headers: ['Aluno', 'Presenças', 'Faltas', 'Justificadas', 'Registos', 'Presença (%)'],
      rows: students.map((student) => {
        const metrics = attendanceMetrics(student.id);
        return [student.name, metrics.present, metrics.missing, metrics.justified, metrics.marked, metrics.rate === null ? 'Sem registo' : formatNumber(metrics.rate)];
      }),
    };
  }

  if (type === 'Avaliações') {
    if (!assessments.length) return { title, headers: ['Aluno', 'Média ponderada'], rows: [] };
    return {
      title,
      headers: ['Aluno', ...assessments.map((assessment) => assessment.title), 'Média ponderada'],
      rows: students.map((student) => [
        student.name,
        ...assessments.map((assessment) => {
          const grade = assessment.grades[student.id];
          return grade === null || grade === undefined
            ? assessment.gradeDetails?.[student.id]?.status || 'Sem nota'
            : formatNumber(grade);
        }),
        averageFor(student.id) === null ? 'Sem nota' : formatNumber(averageFor(student.id)!),
      ]),
    };
  }

  if (type === 'Atividades') {
    return {
      title,
      headers: ['Atividade', 'Data', 'Início', 'Fim', 'Tipo', 'Local', 'Participantes'],
      rows: activities.map((event) => [event.title, event.date, event.start, event.end, event.type, event.location, event.participants]),
    };
  }

  if (type === 'Personalizado') {
    const headers = ['Categoria', 'Aluno ou atividade', 'Data', 'Detalhe', 'Valor'];
    const rows: (string | number)[][] = [];
    if (sections.includes('Presenças')) {
      for (const call of calls) {
        for (const student of students) {
          const record = call.records[student.id];
          if (record) rows.push(['Presença', student.name, call.date, record.note || '—', record.status]);
        }
      }
    }
    if (sections.includes('Avaliações')) {
      for (const assessment of assessments) {
        for (const student of students) {
          const grade = assessment.grades[student.id];
          const detail = assessment.gradeDetails?.[student.id];
          if (grade !== null && grade !== undefined || detail) {
            rows.push([`Avaliação · ${assessment.title}`, student.name, assessment.date, detail?.status || 'Registada', grade === null || grade === undefined ? 'Sem nota' : formatNumber(grade)]);
          }
        }
      }
    }
    if (sections.includes('Atividades')) {
      rows.push(...activities.map((event) => ['Atividade', event.title, event.date, event.type, event.location || '—']));
    }
    return { title, headers, rows };
  }

  if (type === 'Desempenho') {
    const ordered = students
      .map((student) => ({ student, average: averageFor(student.id), attendance: attendanceMetrics(student.id) }))
      .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
    return {
      title,
      headers: ['Posição', 'Aluno', 'Média ponderada', 'Presença (%)', 'Situação'],
      rows: ordered.map(({ student, average, attendance }, index) => [
        average === null ? '—' : index + 1,
        student.name,
        average === null ? 'Sem nota' : formatNumber(average),
        attendance.rate === null ? 'Sem registo' : formatNumber(attendance.rate),
        average === null ? 'Sem avaliações' : average >= 18 ? 'Em destaque' : average < 10 ? 'Precisa de apoio' : 'Em progresso',
      ]),
    };
  }

  if (type === 'Comparativos') {
    if (!assessments.length && !calls.length) {
      return { title, headers: ['Aluno', 'Média', 'Presença (%)'], rows: [] };
    }
    const classAverages = allStudents.map((student) => averageFor(student.id)).filter((value): value is number => value !== null);
    const classAttendanceRates = allStudents.map((student) => {
      const statuses = calls.map((call) => call.records[student.id]?.status).filter(Boolean);
      return statuses.length ? (statuses.filter((status) => status === 'Presente').length / statuses.length) * 100 : null;
    }).filter((value): value is number => value !== null);
    const averages = students.map((student) => averageFor(student.id)).filter((value): value is number => value !== null);
    const attendanceRates = students.map((student) => attendanceMetrics(student.id).rate).filter((value): value is number => value !== null);
    const classAverage = classAverages.length ? classAverages.reduce((sum, value) => sum + value, 0) / classAverages.length : null;
    const classAttendance = classAttendanceRates.length ? classAttendanceRates.reduce((sum, value) => sum + value, 0) / classAttendanceRates.length : null;
    return {
      title,
      headers: ['Aluno', 'Média', 'Média da turma', 'Diferença de média', 'Presença (%)', 'Presença média da turma (%)', 'Diferença de presença (p.p.)'],
      rows: students.map((student) => {
        const average = averageFor(student.id);
        const rate = attendanceMetrics(student.id).rate;
        return [student.name, average === null ? 'Sem nota' : formatNumber(average), classAverage === null ? 'Sem dados' : formatNumber(classAverage), average === null || classAverage === null ? '—' : formatNumber(average - classAverage), rate === null ? 'Sem registo' : formatNumber(rate), classAttendance === null ? 'Sem dados' : formatNumber(classAttendance), rate === null || classAttendance === null ? '—' : formatNumber(rate - classAttendance)];
      }),
    };
  }

  return {
    title,
    headers: ['Aluno', 'Média ponderada', 'Presenças', 'Faltas', 'Justificadas', 'Presença (%)'],
    rows: students.map((student) => {
      const average = averageFor(student.id);
      const metrics = attendanceMetrics(student.id);
      return [student.name, average === null ? 'Sem nota' : formatNumber(average), metrics.present, metrics.missing, metrics.justified, metrics.rate === null ? 'Sem registo' : formatNumber(metrics.rate)];
    }),
  };
}
export function ReportsPage({ initialClass = '10a' }: { initialClass?: string }) {
  const { state, update, notify } = useDashboard();
  const availableSubjects = state.subjects.filter((item) => state.user.role !== 'Professor' || state.teacherSubjectIds.includes(item.id));
  const [classId, setClassId] = useState(
      state.classes.some((c) => c.id === initialClass) ? initialClass : state.classes[0]?.id || '',
    ),
    [period, setPeriod] = useState('2026-10'),
    [tab, setTab] = useState('Visão Geral'),
    [customSections, setCustomSections] = useState(['Presenças', 'Avaliações']),
    [subjectId, setSubjectId] = useState(''),
    [teacherId, setTeacherId] = useState(''),
    [studentId, setStudentId] = useState(''),
    [startDate, setStartDate] = useState(''),
    [endDate, setEndDate] = useState('');
  const dateRangeInvalid = Boolean(startDate && endDate && endDate < startDate);
  const filters: ReportFilters = { subjectId, teacherId, studentId, startDate, endDate };
  const allStudents = classStudents(state, classId);
  const students = allStudents.filter((student) => !studentId || student.id === studentId);
  const inReportPeriod = (date: string) => ((startDate || endDate) ? true : belongsToPeriod(date, period))
    && (!startDate || date >= startDate) && (!endDate || date <= endDate);
  const attendance = state.attendance
    .filter((a) => a.classId === classId && inReportPeriod(a.date)
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const assessments = state.assessments.filter(
    (a) => (state.user.role !== 'Professor' || state.teacherSubjectIds.includes(a.subjectId)) && a.classId === classId && inReportPeriod(a.date)
      && (!teacherId || a.teacherId === teacherId)
      && (!subjectId || a.subjectId === subjectId),
  );
  const activities = state.events.filter((event) => event.classId === classId
    && (state.user.role !== 'Professor' || !event.subjectId || state.teacherSubjectIds.includes(event.subjectId))
    && inReportPeriod(event.date)
    && (!teacherId || event.teacherId === teacherId)
    && (!subjectId || event.subjectId === subjectId)
    && (!studentId || event.participants === classId || event.participants.includes(students[0]?.name || '\u0000')))
    .sort((a, b) => a.date.localeCompare(b.date));
  const averages = students.map((s) => ({ student: s, mean: studentAverage(assessments, s.id) }));
  const numbers = averages.filter((a) => a.mean !== null);
  const mean = numbers.length ? numbers.reduce((n, a) => n + a.mean!, 0) / numbers.length : 0;
  const classNumbers = allStudents.map((student) => studentAverage(assessments, student.id)).filter((value): value is number => value !== null);
  const classMean = classNumbers.length ? classNumbers.reduce((sum, value) => sum + value, 0) / classNumbers.length : null;
  const entries = attendance.flatMap((call) => studentId
    ? call.records[studentId] ? [call.records[studentId]] : []
    : Object.values(call.records));
  const attendanceRate = entries.length
    ? Math.round((entries.filter((r) => r.status === 'Presente').length / entries.length) * 100)
    : 0;
  const absenceCount = entries.filter((record) => record.status === 'Falta').length;
  const justifiedCount = entries.filter((record) => record.status === 'Justificada').length;
  const activityTypeCount = new Set(activities.map((event) => event.type)).size;
  const customReportRowCount = tab === 'Personalizado'
    ? buildReportData(state, classId, period, tab, customSections, filters).rows.length
    : 0;
  const excellent = numbers.filter((a) => a.mean! >= 18);
  const risk = numbers.filter((a) => a.mean! < 10 && assessments.every((item) => !gradePending(item, a.student.id)));
  const dates = attendance.slice(-5);
  const frequency = dates.map((a) => {
    if (studentId) return a.records[studentId]?.status === 'Presente' ? 100 : 0;
    const records = Object.values(a.records);
    return records.length
      ? Math.round((records.filter((r) => r.status === 'Presente').length / records.length) * 100)
      : 0;
  });
  const exportReport = (
    pdf = false,
    reportType = tab,
    reportClassId = classId,
    reportPeriod = period,
    reportSections = customSections,
    reportFilters = filters,
  ) => {
    if (dateRangeInvalid && reportFilters === filters) {
      notify('A data final deve ser igual ou posterior à data inicial.');
      return;
    }
    const report = buildReportData(state, reportClassId, reportPeriod, reportType, reportSections, reportFilters);
    if (!report.rows.length) {
      notify('Não há registos deste tipo para a turma e período selecionados.');
      return;
    }
    if (pdf) {
      if (!printDocument(report.title, report.headers, report.rows)) notify('Permita janelas para imprimir.');
    } else exportCSV(reportFilename(report.title), [report.headers, ...report.rows]);
  };
  const generateReport = () => {
    if (dateRangeInvalid) {
      notify('A data final deve ser igual ou posterior à data inicial.');
      return;
    }
    const report = buildReportData(state, classId, period, tab, customSections, filters);
    if (!report.rows.length) {
      notify('Não há registos deste tipo para a turma e período selecionados.');
      return;
    }
    const saved: Report = {
      id: localId('report'),
      name: report.title,
      classId,
      type: tab,
      period,
      date: DEMO_DATE,
      ...(tab === 'Personalizado' ? { sections: customSections } : {}),
      filters: { ...filters },
    };
    update((s) => ({ ...s, reports: [saved, ...s.reports] }));
    exportCSV(reportFilename(report.title), [report.headers, ...report.rows]);
    notify('Relatório guardado e exportado em CSV.');
  };
  const showAttendance = ['Visão Geral', 'Presenças', 'Comparativos'].includes(tab),
    showGrades = ['Visão Geral', 'Avaliações', 'Desempenho', 'Comparativos'].includes(tab);
  const customSectionOptions = ['Presenças', 'Avaliações', 'Atividades'];
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
              onChange={(e) => { setClassId(e.target.value); setStudentId(''); }}
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
            <button className="dash-btn" onClick={generateReport} disabled={dateRangeInvalid || (tab === 'Personalizado' && !customSections.length)}>
              <FileText size={18} />
              Gerar relatório
            </button>
          </>
        }
      />
      <div className="dash-report-filters" aria-label="Filtros do relatório">
        <SelectField
          label="Disciplina (notas e atividades)"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          options={[{ value: '', label: 'Todas as disciplinas' }, ...availableSubjects.map((subject) => ({ value: subject.id, label: subject.name }))]}
        />
        <SelectField
          label="Professor"
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
          options={[{ value: '', label: 'Todos os professores' }, ...(state.teacherDirectory || [{ id: state.user.id, name: state.user.name }]).map((teacher) => ({ value: teacher.id, label: teacher.name }))]}
        />
        <SelectField
          label="Aluno"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          options={[{ value: '', label: 'Toda a turma' }, ...allStudents.map((student) => ({ value: student.id, label: student.name }))]}
        />
        <label className="dash-report-date-filter">
          <span>Desde</span>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="dash-report-date-filter">
          <span>Até</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        {(subjectId || teacherId || studentId || startDate || endDate) && (
          <button className="dash-text-link" onClick={() => { setSubjectId(''); setTeacherId(''); setStudentId(''); setStartDate(''); setEndDate(''); }}>Limpar filtros</button>
        )}
        <small>As datas definem um intervalo próprio e substituem o período acima. A disciplina filtra avaliações e atividades; as presenças continuam a refletir as chamadas da turma.</small>
        {dateRangeInvalid && <p className="dash-report-filter-error" role="alert">A data final deve ser igual ou posterior à data inicial.</p>}
      </div>
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
      {tab === 'Personalizado' && (
        <Panel title="Dados a incluir no relatório" className="dash-report-customizer">
          <p>Escolhe uma ou mais áreas. O relatório reunirá apenas os registos da turma e do período selecionados.</p>
          <div className="dash-report-options">
            {customSectionOptions.map((section) => (
              <label key={section}>
                <input
                  type="checkbox"
                  checked={customSections.includes(section)}
                  onChange={(event) => setCustomSections((current) => event.target.checked
                    ? [...current, section]
                    : current.filter((item) => item !== section))}
                />
                <span>{section}</span>
              </label>
            ))}
          </div>
        </Panel>
      )}
      <div className="dash-stats">
        {tab === 'Presenças' ? <>
          <StatCard icon={Users} value={students.length} label="Alunos no relatório" />
          <StatCard icon={Check} value={entries.length ? `${attendanceRate}%` : '—'} label="Taxa de presença" />
          <StatCard icon={FileText} value={attendance.length} label="Chamadas no período" />
          <StatCard icon={TriangleAlert} value={absenceCount + justifiedCount} label="Faltas e justificações" tone="amber" detail={`${absenceCount} faltas · ${justifiedCount} justificadas`} />
        </> : tab === 'Avaliações' ? <>
          <StatCard icon={FileText} value={assessments.length} label="Avaliações no período" />
          <StatCard icon={Users} value={numbers.length} label="Alunos com nota" />
          <StatCard icon={ChartColumn} value={numbers.length ? formatNumber(mean) : '—'} label="Média da turma (0–20)" />
          <StatCard icon={TriangleAlert} value={risk.length} label="Alunos abaixo de 10" tone="amber" />
        </> : tab === 'Desempenho' ? <>
          <StatCard icon={ChartColumn} value={numbers.length ? formatNumber(mean) : '—'} label="Média ponderada" />
          <StatCard icon={Trophy} value={excellent.length} label="Alunos em destaque" tone="amber" />
          <StatCard icon={TriangleAlert} value={risk.length} label="Alunos que precisam de apoio" tone="red" />
          <StatCard icon={Users} value={numbers.length} label="Alunos avaliados" />
        </> : tab === 'Atividades' ? <>
          <StatCard icon={FileText} value={activities.length} label="Atividades planeadas" />
          <StatCard icon={ChartColumn} value={activityTypeCount} label="Tipos de atividade" />
          <StatCard icon={Users} value={students.length} label="Alunos na turma" />
          <StatCard icon={Check} value={new Set(activities.map((event) => event.date)).size} label="Dias com atividades" />
        </> : tab === 'Personalizado' ? <>
          <StatCard icon={FileText} value={customSections.length} label="Áreas selecionadas" />
          <StatCard icon={ChartColumn} value={customReportRowCount} label="Registos no relatório" />
          <StatCard icon={Users} value={students.length} label="Alunos abrangidos" />
          <StatCard icon={Check} value={activities.length} label="Atividades incluídas" />
        </> : tab === 'Comparativos' ? <>
          <StatCard icon={ChartColumn} value={numbers.length ? formatNumber(mean) : '—'} label="Média selecionada" />
          <StatCard icon={Users} value={classMean === null ? '—' : formatNumber(classMean)} label="Média da turma" />
          <StatCard icon={Check} value={classMean === null || !numbers.length ? '—' : formatNumber(mean - classMean)} label="Diferença para a turma" />
          <StatCard icon={Users} value={students.length} label="Alunos no filtro" />
        </> : <>
          <StatCard icon={Users} value={students.length} label="Alunos" />
          <StatCard icon={Check} value={entries.length ? `${attendanceRate}%` : '—'} label="Presença média" detail={entries.length ? undefined : 'Sem chamadas no período'} />
          <StatCard icon={ChartColumn} value={numbers.length ? formatNumber(mean) : '—'} label="Média geral (0–20)" detail={numbers.length ? undefined : 'Sem notas no período'} />
          <StatCard icon={Trophy} value={excellent.length} label="Alunos em destaque" tone="amber" />
        </>}
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
                {availableSubjects.map((subject) => {
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
            {activities.map((e) => (
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
          <Panel title="Pré-visualização do relatório personalizado">
            <p>O ficheiro incluirá {customSections.length ? customSections.join(', ') : 'nenhuma área selecionada'} para a turma e o período escolhidos.</p>
            <button className="dash-btn" onClick={() => exportReport()} disabled={!customSections.length}>Exportar seleção (CSV)</button>
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
                      <td>{r.filters?.startDate || r.filters?.endDate
                        ? `${r.filters?.startDate ? formatDate(r.filters.startDate) : 'Sem início'} – ${r.filters?.endDate ? formatDate(r.filters.endDate) : 'Sem fim'}`
                        : r.period === 'all' ? 'Todo o período' : /^\d{4}-\d{2}$/.test(r.period) ? formatDate(`${r.period}-01`, { month: 'long', year: 'numeric' }) : r.period}</td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <button
                          className="dash-icon-button"
                          aria-label={`Exportar ${r.name}`}
                          onClick={() => exportReport(false, r.type, r.classId, r.period, r.sections || [], r.filters || {})}
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
