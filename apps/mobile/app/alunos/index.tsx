import { BRAND } from '@/config';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Empty, Field, Heading, Page, styles } from '@/components/ui';
import { SchoolDataStatus } from '@/components/school-data-status';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Students() {
  const { snapshot, syncState, schoolId } = useDashboard();
  const { user } = useAuth();
  const canManageStudents =
    user?.schools.find((school) => school.id === schoolId)?.role !== 'TEACHER';
  const [query, setQuery] = useState('');
  const students = (snapshot?.data.students || []).filter((s) =>
    String(s.payload.name || '')
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Page>
      <Heading title="Alunos" back />
      <SchoolDataStatus />
      <Field
        label="Pesquisar aluno"
        value={query}
        onChangeText={setQuery}
        placeholder="Nome do aluno"
      />
      {students.length ? (
        students.map((s) => (
          <Card
            key={s.recordId}
            onPress={() => router.push({ pathname: '/alunos/[id]', params: { id: s.recordId } })}
          >
            <Text style={{ color: BRAND.ink, fontWeight: '800' }}>
              {String(s.payload.name || 'Aluno')}
            </Text>
            <Text style={styles.subtitle}>
              {String(
                s.payload.className ||
                  snapshot?.data.classes.find(
                    (schoolClass) => schoolClass.recordId === s.payload.classId,
                  )?.payload.name ||
                  '',
              )}
            </Text>
          </Card>
        ))
      ) : (
        <Empty
          title={syncState === 'loading' ? 'A carregar alunos…' : 'Nenhum aluno encontrado'}
          text="Tente outra pesquisa ou sincronize os dados."
        />
      )}
      {canManageStudents && (
        <Button title="Adicionar aluno" onPress={() => router.push('/alunos/novo')} />
      )}
    </Page>
  );
}
