import { BRAND } from '@/config';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Card, Empty, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Lessons() {
  const { snapshot } = useDashboard();
  const plans = snapshot?.data.plans || [];
  return (
    <Page>
      <Text style={styles.subtitle}>Os seus planos e ações de aula.</Text>
      {plans.length ? (
        plans.map((row) => {
          const p = row.payload;
          return (
            <Card
              key={row.recordId}
              onPress={() =>
                router.push({
                  pathname: '/presenca',
                  params: { planId: row.recordId, classId: String(p.classId || '') },
                })
              }
            >
              <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
                {String(p.subject || p.title || 'Aula')}
              </Text>
              <Text style={styles.subtitle}>
                {[p.date, p.startTime, p.className || p.classId].filter(Boolean).join(' · ')}
              </Text>
              <Text style={{ color: BRAND.forestSoft, fontWeight: '700' }}>Abrir presenças →</Text>
            </Card>
          );
        })
      ) : (
        <Empty title="Sem aulas planeadas" text="Os planos de aula aparecerão aqui." />
      )}
    </Page>
  );
}
