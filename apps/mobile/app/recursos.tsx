import { AppText } from '@/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import { useMemo, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { Button, Card, Empty, Field, Heading, Notice, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Resources() {
  const { snapshot, saveRecord, online } = useDashboard();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const resources = snapshot?.data.resources || [];
  const library = snapshot?.data.library || [];
  const filtered = useMemo(
    () =>
      resources.filter(({ payload }) =>
        `${payload.title || ''} ${payload.subject || ''} ${payload.category || ''} ${payload.description || ''}`
          .toLocaleLowerCase('pt')
          .includes(query.toLocaleLowerCase('pt')),
      ),
    [resources, query],
  );
  const saveOffline = async (recordId: string, payload: Record<string, unknown>) => {
    try {
      const fileUrl = payload.downloadUrl || payload.fileUrl || payload.url;
      let localUri: string | undefined;
      if (typeof fileUrl === 'string') {
        const parsed = new URL(fileUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
          throw new Error('O endereço deste recurso não é válido.');
        const directory = new Directory(Paths.document, 'recursos');
        if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
        const extension = parsed.pathname.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] || '.bin';
        const file = await File.downloadFileAsync(
          fileUrl,
          new File(directory, `${recordId.replace(/[^a-zA-Z0-9_-]/g, '_')}${extension}`),
          { idempotent: true },
        );
        localUri = file.uri;
      }
      await saveRecord('library', recordId, {
        id: recordId,
        resourceId: recordId,
        title: payload.title,
        category: payload.category,
        subjectId: payload.subjectId,
        description: payload.description,
        offlineAvailable: true,
        localUri,
        savedAt: new Date().toISOString(),
      });
      setNotice(
        localUri
          ? 'Ficheiro descarregado e guardado offline.'
          : 'Registo guardado na biblioteca offline. Este recurso não tem ficheiro para descarregar.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível guardar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    }
  };
  const open = async (payload: Record<string, unknown>, recordId: string) => {
    const cached = library.find(
      (row) => row.recordId === recordId || row.payload.resourceId === recordId,
    )?.payload.localUri;
    if (typeof cached === 'string') {
      await Linking.openURL(cached);
      return;
    }
    const url = payload.downloadUrl || payload.fileUrl || payload.url;
    if (typeof url === 'string') await Linking.openURL(url);
    else
      setNotice(
        'Este recurso não tem ficheiro associado. O registo fica disponível na biblioteca offline.',
      );
  };
  return (
    <Page>
      <Heading
        title="Recursos"
        subtitle="Explore materiais e guarde-os na biblioteca offline."
        back
      />
      <Notice text={notice} type="success" />
      {!online ? (
        <Notice text="Offline: são apresentados os recursos que já estão guardados neste dispositivo." />
      ) : null}
      <Field
        label="Pesquisar recursos"
        value={query}
        onChangeText={setQuery}
        placeholder="Título, disciplina ou categoria"
      />
      {filtered.length ? (
        filtered.map(({ recordId, payload }) => {
          const saved = library.some(
            (row) => row.recordId === recordId || row.payload.resourceId === recordId,
          );
          return (
            <Card key={recordId}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="book-outline" size={25} color={BRAND.green} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
                    {String(payload.title || 'Recurso')}
                  </AppText>
                  <AppText style={styles.subtitle}>
                    {[payload.subjectName || payload.category, payload.level, payload.format]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                </View>
              </View>
              {payload.description ? (
                <AppText style={styles.subtitle}>{String(payload.description)}</AppText>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  title={saved ? 'Guardado offline' : '＋ Guardar offline'}
                  tone={saved ? 'soft' : 'green'}
                  onPress={() => void saveOffline(recordId, payload)}
                />
                <Button title="Abrir" secondary onPress={() => void open(payload, recordId)} />
              </View>
            </Card>
          );
        })
      ) : (
        <Empty
          title="Sem recursos"
          text={
            query
              ? 'Não encontrámos recursos com essa pesquisa.'
              : 'Os recursos partilhados pela escola aparecerão aqui.'
          }
        />
      )}
    </Page>
  );
}
