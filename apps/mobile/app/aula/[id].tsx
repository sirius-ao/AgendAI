import { BRAND } from '@/config';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

const value = (item: unknown) =>
  typeof item === 'string' || typeof item === 'number' ? String(item) : '';
export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useDashboard();
  const row = snapshot?.data.plans.find((item) => item.recordId === id);
  const plan = row?.payload;
  const classId = value(plan?.classId);
  const group = snapshot?.data.classes.find((item) => item.recordId === classId);
  const fields = [
    ['Objetivos', plan?.objectives],
    ['Conteúdo', plan?.content || plan?.topic],
    ['Metodologia', plan?.methodology],
    ['Recursos', plan?.resources],
    ['Avaliação', plan?.evaluation],
    ['Observações', plan?.description],
  ].filter(([, text]) => Boolean(value(text).trim()));
  return (
    <Page>
      <Heading
        title={value(plan?.title || plan?.subject) || 'Detalhes da aula'}
        subtitle={[
          value(plan?.subject),
          value(group?.payload.name || plan?.className),
          value(plan?.date),
          value(plan?.startTime),
        ]
          .filter(Boolean)
          .join(' · ')}
        back
      />
      {plan ? (
        <>
          <Card style={{ backgroundColor: BRAND.greenPale }}>
            <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>PLANO DE AULA</Text>
            <Text style={styles.subtitle}>
              Estado: {value(plan.status) || 'Rascunho'} · Duração: {value(plan.duration) || '45'}{' '}
              min
            </Text>
          </Card>
          {fields.map(([title, text]) => (
            <Card key={String(title)}>
              <Text style={{ color: BRAND.ink, fontSize: 16, fontWeight: '800' }}>
                {String(title)}
              </Text>
              <Text style={{ color: BRAND.muted, lineHeight: 22 }}>{value(text)}</Text>
            </Card>
          ))}
          <Button
            title="Marcar presença"
            onPress={() => router.push({ pathname: '/presenca', params: { planId: id, classId } })}
          />
          <Button
            title="Lançar avaliação"
            tone="purple"
            onPress={() =>
              router.push({
                pathname: '/avaliacoes',
                params: { classId, planId: id, subjectId: value(plan.subjectId) },
              })
            }
          />
        </>
      ) : (
        <Card>
          <Text style={styles.subtitle}>
            Este plano não foi encontrado. Atualize os dados da escola e tente novamente.
          </Text>
        </Card>
      )}
    </Page>
  );
}
