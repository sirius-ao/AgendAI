import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  Button,
  Card,
  ChoiceField,
  Empty,
  Field,
  Heading,
  Notice,
  Page,
  styles,
} from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { SchoolDataStatus } from '@/components/school-data-status';
import { useDashboard } from '@/providers/dashboard-provider';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const newId = () => `mobile-assessment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const scoresFor = (record: Record<string, unknown>, students: { recordId: string }[]) =>
  students.map((student) => {
    const grades =
      record.grades && typeof record.grades === 'object'
        ? (record.grades as Record<string, unknown>)
        : {};
    const legacy = Array.isArray(record.scores)
      ? (record.scores as { studentId: string; score: number }[]).find(
          (item) => item.studentId === student.recordId,
        )?.score
      : undefined;
    const score = grades[student.recordId] ?? legacy;
    return typeof score === 'number' && Number.isFinite(score) ? score : null;
  });
export default function Assessments() {
  const {
    classId: selectedClass,
    planId,
    subjectId: selectedSubject,
    studentId,
  } = useLocalSearchParams<{
    classId?: string;
    planId?: string;
    subjectId?: string;
    studentId?: string;
  }>();
  const { snapshot, saveRecord, syncState } = useDashboard();
  const { user } = useAuth();
  const classes = snapshot?.data.classes || [];
  const plans = snapshot?.data.plans || [];
  const plan = plans.find((row) => row.recordId === planId);
  const [classId, setClassId] = useState(
    String(selectedClass || plan?.payload.classId || classes[0]?.recordId || ''),
  );
  const subjects = snapshot?.data.subjects || [];
  const group = classes.find((row) => row.recordId === classId);
  const subjectOptions = useMemo(() => {
    const allowed = Array.isArray(group?.payload.subjectIds)
      ? group.payload.subjectIds.filter((id): id is string => typeof id === 'string')
      : [];
    return subjects.filter((row) => !allowed.length || allowed.includes(row.recordId));
  }, [subjects, group]);
  const [subject, setSubject] = useState(
    String(selectedSubject || plan?.payload.subjectId || subjectOptions[0]?.recordId || ''),
  );
  const students = (snapshot?.data.students || []).filter((row) => row.payload.classId === classId);
  const [title, setTitle] = useState(String(plan?.payload.title || 'Avaliação'));
  const [scores, setScores] = useState<Record<string, string>>({});
  const [assessmentId, setAssessmentId] = useState(newId);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const history = (snapshot?.data.assessments || [])
    .filter((row) => row.payload.classId === classId)
    .sort((a, b) => String(b.payload.date || '').localeCompare(String(a.payload.date || '')));
  useEffect(() => {
    if (!classes.some((row) => row.recordId === classId) && classes.length)
      setClassId(classes[0].recordId);
  }, [classes, classId]);
  useEffect(() => {
    if (!subjectOptions.some((row) => row.recordId === subject) && subjectOptions.length)
      setSubject(subjectOptions[0].recordId);
  }, [subjectOptions, subject]);
  const mean = (values: (number | null)[]) => {
    const valid = values.filter((n): n is number => n !== null);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };
  const save = () => {
    if (!classId || !subject || !students.length) {
      setError('Escolha uma turma com alunos e uma disciplina.');
      return;
    }
    const invalid = students.find((student) => {
      const raw = scores[student.recordId]?.trim().replace(',', '.');
      return !raw || !Number.isFinite(Number(raw)) || Number(raw) < 0 || Number(raw) > 20;
    });
    if (invalid) {
      setError('Introduza uma nota entre 0 e 20 para cada aluno.');
      return;
    }
    Alert.alert('Guardar avaliação?', `Será registada para ${students.length} alunos.`, [
      { text: 'Rever', style: 'cancel' },
      { text: 'Guardar', onPress: () => void persist() },
    ]);
  };
  const persist = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const grades = Object.fromEntries(
        students.map((student) => [
          student.recordId,
          Number(scores[student.recordId].trim().replace(',', '.')),
        ]),
      );
      await saveRecord('assessments', assessmentId, {
        id: assessmentId,
        teacherId: user?.id,
        title: title.trim() || 'Avaliação',
        classId,
        subjectId: subject,
        type: 'Prova/Teste',
        date: localDate(),
        duration: 45,
        weight: 1,
        description: '',
        criteria: '',
        visibility: 'Escola',
        published: true,
        reminder: false,
        tags: '',
        attachments: [],
        grades,
        gradeDetails: Object.fromEntries(
          Object.entries(grades).map(([id, value]) => [
            id,
            { status: 'Avaliado', value: String(value), feedback: '', difficulties: [] },
          ]),
        ),
        gradesConfirmedAt: new Date().toISOString(),
      });
      setNotice(
        syncState === 'offline'
          ? 'Avaliação guardada no dispositivo; será enviada quando houver internet.'
          : 'Avaliação guardada e sincronizada com a escola.',
      );
      setScores({});
      setTitle('Avaliação');
      setAssessmentId(newId());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading
        title="Avaliações e notas"
        subtitle="Lance notas e acompanhe os resultados da turma."
        back
      />
      <SchoolDataStatus />
      <Card>
        <ChoiceField
          label="Turma"
          value={classId}
          options={classes.map((row) => ({
            id: row.recordId,
            label: String(row.payload.name || 'Turma'),
          }))}
          onSelect={(value) => {
            setClassId(value);
            setScores({});
            setError('');
            setNotice('');
          }}
        />
        <ChoiceField
          label="Disciplina"
          value={subject}
          options={subjectOptions.map((row) => ({
            id: row.recordId,
            label: String(row.payload.name || 'Disciplina'),
          }))}
          onSelect={setSubject}
        />
        <Field
          label="Nome da avaliação"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Teste 1 — Equações"
        />
      </Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <AppText style={styles.subtitle}>Alunos</AppText>
          <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 20 }}>
            {students.length}
          </AppText>
        </Card>
        <Card style={{ flex: 1 }}>
          <AppText style={styles.subtitle}>Avaliações</AppText>
          <AppText style={{ color: BRAND.purpleInk, fontWeight: '800', fontSize: 20 }}>
            {history.length}
          </AppText>
        </Card>
      </View>
      <AppText style={{ fontSize: 17, color: BRAND.ink, fontWeight: '800' }}>
        Lançar notas · 0 a 20
      </AppText>
      {students.length ? (
        students.map((student) => (
          <Card key={student.recordId}>
            <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>
              {String(student.payload.name || 'Aluno')}
            </AppText>
            <Field
              label="Nota"
              value={scores[student.recordId] || ''}
              onChangeText={(value) =>
                setScores((old) => ({ ...old, [student.recordId]: value.replace(',', '.') }))
              }
              keyboardType="decimal-pad"
              placeholder="0–20"
            />
          </Card>
        ))
      ) : (
        <Empty
          title={syncState === 'loading' ? 'A carregar alunos…' : 'Sem alunos nesta turma'}
          text="Escolha uma turma com alunos sincronizados."
        />
      )}
      <Notice text={error} type="error" />
      <Notice text={notice} type="success" />
      <Button
        title="Guardar avaliação"
        tone="purple"
        onPress={save}
        loading={busy}
        disabled={!students.length}
      />
      <AppText style={{ fontSize: 17, color: BRAND.ink, fontWeight: '800' }}>
        Histórico de avaliações
      </AppText>
      {history.length ? (
        history.map((row) => {
          const values = scoresFor(row.payload, students);
          const average = mean(values);
          return (
            <Card key={row.recordId}>
              <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>
                {String(row.payload.title || 'Avaliação')}
              </AppText>
              <AppText style={styles.subtitle}>
                {String(row.payload.date || '')} · {String(row.payload.type || 'Avaliação')}
              </AppText>
              <AppText style={{ color: BRAND.purpleInk, fontWeight: '700' }}>
                {values.filter((value) => value !== null).length}/{students.length} notas · Média{' '}
                {average === null ? '—' : average.toFixed(1)}
              </AppText>
              {students
                .filter((_, index) => values[index] !== null)
                .map((student, index) => (
                  <AppText key={student.recordId} style={styles.subtitle}>
                    {String(student.payload.name || 'Aluno')}: {values[index]}/20
                  </AppText>
                ))}
            </Card>
          );
        })
      ) : (
        <Empty
          title="Sem avaliações lançadas"
          text="As notas e os resultados da turma ficarão disponíveis aqui."
        />
      )}
      {studentId && (
        <Button
          title="Ver perfil do aluno"
          secondary
          onPress={() => router.push({ pathname: '/alunos/[id]', params: { id: studentId } })}
        />
      )}
    </Page>
  );
}
