type ClassRecord = { recordId: string; payload: unknown };
export type TeacherScope = { subjectIds: Set<string>; classIds: Set<string> };
type Payload = Record<string, unknown>;

const payloadOf = (value: unknown): Payload =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Payload) : {};
const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Builds access only from school controlled class-to-teacher assignments. */
export function deriveTeacherScope(userId: string, rows: ClassRecord[]): TeacherScope {
  const classIds = new Set<string>();
  const subjectIds = new Set<string>();
  for (const row of rows) {
    const payload = payloadOf(row.payload);
    const assignments = payloadOf(payload.subjectTeacherIds);
    const subjects = ids(payload.subjectIds);
    for (const subjectId of subjects) {
      if (assignments[subjectId] === userId) {
        classIds.add(row.recordId);
        subjectIds.add(subjectId);
      }
    }
  }
  return { classIds, subjectIds };
}

export function teacherCanReadRecord(input: {
  collection: string;
  recordId: string;
  value: unknown;
  userId: string;
  scope: TeacherScope;
  createdById?: string;
}) {
  const { collection, recordId, value, userId, scope, createdById } = input;
  const item = payloadOf(value);
  const ownsPayload = [
    item.teacherId,
    item.ownerId,
    item.createdById,
    item.authorId,
    item.userId,
    item.assigneeId,
  ].includes(userId);
  const authored = createdById === userId || ownsPayload;
  const subjectId = typeof item.subjectId === 'string' ? item.subjectId : '';
  const classId = typeof item.classId === 'string' ? item.classId : '';
  const classAllowed = !!classId && scope.classIds.has(classId);
  const subjectAllowed =
    !!subjectId && scope.subjectIds.has(subjectId) && (!classId || classAllowed);
  const ownedAndInScope =
    ownsPayload && (!classId || classAllowed) && (!subjectId || scope.subjectIds.has(subjectId));
  switch (collection) {
    case 'SUBJECTS':
      return scope.subjectIds.has(recordId);
    case 'CLASSES':
      return scope.classIds.has(recordId);
    case 'STUDENTS':
    case 'ATTENDANCE':
      return classAllowed;
    case 'PLANS':
      return ownedAndInScope || (subjectAllowed && item.visibility !== 'Apenas eu');
    case 'ASSESSMENTS':
    case 'EVENTS':
      return (
        ownedAndInScope || ((classAllowed || subjectAllowed) && item.visibility !== 'Apenas eu')
      );
    case 'RESOURCES':
      return authored || subjectAllowed;
    case 'LIBRARY':
    case 'FOLDERS':
    case 'ONBOARDING':
      return authored;
    case 'CONVERSATIONS':
      if (item.direct === true) return ids(item.participantIds).includes(userId);
      return authored || classAllowed;
    case 'TASKS':
      return authored || classAllowed;
    case 'DIARY':
      return authored && classAllowed;
    case 'ANNOUNCEMENTS':
      return true;
    case 'REPORTS':
      return ownedAndInScope || classAllowed || subjectAllowed;
    case 'SETTINGS':
      return false;
    default:
      return authored;
  }
}
