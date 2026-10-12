import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { Switch, View } from 'react-native';
import { Button, Card, Heading, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';
import { usePreferences } from '@/providers/preferences-provider';

export default function Settings() {
  const { user } = useAuth();
  const { online, syncState, pendingCount, message, syncNow } = useDashboard();
  const { fontScale, setFontScale, notifications, setNotification } = usePreferences();
  return (
    <Page>
      <Heading title="Configurações" subtitle="Conta e sincronização" back />
      <Card>
        <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 17 }}>
          {user?.name}
        </AppText>
        <AppText style={styles.subtitle}>{user?.email}</AppText>
        <AppText style={styles.subtitle}>{user?.schools[0]?.name}</AppText>
      </Card>
      <Card>
        <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 17 }}>
          Acessibilidade
        </AppText>
        <AppText style={styles.subtitle}>
          Ajuste o tamanho do texto para facilitar a leitura.
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([1, 1.15, 1.3] as const).map((scale) => (
            <View key={scale} style={{ flex: 1, minWidth: 90 }}>
              <Button
                title={scale === 1 ? 'Normal' : `${Math.round(scale * 100)}%`}
                secondary={fontScale !== scale}
                onPress={() => setFontScale(scale)}
              />
            </View>
          ))}
        </View>
        <AppText style={{ color: BRAND.muted }}>
          Pré-visualização: {user?.name || 'Texto de exemplo'}
        </AppText>
      </Card>
      <Card>
        <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 17 }}>
          Avisos no aplicativo
        </AppText>
        <AppText style={styles.subtitle}>
          Escolha os avisos que aparecem na central de notificações.
        </AppText>
        <PreferenceToggle
          label="Aulas e eventos próximos"
          value={notifications.lessons}
          onChange={(value) => setNotification('lessons', value)}
        />
        <PreferenceToggle
          label="Tarefas e prazos"
          value={notifications.tasks}
          onChange={(value) => setNotification('tasks', value)}
        />
        <PreferenceToggle
          label="Avaliações por concluir"
          value={notifications.evaluations}
          onChange={(value) => setNotification('evaluations', value)}
        />
        <PreferenceToggle
          label="Mensagens não lidas"
          value={notifications.messages}
          onChange={(value) => setNotification('messages', value)}
        />
        <PreferenceToggle
          label="Sincronização pendente"
          value={notifications.sync}
          onChange={(value) => setNotification('sync', value)}
        />
      </Card>
      <Card>
        <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>Sincronização</AppText>
        <AppText style={styles.subtitle}>
          {online ? 'Ligação à internet disponível' : 'Sem internet'}
        </AppText>
        <AppText style={styles.subtitle}>
          {syncState === 'synced' ? 'Tudo atualizado' : `${pendingCount} alteração(ões) pendentes`}
        </AppText>
        {message ? <AppText style={{ color: BRAND.red }}>{message}</AppText> : null}
        <AppText
          onPress={() => void syncNow()}
          style={{ color: BRAND.forestSoft, fontWeight: '800', paddingVertical: 5 }}
        >
          Sincronizar agora
        </AppText>
      </Card>
      <Card>
        <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>Modo offline</AppText>
        <AppText style={styles.subtitle}>
          Os dados sincronizados ficam guardados localmente e protegidos no dispositivo. Alterações
          feitas sem internet são enviadas quando a ligação voltar.
        </AppText>
      </Card>
      <Card>
        <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>AgendAKI</AppText>
        <AppText style={styles.subtitle}>Planear hoje. Ensinar melhor.</AppText>
        <AppText style={styles.subtitle}>Versão 1.0.0</AppText>
      </Card>
    </Page>
  );
}

function PreferenceToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <AppText style={{ flex: 1, color: BRAND.ink }}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: BRAND.line, true: BRAND.greenSoft }}
        thumbColor={value ? BRAND.green : '#ffffff'}
      />
    </View>
  );
}
