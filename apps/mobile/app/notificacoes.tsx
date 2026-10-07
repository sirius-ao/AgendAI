import { AppText } from '@/components/app-text';
import { router } from 'expo-router';

import { Card, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';
import { useAuth } from '@/providers/auth-provider';
import { usePreferences } from '@/providers/preferences-provider';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export default function Notifications() {
  const { snapshot, pendingCount } = useDashboard();
  const { user } = useAuth();
  const { notifications } = usePreferences();
  const alerts: Array<{ title: string; detail: string; path: string }> = [];
  const today = todayKey();
  for (const row of notifications.lessons ? snapshot?.data.events || [] : []) {
    const date = String(row.payload.date || '').slice(0, 10);
    if (date >= today && date <= todayKeyOffset(1))
      alerts.push({
        title: String(row.payload.title || 'Evento próximo'),
        detail: `${date} · ${String(row.payload.start || row.payload.startTime || 'horário por definir')}`,
        path: '/calendario',
      });
  }
  for (const row of notifications.lessons ? snapshot?.data.plans || [] : []) {
    const date = String(row.payload.date || row.payload.lessonDate || '').slice(0, 10);
    if (date >= today && date <= todayKeyOffset(1))
      alerts.push({
        title: `Aula: ${String(row.payload.title || row.payload.subject || 'Plano')}`,
        detail: `${date} · ${String(row.payload.startTime || 'horário por definir')}`,
        path: `/aula/${row.recordId}`,
      });
  }
  for (const row of notifications.messages ? snapshot?.data.conversations || [] : []) {
    if (Number(row.payload.unread || 0) > 0)
      alerts.push({
        title: String(row.payload.title || 'Nova mensagem'),
        detail: `${Number(row.payload.unread)} mensagem(ns) por ler`,
        path: `/mensagens/${row.recordId}`,
      });
  }
  for (const row of notifications.tasks
    ? (snapshot?.data.tasks || []).filter(
        (task) =>
          !task.payload.done &&
          (task.payload.teacherId === user?.id || task.payload.ownerId === user?.id),
      )
    : []) {
    const due = String(row.payload.due || row.payload.date || '');
    if (due && due <= todayKeyOffset(7))
      alerts.push({
        title: String(row.payload.title || 'Tarefa por concluir'),
        detail: due < today ? `Prazo ultrapassado · ${due}` : `Prazo ${due}`,
        path: '/tarefas',
      });
  }
  if (notifications.evaluations) {
    for (const row of snapshot?.data.assessments || []) {
      const draft =
        row.payload.published === false ||
        String(row.payload.status || '')
          .toLowerCase()
          .includes('rascunho');
      if (draft)
        alerts.push({
          title: `Avaliação por concluir: ${String(row.payload.title || 'Avaliação')}`,
          detail: 'Rascunho por publicar',
          path: '/avaliacoes',
        });
    }
  }
  if (pendingCount && notifications.sync)
    alerts.push({
      title: 'Sincronização pendente',
      detail: `${pendingCount} alteração(ões) aguardam internet`,
      path: '/sincronizacao',
    });
  return (
    <Page>
      <Heading
        title="Notificações"
        subtitle="Lembretes derivados da agenda, mensagens e sincronização."
        back
      />
      <Card onPress={() => router.push('/configuracoes')}>
        <AppText style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
          Gerir preferências dos avisos →
        </AppText>
      </Card>
      {alerts.length ? (
        alerts.map((alert, index) => (
          <Card key={`${alert.path}-${index}`} onPress={() => router.push(alert.path as never)}>
            <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>{alert.title}</AppText>
            <AppText style={styles.subtitle}>{alert.detail}</AppText>
          </Card>
        ))
      ) : (
        <Empty title="Tudo em dia" text="Não há lembretes ou avisos novos neste momento." />
      )}
    </Page>
  );
}
function todayKeyOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
