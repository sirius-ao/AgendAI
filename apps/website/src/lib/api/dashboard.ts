import { createDashboardSeed } from '@/data/dashboard/seed';
import type { DashboardState } from '@/types/dashboard';
import { apiRequest, type ApiUser } from './client';

type StoredRecord = { id: string; payload: Record<string, unknown> };
type Snapshot = {
  school: { id: string; name: string; address: string; academicYear: string; timezone: string };
  data: Record<string, { recordId: string; payload: Record<string, unknown> }[]>;
};
export type RecordIndex = Record<string, Map<string, string>>;
const collections = ['subjects', 'classes', 'students', 'plans', 'attendance', 'assessments', 'events', 'resources', 'library', 'reports', 'conversations', 'tasks', 'folders', 'planDrafts', 'assessmentDrafts', 'attendanceDrafts', 'settings', 'onboarding'] as const;
type Collection = (typeof collections)[number];

function roleName(role: string) {
  return ({ OWNER: 'Diretor', ADMIN: 'Administrador', COORDINATOR: 'Coordenador', TEACHER: 'Professor' } as Record<string, string>)[role] || role;
}
function fromRows(snapshot: Snapshot) {
  return Object.fromEntries(Object.entries(snapshot.data).map(([key, rows]) => [key, rows.map((row) => row.payload)])) as Record<string, Record<string, unknown>[]>;
}
function savedRecords(state: DashboardState, schoolId: string): Record<Collection, StoredRecord[]> {
  const record = <T extends { id: string }>(items: T[]) => items.map((item) => ({ id: item.id, payload: item as unknown as Record<string, unknown> }));
  const attendance = state.attendance.map((item) => {
    const id = `${item.classId}:${item.date}`;
    return { id, payload: { ...item, id } as unknown as Record<string, unknown> };
  });
  const preferences = { id: 'dashboard-settings', settings: state.settings, planPreferences: state.planPreferences };
  const onboarding = state.onboardingBySchool?.[schoolId] || state.onboarding;
  const drafts = <T>(items: Record<string, T> | undefined, wrap: (id: string, value: T) => Record<string, unknown>) => Object.entries(items || {}).map(([id, value]) => ({ id, payload: wrap(id, value) }));
  return {
    subjects: record(state.subjects), classes: record(state.classes), students: record(state.students), plans: record(state.plans), attendance,
    assessments: record(state.assessments), events: record(state.events), resources: record(state.resources), library: record(state.library),
    reports: record(state.reports), conversations: record(state.conversations), tasks: record(state.tasks),
    folders: state.folders.map((folder) => ({ id: folder, payload: { id: folder, name: folder } })),
    planDrafts: drafts(state.planDrafts, (id, value) => ({ id, ...value as object })),
    assessmentDrafts: drafts(state.assessmentDrafts, (id, value) => ({ id, details: value })),
    attendanceDrafts: drafts(state.attendanceDrafts, (id, value) => ({ id, records: value })),
    settings: [{ id: 'dashboard-settings', payload: preferences }],
    onboarding: onboarding ? [{ id: schoolId, payload: { id: schoolId, ...onboarding } }] : [],
  };
}

export async function loadApiDashboard(user: ApiUser, schoolId: string) {
  const snapshot = await apiRequest<Snapshot>(`/schools/${encodeURIComponent(schoolId)}/dashboard`);
  const teacherSubjects = await apiRequest<{ subjectIds: string[] }>(`/schools/${encodeURIComponent(schoolId)}/teachers/me/subjects`);
  const seed = createDashboardSeed();
  const data = fromRows(snapshot);
  const school = user.schools.find((item) => item.id === schoolId);
  const teacherDirectory = school && ['OWNER', 'ADMIN', 'COORDINATOR'].includes(school.role)
    ? await apiRequest<{ id: string; name: string }[]>(`/schools/${encodeURIComponent(schoolId)}/teachers/subjects`)
    : [{ id: user.id, name: user.name }];
  const state: DashboardState = {
    ...seed,
    teacherSubjectIds: teacherSubjects.subjectIds,
    teacherDirectory,
    user: { id: user.id, name: user.name, email: user.email, role: roleName(school?.role || ''), avatar: '', phone: user.phone || '' },
    schools: user.schools.map((item) => ({ id: item.id, name: item.name, address: item.address || '', year: item.academicYear || '', role: roleName(item.role) })),
    activeSchoolId: schoolId,
    settings: { ...seed.settings, ...(data.settings?.[0]?.settings as Partial<DashboardState['settings']> || {}), school: snapshot.school.name, address: snapshot.school.address, year: snapshot.school.academicYear, timezone: snapshot.school.timezone },
    planPreferences: data.settings?.[0]?.planPreferences as DashboardState['planPreferences'] || seed.planPreferences,
    subjects: (data.subjects || []) as unknown as DashboardState['subjects'],
    classes: (data.classes || []) as unknown as DashboardState['classes'],
    students: (data.students || []) as unknown as DashboardState['students'],
    plans: (data.plans || []) as unknown as DashboardState['plans'],
    attendance: (data.attendance || []).map(({ id: _id, ...item }) => item) as unknown as DashboardState['attendance'],
    assessments: (data.assessments || []) as unknown as DashboardState['assessments'],
    events: (data.events || []) as unknown as DashboardState['events'],
    resources: (data.resources || []) as unknown as DashboardState['resources'],
    library: (data.library || []) as unknown as DashboardState['library'],
    reports: (data.reports || []) as unknown as DashboardState['reports'],
    conversations: (data.conversations || []) as unknown as DashboardState['conversations'],
    tasks: (data.tasks || []) as unknown as DashboardState['tasks'],
    folders: (data.folders || []).map((item) => String(item.name || item.id)),
    planDrafts: Object.fromEntries((data.planDrafts || []).map(({ id, ...item }) => [id, item])) as DashboardState['planDrafts'],
    assessmentDrafts: Object.fromEntries((data.assessmentDrafts || []).map((item) => [String(item.id), item.details])) as DashboardState['assessmentDrafts'],
    attendanceDrafts: Object.fromEntries((data.attendanceDrafts || []).map((item) => [String(item.id), item.records])) as DashboardState['attendanceDrafts'],
    onboarding: data.onboarding?.[0] ? Object.fromEntries(Object.entries(data.onboarding[0]).filter(([key]) => key !== 'id')) as unknown as DashboardState['onboarding'] : undefined,
    onboardingBySchool: data.onboarding?.[0] ? { [schoolId]: Object.fromEntries(Object.entries(data.onboarding[0]).filter(([key]) => key !== 'id')) as unknown as NonNullable<DashboardState['onboarding']> } : {},
  };
  const index: RecordIndex = {};
  for (const collection of collections) index[collection] = new Map((snapshot.data[collection] || []).map((row) => [row.recordId, JSON.stringify(row.payload)]));
  index.teacherSubjects = new Map([[user.id, JSON.stringify(teacherSubjects.subjectIds)]]);
  return { state, index, school: snapshot.school };
}

async function performSyncApiDashboard(state: DashboardState, schoolId: string, index: RecordIndex, previous: { name: string; address: string; academicYear: string }, user: { id: string; name: string; email: string; phone: string }) {
  const values = savedRecords(state, schoolId);
  for (const collection of collections) {
    // School preferences contain school-wide identity fields; the generic endpoint
    // intentionally reserves them for administrators.
    if (state.user.role === 'Professor' && collection === 'settings') continue;
    const oldRows = index[collection] || new Map<string, string>();
    const nextRows = new Map(values[collection].map((item) => [item.id, JSON.stringify(item.payload)]));
    const operations: (() => Promise<unknown>)[] = [];
    for (const [id, payload] of nextRows) {
      if (oldRows.get(id) !== payload) operations.push(() => apiRequest(`/schools/${encodeURIComponent(schoolId)}/data/${collection}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ id, payload: values[collection].find((item) => item.id === id)!.payload }) }));
    }
    for (const id of oldRows.keys()) if (!nextRows.has(id)) operations.push(() => apiRequest(`/schools/${encodeURIComponent(schoolId)}/data/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }));
    for (let offset = 0; offset < operations.length; offset += 8) await Promise.all(operations.slice(offset, offset + 8).map((operation) => operation()));
    index[collection] = nextRows;
  }
  const teacherSubjectIndex = index.teacherSubjects || new Map<string, string>();
  const teacherSubjects = JSON.stringify(state.teacherSubjectIds || []);
  if (teacherSubjectIndex.get(user.id) !== teacherSubjects) {
    await apiRequest(`/schools/${encodeURIComponent(schoolId)}/teachers/me/subjects`, { method: 'PUT', body: JSON.stringify({ subjectIds: state.teacherSubjectIds || [] }) });
    teacherSubjectIndex.set(user.id, teacherSubjects);
    index.teacherSubjects = teacherSubjectIndex;
  }
  const schoolPatch = { name: state.settings.school, address: state.settings.address, academicYear: state.settings.year };
  if (schoolPatch.name !== previous.name || schoolPatch.address !== previous.address || schoolPatch.academicYear !== previous.academicYear) {
    const school = await apiRequest<typeof previous & { timezone?: string }>(`/schools/${encodeURIComponent(schoolId)}`, { method: 'PATCH', body: JSON.stringify(schoolPatch) });
    previous.name = school.name; previous.address = school.address; previous.academicYear = school.academicYear;
  }
  if (state.user.name !== user.name || state.user.phone !== user.phone) {
    const next = await apiRequest<{ name: string; phone: string }>('/auth/me', { method: 'PATCH', body: JSON.stringify({ name: state.user.name, phone: state.user.phone }) });
    user.name = next.name; user.phone = next.phone;
  }
}

let syncQueue: Promise<void> = Promise.resolve();
export function syncApiDashboard(state: DashboardState, schoolId: string, index: RecordIndex, previous: { name: string; address: string; academicYear: string }, user: { id: string; name: string; email: string; phone: string }) {
  const result = syncQueue.then(() => performSyncApiDashboard(state, schoolId, index, previous, user));
  syncQueue = result.then(() => undefined, () => undefined);
  return result;
}
