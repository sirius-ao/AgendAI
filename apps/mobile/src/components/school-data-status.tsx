import { ActivityIndicator, Text } from 'react-native';
import { BRAND } from '@/config';
import { Button, ChoiceField, Notice, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

export function SchoolDataStatus() {
  const { user } = useAuth();
  const { snapshot, schoolId, selectSchool, syncState, message, syncNow } = useDashboard();
  return (
    <>
      {user && user.schools.length > 1 ? (
        <ChoiceField
          label="Escola"
          value={schoolId}
          options={user.schools.map((school) => ({ id: school.id, label: school.name }))}
          onSelect={(id) => {
            void selectSchool(id);
          }}
        />
      ) : (
        <Text style={styles.subtitle}>
          {snapshot?.school.name ||
            user?.schools.find((school) => school.id === schoolId)?.name ||
            'A sua escola'}
        </Text>
      )}
      {syncState === 'loading' && (
        <ActivityIndicator accessibilityLabel="A carregar os dados da escola" color={BRAND.green} />
      )}
      {message && <Notice text={message} type={syncState === 'error' ? 'error' : 'info'} />}
      {syncState === 'offline' && (
        <Notice text="Sem ligação. A mostrar os dados guardados neste dispositivo." />
      )}
      <Button
        title="Atualizar dados"
        secondary
        loading={syncState === 'loading'}
        onPress={() => void syncNow()}
      />
    </>
  );
}
