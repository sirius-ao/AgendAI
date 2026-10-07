import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
export default function Calendar() {
  const { snapshot } = useDashboard();
  const [selected, setSelected] = useState(() => new Date());
  const weekStart = startOfWeek(selected);
  const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const schedule = useMemo(() => {
    const plans = snapshot?.data.plans || [];
    const events = (snapshot?.data.events || []).map((row) => ({ ...row, kind: 'event' as const }));
    const linkedPlanIds = new Set<string>();
    const eventItems = events.map((event) => {
      const p = event.payload;
      const plan = plans.find(
        (row) =>
          (p.sourceId && row.recordId === p.sourceId) ||
          (row.payload.classId === p.classId &&
            row.payload.subjectId === p.subjectId &&
            String(row.payload.date || '').slice(0, 10) === String(p.date || '').slice(0, 10)),
      );
      if (plan) linkedPlanIds.add(plan.recordId);
      return { ...event, planId: plan?.recordId || '' };
    });
    const planItems = plans
      .filter((row) => !linkedPlanIds.has(row.recordId))
      .map((row) => ({ ...row, kind: 'plan' as const, planId: row.recordId }));
    return [...eventItems, ...planItems];
  }, [snapshot]);
  const selectedKey = dayKey(selected);
  const events = useMemo(
    () =>
      schedule
        .filter(({ payload }) => {
          const start = String(payload.date || payload.startDate || payload.lessonDate || '').slice(
            0,
            10,
          );
          const end = String(payload.endDate || start).slice(0, 10);
          return start && start <= selectedKey && end >= selectedKey;
        })
        .sort((a, b) =>
          String(a.payload.startTime || a.payload.start || a.payload.time || '').localeCompare(
            String(b.payload.startTime || b.payload.start || b.payload.time || ''),
          ),
        ),
    [schedule, selectedKey],
  );
  const weekLabel = `${weekStart.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return (
    <Page>
      <Heading title="Agenda semanal" subtitle="Organize aulas e eventos da semana." back />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="‹ Semana" secondary onPress={() => setSelected((day) => addDays(day, -7))} />
        <Button title="Esta semana" tone="soft" onPress={() => setSelected(new Date())} />
        <Button title="Semana ›" secondary onPress={() => setSelected((day) => addDays(day, 7))} />
      </View>
      <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>{weekLabel}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {week.map((day) => {
          const key = dayKey(day);
          const count = schedule.filter(({ payload }) => {
            const start = String(
              payload.date || payload.startDate || payload.lessonDate || '',
            ).slice(0, 10);
            const end = String(payload.endDate || start).slice(0, 10);
            return start && start <= key && end >= key;
          }).length;
          const active = key === selectedKey;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${day.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric' })}, ${count} compromissos`}
              onPress={() => setSelected(day)}
              style={{
                minWidth: 48,
                alignItems: 'center',
                gap: 5,
                paddingVertical: 10,
                paddingHorizontal: 7,
                borderRadius: 14,
                backgroundColor: active ? BRAND.green : BRAND.white,
                borderWidth: 1,
                borderColor: active ? BRAND.green : BRAND.line,
              }}
            >
              <Text
                style={{
                  color: active ? BRAND.white : BRAND.muted,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                {day.toLocaleDateString('pt-PT', { weekday: 'short' })}
              </Text>
              <Text
                style={{ color: active ? BRAND.white : BRAND.ink, fontSize: 16, fontWeight: '900' }}
              >
                {day.getDate()}
              </Text>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: count ? (active ? BRAND.white : BRAND.green) : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
      <Text
        style={{ color: BRAND.ink, fontWeight: '800', fontSize: 18, textTransform: 'capitalize' }}
      >
        {selected.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
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
              onPress={() => row.planId && router.push(`/aula/${row.planId}` as never)}
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
              {row.planId ? (
                <Text style={{ color: BRAND.forestSoft, fontWeight: '700' }}>Abrir plano →</Text>
              ) : null}
            </Card>
          );
        })
      ) : (
        <Empty title="Dia livre" text="Não há aulas ou eventos registados nesta data." />
      )}
      <Button
        title="＋ Preparar aula para este dia"
        tone="soft"
        onPress={() => router.push({ pathname: '/plano/criar', params: { date: selectedKey } })}
      />
    </Page>
  );
}
