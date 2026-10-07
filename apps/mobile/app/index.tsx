import { AppText } from '@/components/app-text';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { BrandLogo } from '@/components/ui';
import { StatusBar } from 'expo-status-bar';

import { BRAND } from '@/config';
import { useAuth } from '@/providers/auth-provider';

export default function Index() {
  const { loading, authenticated } = useAuth();
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND.forest,
        }}
      >
        <StatusBar style="light" />
        <BrandLogo dark />
        <ActivityIndicator style={{ marginTop: 32 }} size="large" color={BRAND.greenBright} />
        <AppText style={{ color: BRAND.white, marginTop: 14 }}>A preparar o seu ambiente…</AppText>
      </View>
    );
  return <Redirect href={authenticated ? '/(tabs)' : '/(auth)/entrar'} />;
}
