import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Empty, Field, Heading, Notice, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

const newId = () => `mobile-message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, saveRecord } = useDashboard();
  const { user } = useAuth();
  const row = snapshot?.data.conversations?.find((item) => item.recordId === id);
  const payload = row?.payload || {};
  const messages = Array.isArray(payload.messages)
    ? (payload.messages as Array<Record<string, unknown>>)
    : [];
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const send = async () => {
    const content = text.trim();
    if (!row || !content || !user) return;
    setBusy(true);
    try {
      const message = {
        id: newId(),
        senderId: user.id,
        text: content,
        time: new Date().toISOString(),
        attachments: [],
      };
      await saveRecord('conversations', row.recordId, {
        ...payload,
        messages: [...messages, message],
        unread: 0,
      });
      setText('');
      setNotice('Mensagem guardada. Será sincronizada com a escola.');
    } catch (error) {
      Alert.alert(
        'Não foi possível enviar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading
        title={String(payload.title || 'Conversa')}
        subtitle={String(payload.subtitle || 'Mensagens da escola')}
        back
      />
      <Notice text={notice} type="success" />
      {messages.length ? (
        messages.map((message, index) => {
          const mine = message.senderId === user?.id;
          return (
            <View
              key={String(message.id || index)}
              style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}
            >
              <Card
                style={{ maxWidth: '88%', backgroundColor: mine ? BRAND.greenPale : BRAND.white }}
              >
                <Text style={{ color: BRAND.muted, fontSize: 11 }}>
                  {mine ? 'Eu' : String(message.senderName || 'Escola')}
                </Text>
                <Text style={{ color: BRAND.ink }}>{String(message.text || '')}</Text>
                <Text style={styles.subtitle}>
                  {message.time ? new Date(String(message.time)).toLocaleString('pt-PT') : ''}
                </Text>
              </Card>
            </View>
          );
        })
      ) : (
        <Empty title="Início da conversa" text="Envie uma mensagem para começar." />
      )}
      <Card>
        <Field
          label="Mensagem"
          value={text}
          onChangeText={setText}
          placeholder="Escreva aqui…"
          multiline
          maxLength={2000}
        />
        <Button
          title="Enviar mensagem"
          onPress={() => void send()}
          disabled={!text.trim()}
          loading={busy}
        />
      </Card>
    </Page>
  );
}
