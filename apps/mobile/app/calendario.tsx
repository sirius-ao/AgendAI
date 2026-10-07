import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};
export default function Calendar() {
  const { snapshot } = useDashboard();
  const [selected, setSelected] = useState(() => new Date());
  const key = dayKey(selected);
  const events = useMemo(() => {
    const all = [
      ...(snapshot?.data.events || []).map((row) => ({ ...row, kind: 'event' })),
      ...(snapshot?.data.plans || []).map((row) => ({ ...row, kind: 'plan' })),
    ];
    return all
      .filter(
        ({ payload }) =>
          String(payload.date || payload.startDate || payload.lessonDate || '').slice(0, 10) ===
          key,
      )
      .sort((a, b) =>
        String(a.payload.startTime || a.payload.start || a.payload.time || '').localeCompare(
          String(b.payload.startTime || b.payload.start || b.payload.time || ''),
        ),
      );
  }, [snapshot, key]);
  const dayLabel = selected.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <Page>
      <Heading title="Agenda" subtitle="Aulas, eventos e compromissos da escola." back />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          title="‹ Dia anterior"
          secondary
          onPress={() => setSelected((day) => addDays(day, -1))}
        />
        <Button title="Hoje" tone="soft" onPress={() => setSelected(new Date())} />
        <Button title="Próximo ›" secondary onPress={() => setSelected((day) => addDays(day, 1))} />
      </View>
      <Text
        style={{ color: BRAND.ink, fontWeight: '800', fontSize: 18, textTransform: 'capitalize' }}
      >
        {dayLabel}
      </Text>
      {events.length ? (
        events.map((row) => {
          const p = row.payload;
          const group = snapshot?.data.classes?.find(
            (item) => item.recordId === p.classId,
          )?.payload;
          return (
            <Card
              key={`${row.kind}-${row.recordId}`}
              onPress={() => row.kind === 'plan' && router.push(`/aula/${row.recordId}` as never)}
            >
              <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
                {String(p.startTime || p.start || p.time || 'Dia inteiro')}{' '}
                {p.endTime || p.end ? `– ${String(p.endTime || p.end)}` : ''}
              </Text>
              <Text style={{ color: BRAND.ink, fontSize: 17, fontWeight: '800' }}>
                {String(p.title || p.subject || 'Compromisso')}
              </Text>
              <Text style={styles.subtitle}>
                {[p.subjectName, group?.name || p.className, p.location]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {p.description || p.objectives ? (
                <Text style={styles.subtitle}>{String(p.description || p.objectives)}</Text>
              ) : null}
            </Card>
          );
        })
      ) : (
        <Empty title="Dia livre" text="Não há aulas ou eventos registados nesta data." />
      )}
    </Page>
  );
}
