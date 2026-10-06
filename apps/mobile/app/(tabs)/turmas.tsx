import { router } from 'expo-router';
import { Text } from 'react-native';
import { Card, Empty, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Classes() {
  const { snapshot } = useDashboard();
  const rows = snapshot?.data.classes || [];
  return (
    <Page>
      <Text style={styles.subtitle}>Turmas e alunos associados.</Text>
      {rows.length ? (
        rows.map((row) => (
          <Card
            key={row.recordId}
            onPress={() => router.push({ pathname: '/turma/[id]', params: { id: row.recordId } })}
          >
            <Text style={{ color: '#11251d', fontSize: 17, fontWeight: '800' }}>
              {String(row.payload.name || row.payload.title || 'Turma')}
            </Text>
            <Text style={styles.subtitle}>
              {String(row.payload.year || row.payload.grade || '')} ·{' '}
              {Number(row.payload.studentCount || row.payload.students || 0)} alunos
            </Text>
          </Card>
        ))
      ) : (
        <Empty
          title="Sem turmas disponíveis"
          text="Quando a escola carregar as turmas, poderá consultar os alunos aqui."
        />
      )}
    </Page>
  );
}
