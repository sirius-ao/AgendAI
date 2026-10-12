import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { router } from 'expo-router';

import { Card, Empty, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Lessons() {
  const { snapshot } = useDashboard();
  const plans = snapshot?.data.plans || [];
  return (
    <Page>
      <AppText style={styles.subtitle}>Os seus planos e ações de aula.</AppText>
      {plans.length ? (
        plans.map((row) => {
          const p = row.payload;
          return (
            <Card
              key={row.recordId}
              onPress={() =>
                router.push({
                  pathname: '/aula/[id]',
                  params: { id: row.recordId },
                })
              }
            >
              <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
                {String(p.subject || p.title || 'Aula')}
              </AppText>
              <AppText style={styles.subtitle}>
                {[p.date, p.startTime, p.className || p.classId].filter(Boolean).join(' · ')}
              </AppText>
              <AppText style={{ color: BRAND.forestSoft, fontWeight: '700' }}>
                Ver detalhes da aula →
              </AppText>
            </Card>
          );
        })
      ) : (
        <Empty title="Sem aulas planeadas" text="Os planos de aula aparecerão aqui." />
      )}
    </Page>
  );
}
