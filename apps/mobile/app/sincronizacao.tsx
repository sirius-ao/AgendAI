import { Text } from 'react-native';
import { Button, Card, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function SyncStatus() {
  const { online, syncState, pendingCount, message, syncNow } = useDashboard();
  const title =
    syncState === 'loading'
      ? 'A sincronizar…'
      : syncState === 'synced'
        ? 'Tudo atualizado!'
        : syncState === 'error'
          ? 'Não foi possível sincronizar'
          : 'Alterações guardadas';
  return (
    <Page>
      <Heading title="Sincronização" back />
      <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
        <Text style={{ fontSize: 42 }}>{syncState === 'synced' ? '✓' : online ? '↻' : '⌁'}</Text>
        <Text style={{ color: '#11251d', fontSize: 21, fontWeight: '800' }}>{title}</Text>
        <Text style={styles.subtitle}>
          {message ||
            (pendingCount
              ? `${pendingCount} de ${pendingCount} alteração(ões) aguardam envio.`
              : online
                ? 'Os dados estão sincronizados com o servidor.'
                : 'Sem internet. O AgendAKI continua disponível com os dados locais.')}
        </Text>
        <Text style={styles.subtitle}>{online ? 'Ligação disponível' : 'Modo offline'}</Text>
      </Card>
      <Button title="Tentar novamente" onPress={() => void syncNow()} />
    </Page>
  );
}
