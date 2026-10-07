import { BRAND } from '@/config';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Empty, Field, Page, styles } from '@/components/ui';
import { SchoolDataStatus } from '@/components/school-data-status';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Classes() {
  const { snapshot, syncState } = useDashboard();
  const rows = snapshot?.data.classes || [];
  const students = snapshot?.data.students || [];
  const [query, setQuery] = useState('');
  const normalize = (value: unknown) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt');
  const filteredRows = useMemo(
    () =>
      rows
        .filter((row) =>
          normalize(
            [
              row.payload.name,
              row.payload.year,
              row.payload.grade,
              row.payload.room,
              row.payload.shift,
            ]
              .filter(Boolean)
              .join(' '),
          ).includes(normalize(query)),
        )
        .sort((a, b) =>
          String(a.payload.name || a.payload.title || '').localeCompare(
            String(b.payload.name || b.payload.title || ''),
            'pt',
          ),
        ),
    [query, rows],
  );
  const activeStudents = students.filter(
    (student) => normalize(student.payload.status || 'Ativo') === 'ativo',
  ).length;
  return (
    <Page>
      <SchoolDataStatus />
      <Text style={{ color: BRAND.ink, fontSize: 20, fontWeight: '800' }}>As minhas turmas</Text>
      <Text style={styles.subtitle}>
        {rows.length} turmas · {activeStudents} alunos ativos
      </Text>
      <Field
        label="Pesquisar turma"
        value={query}
        onChangeText={setQuery}
        placeholder="Nome, ano, sala ou turno"
      />
      <Text style={{ color: BRAND.muted, fontSize: 13, fontWeight: '700' }}>
        {filteredRows.length}{' '}
        {filteredRows.length === 1 ? 'turma encontrada' : 'turmas encontradas'}
      </Text>
      {filteredRows.length ? (
        filteredRows.map((row) => {
          const classStudents = students.filter(
            (student) => student.payload.classId === row.recordId,
          );
          const activeCount = classStudents.filter(
            (student) => normalize(student.payload.status || 'Ativo') === 'ativo',
          ).length;
          const details = [
            row.payload.year || row.payload.grade,
            row.payload.shift,
            row.payload.room ? `Sala ${String(row.payload.room)}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          return (
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
                  <Text style={styles.subtitle}>{details || 'Detalhes da turma'}</Text>
                  <Text style={{ color: BRAND.forestSoft, fontSize: 12, fontWeight: '700' }}>
                    {activeCount} ativos · {classStudents.length} no total
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={BRAND.muted} />
              </View>
            </Card>
          );
        })
      ) : (
        <Empty
          title={syncState === 'loading' ? 'A carregar turmas…' : 'Sem turmas disponíveis'}
          text={
            query
              ? 'Não encontrámos turmas com essa pesquisa.'
              : 'Quando a escola carregar as turmas, poderá consultar os alunos aqui.'
          }
        />
      )}
    </Page>
  );
}
