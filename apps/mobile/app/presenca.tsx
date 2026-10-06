import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Heading, Page, styles } from '@/components/ui';
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
  const classRecord = snapshot?.data.classes.find((c) => c.recordId === classId);
  const day = new Date().toISOString().slice(0, 10);
  const toggle = (studentId: string) =>
    setPresent((state) => ({ ...state, [studentId]: !(state[studentId] ?? true) }));
  const save = async () => {
    await saveRecord('attendance', `${planId || classId}-${day}`, {
      id: `${planId || classId}-${day}`,
      planId,
      classId,
      date: day,
      entries: students.map((s) => ({
        studentId: s.recordId,
        present: present[s.recordId] ?? true,
      })),
    });
    setSaved(true);
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
          <Text style={{ color: '#0b5239', fontWeight: '800' }}>
            {students.length - Object.values(present).filter((v) => v === false).length} Presentes
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: '#d83b4b', fontWeight: '800' }}>
            {Object.values(present).filter((v) => v === false).length} Ausentes
          </Text>
        </Card>
      </View>
      {students.length ? (
        students.map((s) => {
          const isPresent = present[s.recordId] ?? true;
          return (
            <Card key={s.recordId} onPress={() => toggle(s.recordId)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: '#11251d', fontWeight: '700', flex: 1 }}>
                  {String(s.payload.name || 'Aluno')}
                </Text>
                <Text style={{ fontSize: 18, color: isPresent ? '#07964e' : '#d83b4b' }}>
                  {isPresent ? '✓ Presente' : '○ Ausente'}
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
      <Button title="Guardar presenças" onPress={() => void save()} />
      <Text style={styles.subtitle}>
        {saved
          ? 'Presença guardada neste dispositivo e enviada quando houver ligação.'
          : 'Toque num aluno para alterar o estado. Funciona offline.'}
      </Text>
    </Page>
  );
}
