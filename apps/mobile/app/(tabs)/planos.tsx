import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BRAND } from '@/config';
import { Button, Card, Empty, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Plans() {
  const { snapshot } = useDashboard();
  const plans = snapshot?.data.plans || [];
  return (
    <Page>
      <Button title="＋  Criar plano de aula" onPress={() => router.push('/plano/criar')} />
      {plans.length ? (
        plans.map(({ recordId, payload: p }) => (
          <Card
            key={recordId}
            onPress={() =>
              router.push({
                pathname: '/aula/[id]',
                params: { id: recordId },
              })
            }
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.ink, flex: 1 }}>
                {String(p.title || p.subject || 'Plano de aula')}
              </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/avaliacoes',
                    params: { classId: String(p.classId || ''), planId: recordId },
                  })
                }
              >
                <Text style={{ color: BRAND.purpleInk, fontWeight: '700' }}>Avaliar</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              {[p.subject, p.className || p.classId, p.date].filter(Boolean).join(' · ')}
            </Text>
            <Text style={{ color: BRAND.muted }}>{String(p.objectives || p.topic || '')}</Text>
          </Card>
        ))
      ) : (
        <Empty
          title="Os seus planos num só lugar"
          text="Crie o primeiro plano e consulte-o mesmo sem internet."
        />
      )}
    </Page>
  );
}
