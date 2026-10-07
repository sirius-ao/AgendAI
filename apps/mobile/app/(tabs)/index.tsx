import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { BRAND } from '@/config';
import { Button, Card, ChoiceField, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateTime = (date: string, time: string) => {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!year || !month || !day || !match) return null;
  return new Date(year, month - 1, day, Number(match[1]), Number(match[2]));
};
const isCompleted = (status: unknown) =>
  ['concluído', 'concluida', 'concluída', 'cancelado', 'cancelada', 'cancelled'].includes(
    String(status || '')
      .trim()
      .toLocaleLowerCase('pt'),
  );

export default function Home() {
  const { user } = useAuth();
  const { snapshot, schoolId, selectSchool, syncState, pendingCount, message, syncNow } =
    useDashboard();
  const plans = snapshot?.data.plans || [];
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const today = dateKey(now);
  const classes = snapshot?.data.classes || [];
  const subjects = snapshot?.data.subjects || [];
  const lesson = useMemo(() => {
    const candidates: Array<{
      id: string;
      title: string;
      classId: string;
      subjectId: string;
      date: string;
      startTime: string;
      endTime: string;
      location: string;
      planId: string;
      startsAt: Date | null;
      endsAt: Date | null;
      timeKnown: boolean;
    }> = [];
    const matchedPlans = new Set<string>();
    for (const event of snapshot?.data.events || []) {
      const payload = event.payload;
      if (String(payload.type || '').toLocaleLowerCase('pt') !== 'aula' || !payload.classId)
        continue;
      const classId = String(payload.classId);
      const subjectId = String(payload.subjectId || '');
      const date = String(payload.date || '').slice(0, 10);
      if (!date || date < today) continue;
      const plan = plans.find(
        (row) =>
          (payload.sourceId && row.recordId === payload.sourceId) ||
          (row.payload.classId === classId &&
            row.payload.subjectId === subjectId &&
            String(row.payload.date || '').slice(0, 10) === date),
      );
      if (plan) matchedPlans.add(plan.recordId);
      if (isCompleted(plan?.payload.status)) continue;
      const startTime = String(payload.start || payload.startTime || '');
      const endTime = String(payload.end || payload.endTime || '');
      const startsAt = dateTime(date, startTime);
      const eventEndDate = String(payload.endDate || date).slice(0, 10);
      const endsAt =
        dateTime(eventEndDate, endTime) ||
        (startsAt ? new Date(startsAt.getTime() + 60 * 60_000) : null);
      const timeKnown = Boolean(startsAt);
      if (timeKnown && endsAt && endsAt.getTime() <= now.getTime()) continue;
      candidates.push({
        id: event.recordId,
        title: String(payload.title || plan?.payload.title || 'Aula'),
        classId,
        subjectId,
        date,
        startTime,
        endTime,
        location: String(payload.location || ''),
        planId: plan?.recordId || '',
        startsAt,
        endsAt,
        timeKnown,
      });
    }
    for (const row of plans) {
      const payload = row.payload;
      const date = String(payload.date || payload.lessonDate || '').slice(0, 10);
      if (
        !date ||
        date < today ||
        matchedPlans.has(row.recordId) ||
        isCompleted(payload.status) ||
        !payload.classId
      )
        continue;
      const startTime = String(payload.startTime || payload.time || '');
      const duration = Number(payload.duration) > 0 ? Number(payload.duration) : 45;
      const startsAt = dateTime(date, startTime);
      const endsAt = startsAt ? new Date(startsAt.getTime() + duration * 60_000) : null;
      const timeKnown = Boolean(startsAt);
      if (timeKnown && endsAt && endsAt.getTime() <= now.getTime()) continue;
      candidates.push({
        id: row.recordId,
        title: String(payload.title || payload.subject || 'Aula'),
        classId: String(payload.classId),
        subjectId: String(payload.subjectId || ''),
        date,
        startTime,
        endTime: String(payload.endTime || ''),
        location: String(payload.location || ''),
        planId: row.recordId,
        startsAt,
        endsAt,
        timeKnown,
      });
    }
    candidates.sort(
      (a, b) =>
        (a.startsAt?.getTime() ?? Date.parse(`${a.date}T23:59:59`)) -
        (b.startsAt?.getTime() ?? Date.parse(`${b.date}T23:59:59`)),
    );
    const next = candidates[0];
    return next
      ? {
          ...next,
          ongoing: Boolean(
            next.timeKnown &&
            next.startsAt &&
            next.endsAt &&
            now >= next.startsAt &&
            now < next.endsAt,
          ),
        }
      : null;
  }, [now, plans, snapshot?.data.events, today]);
  const greeting =
    new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <Page>
      <View style={{ gap: 4, paddingVertical: 4 }}>
        <Text style={{ color: BRAND.muted }}>{greeting},</Text>
        <Text style={styles.title}>{user?.name?.split(' ')[0] || 'Professor'}</Text>
        <Text style={styles.subtitle}>
          {now.toLocaleDateString('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>
      {syncState === 'offline' || syncState === 'pending' || syncState === 'error' ? (
        <Card style={{ backgroundColor: syncState === 'error' ? '#fff8eb' : BRAND.greenPale }}>
          <Text style={{ color: BRAND.forest, fontWeight: '800' }}>
            {syncState === 'offline'
              ? 'Modo offline'
              : syncState === 'error'
                ? 'Falha ao sincronizar'
                : 'Alterações por sincronizar'}
          </Text>
          <Text style={styles.subtitle}>
            {message ||
              (pendingCount
                ? `${pendingCount} alteração(ões) guardada(s) neste dispositivo.`
                : 'Os dados guardados continuam disponíveis.')}
          </Text>
        </Card>
      ) : null}
      {lesson ? (
        <Card
          onPress={() => router.push(lesson.planId ? `/aula/${lesson.planId}` : '/calendario')}
          style={{ backgroundColor: lesson.ongoing ? '#e9f8ee' : BRAND.greenPale }}
        >
          <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
            {lesson.ongoing ? '● AULA EM CURSO' : '◷ PRÓXIMA AULA'}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.ink }}>{lesson.title}</Text>
          <Text style={styles.subtitle}>
            {[
              lesson.date === today
                ? 'Hoje'
                : new Date(`${lesson.date}T12:00:00`).toLocaleDateString('pt-PT', {
                    day: 'numeric',
                    month: 'short',
                  }),
              lesson.timeKnown
                ? `${lesson.startTime}${lesson.endTime ? `–${lesson.endTime}` : ''}`
                : 'Horário por definir',
              classes.find((item) => item.recordId === lesson.classId)?.payload.name || 'Turma',
              subjects.find((item) => item.recordId === lesson.subjectId)?.payload.name,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {lesson.location ? <Text style={styles.subtitle}>{lesson.location}</Text> : null}
          <Text style={{ color: BRAND.forestSoft, fontWeight: '700', marginTop: 4 }}>
            {lesson.planId ? 'Abrir plano →' : 'Ver agenda →'}
          </Text>
        </Card>
      ) : (
        <Card style={{ backgroundColor: BRAND.greenPale }}>
          <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 17 }}>
            Sem próximas aulas
          </Text>
          <Text style={styles.subtitle}>
            Não há aulas futuras na agenda. Pode consultar o calendário ou preparar uma aula.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Ver agenda" secondary onPress={() => router.push('/calendario')} />
            <Button title="Preparar aula" tone="soft" onPress={() => router.push('/plano/criar')} />
          </View>
        </Card>
      )}
      <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.ink }}>Acesso rápido</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Quick title="Presenças" onPress={() => router.push('/(tabs)/aulas')} />
        <Quick title="Avaliações" tone="purple" onPress={() => router.push('/avaliacoes')} />
      </View>
      <Button title="＋ Criar plano" tone="soft" onPress={() => router.push('/plano/criar')} />
      <Card
        onPress={() => router.push('/alunos')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            backgroundColor: BRAND.bluePale,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="people-outline" size={24} color={BRAND.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
            Consultar alunos
          </Text>
          <Text style={styles.subtitle}>
            {
              (snapshot?.data.students || []).filter(
                (student) => String(student.payload.status || 'Ativo').toLowerCase() === 'ativo',
              ).length
            }{' '}
            ativos · {(snapshot?.data.students || []).length} no total
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={BRAND.muted} />
      </Card>
      <Card>
        <Text style={{ fontWeight: '800', color: BRAND.ink }}>Hoje na escola</Text>
        {user && user.schools.length > 1 ? (
          <ChoiceField
            label="Escola"
            value={schoolId}
            options={user.schools.map((school) => ({ id: school.id, label: school.name }))}
            onSelect={(id) => {
              void selectSchool(id);
            }}
          />
        ) : null}
        <Text style={styles.subtitle}>
          {snapshot?.school.name ||
            user?.schools.find((school) => school.id === schoolId)?.name ||
            'A sua escola'}
        </Text>
        <Text style={{ color: BRAND.muted }}>
          {(snapshot?.data.classes || []).length} turmas · {(snapshot?.data.students || []).length}{' '}
          alunos · {plans.length} planos de aula
        </Text>
      </Card>
      <Text
        onPress={() => void syncNow()}
        style={{ color: BRAND.forestSoft, textAlign: 'center', padding: 8 }}
      >
        Atualizar dados
      </Text>
    </Page>
  );
}
function Quick({
  title,
  onPress,
  tone = 'green',
}: {
  title: string;
  tone?: 'green' | 'purple' | 'soft';
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Button title={`＋ ${title}`} onPress={onPress} tone={tone} />
    </View>
  );
}
