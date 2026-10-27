import { AppText } from '@/components/app-text';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { Button, Card, ChoiceField, Field, Heading, Notice, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';
import { useAuth } from '@/providers/auth-provider';
import { BRAND } from '@/config';

type AISuggestions = {
  objectives: string;
  content: string;
  methodology: string;
  resources: string;
  evaluation: string;
  stages: Array<{ title: string; minutes: number; teacher: string; students: string }>;
};

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
  const { snapshot, saveRecord, schoolId } = useDashboard();
  const { request } = useAuth();
  const classes = snapshot?.data.classes || [];
  const subjects = snapshot?.data.subjects || [];
  const resourcesList = snapshot?.data.resources || [];
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
  const [modelId, setModelId] = useState('simple');
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [stages, setStages] = useState<Array<{ title: string; minutes: number; teacher: string; students: string }>>([]);
  const [schoolFields, setSchoolFields] = useState<Array<{ label: string; value: string }>>([]);
  const [date, setDate] = useState(localDate());
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState('45');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiAvailability, setAIAvailability] = useState<'checking' | 'available' | 'unavailable' | 'error'>('checking');
  const [useAI, setUseAI] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState('');
  const [aiSuggestions, setAISuggestions] = useState<AISuggestions | null>(null);
  useEffect(() => {
    if (!schoolId) { setAIAvailability('unavailable'); return; }
    let active = true;
    setAIAvailability('checking');
    void request<{ enabled: boolean }>(`/schools/${encodeURIComponent(schoolId)}/plans/ai-status`)
      .then(({ enabled }) => { if (active) { setAIAvailability(enabled ? 'available' : 'unavailable'); if (!enabled) setUseAI(false); } })
      .catch(() => { if (active) { setAIAvailability('error'); setUseAI(false); } });
    return () => { active = false; };
  }, [request, schoolId]);
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
      setModelId(String(plan.modelId || 'simple'));
      setResourceIds(Array.isArray(plan.resourceIds) ? plan.resourceIds.map(String) : []);
      setStages(Array.isArray(plan.stages) ? plan.stages as typeof stages : []);
      setSchoolFields(Array.isArray(plan.schoolFields) ? plan.schoolFields as typeof schoolFields : []);
      setDate(String(plan.date || localDate()).slice(0, 10));
      setClassId(String(plan.classId || classes[0]?.recordId || ''));
      setSubjectId(String(plan.subjectId || subjects[0]?.recordId || ''));
      setTime(String(plan.startTime || plan.time || '08:00'));
      setDuration(String(plan.duration || 45));
    } else {
      setStages([
        { title: 'Introdução', minutes: 10, teacher: '', students: '' },
        { title: 'Desenvolvimento', minutes: 30, teacher: '', students: '' },
        { title: 'Síntese e avaliação', minutes: 10, teacher: '', students: '' },
      ]);
      setSchoolFields(['Unidade temática', 'Competências', 'Visto da coordenação'].map((label) => ({ label, value: '' })));
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
  const generateWithAI = async () => {
    if (!schoolId || !title.trim() || !classId || !subjectId || aiAvailability !== 'available') return;
    const className = String(classes.find((row) => row.recordId === classId)?.payload.name || 'Turma');
    const subjectName = String(subjects.find((row) => row.recordId === subjectId)?.payload.name || 'Disciplina');
    const lessonDuration = Number(duration);
    if (!Number.isInteger(lessonDuration) || lessonDuration < 10 || lessonDuration > 480) {
      setAIError('Para usar a IA, indique uma duração entre 10 e 480 minutos.');
      return;
    }
    setAILoading(true); setAIError(''); setAISuggestions(null);
    try {
      const result = await request<AISuggestions>(`/schools/${encodeURIComponent(schoolId)}/plans/generate`, {
        method: 'POST',
        body: JSON.stringify({
          theme: title.trim(), subject: subjectName, className, duration: lessonDuration,
          objectives: objectives.slice(0, 2000), content: content.slice(0, 3000),
          lessonType: 'Aula teórica', modality: 'Presencial', materials: resources.slice(0, 2000),
        }),
      });
      setAISuggestions(result);
    } catch (cause) {
      setAIError(cause instanceof Error ? cause.message : 'Não foi possível gerar sugestões. O seu plano não foi alterado.');
    } finally { setAILoading(false); }
  };
  const useSuggestedStages = () => {
    if (!aiSuggestions?.stages.length) return;
    const minutesEach = Math.floor(Number(duration) / aiSuggestions.stages.length);
    const remainder = Number(duration) % aiSuggestions.stages.length;
    setMethodology(aiSuggestions.stages.map((stage, index) =>
      `${index + 1}. ${stage.title} (${minutesEach + (index < remainder ? 1 : 0)} min)\nProfessor: ${stage.teacher}\nAlunos: ${stage.students}`,
    ).join('\n\n'));
  };
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
        modelId,
        stages,
        schoolFields,
        attachments: plan?.attachments || [],
        resourceIds,
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
        <ChoiceField
          label="Turma"
          value={classId}
          options={classes.map((item) => ({ id: item.recordId, label: String(item.payload.name || 'Turma') }))}
          onSelect={setClassId}
        />
        <ChoiceField
          label="Disciplina"
          value={subjectId}
          options={subjects.map((item) => ({ id: item.recordId, label: String(item.payload.name || 'Disciplina') }))}
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
        <ChoiceField label="Modelo do plano" value={modelId} options={[{ id: 'simple', label: 'Simples' }, { id: 'detailed', label: 'Detalhado' }, { id: 'school', label: 'Da escola' }]} onSelect={setModelId} />
        <View style={{ borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>Usar IA neste plano</AppText>
              {aiAvailability === 'available' ? <AppText style={styles.subtitle}>Ative para receber sugestões editáveis.</AppText> : null}
            </View>
            <Switch
              accessibilityLabel="Usar IA neste plano"
              value={useAI && aiAvailability === 'available'}
              onValueChange={setUseAI}
              disabled={aiAvailability !== 'available'}
              trackColor={{ false: BRAND.line, true: BRAND.greenSoft }}
              thumbColor={useAI ? BRAND.green : '#ffffff'}
            />
          </View>
          {aiAvailability === 'checking' ? <AppText style={styles.subtitle}>A verificar se a IA está ativa…</AppText> : null}
          {aiAvailability === 'unavailable' ? <AppText style={styles.subtitle}>A IA não está ativa nesta plataforma. Pode continuar a preencher o plano manualmente.</AppText> : null}
          {aiAvailability === 'error' ? <AppText style={styles.subtitle}>Não foi possível verificar a IA. O preenchimento manual continua disponível.</AppText> : null}
        </View>
        {useAI && aiAvailability === 'available' ? <Card style={{ gap: 12 }}>
          <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>Assistente de IA</AppText>
          <AppText style={styles.subtitle}>Gera propostas com base no tema, turma, disciplina, duração e textos preenchidos. Revê e aplica cada campo que quiseres.</AppText>
          <AppText style={styles.subtitle}>Estes dados são enviados ao serviço de IA configurado. Não incluas nomes nem dados pessoais dos alunos.</AppText>
          <Button title={aiLoading ? 'A preparar sugestões…' : aiSuggestions ? 'Gerar novas sugestões' : 'Criar com IA'} onPress={() => void generateWithAI()} loading={aiLoading} disabled={!title.trim() || !classId || !subjectId} />
          {aiLoading ? <ActivityIndicator color={BRAND.green} /> : null}
          <Notice text={aiError} type="error" />
          {aiSuggestions ? <>
            {([
              ['objectives', 'Objetivos', objectives, setObjectives],
              ['content', 'Conteúdo da aula', content, setContent],
              ['methodology', 'Metodologia', methodology, setMethodology],
              ['resources', 'Recursos', resources, setResources],
              ['evaluation', 'Avaliação', evaluation, setEvaluation],
            ] as const).map(([key, label, , apply]) => {
              const suggestion = aiSuggestions[key];
              return suggestion ? <View key={key} style={{ borderTopWidth: 1, borderTopColor: BRAND.line, paddingTop: 10, gap: 8 }}>
                <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>{label}</AppText>
                <AppText style={{ color: BRAND.muted, lineHeight: 21 }}>{suggestion}</AppText>
                <Button title={`Usar ${label.toLowerCase()}`} secondary onPress={() => apply(suggestion)} />
              </View> : null;
            })}
            {aiSuggestions.stages.length ? <View style={{ borderTopWidth: 1, borderTopColor: BRAND.line, paddingTop: 10, gap: 8 }}>
              <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>Etapas da aula</AppText>
              {aiSuggestions.stages.map((stage, index) => <AppText key={index} style={styles.subtitle}>{stage.title} · {stage.minutes} min{'\n'}Professor: {stage.teacher}{'\n'}Alunos: {stage.students}</AppText>)}
              <Button title="Usar etapas na metodologia" secondary onPress={useSuggestedStages} />
            </View> : null}
          </> : null}
        </Card> : null}
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
        <View style={{ gap: 8 }}>
          <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>Materiais da biblioteca</AppText>
          {resourcesList.map(({ recordId, payload }) => {
            const selected = resourceIds.includes(recordId);
            return <Pressable key={recordId} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setResourceIds((current) => selected ? current.filter((id) => id !== recordId) : [...current, recordId])} style={{ padding: 12, backgroundColor: selected ? BRAND.greenPale : BRAND.white, borderColor: selected ? BRAND.green : BRAND.line, borderWidth: 1, borderRadius: 12 }}><AppText style={{ color: BRAND.ink, fontWeight: '700' }}>{selected ? '✓ ' : ''}{String(payload.title || 'Recurso')}</AppText><AppText style={styles.subtitle}>{String(payload.subjectName || payload.category || '')}</AppText></Pressable>;
          })}
          {!resourcesList.length ? <AppText style={styles.subtitle}>Ainda não há recursos da escola para associar.</AppText> : null}
        </View>
        {modelId !== 'simple' ? <View style={{ gap: 10 }}>
          <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>Etapas da aula</AppText>
          {stages.map((stage, index) => <Card key={`stage-${index}`}>
            <Field label={`Etapa ${index + 1}`} value={stage.title} onChangeText={(title) => setStages((rows) => rows.map((row, i) => i === index ? { ...row, title } : row))} />
            <Field label="Duração (minutos)" value={String(stage.minutes)} keyboardType="number-pad" onChangeText={(raw) => setStages((rows) => rows.map((row, i) => i === index ? { ...row, minutes: Number(raw) || 0 } : row))} />
            <Field label="Ações do professor" value={stage.teacher} multiline onChangeText={(teacher) => setStages((rows) => rows.map((row, i) => i === index ? { ...row, teacher } : row))} />
            <Field label="Atividades dos alunos" value={stage.students} multiline onChangeText={(students) => setStages((rows) => rows.map((row, i) => i === index ? { ...row, students } : row))} />
            <Button title="Remover etapa" secondary onPress={() => setStages((rows) => rows.filter((_, i) => i !== index))} />
          </Card>)}
          <Button title="＋ Adicionar etapa" secondary onPress={() => setStages((rows) => [...rows, { title: '', minutes: 10, teacher: '', students: '' }])} />
        </View> : null}
        {modelId === 'school' ? <View style={{ gap: 10 }}>
          <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>Campos da escola</AppText>
          {schoolFields.map((field, index) => <Card key={`school-field-${index}`}>
            <Field label="Nome do campo" value={field.label} onChangeText={(label) => setSchoolFields((rows) => rows.map((row, i) => i === index ? { ...row, label } : row))} />
            <Field label="Conteúdo" value={field.value} multiline onChangeText={(value) => setSchoolFields((rows) => rows.map((row, i) => i === index ? { ...row, value } : row))} />
            <Button title="Remover campo" secondary onPress={() => setSchoolFields((rows) => rows.filter((_, i) => i !== index))} />
          </Card>)}
          <Button title="＋ Adicionar campo" secondary onPress={() => setSchoolFields((rows) => [...rows, { label: '', value: '' }])} />
        </View> : null}
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
        <Button
          title={planId ? 'Guardar alterações' : 'Guardar plano'}
          onPress={() => void submit()}
          loading={busy}
        />
      </Card>
    </Page>
  );
}
