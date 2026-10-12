import { AppText } from '@/components/app-text';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Empty, Heading, Notice, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';
import { useAuth } from '@/providers/auth-provider';

export default function Messages() {
  const { snapshot, schoolId, refresh } = useDashboard();
  const { request } = useAuth();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const newConversation = async () => {
    setOpen(true);
    setNotice('');
    setSearch('');
    setLoadingPeople(true);
    try {
      setPeople(await request(`/schools/${encodeURIComponent(schoolId)}/messaging/participants`));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Não foi possível carregar os professores.',
      );
    } finally {
      setLoadingPeople(false);
    }
  };
  const startConversation = async (person: { id: string; name: string }) => {
    setBusy(true);
    try {
      const result = await request<{ id: string }>(
        `/schools/${encodeURIComponent(schoolId)}/messaging/conversations`,
        { method: 'POST', body: JSON.stringify({ recipientId: person.id }) },
      );
      await refresh();
      setOpen(false);
      router.push(`/mensagens/${result.id}` as never);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível iniciar a conversa.');
    } finally {
      setBusy(false);
    }
  };
  const conversations = snapshot?.data.conversations || [];
  return (
    <Page>
      <Heading title="Mensagens" subtitle="Conversas da escola e das suas turmas." back />
      <Button title="Nova conversa" onPress={() => void newConversation()} />
      <Notice text={notice} type="error" />
      {conversations.length ? (
        conversations.map(({ recordId, payload }) => {
          const messages = Array.isArray(payload.messages) ? payload.messages : [];
          const last = messages[messages.length - 1] as Record<string, unknown> | undefined;
          return (
            <Card key={recordId} onPress={() => router.push(`/mensagens/${recordId}` as never)}>
              <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
                {String(payload.title || 'Conversa')}
              </AppText>
              <AppText style={styles.subtitle}>
                {String(last?.text || payload.subtitle || 'Sem mensagens')}
              </AppText>
              {Number(payload.unread || 0) > 0 ? (
                <AppText style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
                  {Number(payload.unread)} por ler
                </AppText>
              ) : null}
            </Card>
          );
        })
      ) : (
        <Empty title="Sem conversas" text="As conversas partilhadas pela escola aparecerão aqui." />
      )}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View
            style={{
              maxHeight: '82%',
              backgroundColor: BRAND.canvas,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <AppText style={{ fontSize: 20, fontWeight: '800', color: BRAND.ink }}>
                Nova conversa
              </AppText>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
                <AppText style={{ fontSize: 16, color: BRAND.forestSoft }}>Fechar</AppText>
              </Pressable>
            </View>
            <AppText style={styles.subtitle}>Escolha um professor da sua escola.</AppText>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Pesquisar por nome ou email"
              style={{
                backgroundColor: BRAND.white,
                borderColor: BRAND.line,
                borderWidth: 1,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: BRAND.ink,
              }}
            />
            <Notice text={notice} type="error" />
            {loadingPeople ? (
              <ActivityIndicator color={BRAND.green} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
                {people
                  .filter((p) =>
                    `${p.name} ${p.email}`.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((person) => (
                    <Card key={person.id} onPress={() => void startConversation(person)}>
                      <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>
                        {person.name}
                      </AppText>
                      <AppText style={styles.subtitle}>{person.email}</AppText>
                    </Card>
                  ))}
                {!people.length && !loadingPeople ? (
                  <Empty
                    title="Sem professores disponíveis"
                    text="Apenas membros ativos com perfil de professor aparecem aqui."
                  />
                ) : null}
              </ScrollView>
            )}
            {busy && <ActivityIndicator color={BRAND.green} />}
          </View>
        </View>
      </Modal>
    </Page>
  );
}
