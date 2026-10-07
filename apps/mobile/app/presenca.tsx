import { BRAND } from '@/config';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
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

type Mark = 'Presente' | 'Falta' | 'Justificada' | '';
type Marks = Record<string, { status: Mark; note: string }>;
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
};
export default function Attendance() {
  const { planId, classId: requestedClass } = useLocalSearchParams<{
    planId?: string;
    classId?: string;
  }>();
  const { snapshot, saveRecord, syncState } = useDashboard();
  const { user } = useAuth();
  const plans = snapshot?.data.plans || [];
  const plan = plans.find((row) => row.recordId === planId);
  const classes = snapshot?.data.classes || [];
  const [classId, setClassId] = useState(
    String(requestedClass || plan?.payload.classId || classes[0]?.recordId || ''),
  );
  const [day, setDay] = useState(localDate);
  const classRecord = classes.find((row) => row.recordId === classId);
  const students = useMemo(
    () => (snapshot?.data.students || []).filter((row) => row.payload.classId === classId),
    [classId, snapshot],
  );
  const savedEntry = snapshot?.data.attendance?.find(
    (row) =>
      row.recordId === `${classId}:${day}` ||
      row.recordId === `${planId || classId}-${day}` ||
      (row.payload.classId === classId && row.payload.date === day),
  );
  const initialMarks = (): Marks => {
    const payload = savedEntry?.payload;
    const raw =
      payload?.records && typeof payload.records === 'object'
        ? (payload.records as Record<string, { status?: string; note?: string }>)
        : null;
    if (raw)
      return Object.fromEntries(
        Object.entries(raw).map(([id, item]) => [
          id,
          { status: (item.status || '') as Mark, note: item.note || '' },
        ]),
      );
    const entries = Array.isArray(payload?.entries)
      ? (payload.entries as { studentId: string; present: boolean }[])
      : [];
    return Object.fromEntries(
      entries.map((item) => [
        item.studentId,
        { status: item.present ? 'Presente' : 'Falta', note: '' },
      ]),
    );
  };
  const [marks, setMarks] = useState<Marks>(initialMarks);
  useEffect(() => {
    setMarks(initialMarks());
  }, [classId, day, savedEntry?.recordId]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const count = (status: Mark) =>
    students.filter((row) => marks[row.recordId]?.status === status).length;
  const pending = students.filter((row) => !marks[row.recordId]?.status).length;
  const writeMark = (id: string, status: Mark) => {
    setNotice('');
    setMarks((current) => ({ ...current, [id]: { status, note: current[id]?.note || '' } }));
  };
  const markAll = (status: Mark) => {
    setNotice('');
    setMarks(Object.fromEntries(students.map((row) => [row.recordId, { status, note: '' }])));
  };
  const persist = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const records = Object.fromEntries(
        students.map((row) => [row.recordId, marks[row.recordId]]),
      );
      await saveRecord('attendance', `${classId}:${day}`, {
        id: `${classId}:${day}`,
        classId,
        date: day,
        teacherId: user?.id,
        confirmedAt: new Date().toISOString(),
        records,
        versions: savedEntry
          ? [
              {
                confirmedAt: savedEntry.payload.confirmedAt,
                records: savedEntry.payload.records || {},
              },
            ]
          : [],
      });
      setNotice(
        syncState === 'offline'
          ? 'Chamada guardada no dispositivo; será enviada quando houver internet.'
          : 'Chamada guardada e sincronizada com a escola.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar a chamada.');
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    if (!validDate(day) || !classId || !students.length || pending || busy) return;
    Alert.alert(
      'Confirmar chamada?',
      `${count('Presente')} presentes · ${count('Falta')} faltas · ${count('Justificada')} justificadas.`,
      [
        { text: 'Rever', style: 'cancel' },
        { text: 'Guardar', onPress: () => void persist() },
      ],
    );
  };
  return (
    <Page>
      <Heading
        title="Presenças"
        subtitle={
          plan
            ? String(plan.payload.title || plan.payload.subject || 'Aula')
            : 'Registe e reveja a chamada.'
        }
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
          onSelect={(id) => {
            setClassId(id);
            setMarks({});
            setNotice('');
          }}
        />
        <Field
          label="Data da chamada (AAAA-MM-DD)"
          value={day}
          onChangeText={(value) => {
            setDay(value);
            setMarks({});
            setNotice('');
          }}
          keyboardType="numbers-and-punctuation"
        />
        {!validDate(day) && (
          <Notice text="Introduza uma data válida no formato AAAA-MM-DD." type="error" />
        )}
        <Text style={styles.subtitle}>
          {String(classRecord?.payload.name || 'Escolha uma turma')} · {count('Presente')} presentes
          · {count('Falta')} faltas · {count('Justificada')} justificadas · {pending} por marcar
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Todos presentes" secondary onPress={() => markAll('Presente')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Limpar chamada" secondary onPress={() => markAll('')} />
          </View>
        </View>
      </Card>
      {students.length ? (
        students.map((student) => {
          const status = marks[student.recordId]?.status || '';
          return (
            <Card key={student.recordId}>
              <Text style={{ color: BRAND.ink, fontWeight: '800' }}>
                {String(student.payload.name || 'Aluno')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 7 }}>
                {(['Presente', 'Falta', 'Justificada'] as const).map((choice) => (
                  <View key={choice} style={{ flex: 1 }}>
                    <Button
                      title={choice}
                      secondary={status !== choice}
                      tone={
                        choice === 'Falta' ? 'red' : choice === 'Justificada' ? 'purple' : 'green'
                      }
                      onPress={() => writeMark(student.recordId, choice)}
                    />
                  </View>
                ))}
              </View>
              <Field
                label="Observação (opcional)"
                value={marks[student.recordId]?.note || ''}
                onChangeText={(note) =>
                  setMarks((current) => ({
                    ...current,
                    [student.recordId]: { status: current[student.recordId]?.status || '', note },
                  }))
                }
                placeholder="Adicionar observação"
              />
            </Card>
          );
        })
      ) : (
        <Empty
          title={syncState === 'loading' ? 'A carregar alunos…' : 'Sem alunos nesta turma'}
          text="Escolha uma turma sincronizada com a escola."
        />
      )}
      <Notice text={error} type="error" />
      <Notice text={notice} type="success" />
      <Button
        title="Confirmar chamada"
        onPress={save}
        loading={busy}
        disabled={!classId || !validDate(day) || !students.length || !!pending}
      />
    </Page>
  );
}
