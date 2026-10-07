import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, ChoiceField, Field, Heading, Notice, Page } from '@/components/ui';
import { SchoolDataStatus } from '@/components/school-data-status';
import { useDashboard } from '@/providers/dashboard-provider';
import { useAuth } from '@/providers/auth-provider';

export default function NewStudent() {
  const { snapshot, schoolId, saveRecord, syncState } = useDashboard();
  const { user } = useAuth();
  const classes = snapshot?.data.classes || [];
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(classes[0]?.recordId || '');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const role = user?.schools.find((school) => school.id === schoolId)?.role;
  useEffect(() => {
    if (!classes.some((item) => item.recordId === classId) && classes.length)
      setClassId(classes[0].recordId);
  }, [classes, classId]);
  const save = async () => {
    if (!name.trim() || !classId) {
      setError('Informe o nome e selecione uma turma.');
      return;
    }
    if (role === 'TEACHER') {
      setError('Apenas a administração pode cadastrar alunos.');
      return;
    }
    setBusy(true);
    try {
      const id = `mobile-student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await saveRecord('students', id, {
        id,
        name: name.trim(),
        classId,
        contact: contact.trim(),
        status: 'Ativo',
        createdAt: new Date().toISOString(),
      });
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
      <SchoolDataStatus />
      <Card>
        {!classes.length && (
          <Text>
            {syncState === 'loading'
              ? 'A carregar turmas…'
              : 'Sincronize uma turma para cadastrar o aluno.'}
          </Text>
        )}
        <Notice text={error} type="error" />
        {role === 'TEACHER' && (
          <Notice text="O cadastro de alunos é gerido pela administração da escola." />
        )}
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
        <Button
          title="Guardar aluno"
          onPress={() => void save()}
          loading={busy}
          disabled={role === 'TEACHER' || !classId}
        />
      </Card>
    </Page>
  );
}
