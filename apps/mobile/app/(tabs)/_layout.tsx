import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';
import { Pressable, Text, View } from 'react-native';
import { BrandLogo } from '@/components/ui';

export default function TabsLayout() {
  const { syncState, pendingCount, syncNow } = useDashboard();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: BRAND.canvas },
        headerTintColor: BRAND.ink,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: BRAND.green,
        tabBarInactiveTintColor: BRAND.muted,
        tabBarStyle: {
          height: 66,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: BRAND.white,
          borderTopColor: BRAND.line,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: focused ? 'home' : 'home-outline',
            aulas: 'calendar-outline',
            turmas: focused ? 'people' : 'people-outline',
            planos: focused ? 'document-text' : 'document-text-outline',
            mais: 'ellipsis-horizontal',
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
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', headerTitle: () => <BrandLogo compact /> }}
      />
      <Tabs.Screen name="aulas" options={{ title: 'Aulas', headerTitle: 'Aulas' }} />
      <Tabs.Screen name="turmas" options={{ title: 'Turmas', headerTitle: 'Turmas' }} />
      <Tabs.Screen name="planos" options={{ title: 'Planos', headerTitle: 'Planos de aula' }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais', headerTitle: 'Mais opções' }} />
    </Tabs>
  );
}
