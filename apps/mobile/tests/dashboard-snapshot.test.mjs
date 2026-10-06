import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDashboardSnapshot } from '../src/data/dashboard-snapshot.ts';

const school = {
  id: 'school-1',
  name: 'Escola',
  address: '',
  academicYear: '2026',
  timezone: 'Africa/Luanda',
};
test('empty legacy lists do not erase classes and students registered on the website', () => {
  const snapshot = normalizeDashboardSnapshot({
    school,
    classes: [],
    students: [],
    data: {
      classes: [{ id: 'class-1', payload: { id: 'class-1', name: '10.ª A' } }],
      students: [{ id: 'student-1', payload: { name: 'Ana', classId: 'class-1' } }],
      subjects: [{ recordId: 'subject-1', payload: { name: 'Matemática' } }],
    },
  });
  assert.equal(snapshot.data.classes[0].recordId, 'class-1');
  assert.equal(snapshot.data.students[0].payload.classId, 'class-1');
  assert.equal(snapshot.data.subjects[0].recordId, 'subject-1');
});
test('dashboard values take precedence without discarding distinct relational records', () => {
  const snapshot = normalizeDashboardSnapshot({
    school,
    classes: [
      { id: 'class-1', name: 'Old name' },
      { id: 'class-2', name: 'Outra turma' },
    ],
    students: [{ id: 'student-2', name: 'João', classId: 'class-2' }],
    data: {
      classes: [
        { recordId: 'class-1', payload: { name: 'Nome atualizado', teacherIds: ['teacher-1'] } },
      ],
    },
  });
  assert.equal(snapshot.data.classes.length, 2);
  assert.equal(
    snapshot.data.classes.find((row) => row.recordId === 'class-1').payload.name,
    'Nome atualizado',
  );
  assert.equal(snapshot.data.students[0].recordId, 'student-2');
});
test('missing collections are usable empty lists', () => {
  const snapshot = normalizeDashboardSnapshot({ school, data: {} });
  assert.deepEqual(snapshot.data.classes, []);
  assert.deepEqual(snapshot.data.students, []);
});
