import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, View } from 'react-native';
import { Button, Card, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function SyncStatus() {
  const {
    online,
    syncState,
    pendingCount,
    message,
    failedOperations,
    retryFailedOperation,
    discardFailedOperation,
    syncNow,
  } = useDashboard();
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
        <AppText style={{ color: BRAND.ink, fontSize: 21, fontWeight: '800' }}>{title}</AppText>
        <AppText style={styles.subtitle}>
          {message ||
            (pendingCount
              ? `${pendingCount} de ${pendingCount} alteração(ões) aguardam envio.`
              : online
                ? 'Os dados estão sincronizados com o servidor.'
                : 'Sem internet. O AgendAKI continua disponível com os dados locais.')}
        </AppText>
        <AppText style={styles.subtitle}>{online ? 'Ligação disponível' : 'Modo offline'}</AppText>
        <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>
          {pendingCount
            ? `${pendingCount} alteração(ões) guardadas neste dispositivo`
            : 'Nenhuma alteração pendente'}
        </AppText>
        {pendingCount > 0 && (
          <AppText style={styles.subtitle}>
            Os dados permanecem no dispositivo até serem aceites pelo servidor. A sincronização
            volta a tentar quando a ligação regressar ou ao abrir esta tela.
          </AppText>
        )}
      </Card>
      {failedOperations.map((failure) => (
        <Card key={failure.operationId}>
          <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>
            Alteração não sincronizada
          </AppText>
          <AppText style={styles.subtitle}>
            {failure.collection} · {failure.recordId}
          </AppText>
          <AppText style={styles.subtitle}>{failure.message}</AppText>
          <Button
            title="Tentar novamente"
            onPress={() => void retryFailedOperation(failure.operationId)}
          />
          <Button
            title="Remover alteração local"
            onPress={() =>
              Alert.alert(
                'Remover alteração?',
                'Esta ação apaga a cópia pendente deste dispositivo.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => void discardFailedOperation(failure.operationId),
                  },
                ],
              )
            }
          />
        </Card>
      ))}
      <Button
        title={
          syncState === 'synced' ? 'Continuar' : online ? 'Tentar novamente' : 'Atualizar estado'
        }
        onPress={() => (syncState === 'synced' ? router.replace('/(tabs)') : void syncNow())}
      />
    </Page>
  );
}
