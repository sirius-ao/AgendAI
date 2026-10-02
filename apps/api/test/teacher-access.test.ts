import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deriveTeacherScope, teacherCanReadRecord } from '../src/dashboard-data/teacher-access.js';

describe('teacher dashboard access', () => {
  const scope = deriveTeacherScope('teacher-a', [
    { recordId: 'class-assigned', payload: { subjectIds: ['math'], subjectTeacherIds: { math: 'teacher-a' } } },
    { recordId: 'class-unassigned', payload: { subjectIds: ['science'], subjectTeacherIds: {} } },
    { recordId: 'class-other-teacher', payload: { subjectIds: ['math'], subjectTeacherIds: { math: 'teacher-b' } } },
  ]);

  it('grants scope only from explicit school assignments', () => {
    assert.deepEqual([...scope.classIds], ['class-assigned']);
    assert.deepEqual([...scope.subjectIds], ['math']);
    assert.equal(scope.classIds.has('class-unassigned'), false);
  });

  it('limits student and attendance records to assigned classes', () => {
    const base = { userId: 'teacher-a', scope, recordId: 'student-1' };
    assert.equal(teacherCanReadRecord({ ...base, collection: 'STUDENTS', value: { classId: 'class-assigned' } }), true);
    assert.equal(teacherCanReadRecord({ ...base, collection: 'STUDENTS', value: { classId: 'class-unassigned' } }), false);
    assert.equal(teacherCanReadRecord({ ...base, collection: 'ATTENDANCE', value: { classId: 'class-other-teacher' } }), false);
  });

  it('allows shared subject plans but keeps private plans with their author', () => {
    const base = { userId: 'teacher-a', scope, recordId: 'plan-1', collection: 'PLANS' };
    assert.equal(teacherCanReadRecord({ ...base, value: { subjectId: 'math', classId: 'class-assigned', visibility: 'Equipa pedagógica' } }), true);
    assert.equal(teacherCanReadRecord({ ...base, value: { subjectId: 'math', classId: 'class-assigned', visibility: 'Apenas eu', teacherId: 'teacher-b' }, createdById: 'teacher-b' }), false);
    assert.equal(teacherCanReadRecord({ ...base, value: { subjectId: 'science', classId: 'class-unassigned', visibility: 'Equipa pedagógica' } }), false);
  });
});
