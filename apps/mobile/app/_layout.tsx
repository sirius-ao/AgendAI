import { router, Stack, useSegments } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BRAND } from '@/config';
import { initializeDatabase } from '@/data/database';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DashboardProvider } from '@/providers/dashboard-provider';
import { PreferencesProvider } from '@/providers/preferences-provider';

function RouteGate() {
  const { authenticated, loading } = useAuth();
  const segments = useSegments();
  const currentPath = (segments as string[]).join('/');
  useEffect(() => {
    if (loading) return;
    const pathSegments = currentPath.split('/').filter(Boolean);
    const inAuth = pathSegments[0] === '(auth)';
    const publicTokenRoute =
      ['verificar-email', 'redefinir-senha'].includes(pathSegments[1] || '') ||
      pathSegments[0] === 'convites';
    if (!authenticated && !inAuth && !publicTokenRoute) router.replace('/(auth)/entrar');
    else if (authenticated && inAuth && !publicTokenRoute) router.replace('/(tabs)');
  }, [authenticated, currentPath, loading]);
  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="agendaki.db" onInit={initializeDatabase}>
      <AuthProvider>
        <PreferencesProvider>
          <DashboardProvider>
            <RouteGate />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: BRAND.canvas },
              }}
            />
          </DashboardProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SQLiteProvider>
  );
}
