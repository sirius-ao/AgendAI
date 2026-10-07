import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, ChoiceField, Field, Heading, Notice, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

const id = () => `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const localDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
export default function CreatePlan() {
  const { snapshot, saveRecord, syncState } = useDashboard();
  const classes = snapshot?.data.classes || [];
  const subjects = snapshot?.data.subjects || [];
  const [title, setTitle] = useState('');
  const [objectives, setObjectives] = useState('');
  const [date, setDate] = useState(localDate());
  const [classId, setClassId] = useState(classes[0]?.recordId || '');
  const [subjectId, setSubjectId] = useState(subjects[0]?.recordId || '');
  const [time, setTime] = useState('08:00');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!classes.some((item) => item.recordId === classId) && classes.length)
      setClassId(classes[0].recordId);
    if (!subjects.some((item) => item.recordId === subjectId) && subjects.length)
      setSubjectId(subjects[0].recordId);
  }, [classes, classId, subjects, subjectId]);
  const submit = async () => {
    if (
      !title.trim() ||
      !classId ||
      !subjectId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      setError('Preencha o título, a turma, a disciplina e uma data e hora válidas.');
      return;
    }
    setBusy(true);
    try {
      await saveRecord('plans', id(), {
        title: title.trim(),
        objectives: objectives.trim(),
        classId,
        subjectId,
        date,
        startTime: time,
        duration: 45,
        status: 'Rascunho',
        lessonType: 'Aula teórica',
        modality: 'Presencial',
        content: '',
        methodology: '',
        resources: '',
        evaluation: '',
        visibility: 'Apenas eu',
        attachments: [],
        resourceIds: [],
      });
      router.replace('/(tabs)/planos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar o plano.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading title="Criar plano de aula" subtitle="Planeie a aula para a sua turma." back />
      <Card>
        <Notice text={error} type="error" />
        {!classes.length || !subjects.length ? (
          <Text style={styles.subtitle}>
            Para criar um plano, este dispositivo precisa de ter pelo menos uma turma e uma
            disciplina sincronizadas.
          </Text>
        ) : null}
        <Field
          label="Título da aula"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Equações do 2.º grau"
        />
        <Field
          label="Objetivos"
          value={objectives}
          onChangeText={setObjectives}
          multiline
          placeholder="O que os alunos vão aprender?"
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
        <ChoiceField
          label="Disciplina"
          value={subjectId}
          options={subjects.map((item) => ({
            id: item.recordId,
            label: String(item.payload.name || 'Disciplina'),
          }))}
          onSelect={setSubjectId}
        />
        <Field label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
        <Field label="Hora" value={time} onChangeText={setTime} placeholder="08:00" />
        <Button title="Guardar plano" onPress={() => void submit()} loading={busy} />
      </Card>
    </Page>
  );
}
