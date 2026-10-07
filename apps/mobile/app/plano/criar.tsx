import { AppText } from '@/components/app-text';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Button, Card, ChoiceField, Field, Heading, Notice, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

const newId = () => `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const localDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
export default function CreatePlan() {
  const {
    planId,
    date: requestedDate,
    classId: requestedClass,
    subjectId: requestedSubject,
  } = useLocalSearchParams<{
    planId?: string;
    date?: string;
    classId?: string;
    subjectId?: string;
  }>();
  const { snapshot, saveRecord, syncState } = useDashboard();
  const classes = snapshot?.data.classes || [];
  const subjects = snapshot?.data.subjects || [];
  const existing = snapshot?.data.plans.find((row) => row.recordId === planId);
  const plan = existing?.payload;
  const initialized = useRef(false);
  const [title, setTitle] = useState('');
  const [objectives, setObjectives] = useState('');
  const [content, setContent] = useState('');
  const [methodology, setMethodology] = useState('');
  const [resources, setResources] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(localDate());
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState('45');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (initialized.current) return;
    if (!snapshot) return;
    if (planId && !plan) return;
    if (plan) {
      setTitle(String(plan.title || plan.subject || ''));
      setObjectives(String(plan.objectives || ''));
      setContent(String(plan.content || plan.topic || ''));
      setMethodology(String(plan.methodology || ''));
      setResources(String(plan.resources || ''));
      setEvaluation(String(plan.evaluation || ''));
      setDescription(String(plan.description || ''));
      setDate(String(plan.date || localDate()).slice(0, 10));
      setClassId(String(plan.classId || classes[0]?.recordId || ''));
      setSubjectId(String(plan.subjectId || subjects[0]?.recordId || ''));
      setTime(String(plan.startTime || plan.time || '08:00'));
      setDuration(String(plan.duration || 45));
    } else {
      setClassId(
        classes.some((row) => row.recordId === requestedClass)
          ? String(requestedClass)
          : classes[0]?.recordId || '',
      );
      setSubjectId(
        subjects.some((row) => row.recordId === requestedSubject)
          ? String(requestedSubject)
          : subjects[0]?.recordId || '',
      );
      if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) setDate(requestedDate);
    }
    initialized.current = true;
  }, [classes, plan, planId, requestedClass, requestedDate, requestedSubject, snapshot, subjects]);
  const submit = async () => {
    if (
      !title.trim() ||
      !classId ||
      !subjectId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      !/^\d+$/.test(duration) ||
      Number(duration) < 1 ||
      Number(duration) > 600
    ) {
      setError(
        'Preencha o título, turma, disciplina, data, hora e duração válida (1 a 600 minutos).',
      );
      return;
    }
    if (planId && !plan) {
      setError('O plano ainda não foi carregado. Sincronize os dados e tente novamente.');
      return;
    }
    setBusy(true);
    try {
      const recordId = planId || newId();
      await saveRecord('plans', recordId, {
        ...plan,
        id: recordId,
        title: title.trim(),
        objectives: objectives.trim(),
        content: content.trim(),
        methodology: methodology.trim(),
        resources: resources.trim(),
        evaluation: evaluation.trim(),
        description: description.trim(),
        classId,
        subjectId,
        date,
        startTime: time,
        duration: Number(duration),
        status: plan?.status || 'Rascunho',
        lessonType: plan?.lessonType || 'Aula teórica',
        modality: plan?.modality || 'Presencial',
        visibility: plan?.visibility || 'Apenas eu',
        attachments: plan?.attachments || [],
        resourceIds: plan?.resourceIds || [],
      });
      router.replace(planId ? `/aula/${planId}` : '/(tabs)/planos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar o plano.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading
        title={planId ? 'Editar plano de aula' : 'Criar plano de aula'}
        subtitle={
          planId ? 'Atualize os dados e conteúdos da aula.' : 'Planeie a aula para a sua turma.'
        }
        back
      />
      <Card>
        <Notice text={error} type="error" />
        {!classes.length || !subjects.length ? (
          <AppText style={styles.subtitle}>
            Para criar um plano, este dispositivo precisa de ter pelo menos uma turma e uma
            disciplina sincronizadas.
          </AppText>
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
        <Field
          label="Conteúdo da aula"
          value={content}
          onChangeText={setContent}
          multiline
          placeholder="Conteúdos que serão abordados"
        />
        <Field
          label="Metodologia"
          value={methodology}
          onChangeText={setMethodology}
          multiline
          placeholder="Como a aula será conduzida"
        />
        <Field
          label="Recursos"
          value={resources}
          onChangeText={setResources}
          multiline
          placeholder="Materiais necessários"
        />
        <Field
          label="Avaliação"
          value={evaluation}
          onChangeText={setEvaluation}
          multiline
          placeholder="Como será verificada a aprendizagem"
        />
        <Field
          label="Observações"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Notas adicionais"
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
        <Field
          label="Duração (minutos)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <Button
          title={planId ? 'Guardar alterações' : 'Guardar plano'}
          onPress={() => void submit()}
          loading={busy}
        />
      </Card>
    </Page>
  );
}
