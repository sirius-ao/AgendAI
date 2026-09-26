import type { Assessment, DashboardState } from '@/types/dashboard';
export const formatDate = (date: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(
    'pt-PT',
    options || { day: '2-digit', month: 'short', year: 'numeric' },
  );
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export const classStudents = (state: DashboardState, id: string) =>
  state.students.filter((s) => s.classId === id);
export function studentAverage(assessments: Assessment[], studentId: string) {
  const entries = assessments.filter((a) => a.grades[studentId] != null);
  const weight = entries.reduce((sum, a) => sum + a.weight, 0);
  return weight
    ? entries.reduce((sum, a) => sum + (a.grades[studentId] || 0) * a.weight, 0) / weight
    : null;
}
export function classSummary(state: DashboardState, classId: string) {
  const students = classStudents(state, classId);
  const assessments = state.assessments.filter((a) => a.classId === classId);
  const averages = students.map((s) => ({
    student: s,
    average: studentAverage(assessments, s.id),
  }));
  const scored = averages.filter((a) => a.average !== null);
  const attendance = state.attendance.filter((a) => a.classId === classId);
  const records = attendance.flatMap((a) => Object.values(a.records));
  return {
    students,
    assessments,
    averages,
    mean: scored.length ? scored.reduce((s, a) => s + a.average!, 0) / scored.length : 0,
    attendance: records.length
      ? (100 * records.filter((r) => r.status === 'Presente').length) / records.length
      : 0,
    excellent: averages.filter((a) => (a.average || 0) >= 18),
    atRisk: averages.filter((a) => a.average !== null && a.average < 10),
  };
}
export const formatNumber = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 });
export const fileSize = (bytes: number) =>
  bytes >= 1e9
    ? `${(bytes / 1e9).toFixed(1)} GB`
    : bytes >= 1e6
      ? `${(bytes / 1e6).toFixed(1)} MB`
      : `${Math.ceil(bytes / 1000)} KB`;
export function localId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
