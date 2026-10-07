import { BRAND } from '@/config';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Field, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useDashboard();
  const group = snapshot?.data.classes.find((c) => c.recordId === id);
  const students = (snapshot?.data.students || []).filter((s) => s.payload.classId === id);
  const [query, setQuery] = useState('');
  const normalize = (value: unknown) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt');
  const visibleStudents = useMemo(
    () =>
      students
        .filter((student) =>
          normalize(`${student.payload.name || ''} ${student.payload.contact || ''}`).includes(
            normalize(query),
          ),
        )
        .sort((a, b) =>
          String(a.payload.name || '').localeCompare(String(b.payload.name || ''), 'pt'),
        ),
    [query, students],
  );
  const activeCount = students.filter(
    (student) => normalize(student.payload.status || 'Ativo') === 'ativo',
  ).length;
  const attendanceRecords = (snapshot?.data.attendance || []).filter(
    (row) => row.payload.classId === id,
  );
  const attendanceCounts = attendanceRecords.reduce(
    (counts, row) => {
      const records =
        row.payload.records && typeof row.payload.records === 'object'
          ? (row.payload.records as Record<string, { status?: string }>)
          : null;
      const marks = records
        ? Object.values(records).map((record) => record.status)
        : Array.isArray(row.payload.entries)
          ? (row.payload.entries as Array<{ present?: boolean }>).map((entry) =>
              entry.present ? 'Presente' : 'Falta',
            )
          : [];
      counts.present += marks.filter((status) => status === 'Presente').length;
      counts.absent += marks.filter((status) => status === 'Falta').length;
      return counts;
    },
    { present: 0, absent: 0 },
  );
  const attendanceRate =
    attendanceCounts.present + attendanceCounts.absent
      ? Math.round(
          (100 * attendanceCounts.present) / (attendanceCounts.present + attendanceCounts.absent),
        )
      : null;
  const grades = (snapshot?.data.assessments || [])
    .filter((row) => row.payload.classId === id)
    .flatMap((row) => {
      const gradeMap =
        row.payload.grades && typeof row.payload.grades === 'object'
          ? (row.payload.grades as Record<string, unknown>)
          : {};
      return Object.values(gradeMap).flatMap((value) => {
        const score = Number(value);
        return value !== null && value !== '' && Number.isFinite(score) ? [score] : [];
      });
    });
  const gradeAverage = grades.length
    ? grades.reduce((sum, score) => sum + score, 0) / grades.length
    : null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const nextPlan = (snapshot?.data.plans || [])
    .filter(
      (row) =>
        row.payload.classId === id &&
        String(row.payload.date || '').slice(0, 10) >= todayKey &&
        normalize(row.payload.status) !== 'concluido',
    )
    .sort((a, b) =>
      `${a.payload.date || ''} ${a.payload.startTime || ''}`.localeCompare(
        `${b.payload.date || ''} ${b.payload.startTime || ''}`,
      ),
    )[0];
  return (
    <Page>
      <Heading
        title={String(group?.payload.name || 'Turma')}
        subtitle={`${activeCount} alunos ativos · ${students.length} no total`}
        back
      />
      <Card>
        <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
          {[
            group?.payload.year || group?.payload.grade,
            group?.payload.shift,
            group?.payload.room ? `Sala ${String(group.payload.room)}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || 'Informações da turma'}
        </Text>
        <Text style={styles.subtitle}>Resumo da turma com dados sincronizados da escola.</Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={styles.subtitle}>Presenças</Text>
          <Text style={{ color: BRAND.forestSoft, fontSize: 20, fontWeight: '900' }}>
            {attendanceRate === null ? '—' : `${attendanceRate}%`}
          </Text>
        </Card>
        <Card style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={styles.subtitle}>Média</Text>
          <Text style={{ color: BRAND.purpleInk, fontSize: 20, fontWeight: '900' }}>
            {gradeAverage === null ? '—' : `${gradeAverage.toFixed(1)}/20`}
          </Text>
        </Card>
        <Card style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={styles.subtitle}>Avaliações</Text>
          <Text style={{ color: BRAND.blue, fontSize: 20, fontWeight: '900' }}>
            {(snapshot?.data.assessments || []).filter((row) => row.payload.classId === id).length}
          </Text>
        </Card>
      </View>
      <Button
        title="Marcar presença"
        onPress={() => router.push({ pathname: '/presenca', params: { classId: id } })}
      />
      <Button
        title="Lançar avaliação"
        secondary
        onPress={() => router.push({ pathname: '/avaliacoes', params: { classId: id } })}
      />
      {nextPlan ? (
        <Card
          onPress={() => router.push(`/aula/${nextPlan.recordId}` as never)}
          style={{ backgroundColor: BRAND.greenPale }}
        >
          <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>PRÓXIMA AULA</Text>
          <Text style={{ color: BRAND.ink, fontWeight: '800' }}>
            {String(nextPlan.payload.title || nextPlan.payload.subject || 'Plano de aula')}
          </Text>
          <Text style={styles.subtitle}>
            {String(nextPlan.payload.date || '')} ·{' '}
            {String(nextPlan.payload.startTime || 'Hora por definir')}
          </Text>
          <Text style={{ color: BRAND.forestSoft, fontWeight: '700' }}>Abrir plano →</Text>
        </Card>
      ) : null}
      <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.ink }}>Alunos</Text>
      <Field
        label="Pesquisar nesta turma"
        value={query}
        onChangeText={setQuery}
        placeholder="Nome ou contacto"
      />
      {visibleStudents.length ? (
        visibleStudents.map((s) => (
          <Card
            key={s.recordId}
            onPress={() => router.push({ pathname: '/alunos/[id]', params: { id: s.recordId } })}
          >
            <Text style={{ color: BRAND.ink, fontWeight: '700' }}>
              {String(s.payload.name || 'Aluno')}
            </Text>
            <Text style={styles.subtitle}>
              {[s.payload.contact, s.payload.status || 'Ativo'].filter(Boolean).join(' · ')}
            </Text>
          </Card>
        ))
      ) : (
        <Empty
          title={query ? 'Nenhum aluno encontrado' : 'Sem alunos registados'}
          text={
            query
              ? 'Tente pesquisar por outro nome ou contacto.'
              : 'Não há alunos associados a esta turma no dispositivo.'
          }
        />
      )}
    </Page>
  );
}
