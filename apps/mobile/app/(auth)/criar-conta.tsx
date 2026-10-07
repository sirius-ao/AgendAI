import { AppText } from '@/components/app-text';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Button, Card, Field, Notice, Page, Heading } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { WEBSITE_URL } from '@/config';

export default function SignUp() {
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{ convite?: string }>();
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  useEffect(() => {
    const receive = (url: string) => {
      try {
        const parsed = new URL(url);
        const token = parsed.searchParams.get('turnstileToken');
        if (parsed.protocol === 'agendaki:' && parsed.pathname.endsWith('/criar-conta') && token)
          setTurnstileToken(token);
      } catch {
        /* Ignore unrelated links. */
      }
    };
    const subscription = Linking.addEventListener('url', ({ url }) => receive(url));
    void Linking.getInitialURL().then((url) => {
      if (url) receive(url);
    });
    return () => subscription.remove();
  }, []);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await signUp({
        name,
        email,
        password,
        schoolName: params.convite ? undefined : schoolName,
        invitationToken: params.convite,
        turnstileToken,
      });
      if (result.verificationRequired) setDone(true);
      else router.replace('/(tabs)');
    } catch (e) {
      setTurnstileToken('');
      setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading title="Criar conta" subtitle="Comece a organizar o seu trabalho." back />
      <Card>
        <Notice text={error} type="error" />
        {done ? (
          <>
            <AppText style={{ fontSize: 20, fontWeight: '800' }}>Confirme o seu email</AppText>
            <AppText>
              Enviámos uma ligação de confirmação para {email}. Abra o email para ativar a conta.
            </AppText>
            <Button title="Voltar a entrar" onPress={() => router.replace('/(auth)/entrar')} />
          </>
        ) : (
          <>
            <Field label="Nome completo" value={name} onChangeText={setName} autoComplete="name" />
            {!params.convite && (
              <Field label="Nome da escola" value={schoolName} onChangeText={setSchoolName} />
            )}
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
              autoComplete="new-password"
            />
            <Button
              title={turnstileToken ? 'Verificação concluída' : 'Verificar com Cloudflare'}
              onPress={() => void Linking.openURL(`${WEBSITE_URL}/turnstile/register`)}
              disabled={busy}
            />
            <AppText>Conclua a verificação no navegador e toque em “Voltar à aplicação”.</AppText>
            <Button
              title="Criar conta"
              onPress={() => void submit()}
              loading={busy}
              disabled={!turnstileToken}
            />
          </>
        )}
      </Card>
      <AppText style={{ textAlign: 'center' }}>
        Já tem conta?{' '}
        <Link
          href={
            params.convite
              ? (`/(auth)/entrar?convite=${encodeURIComponent(params.convite)}` as never)
              : '/(auth)/entrar'
          }
        >
          Entrar
        </Link>
      </AppText>
    </Page>
  );
}
