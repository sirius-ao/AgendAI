import { useLocalSearchParams, router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function StudentProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useDashboard();
  const student = snapshot?.data.students.find((s) => s.recordId === id);
  const p = student?.payload;
  const records =
    snapshot?.data.assessments.flatMap((r) =>
      Array.isArray(r.payload.scores)
        ? r.payload.scores
            .filter((s: any) => s.studentId === id)
            .map((s: any) => ({ title: r.payload.title, score: s.score }))
        : [],
    ) || [];
  return (
    <Page>
      <Heading
        title={String(p?.name || 'Aluno')}
        subtitle={String(p?.className || p?.classId || '')}
        back
      />
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#11251d' }}>
          {String(p?.name || 'Aluno')}
        </Text>
        <Text style={styles.subtitle}>Contacto · {String(p?.contact || 'Não informado')}</Text>
        <Text style={styles.subtitle}>
          Presenças e média estarão disponíveis conforme os dados sincronizados da escola.
        </Text>
      </Card>
      <Text style={{ fontSize: 17, color: '#11251d', fontWeight: '800' }}>Avaliações</Text>
      {records.length ? (
        records.map((r, i) => (
          <Card key={i}>
            <Text style={{ fontWeight: '700' }}>{String(r.title || 'Avaliação')}</Text>
            <Text style={styles.subtitle}>Nota: {String(r.score)}</Text>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.subtitle}>Ainda não há notas para este aluno.</Text>
        </Card>
      )}
      <Button title="Lançar avaliação" onPress={() => router.push('/avaliacoes')} />
    </Page>
  );
}
