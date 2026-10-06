import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Empty, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useDashboard();
  const group = snapshot?.data.classes.find((c) => c.recordId === id);
  const students = (snapshot?.data.students || []).filter((s) => s.payload.classId === id);
  return (
    <Page>
      <Heading
        title={String(group?.payload.name || 'Turma')}
        subtitle={`${students.length} alunos`}
        back
      />
      <Card>
        <Text style={styles.subtitle}>
          {String(group?.payload.year || group?.payload.grade || '')}
        </Text>
        <Text style={{ color: '#11251d', fontWeight: '700' }}>
          Presenças: acompanhe as aulas e os registos desta turma.
        </Text>
      </Card>
      <Button
        title="Marcar presença"
        onPress={() => router.push({ pathname: '/presenca', params: { classId: id } })}
      />
      <Button
        title="Lançar avaliação"
        secondary
        onPress={() => router.push({ pathname: '/avaliacoes', params: { classId: id } })}
      />
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#11251d' }}>Alunos</Text>
      {students.length ? (
        students.map((s) => (
          <Card
            key={s.recordId}
            onPress={() => router.push({ pathname: '/alunos/[id]', params: { id: s.recordId } })}
          >
            <Text style={{ color: '#11251d', fontWeight: '700' }}>
              {String(s.payload.name || 'Aluno')}
            </Text>
          </Card>
        ))
      ) : (
        <Empty
          title="Sem alunos registados"
          text="Não há alunos associados a esta turma no dispositivo."
        />
      )}
    </Page>
  );
}
