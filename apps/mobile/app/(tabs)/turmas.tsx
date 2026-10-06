import { BRAND } from '@/config';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card, Empty, Page, styles } from '@/components/ui';
import { SchoolDataStatus } from '@/components/school-data-status';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Classes() {
  const { snapshot, syncState } = useDashboard();
  const rows = snapshot?.data.classes || [];
  return (
    <Page>
      <SchoolDataStatus />
      <Text style={styles.subtitle}>Turmas e alunos associados.</Text>
      {rows.length ? (
        rows.map((row) => (
          <Card
            key={row.recordId}
            onPress={() => router.push({ pathname: '/turma/[id]', params: { id: row.recordId } })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: BRAND.green, borderRadius: 12, padding: 10 }}>
                <Ionicons name="book-outline" size={24} color={BRAND.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: BRAND.ink, fontSize: 17, fontWeight: '800' }}>
                  {String(row.payload.name || row.payload.title || 'Turma')}
                </Text>
                <Text style={styles.subtitle}>
                  {String(row.payload.year || row.payload.grade || '')} ·{' '}
                  {
                    (snapshot?.data.students || []).filter(
                      (student) => student.payload.classId === row.recordId,
                    ).length
                  }{' '}
                  alunos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={BRAND.muted} />
            </View>
          </Card>
        ))
      ) : (
        <Empty
          title={syncState === 'loading' ? 'A carregar turmas…' : 'Sem turmas disponíveis'}
          text="Quando a escola carregar as turmas, poderá consultar os alunos aqui."
        />
      )}
    </Page>
  );
}
