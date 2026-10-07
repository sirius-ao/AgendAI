import { router } from 'expo-router';
import { Text } from 'react-native';
import { Card, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export default function Notifications() {
  const { snapshot, pendingCount } = useDashboard();
  const alerts: Array<{ title: string; detail: string; path: string }> = [];
  const today = todayKey();
  for (const row of snapshot?.data.events || []) {
    const date = String(row.payload.date || '').slice(0, 10);
    if (date >= today && date <= todayKeyOffset(1))
      alerts.push({
        title: String(row.payload.title || 'Evento próximo'),
        detail: `${date} · ${String(row.payload.start || row.payload.startTime || 'horário por definir')}`,
        path: '/calendario',
      });
  }
  for (const row of snapshot?.data.plans || []) {
    const date = String(row.payload.date || row.payload.lessonDate || '').slice(0, 10);
    if (date >= today && date <= todayKeyOffset(1))
      alerts.push({
        title: `Aula: ${String(row.payload.title || row.payload.subject || 'Plano')}`,
        detail: `${date} · ${String(row.payload.startTime || 'horário por definir')}`,
        path: `/aula/${row.recordId}`,
      });
  }
  for (const row of snapshot?.data.conversations || []) {
    if (Number(row.payload.unread || 0) > 0)
      alerts.push({
        title: String(row.payload.title || 'Nova mensagem'),
        detail: `${Number(row.payload.unread)} mensagem(ns) por ler`,
        path: `/mensagens/${row.recordId}`,
      });
  }
  if (pendingCount)
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
      {alerts.length ? (
        alerts.map((alert, index) => (
          <Card key={`${alert.path}-${index}`} onPress={() => router.push(alert.path as never)}>
            <Text style={{ color: BRAND.ink, fontWeight: '800' }}>{alert.title}</Text>
            <Text style={styles.subtitle}>{alert.detail}</Text>
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
