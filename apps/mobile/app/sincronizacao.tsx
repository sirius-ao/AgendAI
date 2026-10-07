import { BRAND } from '@/config';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
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
        <View
          style={{
            padding: 18,
            borderRadius: 50,
            backgroundColor: syncState === 'synced' ? BRAND.greenSoft : BRAND.purplePale,
          }}
        >
          <Ionicons
            name={
              syncState === 'synced'
                ? 'checkmark-circle'
                : online
                  ? 'sync-outline'
                  : 'cloud-offline-outline'
            }
            size={48}
            color={syncState === 'synced' ? BRAND.green : BRAND.purple}
          />
        </View>
        <Text style={{ color: BRAND.ink, fontSize: 21, fontWeight: '800' }}>{title}</Text>
        <Text style={styles.subtitle}>
          {message ||
            (pendingCount
              ? `${pendingCount} de ${pendingCount} alteração(ões) aguardam envio.`
              : online
                ? 'Os dados estão sincronizados com o servidor.'
                : 'Sem internet. O AgendAKI continua disponível com os dados locais.')}
        </Text>
        <Text style={styles.subtitle}>{online ? 'Ligação disponível' : 'Modo offline'}</Text>
        <Text style={{ color: BRAND.ink, fontWeight: '700' }}>
          {pendingCount
            ? `${pendingCount} alteração(ões) guardadas neste dispositivo`
            : 'Nenhuma alteração pendente'}
        </Text>
        {pendingCount > 0 && (
          <Text style={styles.subtitle}>
            Os dados permanecem no dispositivo até serem aceites pelo servidor. A sincronização
            volta a tentar quando a ligação regressar ou ao abrir esta tela.
          </Text>
        )}
      </Card>
      <Button
        title={
          syncState === 'synced' ? 'Continuar' : online ? 'Tentar novamente' : 'Atualizar estado'
        }
        onPress={() => (syncState === 'synced' ? router.replace('/(tabs)') : void syncNow())}
      />
    </Page>
  );
}
