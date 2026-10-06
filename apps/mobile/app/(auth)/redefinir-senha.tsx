import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Heading, Notice, Page } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError('');
    setMessage('');
    if (!token) {
      setError('A ligação não contém um token válido.');
      return;
    }
    if (password.length < 10) {
      setError('A palavra-passe deve ter pelo menos 10 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As palavras-passe não coincidem.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setMessage('Palavra-passe alterada. Já pode entrar com a nova palavra-passe.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível redefinir a palavra-passe.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading title="Nova palavra-passe" subtitle="Escolha uma palavra-passe segura." back />
      <Card>
        <Notice text={error} type="error" />
        <Notice text={message} type="success" />
        <Field
          label="Nova palavra-passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Field
          label="Confirmar palavra-passe"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
        />
        <Button title="Guardar palavra-passe" onPress={() => void submit()} loading={busy} />
        {message ? (
          <Button
            title="Ir para entrar"
            secondary
            onPress={() => router.replace('/(auth)/entrar')}
          />
        ) : null}
      </Card>
    </Page>
  );
}
