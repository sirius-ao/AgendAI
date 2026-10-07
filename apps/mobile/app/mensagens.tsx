import { router } from 'expo-router';
import { Text } from 'react-native';
import { Card, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Messages() {
  const { snapshot } = useDashboard();
  const conversations = snapshot?.data.conversations || [];
  return (
    <Page>
      <Heading title="Mensagens" subtitle="Conversas da escola e das suas turmas." back />
      {conversations.length ? (
        conversations.map(({ recordId, payload }) => {
          const messages = Array.isArray(payload.messages) ? payload.messages : [];
          const last = messages[messages.length - 1] as Record<string, unknown> | undefined;
          return (
            <Card key={recordId} onPress={() => router.push(`/mensagens/${recordId}` as never)}>
              <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
                {String(payload.title || 'Conversa')}
              </Text>
              <Text style={styles.subtitle}>
                {String(last?.text || payload.subtitle || 'Sem mensagens')}
              </Text>
              {Number(payload.unread || 0) > 0 ? (
                <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
                  {Number(payload.unread)} por ler
                </Text>
              ) : null}
            </Card>
          );
        })
      ) : (
        <Empty title="Sem conversas" text="As conversas partilhadas pela escola aparecerão aqui." />
      )}
    </Page>
  );
}
