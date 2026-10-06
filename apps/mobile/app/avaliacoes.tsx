import { BRAND } from '@/config';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text } from 'react-native';
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
import { useDashboard } from '@/providers/dashboard-provider';

export default function Assessments() {
  const { classId: selectedClass } = useLocalSearchParams<{ classId?: string }>();
  const { snapshot, saveRecord } = useDashboard();
  const [classId, setClassId] = useState(
    String(selectedClass || snapshot?.data.classes[0]?.recordId || ''),
  );
  const students = (snapshot?.data.students || []).filter(
    (s) => !classId || s.payload.classId === classId,
  );
  const [title, setTitle] = useState('Avaliação');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useMemo(
    () => `mobile-assessment-${classId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [classId],
  );
  const save = async () => {
    if (!classId || !students.length) {
      setError('Selecione uma turma com alunos.');
      return;
    }
    const invalid = students.find((student) => {
      const value = scores[student.recordId]?.trim().replace(',', '.');
      const score = Number(value);
      return !value || !Number.isFinite(score) || score < 0 || score > 20;
    });
    if (invalid) {
      setError('Preencha uma nota válida entre 0 e 20 para cada aluno.');
      return;
    }
    Alert.alert('Guardar avaliação?', `Será registada para ${students.length} alunos.`, [
      { text: 'Rever', style: 'cancel' },
      {
        text: 'Guardar',
        onPress: () => {
          void persist();
        },
      },
    ]);
  };
  const persist = async () => {
    setBusy(true);
    setError('');
    try {
      await saveRecord('assessments', id, {
        id,
        title: title.trim() || 'Avaliação',
        classId,
        date: localDate(),
        scores: students.map((student) => ({
          studentId: student.recordId,
          score: Number(scores[student.recordId].trim().replace(',', '.')),
        })),
      });
      setNotice(
        'Avaliação guardada neste dispositivo e ficará sincronizada quando houver internet.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading title="Lançar avaliação" subtitle="Registe notas por aluno." back />
      <Card>
        <Field label="Nome da avaliação" value={title} onChangeText={setTitle} />
        <ChoiceField
          label="Turma"
          value={classId}
          options={(snapshot?.data.classes || []).map((item) => ({
            id: item.recordId,
            label: String(item.payload.name || 'Turma'),
          }))}
          onSelect={(value) => {
            setClassId(value);
            setScores({});
            setError('');
            setNotice('');
          }}
        />
      </Card>
      {students.length ? (
        students.map((s) => (
          <Card key={s.recordId}>
            <Text style={{ color: BRAND.ink, fontWeight: '700' }}>
              {String(s.payload.name || 'Aluno')}
            </Text>
            <Field
              label="Nota"
              value={scores[s.recordId] || ''}
              onChangeText={(value) =>
                setScores((old) => ({ ...old, [s.recordId]: value.replace(',', '.') }))
              }
              keyboardType="decimal-pad"
              placeholder="0–20"
            />
          </Card>
        ))
      ) : (
        <Empty title="Sem alunos nesta turma" text="Os alunos disponíveis aparecerão aqui." />
      )}
      <Notice text={error} type="error" />
      <Notice text={notice} type="success" />
      <Button title="Guardar avaliação" onPress={() => void save()} loading={busy} />
      <Text style={styles.subtitle}>
        Os dados são guardados localmente e sincronizados ao recuperar a ligação.
      </Text>
    </Page>
  );
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
