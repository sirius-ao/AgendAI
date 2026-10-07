import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Card, Field, Notice, Page, Heading } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { WEBSITE_URL } from '@/config';

export default function SignUp() {
  const { signUp } = useAuth();
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
        if (parsed.protocol === 'agendaki:' && parsed.pathname.endsWith('/criar-conta') && token) setTurnstileToken(token);
      } catch { /* Ignore unrelated links. */ }
    };
    const subscription = Linking.addEventListener('url', ({ url }) => receive(url));
    void Linking.getInitialURL().then((url) => { if (url) receive(url); });
    return () => subscription.remove();
  }, []);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await signUp({ name, email, password, schoolName, turnstileToken });
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
            <Text style={{ fontSize: 20, fontWeight: '800' }}>Confirme o seu email</Text>
            <Text>
              Enviámos uma ligação de confirmação para {email}. Abra o email para ativar a conta.
            </Text>
            <Button title="Voltar a entrar" onPress={() => router.replace('/(auth)/entrar')} />
          </>
        ) : (
          <>
            <Field label="Nome completo" value={name} onChangeText={setName} autoComplete="name" />
            <Field label="Nome da escola" value={schoolName} onChangeText={setSchoolName} />
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
            <Text>Conclua a verificação no navegador e toque em “Voltar à aplicação”.</Text>
            <Button title="Criar conta" onPress={() => void submit()} loading={busy} disabled={!turnstileToken} />
          </>
        )}
      </Card>
      <Text style={{ textAlign: 'center' }}>
        Já tem conta? <Link href="/(auth)/entrar">Entrar</Link>
      </Text>
    </Page>
  );
}
