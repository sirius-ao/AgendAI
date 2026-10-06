import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Empty, Field, Heading, Notice, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Assessments() {
  const { classId: selectedClass } = useLocalSearchParams<{ classId?: string }>();
  const { snapshot, saveRecord } = useDashboard();
  const classId = String(selectedClass || snapshot?.data.classes[0]?.recordId || '');
  const students = (snapshot?.data.students || []).filter(
    (s) => !classId || s.payload.classId === classId,
  );
  const [title, setTitle] = useState('Avaliação');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const id = `mobile-assessment-${classId}-${Date.now()}`;
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await saveRecord('assessments', id, {
        id,
        title: title.trim() || 'Avaliação',
        classId,
        date: new Date().toISOString().slice(0, 10),
        scores: Object.entries(scores).map(([studentId, score]) => ({
          studentId,
          score: Number(score),
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
      </Card>
      {students.length ? (
        students.map((s) => (
          <Card key={s.recordId}>
            <Text style={{ color: '#11251d', fontWeight: '700' }}>
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
