import { BRAND } from '@/config';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button, Card, ChoiceField, Empty, Field, Heading, Page, styles } from '@/components/ui';
import { SchoolDataStatus } from '@/components/school-data-status';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Students() {
  const { snapshot, syncState, schoolId } = useDashboard();
  const { user } = useAuth();
  const canManageStudents =
    user?.schools.find((school) => school.id === schoolId)?.role !== 'TEACHER';
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState('all');
  const [status, setStatus] = useState('all');
  const allStudents = snapshot?.data.students || [];
  const classes = snapshot?.data.classes || [];
  const normalize = (value: unknown) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt')
      .trim();
  const students = useMemo(
    () =>
      allStudents
        .filter((student) => {
          const group = classes.find((item) => item.recordId === student.payload.classId);
          const haystack = normalize(
            [student.payload.name, student.payload.contact, student.recordId, group?.payload.name]
              .filter(Boolean)
              .join(' '),
          );
          const matchesQuery = haystack.includes(normalize(query));
          const matchesClass = classId === 'all' || student.payload.classId === classId;
          const active = normalize(student.payload.status || 'Ativo') === 'ativo';
          const matchesStatus = status === 'all' || (status === 'active' ? active : !active);
          return matchesQuery && matchesClass && matchesStatus;
        })
        .sort((a, b) =>
          String(a.payload.name || '').localeCompare(String(b.payload.name || ''), 'pt'),
        ),
    [allStudents, classes, classId, query, status],
  );
  const activeCount = allStudents.filter(
    (student) => normalize(student.payload.status || 'Ativo') === 'ativo',
  ).length;
  return (
    <Page>
      <Heading
        title="Alunos"
        subtitle={`${allStudents.length} alunos · ${activeCount} ativos`}
        back
      />
      <SchoolDataStatus />
      <Field
        label="Pesquisar aluno"
        value={query}
        onChangeText={setQuery}
        placeholder="Nome, contacto ou turma"
      />
      <ChoiceField
        label="Turma"
        value={classId}
        options={[
          { id: 'all', label: 'Todas as turmas' },
          ...classes.map((item) => ({
            id: item.recordId,
            label: String(item.payload.name || 'Turma'),
          })),
        ]}
        onSelect={setClassId}
      />
      <ChoiceField
        label="Estado"
        value={status}
        options={[
          { id: 'all', label: 'Todos os estados' },
          { id: 'active', label: 'Ativos' },
          { id: 'other', label: 'Transferidos ou inativos' },
        ]}
        onSelect={setStatus}
      />
      <Text style={{ color: BRAND.muted, fontSize: 13, fontWeight: '700' }}>
        {students.length} {students.length === 1 ? 'aluno encontrado' : 'alunos encontrados'}
      </Text>
      {students.length ? (
        students.map((s) => (
          <Card
            key={s.recordId}
            onPress={() => router.push({ pathname: '/alunos/[id]', params: { id: s.recordId } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <ViewInitials name={String(s.payload.name || 'Aluno')} />
            <ViewText
              name={String(s.payload.name || 'Aluno')}
              className={String(
                s.payload.className ||
                  classes.find((schoolClass) => schoolClass.recordId === s.payload.classId)?.payload
                    .name ||
                  '',
              )}
              contact={String(s.payload.contact || '')}
              status={String(s.payload.status || 'Ativo')}
            />
            <Ionicons name="chevron-forward" size={18} color={BRAND.muted} />
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

function ViewInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: BRAND.bluePale,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: BRAND.blue, fontSize: 16, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}

function ViewText({
  name,
  className,
  contact,
  status,
}: {
  name: string;
  className: string;
  contact: string;
  status: string;
}) {
  const active = status.trim().toLocaleLowerCase('pt') === 'ativo';
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: BRAND.ink, fontWeight: '800' }}>{name}</Text>
      <Text style={styles.subtitle}>
        {[className, contact].filter(Boolean).join(' · ') || 'Turma não indicada'}
      </Text>
      <Text
        style={{ color: active ? BRAND.forestSoft : BRAND.muted, fontSize: 11, fontWeight: '700' }}
      >
        {status}
      </Text>
    </View>
  );
}
