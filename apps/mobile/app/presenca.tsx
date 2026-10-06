import { BRAND } from '@/config';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Empty, Field, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Attendance() {
  const { planId, classId: initialClass } = useLocalSearchParams<{
    planId?: string;
    classId?: string;
  }>();
  const { snapshot, saveRecord } = useDashboard();
  const plans = snapshot?.data.plans || [];
  const plan = plans.find((p) => p.recordId === planId);
  const classId = String(initialClass || plan?.payload.classId || '');
  const students = useMemo(
    () => (snapshot?.data.students || []).filter((s) => !classId || s.payload.classId === classId),
    [classId, snapshot],
  );
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const classRecord = snapshot?.data.classes.find((c) => c.recordId === classId);
  const now = new Date();
  const [day, setDay] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  );
  const savedEntry = snapshot?.data.attendance?.find(
    (row) => row.recordId === `${planId || classId}-${day}`,
  );
  const attendance = savedEntry?.payload.entries;
  const statuses: Record<string, boolean> = Object.keys(present).length
    ? present
    : Array.isArray(attendance)
      ? Object.fromEntries(
          attendance.map((entry) => [String(entry.studentId), Boolean(entry.present)]),
        )
      : {};
  const presentCount = students.filter((s) => statuses[s.recordId] === true).length;
  const absentCount = students.filter((s) => statuses[s.recordId] === false).length;
  const complete =
    students.length > 0 && students.every((s) => typeof statuses[s.recordId] === 'boolean');
  const toggle = (studentId: string) =>
    setPresent((state) => ({ ...statuses, ...state, [studentId]: statuses[studentId] !== true }));
  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !complete || busy) return;
    Alert.alert('Guardar presenças?', `${presentCount} presentes e ${absentCount} ausentes.`, [
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
      await saveRecord('attendance', `${planId || classId}-${day}`, {
        id: `${planId || classId}-${day}`,
        planId,
        classId,
        date: day,
        entries: students.map((s) => ({
          studentId: s.recordId,
          present: statuses[s.recordId],
        })),
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading
        title="Marcar presença"
        subtitle={`${String(plan?.payload.subject || plan?.payload.title || 'Aula')} · ${String(classRecord?.payload.name || '')}`}
        back
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
            {presentCount} Presentes
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: BRAND.red, fontWeight: '800' }}>{absentCount} Ausentes</Text>
        </Card>
      </View>
      <Card>
        <Field
          label="Data (AAAA-MM-DD)"
          value={day}
          onChangeText={(value) => {
            setDay(value);
            setPresent({});
            setSaved(false);
          }}
          keyboardType="numbers-and-punctuation"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Todos presentes"
            onPress={() => setPresent(Object.fromEntries(students.map((s) => [s.recordId, true])))}
            secondary
          />
          <Button
            title="Todos ausentes"
            onPress={() => setPresent(Object.fromEntries(students.map((s) => [s.recordId, false])))}
            secondary
          />
        </View>
      </Card>
      {students.length ? (
        students.map((s) => {
          const isPresent = statuses[s.recordId] === true;
          return (
            <Card key={s.recordId} onPress={() => toggle(s.recordId)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: BRAND.ink, fontWeight: '700', flex: 1 }}>
                  {String(s.payload.name || 'Aluno')}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color:
                      typeof statuses[s.recordId] !== 'boolean'
                        ? BRAND.muted
                        : isPresent
                          ? BRAND.green
                          : BRAND.red,
                  }}
                >
                  {typeof statuses[s.recordId] !== 'boolean'
                    ? 'Marcar'
                    : isPresent
                      ? '✓ Presente'
                      : '○ Ausente'}
                </Text>
              </View>
            </Card>
          );
        })
      ) : (
        <Empty
          title="Sem alunos nesta turma"
          text="Verifique a turma selecionada e sincronize os dados."
        />
      )}
      <Text style={styles.subtitle}>{error}</Text>
      <Button
        title="Guardar presenças"
        onPress={() => void save()}
        loading={busy}
        disabled={!complete || !/^\d{4}-\d{2}-\d{2}$/.test(day)}
      />
      <Text style={styles.subtitle}>
        {saved
          ? 'Presença guardada neste dispositivo e enviada quando houver ligação.'
          : complete
            ? 'Toque num aluno para corrigir o estado. Funciona offline.'
            : 'Marque cada aluno como presente ou ausente antes de guardar.'}
      </Text>
    </Page>
  );
}
