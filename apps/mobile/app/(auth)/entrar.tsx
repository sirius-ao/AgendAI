import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { BRAND } from '@/config';
import { Button, Card, Field, Notice, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <View style={{ alignItems: 'center', gap: 5, paddingVertical: 20 }}>
        <Text style={{ color: BRAND.green, fontSize: 48, fontWeight: '900' }}>◈</Text>
        <Text style={{ color: BRAND.forest, fontSize: 30, fontWeight: '900' }}>
          Agend<Text style={{ color: BRAND.green }}>AKI</Text>
        </Text>
        <Text style={styles.subtitle}>Planear hoje. Ensinar melhor.</Text>
      </View>
      <Card>
        <Text style={styles.title}>Entrar na conta</Text>
        <Notice text={error} type="error" />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Palavra-passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Button title="Entrar" onPress={() => void submit()} loading={busy} />
        <Link
          href="/(auth)/recuperar"
          style={{ color: BRAND.forestSoft, textAlign: 'center', padding: 6 }}
        >
          Esqueci-me da palavra-passe
        </Link>
      </Card>
      <Text style={{ textAlign: 'center', color: BRAND.muted }}>
        Ainda não tem conta?{' '}
        <Link href="/(auth)/criar-conta" style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
          Criar conta
        </Link>
      </Text>
    </Page>
  );
}
