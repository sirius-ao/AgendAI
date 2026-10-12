import { AppText } from '@/components/app-text';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BRAND } from '@/config';
import { Button, Card, ChoiceField, Empty, Field, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt')
    .trim();

export default function Plans() {
  const { snapshot } = useDashboard();
  const plans = snapshot?.data.plans || [];
  const classes = snapshot?.data.classes || [];
  const subjects = snapshot?.data.subjects || [];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const today = localDate();
  const drafts = plans.filter((row) => normalize(row.payload.status) === 'rascunho').length;
  const completed = plans.filter((row) => normalize(row.payload.status) === 'concluido').length;
  const upcoming = plans.filter(
    (row) =>
      String(row.payload.date || '').slice(0, 10) >= today &&
      normalize(row.payload.status) !== 'concluido',
  ).length;
  const visiblePlans = useMemo(() => {
    const rows = plans.filter(({ payload }) => {
      const status = normalize(payload.status);
      const date = String(payload.date || '').slice(0, 10);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'upcoming' && date >= today && status !== 'concluido') ||
        (filter === 'draft' && status === 'rascunho') ||
        (filter === 'completed' && status === 'concluido');
      const groupName = classes.find((row) => row.recordId === payload.classId)?.payload.name;
      const subjectName = subjects.find((row) => row.recordId === payload.subjectId)?.payload.name;
      const searchText = normalize(
        [payload.title, payload.subject, payload.objectives, groupName, subjectName]
          .filter(Boolean)
          .join(' '),
      );
      return matchesFilter && searchText.includes(normalize(query));
    });
    return rows.sort((a, b) => {
      const aDate = String(a.payload.date || '').slice(0, 10);
      const bDate = String(b.payload.date || '').slice(0, 10);
      const aUpcoming = aDate >= today && normalize(a.payload.status) !== 'concluido';
      const bUpcoming = bDate >= today && normalize(b.payload.status) !== 'concluido';
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      const aTime = `${aDate} ${String(a.payload.startTime || '')}`;
      const bTime = `${bDate} ${String(b.payload.startTime || '')}`;
      return aUpcoming ? aTime.localeCompare(bTime) : bTime.localeCompare(aTime);
    });
  }, [classes, filter, plans, query, subjects, today]);

  return (
    <Page>
      <Button title="＋  Criar plano de aula" onPress={() => router.push('/plano/criar')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Summary label="Total" value={plans.length} color={BRAND.ink} />
        <Summary label="Próximos" value={upcoming} color={BRAND.forestSoft} />
        <Summary label="Rascunhos" value={drafts} color={BRAND.amber} />
        <Summary label="Concluídos" value={completed} color={BRAND.purpleInk} />
      </View>
      <Field
        label="Pesquisar planos"
        value={query}
        onChangeText={setQuery}
        placeholder="Título, objetivo, turma ou disciplina"
      />
      <ChoiceField
        label="Mostrar"
        value={filter}
        options={[
          { id: 'all', label: 'Todos os planos' },
          { id: 'upcoming', label: 'Próximas aulas' },
          { id: 'draft', label: 'Rascunhos' },
          { id: 'completed', label: 'Concluídos' },
        ]}
        onSelect={setFilter}
      />
      <AppText style={{ color: BRAND.muted, fontSize: 13, fontWeight: '700' }}>
        {visiblePlans.length}{' '}
        {visiblePlans.length === 1 ? 'plano encontrado' : 'planos encontrados'}
      </AppText>
      {visiblePlans.length ? (
        visiblePlans.map(({ recordId, payload: plan }) => {
          const groupName = String(
            classes.find((row) => row.recordId === plan.classId)?.payload.name ||
              plan.className ||
              'Turma não indicada',
          );
          const subjectName = String(
            subjects.find((row) => row.recordId === plan.subjectId)?.payload.name ||
              plan.subject ||
              'Disciplina não indicada',
          );
          const status = String(plan.status || 'Planeado');
          const statusColor =
            normalize(status) === 'concluido'
              ? BRAND.purpleInk
              : normalize(status) === 'rascunho'
                ? BRAND.amber
                : BRAND.forestSoft;
          const date = String(plan.date || 'Data por definir');
          return (
            <Card key={recordId}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir plano ${String(plan.title || plan.subject || '')}`}
                onPress={() => router.push({ pathname: '/aula/[id]', params: { id: recordId } })}
                style={{ gap: 10 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText style={{ fontSize: 16, fontWeight: '800', color: BRAND.ink }}>
                      {String(plan.title || plan.subject || 'Plano de aula')}
                    </AppText>
                    <AppText style={styles.subtitle}>
                      {[groupName, subjectName].join(' · ')}
                    </AppText>
                  </View>
                  <View
                    style={{
                      backgroundColor: `${statusColor}18`,
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <AppText style={{ color: statusColor, fontSize: 11, fontWeight: '800' }}>
                      {status}
                    </AppText>
                  </View>
                </View>
                <AppText style={{ color: BRAND.muted, fontWeight: '600' }}>
                  {date} · {String(plan.startTime || 'Hora por definir')}
                  {plan.duration ? ` · ${String(plan.duration)} min` : ''}
                </AppText>
                {plan.objectives ? (
                  <AppText style={styles.subtitle} numberOfLines={2}>
                    {String(plan.objectives)}
                  </AppText>
                ) : null}
              </Pressable>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/plano/criar', params: { planId: recordId } })
                  }
                >
                  <AppText style={{ color: BRAND.forestSoft, fontWeight: '700' }}>Editar</AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/avaliacoes',
                      params: { classId: String(plan.classId || ''), planId: recordId },
                    })
                  }
                >
                  <AppText style={{ color: BRAND.purpleInk, fontWeight: '700' }}>Avaliar</AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/aula/[id]', params: { id: recordId } })}
                >
                  <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>Abrir</AppText>
                </Pressable>
              </View>
            </Card>
          );
        })
      ) : (
        <Empty
          title={plans.length ? 'Nenhum plano encontrado' : 'Os seus planos num só lugar'}
          text={
            plans.length
              ? 'Altere a pesquisa ou o filtro para ver outros planos.'
              : 'Crie o primeiro plano e consulte-o mesmo sem internet.'
          }
        />
      )}
    </Page>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card
      style={{ flexBasis: '47%', flexGrow: 1, paddingHorizontal: 10, paddingVertical: 12, gap: 4 }}
    >
      <AppText style={{ color: BRAND.muted, fontSize: 11 }}>{label}</AppText>
      <AppText style={{ color, fontSize: 20, fontWeight: '900' }}>{value}</AppText>
    </Card>
  );
}
