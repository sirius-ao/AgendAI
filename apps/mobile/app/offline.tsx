import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Offline() {
  const { snapshot, pendingCount, syncState } = useDashboard();
  return (
    <Page dark>
      <StatusBar style="light" />
      <Card style={{ backgroundColor: BRAND.forest }}>
        <Ionicons name="cloud-offline-outline" size={40} color={BRAND.greenBright} />
        <AppText style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Sem Internet</AppText>
        <AppText style={{ color: '#d8e9df', lineHeight: 21 }}>
          O AgendAKI continua a funcionar com os dados guardados no dispositivo. As alterações serão
          sincronizadas quando voltar a ligar-se.
        </AppText>
      </Card>
      {['Planos de aula', 'Presenças', 'Avaliações', 'Notas'].map((item) => (
        <Card key={item} style={{ backgroundColor: BRAND.forest, borderColor: BRAND.forestSoft }}>
          <AppText style={{ color: BRAND.white, fontWeight: '700' }}>✓ {item}</AppText>
        </Card>
      ))}
      <AppText style={[styles.subtitle, { color: '#d8e9df' }]}>
        {snapshot
          ? `Dados guardados de ${snapshot.school.name}.`
          : 'Ainda não há dados sincronizados neste dispositivo.'}{' '}
        {pendingCount ? `${pendingCount} alteração(ões) pendentes.` : ''} Estado: {syncState}.
      </AppText>
      <Button title="Continuar" onPress={() => router.replace('/(tabs)')} />
    </Page>
  );
}
