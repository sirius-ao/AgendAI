import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
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
          backgroundColor: BRAND.canvas,
        }}
      >
        <ActivityIndicator size="large" color={BRAND.green} />
      </View>
    );
  return <Redirect href={authenticated ? '/(tabs)' : '/(auth)/entrar'} />;
}
