import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Heading, Notice, Page } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function Recover() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await forgotPassword(email);
      setMessage(
        'Se o email estiver registado, receberá uma ligação para redefinir a palavra-passe.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar o pedido.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading title="Recuperar acesso" back />
      <Card>
        <Notice text={error} type="error" />
        <Notice text={message} type="success" />
        <Field
          label="Email da conta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button title="Enviar ligação" onPress={() => void submit()} loading={busy} />
        <Button title="Voltar" secondary onPress={() => router.back()} />
      </Card>
    </Page>
  );
}
