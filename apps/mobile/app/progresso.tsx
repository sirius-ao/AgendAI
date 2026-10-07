import { AppText } from '@/components/app-text';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ChoiceField, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';

type StudentProgress = {
  id: string;
  name: string;
  average: number | null;
  attendanceRate: number | null;
  assessments: number[];
  attention: boolean;
};
export default function Progress() {
  const { snapshot } = useDashboard();
  const classes = snapshot?.data.classes || [];
  const [classId, setClassId] = useState(classes[0]?.recordId || '');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].recordId);
  }, [classId, classes]);
  const students = (snapshot?.data.students || []).filter((row) => row.payload.classId === classId);
  const assessments = (snapshot?.data.assessments || []).filter(
    (row) => row.payload.classId === classId,
  );
  const attendance = (snapshot?.data.attendance || []).filter(
    (row) => row.payload.classId === classId,
  );
  const rows = useMemo<StudentProgress[]>(
    () =>
      students.map((student) => {
        const grades = assessments
          .flatMap((assessment) => {
            const map =
              assessment.payload.grades && typeof assessment.payload.grades === 'object'
                ? (assessment.payload.grades as Record<string, unknown>)
                : {};
            const details =
              assessment.payload.gradeDetails && typeof assessment.payload.gradeDetails === 'object'
                ? (assessment.payload.gradeDetails as Record<string, { value?: unknown }>)
                : {};
            const legacy = Array.isArray(assessment.payload.scores)
              ? (assessment.payload.scores as Array<{ studentId: string; score: number }>).find(
                  (row) => row.studentId === student.recordId,
                )?.score
              : undefined;
            const raw = map[student.recordId] ?? details[student.recordId]?.value ?? legacy;
            if (raw === null || raw === undefined || raw === '') return [];
            const score = Number(
              typeof raw === 'object' && raw && 'value' in raw
                ? (raw as { value: unknown }).value
                : raw,
            );
            return Number.isFinite(score)
              ? [{ date: String(assessment.payload.date || ''), score }]
              : [];
          })
          .sort((a, b) => a.date.localeCompare(b.date));
        let present = 0;
        let absent = 0;
        for (const record of attendance) {
          const records =
            record.payload.records && typeof record.payload.records === 'object'
              ? (record.payload.records as Record<string, { status?: string }>)
              : {};
          const modern = records[student.recordId]?.status;
          if (modern === 'Presente') present += 1;
          else if (modern === 'Falta') absent += 1;
          else if (Array.isArray(record.payload.entries)) {
            const legacy = (
              record.payload.entries as Array<{ studentId: string; present: boolean }>
            ).find((entry) => entry.studentId === student.recordId);
            if (legacy) legacy.present ? (present += 1) : (absent += 1);
          }
        }
        const average = grades.length
          ? grades.reduce((sum, row) => sum + row.score, 0) / grades.length
          : null;
        const attendanceRate =
          present + absent ? Math.round((100 * present) / (present + absent)) : null;
        return {
          id: student.recordId,
          name: String(student.payload.name || 'Aluno'),
          average,
          attendanceRate,
          assessments: grades
            .map((row) => row.score)
            .slice(-3)
            .reverse(),
          attention:
            (average !== null && average < 10) || (attendanceRate !== null && attendanceRate < 75),
        };
      }),
    [assessments, attendance, students],
  );
  const attentionCount = rows.filter((row) => row.attention).length;
  const classAverageRows = rows.flatMap((row) => (row.average === null ? [] : [row.average]));
  const classAverage = classAverageRows.length
    ? classAverageRows.reduce((sum, score) => sum + score, 0) / classAverageRows.length
    : null;
  const attendanceRows = rows.flatMap((row) =>
    row.attendanceRate === null ? [] : [row.attendanceRate],
  );
  const classAttendance = attendanceRows.length
    ? Math.round(attendanceRows.reduce((sum, rate) => sum + rate, 0) / attendanceRows.length)
    : null;
  const visible = rows
    .filter((row) => filter === 'all' || row.attention)
    .sort(
      (a, b) => Number(b.attention) - Number(a.attention) || (a.average ?? 21) - (b.average ?? 21),
    );
  return (
    <Page>
      <Heading
        title="Progresso dos alunos"
        subtitle="Acompanhe resultados e identifique quem precisa de apoio."
        back
      />
      {classes.length ? (
        <ChoiceField
          label="Turma"
          value={classId}
          options={classes.map((row) => ({
            id: row.recordId,
            label: String(row.payload.name || 'Turma'),
          }))}
          onSelect={setClassId}
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Metric
          label="Média da turma"
          value={classAverage === null ? '—' : `${classAverage.toFixed(1)}/20`}
          tone="purple"
        />
        <Metric
          label="Presença média"
          value={classAttendance === null ? '—' : `${classAttendance}%`}
        />
        <Metric
          label="Atenção"
          value={String(attentionCount)}
          tone={attentionCount ? 'red' : 'green'}
        />
      </View>
      <ChoiceField
        label="Alunos"
        value={filter}
        options={[
          { id: 'all', label: 'Todos os alunos' },
          { id: 'attention', label: 'Precisam de atenção' },
        ]}
        onSelect={setFilter}
      />
      {visible.length ? (
        visible.map((row) => (
          <Card
            key={row.id}
            onPress={() => router.push({ pathname: '/alunos/[id]', params: { id: row.id } })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <AppText style={{ color: BRAND.ink, fontWeight: '800', flex: 1 }}>{row.name}</AppText>
              {row.attention ? (
                <AppText style={{ color: BRAND.red, fontWeight: '800', fontSize: 12 }}>
                  Acompanhar
                </AppText>
              ) : null}
            </View>
            <AppText style={styles.subtitle}>
              Média {row.average === null ? '—' : `${row.average.toFixed(1)}/20`} · Presença{' '}
              {row.attendanceRate === null ? '—' : `${row.attendanceRate}%`}
            </AppText>
            <AppText style={styles.subtitle}>
              Últimas notas:{' '}
              {row.assessments.length
                ? row.assessments.map((score) => score.toFixed(1)).join(' · ')
                : 'sem avaliações'}
            </AppText>
            <AppText style={{ color: BRAND.forestSoft, fontWeight: '700' }}>Abrir perfil →</AppText>
          </Card>
        ))
      ) : (
        <Empty
          title={students.length ? 'Tudo em dia' : 'Sem alunos nesta turma'}
          text={
            students.length
              ? 'Nenhum aluno corresponde ao filtro de acompanhamento.'
              : 'Escolha uma turma com alunos para consultar o progresso.'
          }
        />
      )}
      {classId ? (
        <Button
          title="Ver relatório da turma"
          secondary
          onPress={() => router.push({ pathname: '/relatorios', params: { classId } })}
        />
      ) : null}
    </Page>
  );
}
function Metric({
  label,
  value,
  tone = 'green',
}: {
  label: string;
  value: string;
  tone?: 'green' | 'purple' | 'red';
}) {
  const color = tone === 'purple' ? BRAND.purpleInk : tone === 'red' ? BRAND.red : BRAND.forestSoft;
  return (
    <Card style={{ flex: 1, paddingHorizontal: 10 }}>
      <AppText style={styles.subtitle}>{label}</AppText>
      <AppText style={{ color, fontSize: 18, fontWeight: '900' }}>{value}</AppText>
    </Card>
  );
}
