import { router, Stack, useSegments } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BRAND } from '@/config';
import { initializeDatabase } from '@/data/database';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DashboardProvider } from '@/providers/dashboard-provider';

function RouteGate() {
  const { authenticated, loading } = useAuth();
  const segments = useSegments();
  const currentPath = (segments as string[]).join('/');
  useEffect(() => {
    if (loading) return;
    const pathSegments = currentPath.split('/').filter(Boolean);
    const inAuth = pathSegments[0] === '(auth)';
    const publicTokenRoute = ['verificar-email', 'redefinir-senha'].includes(pathSegments[1] || '');
    if (!authenticated && !inAuth) router.replace('/(auth)/entrar');
    else if (authenticated && inAuth && !publicTokenRoute) router.replace('/(tabs)');
  }, [authenticated, currentPath, loading]);
  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="agendaki.db" onInit={initializeDatabase}>
      <AuthProvider>
        <DashboardProvider>
          <RouteGate />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BRAND.canvas } }}
          />
        </DashboardProvider>
      </AuthProvider>
    </SQLiteProvider>
  );
}
