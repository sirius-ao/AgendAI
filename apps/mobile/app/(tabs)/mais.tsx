import { AppText } from '@/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/config';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

export default function More() {
  const { user, signOut } = useAuth();
  const { syncState, pendingCount, syncNow } = useDashboard();
  const exit = async () => {
    await signOut();
    router.replace('/(auth)/entrar');
  };
  return (
    <Page>
      <Card>
        <AppText style={{ fontSize: 18, color: BRAND.ink, fontWeight: '800' }}>
          {user?.name}
        </AppText>
        <AppText style={styles.subtitle}>{user?.email}</AppText>
        <AppText style={styles.subtitle}>{user?.schools[0]?.name || 'Conta AgendAKI'}</AppText>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          ['Meus planos', '/(tabs)/planos'],
          ['Minhas turmas', '/(tabs)/turmas'],
          ['Alunos', '/alunos'],
          ['Avaliações e notas', '/avaliacoes'],
          ['Presenças', '/(tabs)/aulas'],
          ['Configurações', '/configuracoes'],
          ['Modo offline', '/offline'],
          ['Detalhes da sincronização', '/sincronizacao'],
          ['Agenda', '/calendario'],
          ['Recursos', '/recursos'],
          ['Relatórios', '/relatorios'],
          ['Notificações', '/notificacoes'],
          ['Mensagens', '/mensagens'],
          ['Tarefas', '/tarefas'],
          ['Progresso dos alunos', '/progresso'],
          ['Diário de turma', '/diario'],
          ['Comunicados', '/comunicados'],
          ['Pendências', '/pendencias'],
          ['Pesquisar', '/pesquisa'],
        ].map(([title, path], index) => (
          <View key={path} style={{ width: '48%' }}>
            <Card onPress={() => router.push(path as never)}>
              <Ionicons
                name={
                  (
                    [
                      'document-text-outline',
                      'people-outline',
                      'person-outline',
                      'stats-chart-outline',
                      'checkbox-outline',
                      'settings-outline',
                      'cloud-offline-outline',
                      'sync-outline',
                      'calendar-outline',
                      'library-outline',
                      'bar-chart-outline',
                      'notifications-outline',
                      'chatbubbles-outline',
                      'checkmark-done-outline',
                      'trending-up-outline',
                      'book-outline',
                      'megaphone-outline',
                      'checkbox-outline',
                      'search-outline',
                    ] as const
                  )[index]
                }
                size={24}
                color={
                  index === 3
                    ? BRAND.purpleInk
                    : index === 1 || index === 2
                      ? BRAND.blue
                      : BRAND.green
                }
              />
              <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>{title}</AppText>
            </Card>
          </View>
        ))}
      </View>
      <Card>
        <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>Sincronização</AppText>
        <AppText style={styles.subtitle}>
          {syncState === 'synced'
            ? 'Tudo atualizado'
            : syncState === 'offline'
              ? 'Sem internet · os dados locais estão disponíveis'
              : `${pendingCount} alteração(ões) pendentes`}
        </AppText>
        <AppText
          onPress={() => void syncNow()}
          style={{ color: BRAND.forestSoft, fontWeight: '700', paddingVertical: 4 }}
        >
          Sincronizar agora
        </AppText>
      </Card>
      <Card onPress={() => router.push('/configuracoes')}>
        <AppText style={{ fontWeight: '700' }}>Ajuda e suporte →</AppText>
      </Card>
      <Card onPress={() => void exit()}>
        <AppText style={{ color: BRAND.red, fontWeight: '800' }}>Sair da conta</AppText>
      </Card>
    </Page>
  );
}
