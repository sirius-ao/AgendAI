import { Share, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, ChoiceField, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Reports() {
  const { snapshot } = useDashboard();
  const classes = snapshot?.data.classes || [];
  const { classId: requestedClassId } = useLocalSearchParams<{ classId?: string }>();
  const [classId, setClassId] = useState(requestedClassId || classes[0]?.recordId || '');
  useEffect(() => {
    if (requestedClassId && classes.some((row) => row.recordId === requestedClassId)) {
      setClassId(requestedClassId);
    } else if (!classId && classes.length) {
      setClassId(classes[0].recordId);
    }
  }, [classId, classes, requestedClassId]);
  const students = (snapshot?.data.students || []).filter((row) => row.payload.classId === classId);
  const attendance = (snapshot?.data.attendance || []).filter(
    (row) => row.payload.classId === classId,
  );
  const assessments = (snapshot?.data.assessments || []).filter(
    (row) => row.payload.classId === classId,
  );
  const attendanceEntries = attendance.flatMap((row) => {
    const entries = Array.isArray(row.payload.entries)
      ? (row.payload.entries as Array<{ studentId: string; present?: boolean; status?: string }>)
      : [];
    const records =
      row.payload.records && typeof row.payload.records === 'object'
        ? (row.payload.records as Record<string, { status?: string }>)
        : {};
    return [
      ...entries.map((entry) => ({
        studentId: entry.studentId,
        present: entry.present ?? entry.status === 'Presente',
      })),
      ...Object.entries(records).map(([studentId, entry]) => ({
        studentId,
        present: entry.status === 'Presente',
      })),
    ];
  });
  const studentStats = useMemo(
    () =>
      students.map((student) => {
        const present = attendanceEntries.filter(
          (entry) => entry.studentId === student.recordId && entry.present,
        ).length;
        const totalAttendance = attendanceEntries.filter(
          (entry) => entry.studentId === student.recordId,
        ).length;
        const grades = assessments.flatMap((row) => {
          const gradeMap =
            row.payload.grades && typeof row.payload.grades === 'object'
              ? (row.payload.grades as Record<string, unknown>)
              : {};
          const raw = gradeMap[student.recordId];
          return typeof raw === 'number' && Number.isFinite(raw) ? [raw] : [];
        });
        return {
          id: student.recordId,
          name: String(student.payload.name || 'Aluno'),
          present,
          totalAttendance,
          average: grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null,
        };
      }),
    [students, attendanceEntries, assessments],
  );
  const presenceTotals = attendanceEntries;
  const presenceRate = presenceTotals.length
    ? Math.round(
        (100 * presenceTotals.filter((entry) => entry.present).length) / presenceTotals.length,
      )
    : null;
  const grades = studentStats.flatMap((student) =>
    student.average === null ? [] : [student.average],
  );
  const average = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
  const share = () => {
    const group = classes.find((row) => row.recordId === classId)?.payload.name || 'Turma';
    const lines = [
      `Relatório · ${String(group)}`,
      `${students.length} alunos`,
      `Assiduidade: ${presenceRate === null ? 'sem dados' : `${presenceRate}%`}`,
      `Média da turma: ${average === null ? 'sem notas' : `${average.toFixed(1)}/20`}`,
      '',
      ...studentStats.map(
        (student) =>
          `${student.name}: ${student.average === null ? 'sem nota' : `${student.average.toFixed(1)}/20`} · presença ${student.totalAttendance ? `${Math.round((100 * student.present) / student.totalAttendance)}%` : 'sem dados'}`,
      ),
    ];
    void Share.share({ title: 'Relatório da turma', message: lines.join('\n') });
  };
  return (
    <Page>
      <Heading title="Relatórios" subtitle="Acompanhe presenças e resultados por turma." back />
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
      {!students.length ? (
        <Empty
          title="Sem dados da turma"
          text="Escolha uma turma com alunos para consultar o relatório."
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1 }}>
              <Text style={{ color: BRAND.muted }}>Assiduidade</Text>
              <Text style={{ color: BRAND.forestSoft, fontSize: 24, fontWeight: '900' }}>
                {presenceRate === null ? '—' : `${presenceRate}%`}
              </Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <Text style={{ color: BRAND.muted }}>Média</Text>
              <Text style={{ color: BRAND.purpleInk, fontSize: 24, fontWeight: '900' }}>
                {average === null ? '—' : `${average.toFixed(1)}/20`}
              </Text>
            </Card>
          </View>
          <Card>
            <Text style={{ color: BRAND.ink, fontWeight: '800' }}>
              {students.length} alunos · {attendance.length} registos de presença ·{' '}
              {assessments.length} avaliações
            </Text>
          </Card>
          <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 17 }}>
            Desempenho por aluno
          </Text>
          {studentStats.map((student) => (
            <Card
              key={student.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: BRAND.ink, fontWeight: '700' }}>{student.name}</Text>
                <Text style={styles.subtitle}>
                  {student.totalAttendance
                    ? `${Math.round((100 * student.present) / student.totalAttendance)}% presença`
                    : 'Sem registos de presença'}
                </Text>
              </View>
              <Text style={{ color: BRAND.forestSoft, fontWeight: '900' }}>
                {student.average === null ? '—' : student.average.toFixed(1)}
              </Text>
            </Card>
          ))}
          <Button title="Partilhar relatório" onPress={share} />
        </>
      )}
    </Page>
  );
}
