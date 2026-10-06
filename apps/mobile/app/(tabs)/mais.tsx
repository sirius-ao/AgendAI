import { router } from 'expo-router';
import { Text, View } from 'react-native';
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
        <Text style={{ fontSize: 18, color: '#11251d', fontWeight: '800' }}>{user?.name}</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
        <Text style={styles.subtitle}>{user?.schools[0]?.name || 'Conta AgendAKI'}</Text>
      </Card>
      <View style={{ gap: 10 }}>
        {[
          ['Meus planos', '/(tabs)/planos'],
          ['Minhas turmas', '/(tabs)/turmas'],
          ['Alunos', '/alunos'],
          ['Avaliações e notas', '/avaliacoes'],
          ['Presenças', '/(tabs)/aulas'],
          ['Configurações', '/configuracoes'],
          ['Modo offline', '/offline'],
          ['Detalhes da sincronização', '/sincronizacao'],
        ].map(([title, path]) => (
          <Card key={path} onPress={() => router.push(path as never)}>
            <Text style={{ color: '#11251d', fontWeight: '700' }}>{title} →</Text>
          </Card>
        ))}
      </View>
      <Card>
        <Text style={{ color: '#11251d', fontWeight: '800' }}>Sincronização</Text>
        <Text style={styles.subtitle}>
          {syncState === 'synced'
            ? 'Tudo atualizado'
            : syncState === 'offline'
              ? 'Sem internet · os dados locais estão disponíveis'
              : `${pendingCount} alteração(ões) pendentes`}
        </Text>
        <Text
          onPress={() => void syncNow()}
          style={{ color: '#0b5239', fontWeight: '700', paddingVertical: 4 }}
        >
          Sincronizar agora
        </Text>
      </Card>
      <Card onPress={() => router.push('/configuracoes')}>
        <Text style={{ fontWeight: '700' }}>Ajuda e suporte →</Text>
      </Card>
      <Card onPress={() => void exit()}>
        <Text style={{ color: '#d83b4b', fontWeight: '800' }}>Sair da conta</Text>
      </Card>
    </Page>
  );
}
