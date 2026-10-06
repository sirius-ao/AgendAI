import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/providers/auth-provider';

export default function TabsLayout() {
  const { syncState, pendingCount, syncNow } = useDashboard();
  const { signOut } = useAuth();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: BRAND.canvas },
        headerTintColor: BRAND.ink,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: BRAND.forestSoft,
        tabBarInactiveTintColor: BRAND.muted,
        tabBarStyle: {
          height: 66,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: BRAND.white,
          borderTopColor: BRAND.line,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: 'home-outline',
            aulas: 'book-outline',
            turmas: 'people-outline',
            planos: 'document-text-outline',
            mais: 'grid-outline',
          };
          return (
            <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />
          );
        },
        headerRight: () => (
          <Pressable onPress={() => void syncNow()} style={{ paddingHorizontal: 16 }}>
            <Text
              style={{
                color: syncState === 'error' ? BRAND.red : BRAND.forestSoft,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {syncState === 'offline'
                ? 'Offline'
                : pendingCount
                  ? `${pendingCount} pendente(s)`
                  : syncState === 'loading'
                    ? 'A sincronizar…'
                    : 'Online'}
            </Text>
          </Pressable>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', headerTitle: 'AgendAKI' }} />
      <Tabs.Screen name="aulas" options={{ title: 'Aulas', headerTitle: 'Aulas' }} />
      <Tabs.Screen name="turmas" options={{ title: 'Turmas', headerTitle: 'Turmas' }} />
      <Tabs.Screen name="planos" options={{ title: 'Planos', headerTitle: 'Planos de aula' }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais', headerTitle: 'Mais opções' }} />
    </Tabs>
  );
}
