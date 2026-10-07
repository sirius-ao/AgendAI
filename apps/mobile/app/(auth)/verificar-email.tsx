import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, Heading, Notice, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  const [message, setMessage] = useState(
    token ? 'A confirmar o seu email…' : 'A ligação de confirmação não contém um token válido.',
  );
  useEffect(() => {
    let active = true;
    if (token)
      void verifyEmail(token)
        .then(() => {
          if (active) {
            setStatus('success');
            setMessage('Email confirmado. Já pode entrar na sua conta.');
          }
        })
        .catch((error) => {
          if (active) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'A ligação é inválida ou expirou.');
          }
        });
    return () => {
      active = false;
    };
  }, [token, verifyEmail]);
  return (
    <Page>
      <Heading title="Confirmar email" subtitle="Proteja o acesso à sua conta." />
      <Card>
        <AppText style={{ color: BRAND.ink, fontSize: 20, fontWeight: '800' }}>
          {status === 'loading'
            ? 'A validar ligação'
            : status === 'success'
              ? 'Email confirmado'
              : 'Não foi possível confirmar'}
        </AppText>
        <Notice
          text={message}
          type={status === 'error' ? 'error' : status === 'success' ? 'success' : 'info'}
        />
        <AppText style={styles.subtitle}>
          A ligação de confirmação só pode ser utilizada uma vez.
        </AppText>
        <Button title="Voltar a entrar" onPress={() => router.replace('/(auth)/entrar')} />
      </Card>
    </Page>
  );
}
