import { AppText } from '@/components/app-text';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Button, Card, Heading, Notice, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function AcceptInvite() {
  const { token: rawToken } = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const { authenticated, loading, acceptInvitation } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const handled = useRef(false);
  useEffect(() => {
    if (!authenticated || !token || handled.current) return;
    handled.current = true;
    setBusy(true);
    void acceptInvitation(token)
      .then(() => setAccepted(true))
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Não foi possível aceitar o convite.');
        handled.current = false;
      })
      .finally(() => setBusy(false));
  }, [authenticated, token, acceptInvitation]);
  const inviteParam = token ? `?convite=${encodeURIComponent(token)}` : '';
  return (
    <Page>
      <Heading title="Convite da escola" back />
      <Card>
        <AppText style={styles.title}>{accepted ? 'Convite aceite' : 'Aceder à escola'}</AppText>
        <AppText style={styles.subtitle}>
          {accepted
            ? 'A sua conta já está associada à escola.'
            : 'Entre ou crie a sua conta com o email que recebeu o convite.'}
        </AppText>
        <Notice
          text={error || (!token ? 'A ligação do convite não contém um código válido.' : '')}
          type="error"
        />
        {loading || busy ? (
          <AppText>A validar o convite…</AppText>
        ) : accepted ? (
          <Button title="Continuar" onPress={() => router.replace('/(tabs)')} />
        ) : !authenticated && token ? (
          <>
            <Button
              title="Entrar para aceitar"
              onPress={() => router.replace(`/(auth)/entrar${inviteParam}` as never)}
            />
            <Button
              title="Criar conta com este convite"
              onPress={() => router.replace(`/(auth)/criar-conta${inviteParam}` as never)}
            />
          </>
        ) : null}
      </Card>
    </Page>
  );
}
