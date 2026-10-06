import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Card, ChoiceField, Field, Heading, Notice, Page } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';
import { useAuth } from '@/providers/auth-provider';

export default function NewStudent() {
  const { snapshot, online, refresh } = useDashboard();
  const { request } = useAuth();
  const classes = snapshot?.data.classes || [];
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(classes[0]?.recordId || '');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim() || !classId) {
      setError('Informe o nome e selecione uma turma.');
      return;
    }
    if (!online) {
      setError('Para criar um aluno, ligue-se à internet. A lista continua disponível offline.');
      return;
    }
    setBusy(true);
    try {
      await request(
        `/schools/${encodeURIComponent(snapshot?.school.id || '')}/classes/${encodeURIComponent(classId)}/students`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            contact: contact.trim() || undefined,
            status: 'ACTIVE',
          }),
        },
      );
      await refresh();
      router.replace('/alunos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar o aluno.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading title="Adicionar aluno" subtitle="A criação requer ligação à escola." back />
      <Card>
        <Notice text={error} type="error" />
        <Field label="Nome completo" value={name} onChangeText={setName} />
        <Field
          label="Contacto (opcional)"
          value={contact}
          onChangeText={setContact}
          keyboardType="phone-pad"
        />
        <ChoiceField
          label="Turma"
          value={classId}
          options={classes.map((item) => ({
            id: item.recordId,
            label: String(item.payload.name || 'Turma'),
          }))}
          onSelect={setClassId}
        />
        <Button title="Guardar aluno" onPress={() => void save()} loading={busy} />
      </Card>
    </Page>
  );
}
