import { AppText } from '@/components/app-text';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BRAND } from '@/config';
import { BrandLogo, Button, Card, Field, Notice, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/data/api';

export default function SignIn() {
  const { signIn, acceptInvitation } = useAuth();
  const params = useLocalSearchParams<{ convite?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await signIn(email, password, mfaRequired ? mfaCode : undefined);
      if (params.convite) await acceptInvitation(params.convite);
      router.replace('/(tabs)');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'MFA_REQUIRED') setMfaRequired(true);
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <View style={{ alignItems: 'center', gap: 5, paddingVertical: 20 }}>
        <BrandLogo />
      </View>
      <Card>
        <AppText style={styles.title}>
          {mfaRequired ? 'Verificação de segurança' : 'Entrar na conta'}
        </AppText>
        {mfaRequired && (
          <AppText style={styles.subtitle}>
            Introduza o código de seis dígitos da sua aplicação autenticadora.
          </AppText>
        )}
        <Notice text={error} type="error" />
        {!mfaRequired && (
          <>
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
          </>
        )}
        {mfaRequired && (
          <Field
            label="Código autenticador"
            value={mfaCode}
            onChangeText={setMfaCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
          />
        )}
        <Button title="Entrar" onPress={() => void submit()} loading={busy} />
        {!mfaRequired && (
          <Link
            href="/(auth)/recuperar"
            style={{ color: BRAND.forestSoft, textAlign: 'center', padding: 6 }}
          >
            Esqueci-me da palavra-passe
          </Link>
        )}
        {mfaRequired && (
          <Button
            title="Voltar"
            onPress={() => {
              setMfaRequired(false);
              setMfaCode('');
              setError('');
            }}
          />
        )}
      </Card>
      <AppText style={{ textAlign: 'center', color: BRAND.muted }}>
        {!mfaRequired && (
          <>
            Ainda não tem conta?{' '}
            <Link href="/(auth)/criar-conta" style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
              Criar conta
            </Link>
          </>
        )}
      </AppText>
    </Page>
  );
}
