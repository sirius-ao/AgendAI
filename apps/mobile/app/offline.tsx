import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Offline() {
  const { snapshot, pendingCount, syncState } = useDashboard();
  return (
    <Page>
      <Heading title="Modo offline" />
      <Card style={{ backgroundColor: '#062f24' }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Sem Internet</Text>
        <Text style={{ color: '#d8e9df', lineHeight: 21 }}>
          O AgendAKI continua a funcionar com os dados guardados no dispositivo. As alterações serão
          sincronizadas quando voltar a ligar-se.
        </Text>
      </Card>
      {['Planos de aula', 'Presenças', 'Avaliações', 'Notas'].map((item) => (
        <Card key={item}>
          <Text style={{ color: '#11251d', fontWeight: '700' }}>✓ {item}</Text>
        </Card>
      ))}
      <Text style={styles.subtitle}>
        {snapshot
          ? `Dados guardados de ${snapshot.school.name}.`
          : 'Ainda não há dados sincronizados neste dispositivo.'}{' '}
        {pendingCount ? `${pendingCount} alteração(ões) pendentes.` : ''} Estado: {syncState}.
      </Text>
      <Button title="Continuar" onPress={() => router.replace('/(tabs)')} />
    </Page>
  );
}
