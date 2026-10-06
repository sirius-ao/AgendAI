import { Text } from 'react-native';
import { Card, Heading, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Settings() {
  const { user } = useAuth();
  const { online, syncState, pendingCount, message, syncNow } = useDashboard();
  return (
    <Page>
      <Heading title="Configurações" subtitle="Conta e sincronização" back />
      <Card>
        <Text style={{ color: '#11251d', fontWeight: '800', fontSize: 17 }}>{user?.name}</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
        <Text style={styles.subtitle}>{user?.schools[0]?.name}</Text>
      </Card>
      <Card>
        <Text style={{ color: '#11251d', fontWeight: '800' }}>Sincronização</Text>
        <Text style={styles.subtitle}>
          {online ? 'Ligação à internet disponível' : 'Sem internet'}
        </Text>
        <Text style={styles.subtitle}>
          {syncState === 'synced' ? 'Tudo atualizado' : `${pendingCount} alteração(ões) pendentes`}
        </Text>
        {message ? <Text style={{ color: '#d83b4b' }}>{message}</Text> : null}
        <Text
          onPress={() => void syncNow()}
          style={{ color: '#0b5239', fontWeight: '800', paddingVertical: 5 }}
        >
          Sincronizar agora
        </Text>
      </Card>
      <Card>
        <Text style={{ color: '#11251d', fontWeight: '800' }}>Modo offline</Text>
        <Text style={styles.subtitle}>
          Os dados sincronizados ficam guardados localmente e protegidos no dispositivo. Alterações
          feitas sem internet são enviadas quando a ligação voltar.
        </Text>
      </Card>
      <Card>
        <Text style={{ color: '#11251d', fontWeight: '800' }}>AgendAKI</Text>
        <Text style={styles.subtitle}>Planear hoje. Ensinar melhor.</Text>
        <Text style={styles.subtitle}>Versão 1.0.0</Text>
      </Card>
    </Page>
  );
}
