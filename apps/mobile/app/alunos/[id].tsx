import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { useLocalSearchParams, router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Empty, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

type Result = { id: string; title: string; date: string; score: number; max: number };
export default function StudentProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useDashboard();
  const student = snapshot?.data.students.find((row) => row.recordId === id);
  const p = student?.payload || {};
  const classId = String(p.classId || '');
  const group = snapshot?.data.classes.find((row) => row.recordId === classId);
  const attendance = (snapshot?.data.attendance || [])
    .filter(
      (row) =>
        row.payload.classId === classId &&
        ((row.payload.records &&
          typeof row.payload.records === 'object' &&
          (row.payload.records as Record<string, { status?: string }>)[id]) ||
          (Array.isArray(row.payload.entries) &&
            (row.payload.entries as { studentId: string }[]).some(
              (entry) => entry.studentId === id,
            ))),
    )
    .sort((a, b) => String(b.payload.date || '').localeCompare(String(a.payload.date || '')));
  const assessments: Result[] = (snapshot?.data.assessments || [])
    .flatMap((row) => {
      if (row.payload.classId !== classId) return [];
      const grades =
        row.payload.grades && typeof row.payload.grades === 'object'
          ? (row.payload.grades as Record<string, unknown>)
          : {};
      const detail =
        row.payload.gradeDetails && typeof row.payload.gradeDetails === 'object'
          ? (row.payload.gradeDetails as Record<string, { value?: string }>)[id]
          : undefined;
      const legacy = Array.isArray(row.payload.scores)
        ? (row.payload.scores as { studentId: string; score: number }[]).find(
            (item) => item.studentId === id,
          )?.score
        : undefined;
      const raw = grades[id] ?? (legacy !== undefined ? legacy : detail?.value);
      const score = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
      return Number.isFinite(score)
        ? [
            {
              id: row.recordId,
              title: String(row.payload.title || 'Avaliação'),
              date: String(row.payload.date || ''),
              score,
              max: 20,
            },
          ]
        : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const average = assessments.length
    ? assessments.reduce((sum, row) => sum + row.score, 0) / assessments.length
    : null;
  const attendanceFor = (record: (typeof attendance)[number]) => {
    const records = record.payload.records as
      Record<string, { status?: string; note?: string }> | undefined;
    const modern = records?.[id];
    if (modern?.status) return { status: modern.status, note: modern.note || '' };
    const old = Array.isArray(record.payload.entries)
      ? (record.payload.entries as { studentId: string; present: boolean }[]).find(
          (entry) => entry.studentId === id,
        )
      : undefined;
    return old ? { status: old.present ? 'Presente' : 'Falta', note: '' } : null;
  };
  const attendanceRows = attendance
    .map((row) => ({ row, mark: attendanceFor(row) }))
    .filter((item) => item.mark);
  const present = attendanceRows.filter((item) => item.mark?.status === 'Presente').length;
  const absences = attendanceRows.filter((item) =>
    ['Falta', 'Justificada'].includes(item.mark?.status || ''),
  ).length;
  return (
    <Page>
      <Heading
        title={String(p.name || 'Perfil do aluno')}
        subtitle={String(group?.payload.name || p.className || 'Turma não indicada')}
        back
      />
      {student ? (
        <>
          <Card style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: BRAND.bluePale,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ color: BRAND.blue, fontSize: 24, fontWeight: '800' }}>
                {String(p.name || 'A')
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((name) => name[0])
                  .join('')
                  .toUpperCase()}
              </AppText>
            </View>
            <AppText style={{ color: BRAND.ink, fontSize: 19, fontWeight: '800' }}>
              {String(p.name || 'Aluno')}
            </AppText>
            <AppText style={styles.subtitle}>
              {String(p.contact || 'Contacto não informado')} · {String(p.status || 'Ativo')}
            </AppText>
            {group && (
              <AppText style={styles.subtitle}>
                {String(group.payload.name || '')} ·{' '}
                {String(group.payload.year || group.payload.grade || '')}
              </AppText>
            )}
          </Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1 }}>
              <AppText style={styles.subtitle}>Presenças</AppText>
              <AppText style={{ color: BRAND.green, fontSize: 21, fontWeight: '800' }}>
                {present}
              </AppText>
            </Card>
            <Card style={{ flex: 1 }}>
              <AppText style={styles.subtitle}>Faltas</AppText>
              <AppText style={{ color: BRAND.red, fontSize: 21, fontWeight: '800' }}>
                {absences}
              </AppText>
            </Card>
            <Card style={{ flex: 1 }}>
              <AppText style={styles.subtitle}>Média / 20</AppText>
              <AppText style={{ color: BRAND.purpleInk, fontSize: 21, fontWeight: '800' }}>
                {average === null ? '—' : average.toFixed(1)}
              </AppText>
            </Card>
          </View>
          <Button
            title="Lançar avaliação"
            tone="purple"
            onPress={() =>
              router.push({ pathname: '/avaliacoes', params: { classId, studentId: id } })
            }
          />
          <AppText style={{ color: BRAND.ink, fontSize: 17, fontWeight: '800' }}>
            Histórico de avaliações
          </AppText>
          {assessments.length ? (
            assessments.map((row) => (
              <Card key={row.id}>
                <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>{row.title}</AppText>
                <AppText style={styles.subtitle}>
                  {row.date} · {row.score}/20
                </AppText>
              </Card>
            ))
          ) : (
            <Empty title="Sem avaliações" text="As notas deste aluno aparecerão aqui." />
          )}
          <AppText style={{ color: BRAND.ink, fontSize: 17, fontWeight: '800' }}>
            Histórico de presenças
          </AppText>
          {attendanceRows.length ? (
            attendanceRows.slice(0, 20).map(({ row, mark }) => (
              <Card key={row.recordId}>
                <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>
                  {String(row.payload.date || '')}
                </AppText>
                <AppText
                  style={{
                    color:
                      mark?.status === 'Presente'
                        ? BRAND.green
                        : mark?.status === 'Justificada'
                          ? BRAND.purpleInk
                          : BRAND.red,
                    fontWeight: '700',
                  }}
                >
                  {mark?.status}
                  {mark?.note ? ` · ${mark.note}` : ''}
                </AppText>
              </Card>
            ))
          ) : (
            <Empty
              title="Sem presenças registadas"
              text="O histórico da chamada ficará disponível aqui."
            />
          )}
        </>
      ) : (
        <Empty title="Aluno não encontrado" text="Atualize os dados da escola e tente novamente." />
      )}
    </Page>
  );
}
