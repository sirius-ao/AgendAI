import { AppText } from '@/components/app-text';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  Button,
  Card,
  ChoiceField,
  Empty,
  Field,
  Heading,
  Notice,
  Page,
  styles,
} from '@/components/ui';
import { BRAND } from '@/config';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const makeId = () => `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export default function Announcements() {
  const { snapshot, saveRecord, syncState } = useDashboard();
  const { user } = useAuth();
  const classes = snapshot?.data.classes || [];
  const role = user?.schools.find((school) => school.id === snapshot?.school.id)?.role;
  const canPublish = ['OWNER', 'ADMIN', 'COORDINATOR'].includes(String(role));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [classId, setClassId] = useState('all');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const announcements = useMemo(
    () =>
      (snapshot?.data.announcements || [])
        .filter(
          (row) =>
            !row.payload.classId ||
            classes.some((item) => item.recordId === row.payload.classId) ||
            canPublish,
        )
        .sort((a, b) => String(b.payload.date || '').localeCompare(String(a.payload.date || ''))),
    [canPublish, classes, snapshot],
  );
  const publish = async () => {
    if (!title.trim() || body.trim().length < 3) {
      setNotice('Escreva um título e o conteúdo do comunicado.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const id = makeId();
      await saveRecord('announcements', id, {
        id,
        title: title.trim(),
        body: body.trim(),
        date: localDate(),
        createdById: user?.id,
        audience: classId === 'all' ? 'school' : 'class',
        ...(classId !== 'all' ? { classId } : {}),
        published: true,
      });
      setTitle('');
      setBody('');
      setNotice('Comunicado publicado para a escola.');
    } catch (cause) {
      Alert.alert(
        'Não foi possível publicar',
        cause instanceof Error ? cause.message : 'Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading title="Comunicados" subtitle="Avisos importantes da escola e das turmas." back />
      {canPublish ? (
        <Card>
          <AppText style={{ color: BRAND.ink, fontSize: 16, fontWeight: '800' }}>
            Novo comunicado
          </AppText>
          <Notice
            text={notice}
            type={notice.startsWith('Comunicado publicado') ? 'success' : 'error'}
          />
          <Field
            label="Título"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            placeholder="Ex.: Reunião de encarregados"
          />
          <Field
            label="Mensagem"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={5000}
            placeholder="Escreva o aviso para a comunidade escolar"
          />
          <ChoiceField
            label="Destinatários"
            value={classId}
            options={[
              { id: 'all', label: 'Toda a escola' },
              ...classes.map((row) => ({
                id: row.recordId,
                label: String(row.payload.name || 'Turma'),
              })),
            ]}
            onSelect={setClassId}
          />
          <Button title="Publicar comunicado" onPress={() => void publish()} loading={busy} />
        </Card>
      ) : (
        <Card style={{ backgroundColor: BRAND.greenPale }}>
          <AppText style={{ color: BRAND.forestSoft, fontWeight: '800' }}>AVISOS ESCOLARES</AppText>
          <AppText style={styles.subtitle}>
            Os comunicados são publicados pela administração da escola.
          </AppText>
        </Card>
      )}
      <AppText style={{ color: BRAND.ink, fontSize: 17, fontWeight: '800' }}>Mais recentes</AppText>
      {announcements.length ? (
        announcements.map((row) => {
          const className = classes.find((item) => item.recordId === row.payload.classId)?.payload
            .name;
          return (
            <Card key={row.recordId}>
              <AppText style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
                {String(row.payload.date || 'Comunicado escolar')} ·{' '}
                {String(className || 'Toda a escola')}
              </AppText>
              <AppText style={{ color: BRAND.ink, fontSize: 16, fontWeight: '800' }}>
                {String(row.payload.title || 'Aviso')}
              </AppText>
              <AppText style={styles.subtitle}>
                {String(row.payload.body || row.payload.message || '')}
              </AppText>
            </Card>
          );
        })
      ) : (
        <Empty
          title={syncState === 'loading' ? 'A carregar comunicados…' : 'Sem comunicados'}
          text="Os avisos publicados pela administração aparecerão aqui."
        />
      )}
    </Page>
  );
}
