import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Empty, Field, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Students() {
  const { snapshot } = useDashboard();
  const [query, setQuery] = useState('');
  const students = (snapshot?.data.students || []).filter((s) =>
    String(s.payload.name || '')
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Page>
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
            <Text style={{ color: '#11251d', fontWeight: '800' }}>
              {String(s.payload.name || 'Aluno')}
            </Text>
            <Text style={styles.subtitle}>
              {String(s.payload.className || s.payload.classId || '')}
            </Text>
          </Card>
        ))
      ) : (
        <Empty
          title="Nenhum aluno encontrado"
          text="Tente outra pesquisa ou sincronize os dados."
        />
      )}
      <Button title="Adicionar aluno" onPress={() => router.push('/alunos/novo')} />
    </Page>
  );
}
