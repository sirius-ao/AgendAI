import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { BRAND } from '@/config';
import { Card, ChoiceField, Empty, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Home() {
  const { user } = useAuth();
  const { snapshot, schoolId, selectSchool, syncState, pendingCount, message, syncNow } =
    useDashboard();
  const plans = snapshot?.data.plans || [];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nextRow =
    plans.find(
      (row) => String(row.payload.date || row.payload.lessonDate || '').slice(0, 10) >= today,
    ) || plans[0];
  const next = nextRow?.payload;
  const greeting =
    new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <Page>
      <View style={{ gap: 4, paddingVertical: 4 }}>
        <Text style={{ color: BRAND.muted }}>{greeting},</Text>
        <Text style={styles.title}>{user?.name?.split(' ')[0] || 'Professor'} 👋</Text>
        <Text style={styles.subtitle}>
          {now.toLocaleDateString('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>
      {syncState === 'offline' || syncState === 'pending' || syncState === 'error' ? (
        <Card style={{ backgroundColor: syncState === 'error' ? '#fff8eb' : BRAND.greenPale }}>
          <Text style={{ color: BRAND.forest, fontWeight: '800' }}>
            {syncState === 'offline'
              ? 'Modo offline'
              : syncState === 'error'
                ? 'Falha ao sincronizar'
                : 'Alterações por sincronizar'}
          </Text>
          <Text style={styles.subtitle}>
            {message ||
              (pendingCount
                ? `${pendingCount} alteração(ões) guardada(s) neste dispositivo.`
                : 'Os dados guardados continuam disponíveis.')}
          </Text>
        </Card>
      ) : null}
      {next ? (
        <Card style={{ backgroundColor: '#eefaf3' }}>
          <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>◉ PRÓXIMA AULA</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.ink }}>
            {String(next.subject || next.title || 'Aula')}
          </Text>
          <Text style={styles.subtitle}>
            {[next.startTime || next.time, next.className || next.classId]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={{ color: BRAND.muted }}>{String(next.objectives || next.topic || '')}</Text>
        </Card>
      ) : (
        <Empty title="Ainda sem aulas" text="Crie um plano de aula para organizar a sua semana." />
      )}
      <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.ink }}>Acesso rápido</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Quick
          title="Presenças"
          icon="checkmark-done-outline"
          onPress={() => router.push('/(tabs)/aulas')}
        />
        <Quick
          title="Avaliações"
          icon="stats-chart-outline"
          onPress={() => router.push('/avaliacoes')}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Quick
          title="Criar plano"
          icon="add-circle-outline"
          onPress={() => router.push('/plano/criar')}
        />
        <Quick title="Alunos" icon="people-outline" onPress={() => router.push('/alunos')} />
      </View>
      <Card>
        <Text style={{ fontWeight: '800', color: BRAND.ink }}>Hoje na escola</Text>
        {user && user.schools.length > 1 ? (
          <ChoiceField
            label="Escola"
            value={schoolId}
            options={user.schools.map((school) => ({ id: school.id, label: school.name }))}
            onSelect={(id) => {
              void selectSchool(id);
            }}
          />
        ) : null}
        <Text style={styles.subtitle}>
          {snapshot?.school.name ||
            user?.schools.find((school) => school.id === schoolId)?.name ||
            'A sua escola'}
        </Text>
        <Text style={{ color: BRAND.muted }}>
          {(snapshot?.data.classes || []).length} turmas · {(snapshot?.data.students || []).length}{' '}
          alunos · {plans.length} planos de aula
        </Text>
      </Card>
      <Text
        onPress={() => void syncNow()}
        style={{ color: BRAND.forestSoft, textAlign: 'center', padding: 8 }}
      >
        Atualizar dados
      </Text>
    </Page>
  );
}
function Quick({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
      <Ionicons name={icon} size={25} color={BRAND.forestSoft} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.ink }}>{title}</Text>
    </Card>
  );
}
