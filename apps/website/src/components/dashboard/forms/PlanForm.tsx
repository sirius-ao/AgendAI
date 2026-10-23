'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, ClipboardCheck, FilePlus } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Attachments, Field, Modal, StatusBadge, Switch } from '../ui/Primitives';
import { PlanFileAttachments } from './PlanFileAttachments';
import { LinkedPlanResources } from './LinkedPlanResources';
import { planModels, planRows } from '@/lib/dashboard/plan-models';
import { printLessonPlan } from '@/lib/dashboard/print-lesson-plan';
import { syncPlanEvent } from '@/lib/dashboard/plan-calendar';
import { planExamples } from '@/data/dashboard/plan-examples';
import { localId } from '@/lib/dashboard/selectors';
import { lessonPlanIsReady } from '@/lib/dashboard/plan-readiness';
import { apiRequest } from '@/lib/api/client';
import { DEMO_DATE } from '@/data/dashboard/seed';
import type { LessonPlan } from '@/types/dashboard';

type AISuggestions = Pick<LessonPlan, 'objectives' | 'content' | 'methodology' | 'resources' | 'evaluation'> & { stages: NonNullable<LessonPlan['stages']> };

function dateInTimezone(timeZone: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Luanda', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  }
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function PlanForm() {
  const { state, modal, update, openModal, notify, error: storageError, apiMode } = useDashboard();
  const old = state.plans.find((p) => p.id === modal?.id);
  const source = state.plans.find((p) => p.id === modal?.copyFrom);
  const draftKey = modal?.id || (modal?.resourceId ? `resource-${modal.resourceId}` : modal?.copyFrom ? `copy-${modal.copyFrom}` : modal?.example ? `example-${modal.example}` : 'new');
  const initialClass = state.classes.find((c) => c.id === (old?.classId || modal?.classId));
  const [plan, setPlan] = useState<LessonPlan>(() => ({
    id: '', teacherId: state.user.id, title: '', description: '',
    subjectId: modal?.subjectId || initialClass?.subjectIds[0] || '',
    classId: initialClass?.id || '', date: modal?.date || DEMO_DATE, duration: 50,
    status: 'Rascunho', favorite: false, shared: false, template: false, ai: false,
    lessonType: 'Aula teórica', modality: 'Presencial', objectives: '', content: '',
    methodology: '', resources: '', evaluation: '', tags: '', visibility: 'Apenas eu', attachments: [], resourceIds: modal?.resourceId ? [modal.resourceId] : [],
    ...old,
    startTime: old?.startTime || state.events.find((e) => (old && e.sourceId === old.id) || e.id === modal?.eventId)?.start || '08:00',
    modelId: old?.modelId || modal?.modelId || state.planPreferences?.modelId || 'simple',
    schoolName: old?.schoolName ?? state.settings.school,
    teacherName: old?.teacherName ?? state.user.name,
    schoolYear: old?.schoolYear ?? initialClass?.year ?? state.settings.year,
    prerequisites: old?.prerequisites || '',
    stages: old?.stages || [
      { title: 'Introdução', minutes: 10, teacher: '', students: '' },
      { title: 'Desenvolvimento', minutes: 30, teacher: '', students: '' },
      { title: 'Síntese e avaliação', minutes: 10, teacher: '', students: '' },
    ],
    schoolFields: old?.schoolFields || (state.planPreferences?.schoolFieldLabels || ['Unidade temática', 'Competências', 'Visto da coordenação']).map((label) => ({ label, value: '' })),
    ...(source ? { ...source, id: '', title: `${source.title} (cópia)`, classId: '', date: '', status: 'Rascunho' as const, shared: false, teacherId: state.user.id, teacherName: state.user.name } : {}),
    ...(modal?.example ? { ...planExamples[modal.example], subjectId: state.subjects.find((s) => s.name === (modal.example === 'math' ? 'Matemática' : 'Português'))?.id || '' } : {}),
    ...state.planDrafts?.[draftKey],
  }));
  const [savedPlan, setSavedPlan] = useState<LessonPlan | null>(null);
  const [preview, setPreview] = useState(false);
  const [preferred, setPreferred] = useState(!old);
  const [error, setError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAIError] = useState('');
  const [aiAvailability, setAIAvailability] = useState<'checking' | 'available' | 'unavailable' | 'error'>('checking');
  const [useAI, setUseAI] = useState(false);
  useEffect(() => {
    if (!apiMode || !state.activeSchoolId) { setAIAvailability('unavailable'); setUseAI(false); return; }
    let cancelled = false;
    setAIAvailability('checking');
    void apiRequest<{ enabled: boolean }>(`/schools/${encodeURIComponent(state.activeSchoolId)}/plans/ai-status`)
      .then(({ enabled }) => { if (!cancelled) { setAIAvailability(enabled ? 'available' : 'unavailable'); if (!enabled) setUseAI(false); } })
      .catch(() => { if (!cancelled) { setAIAvailability('error'); setUseAI(false); } });
    return () => { cancelled = true; };
  }, [apiMode, state.activeSchoolId]);
  const patch = (value: Partial<LessonPlan>) => {
    const next = { ...plan, ...value };
    setPlan(next);
    update((s) => ({ ...s, planDrafts: { ...s.planDrafts, [draftKey]: next } }));
  };
  const stages = plan.stages || [];
  const totalMinutes = stages.reduce((total, stage) => total + stage.minutes, 0);
  const today = dateInTimezone(state.settings.timezone);
  const canMarkCompleted = Boolean(plan.date && plan.date < today) || plan.status === 'Concluído';
  const selectedStatus = plan.status === 'Em utilização' ? 'Planeado' : plan.status;
  const close = () => openModal(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!plan.title.trim() || !plan.classId || !plan.subjectId || !plan.date || !plan.startTime || !Number.isFinite(plan.duration) || plan.duration < 1) {
      setError('Preencha o tema, a turma e a disciplina.'); return;
    }
    const statusToSave = plan.status === 'Em utilização' ? 'Planeado' : plan.status;
    const alreadyCompletedOnThisDate = old?.status === 'Concluído' && old.date === plan.date;
    if (statusToSave === 'Concluído' && plan.date >= today && !alreadyCompletedOnThisDate) {
      setError('Só pode marcar como concluída uma aula com data passada.'); return;
    }
    if (statusToSave !== 'Rascunho' && plan.modelId !== 'simple' && totalMinutes !== plan.duration) {
      setError('A soma dos minutos das etapas deve corresponder à duração da aula. Pode guardar como rascunho.'); return;
    }
    if (statusToSave !== 'Rascunho' && plan.modelId === 'school' && plan.schoolFields?.some((field) => !field.label.trim())) {
      setError('Dê um nome a cada campo da escola ou remova os campos sem nome.'); return;
    }
    if (statusToSave !== 'Rascunho' && !lessonPlanIsReady(plan)) {
      setError('Complete os dados, objetivos e atividades antes de guardar como preparado ou concluído. Para continuar depois, escolha “Por terminar”.'); return;
    }
    const saved = { ...plan, id: old?.id || localId('plan'), title: plan.title.trim(), status: statusToSave };
    update((s) => ({ ...s,
      plans: old ? s.plans.map((p) => p.id === old.id ? saved : p) : [saved, ...s.plans],
      events: syncPlanEvent(s, saved, modal?.eventId),
      planDrafts: Object.fromEntries(Object.entries(s.planDrafts || {}).filter(([key]) => key !== draftKey)),
      planPreferences: preferred ? { modelId: plan.modelId || 'simple', schoolFieldLabels: plan.modelId === 'school' ? (plan.schoolFields || []).map((field) => field.label.trim()) : s.planPreferences?.schoolFieldLabels || ['Unidade temática', 'Competências', 'Visto da coordenação'] } : s.planPreferences,
    }));
    setSavedPlan(saved);
  }
  const area = (key: 'objectives' | 'content' | 'methodology' | 'resources' | 'evaluation' | 'prerequisites', label: string) => <Field label={label}><textarea value={plan[key] || ''} maxLength={6000} rows={3} onChange={(e) => patch({ [key]: e.target.value })} /></Field>;
  async function generateWithAI() {
    if (!state.activeSchoolId || !plan.classId || !plan.subjectId || !plan.title.trim()) return;
    setGeneratingAI(true); setAIError(''); setAiSuggestions(null);
    try {
      const className = state.classes.find((item) => item.id === plan.classId)?.name || 'Turma';
      const subject = state.subjects.find((item) => item.id === plan.subjectId)?.name || 'Disciplina';
      const materials = [plan.resources, ...(plan.resourceIds || []).map((id) => state.resources.find((resource) => resource.id === id)?.title).filter(Boolean)].filter(Boolean).join('\n');
      const result = await apiRequest<AISuggestions>(`/schools/${encodeURIComponent(state.activeSchoolId)}/plans/generate`, {
        method: 'POST',
        body: JSON.stringify({ theme: plan.title, subject, className, duration: plan.duration, objectives: plan.objectives, content: plan.content, lessonType: plan.lessonType, modality: plan.modality, materials }),
      });
      setAiSuggestions(result);
    } catch (cause) {
      setAIError(cause instanceof Error ? cause.message : 'Não foi possível gerar as sugestões. O seu rascunho continua guardado.');
    } finally { setGeneratingAI(false); }
  }
  function applyAIField(field: keyof Omit<AISuggestions, 'stages'>) {
    if (!aiSuggestions) return;
    patch({ [field]: aiSuggestions[field] });
    setAiSuggestions({ ...aiSuggestions, [field]: '' });
  }
  function applyAIStages() {
    if (!aiSuggestions?.stages.length) return;
    const each = Math.floor(plan.duration / aiSuggestions.stages.length);
    const remainder = plan.duration % aiSuggestions.stages.length;
    patch({ modelId: plan.modelId === 'simple' ? 'detailed' : plan.modelId, stages: aiSuggestions.stages.map((stage, index) => ({ ...stage, minutes: each + (index < remainder ? 1 : 0) })) });
    setAiSuggestions({ ...aiSuggestions, stages: [] });
  }
  if (savedPlan) return <Modal title="Plano e calendário atualizados" onClose={close} className="dash-dialog-small"><div className="dash-modal-simple">
    <h3>{savedPlan.title}</h3><p role="status">{storageError ? apiMode ? 'Não foi possível sincronizar com o servidor. Verifique a ligação antes de sair.' : 'Alterações disponíveis nesta sessão, mas não foi possível guardá-las no navegador. Mantenha esta página aberta.' : apiMode ? 'Plano guardado na escola e aula atualizada no calendário.' : 'Plano guardado e aula atualizada no calendário deste dispositivo.'}</p>
    <StatusBadge tone={savedPlan.status === 'Concluído' ? 'green' : savedPlan.status === 'Rascunho' ? 'amber' : 'blue'}>{savedPlan.status === 'Concluído' ? 'Concluído' : savedPlan.status === 'Rascunho' ? 'Por terminar' : 'Preparado'}</StatusBadge>
    <p>{savedPlan.date} · {savedPlan.startTime} · {savedPlan.duration} minutos</p>
    <div className="dash-guide-actions"><Link className="dash-btn" onClick={close} href={`/dashboard/calendario?turma=${savedPlan.classId}&data=${savedPlan.date}&plano=${savedPlan.id}`}>Ver aula no calendário</Link><button className="dash-btn secondary" onClick={close}>Continuar nos planos</button></div>
  </div></Modal>;
  return <Modal title={old ? 'Editar plano de aula' : 'Novo plano de aula'} icon={FilePlus} onClose={close} className="dash-dialog-plan">
    <form className="dash-creation-form" onSubmit={submit}>
      <div className="dash-plan-savebar" role="status"><div>{storageError ? apiMode ? 'Não foi possível sincronizar o rascunho. Verifique a ligação.' : 'Não foi possível guardar no navegador. Mantenha esta página aberta.' : state.planDrafts?.[draftKey] ? apiMode ? 'Rascunho automático guardado na escola. Pode continuar noutro dispositivo.' : 'Rascunho automático neste dispositivo. Pode fechar e retomar aqui.' : apiMode ? 'As alterações são sincronizadas automaticamente com a escola.' : 'As alterações são guardadas automaticamente neste dispositivo.'}
        {source && <p>Escolha a turma e a nova data. O plano original não será alterado.</p>}
        <p>Guardar o plano atualiza a aula correspondente no calendário.</p></div><button className="dash-btn secondary" type="button" onClick={close}>Continuar depois</button></div>
      <section id="plan-status" className="dash-plan-status-panel" aria-labelledby="plan-status-heading">
        <div className="dash-plan-status-intro"><span>Antes de guardar</span><h2 id="plan-status-heading">Em que ponto está este plano?</h2><p>Escolha uma opção. Pode alterar o estado mais tarde.</p></div>
        <div className="dash-plan-status-options" role="group" aria-label="Estado do plano">
          {[
            { value: 'Rascunho', title: 'Por terminar', description: 'Ainda estou a preparar. Posso guardar e continuar depois.', icon: CircleDashed, tone: 'amber' },
            { value: 'Planeado', title: 'Preparado', description: 'Está pronto para dar a aula e aparece como preparado.', icon: ClipboardCheck, tone: 'blue' },
            { value: 'Concluído', title: 'Concluído', description: canMarkCompleted ? 'A aula já aconteceu.' : 'Disponível depois da data da aula.', icon: CheckCircle2, tone: 'green', disabled: !canMarkCompleted },
          ].map(({ value, title, description, icon: Icon, tone, disabled }) => {
            const active = selectedStatus === value;
            return <button key={value} type="button" className={`dash-plan-status-choice ${active ? 'is-selected' : ''} ${disabled ? 'is-unavailable' : ''}`} aria-pressed={active} disabled={disabled} onClick={() => { setError(''); patch({ status: value as LessonPlan['status'] }); }}>
              <span className={`dash-plan-status-icon ${tone}`}><Icon size={19} /></span><span className="dash-plan-status-copy"><strong>{title}</strong><small>{description}</small></span><span className="dash-plan-status-indicator" aria-hidden="true" />
            </button>;
          })}
        </div>
      </section>
      <div className="dash-form-main">
        <nav className="dash-plan-section-nav" aria-label="Secções do plano"><a href="#plan-status">Estado</a><a href="#plan-data">Dados</a><a href="#plan-content">Conteúdo</a><a href="#plan-ai-toggle">IA</a><a href="#plan-linked-resources">Materiais</a>{plan.modelId !== 'simple' && <a href="#plan-stages">Etapas</a>}<a href="#plan-document">Documento</a></nav>
        <section id="plan-data" className="dash-plan-section"><h2>1. Dados da aula</h2>
        <Field label="Modelo de plano"><select value={plan.modelId} onChange={(e) => patch({ modelId: e.target.value as LessonPlan['modelId'] })}>{planModels.map((model) => <option value={model.id} key={model.id}>{model.name}</option>)}</select></Field>
        <p>{planModels.find((m) => m.id === plan.modelId)?.description} Mudar de modelo preserva os campos preenchidos; a pré-visualização mostra os campos do modelo escolhido.</p>
        <Field label="Título da aula" required><input required maxLength={160} value={plan.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex.: Introdução às frações" /></Field>
        <div className="dash-fields-row">
          <Field label="Turma" required><select required value={plan.classId} onChange={(e) => {
            const c = state.classes.find((item) => item.id === e.target.value);
            patch({ classId: e.target.value, schoolYear: c?.year || state.settings.year, subjectId: c?.subjectIds.includes(plan.subjectId) ? plan.subjectId : c?.subjectIds[0] || '' });
          }}><option value="">Selecionar turma</option>{state.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Disciplina" required><select required value={plan.subjectId} onChange={(e) => patch({ subjectId: e.target.value })}><option value="">Selecionar disciplina</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Data da aula" required><input type="date" required value={plan.date} onChange={(e) => patch({ date: e.target.value })} /></Field>
          <Field label="Hora de início" required><input type="time" required value={plan.startTime || '08:00'} onChange={(e) => patch({ startTime: e.target.value })} /></Field>
        </div>
        <details className="dash-plan-identification" open={plan.modelId === 'school'}><summary>Escola, professor e ano letivo</summary>
          <Field label="Escola"><input value={plan.schoolName} onChange={(e) => patch({ schoolName: e.target.value })} /></Field>
          <Field label="Professor"><input value={plan.teacherName} onChange={(e) => patch({ teacherName: e.target.value })} /></Field>
          <Field label="Ano letivo"><input value={plan.schoolYear} onChange={(e) => patch({ schoolYear: e.target.value })} /></Field>
        </details>
        <div className="dash-fields-row">
          <Field label="Duração (minutos)"><input type="number" min={1} max={480} required value={plan.duration} onChange={(e) => patch({ duration: Number(e.target.value) })} /></Field>
          <Field label="Tipo de aula"><input value={plan.lessonType} onChange={(e) => patch({ lessonType: e.target.value })} /></Field>
          <Field label="Modalidade"><select value={plan.modality} onChange={(e) => patch({ modality: e.target.value })}>{['Presencial', 'Online', 'Híbrida'].map((v) => <option key={v}>{v}</option>)}</select></Field>
        </div>
        </section>
        <section id="plan-ai-toggle" className="dash-plan-ai-toggle" aria-labelledby="plan-ai-toggle-heading">
          <h3 id="plan-ai-toggle-heading">Como queres preparar o plano?</h3>
          {aiAvailability === 'available' ? <Switch label="Usar IA neste plano" checked={useAI} onChange={setUseAI} hint="Desativado: preenche todos os campos manualmente. Ativado: recebe sugestões e escolhe quais aplicar." /> :
            aiAvailability === 'checking' ? <p role="status">A verificar se a geração com IA está ativa…</p> :
              <p role="status">{aiAvailability === 'error' ? 'Não foi possível verificar a IA. Podes continuar a preencher o plano manualmente.' : 'A geração com IA não está ativa nesta plataforma. Podes continuar a preencher o plano manualmente.'}</p>}
        </section>
        {useAI && aiAvailability === 'available' && <section className="dash-plan-ai" aria-labelledby="plan-ai-heading">
          <h3 id="plan-ai-heading">Assistente de IA</h3>
          <p>Gera sugestões com base no tema, turma, disciplina e duração. Revê cada sugestão antes de a aplicar; nada é guardado no plano sem a tua escolha.</p>
          <small>O tema, disciplina, turma, duração e textos que preencher serão enviados ao serviço de IA configurado. Não inclua nomes ou dados pessoais de alunos.</small>
          <button className="dash-btn secondary" type="button" onClick={() => void generateWithAI()} disabled={!apiMode || !state.activeSchoolId || !plan.title.trim() || !plan.classId || !plan.subjectId || generatingAI}>
            {generatingAI ? 'A preparar sugestões…' : aiSuggestions ? 'Gerar novas sugestões' : 'Gerar sugestões com IA'}
          </button>
          {(!plan.title.trim() || !plan.classId || !plan.subjectId) && <small>Preenche o tema, a turma e a disciplina para começar.</small>}
          {aiError && <p role="alert" className="dash-error-text">{aiError}</p>}
          {aiSuggestions && <div className="dash-plan-ai-results" aria-live="polite">
            {(['objectives', 'content', 'methodology', 'resources', 'evaluation'] as const).map((field) => aiSuggestions[field] && <article key={field}><div><strong>{{ objectives: 'Objetivos', content: 'Conteúdos', methodology: 'Atividades', resources: 'Recursos', evaluation: 'Avaliação' }[field]}</strong><p>{aiSuggestions[field]}</p></div><button type="button" className="dash-btn secondary" onClick={() => applyAIField(field)}>Usar sugestão</button></article>)}
            {!!aiSuggestions.stages.length && <article><div><strong>Etapas da aula</strong>{aiSuggestions.stages.map((stage, index) => <p key={index}><b>{stage.title}</b> · {stage.minutes} min<br />Professor: {stage.teacher}<br />Alunos: {stage.students}</p>)}</div><button type="button" className="dash-btn secondary" onClick={applyAIStages}>Usar etapas</button></article>}
          </div>}
        </section>}
        <section id="plan-content" className="dash-plan-section"><h2>2. Conteúdo da aula</h2>
        {area('objectives', 'Objetivos de aprendizagem')}
        {area('content', 'Conteúdos programáticos')}
        {area('methodology', 'Atividades / Estratégias de ensino')}
        {area('resources', 'Recursos necessários')}
        {area('evaluation', 'Avaliação da aprendizagem')}
        </section>
        <LinkedPlanResources resourceIds={plan.resourceIds || []} onChange={(resourceIds) => patch({ resourceIds })}>
          {apiMode ? <PlanFileAttachments schoolId={state.activeSchoolId} planId={old?.id} /> : <Attachments initialNames={plan.attachments} onChange={(attachments) => patch({ attachments })} />}
        </LinkedPlanResources>
        {plan.modelId !== 'simple' && <section id="plan-stages" className="dash-plan-section"><h2>3. Etapas da aula</h2>
          {area('prerequisites', 'Pré-requisitos')}
          <h3>Etapas da aula</h3><p role="status">{totalMinutes} de {plan.duration} minutos distribuídos.</p>
          {stages.map((stage, index) => <fieldset className="dash-plan-stage" key={index}><legend>Etapa {index + 1}</legend>
            <Field label="Nome da etapa"><input value={stage.title} onChange={(e) => patch({ stages: stages.map((s, i) => i === index ? { ...s, title: e.target.value } : s) })} /></Field>
            <Field label="Minutos"><input type="number" min={1} max={480} required value={stage.minutes} onChange={(e) => patch({ stages: stages.map((s, i) => i === index ? { ...s, minutes: Number(e.target.value) } : s) })} /></Field>
            <Field label="Ações do professor"><textarea value={stage.teacher} onChange={(e) => patch({ stages: stages.map((s, i) => i === index ? { ...s, teacher: e.target.value } : s) })} /></Field>
            <Field label="Atividades dos alunos"><textarea value={stage.students} onChange={(e) => patch({ stages: stages.map((s, i) => i === index ? { ...s, students: e.target.value } : s) })} /></Field>
            <button className="dash-btn secondary" type="button" onClick={() => patch({ stages: stages.filter((_, i) => i !== index) })}>Remover etapa {index + 1}</button>
          </fieldset>)}
          <button className="dash-btn secondary" type="button" onClick={() => patch({ stages: [...stages, { title: '', minutes: 10, teacher: '', students: '' }] })}>Adicionar etapa</button>
        </section>}
        {plan.modelId === 'school' && <section><h3>Campos da escola</h3><p>Defina os nomes e a ordem. Marque a opção de reutilização para guardar esta estrutura.</p>
          {plan.schoolFields?.map((field, index) => <fieldset className="dash-plan-stage" key={index}><legend>Campo {index + 1}</legend>
            <Field label="Nome do campo"><input required maxLength={100} value={field.label} onChange={(e) => patch({ schoolFields: plan.schoolFields?.map((f, i) => i === index ? { ...f, label: e.target.value } : f) })} /></Field>
            <Field label="Conteúdo"><textarea value={field.value} onChange={(e) => patch({ schoolFields: plan.schoolFields?.map((f, i) => i === index ? { ...f, value: e.target.value } : f) })} /></Field>
            <div className="dash-guide-actions"><button className="dash-btn secondary" disabled={index === 0} type="button" onClick={() => { const fields = [...(plan.schoolFields || [])]; [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]]; patch({ schoolFields: fields }); }}>Mover acima</button><button className="dash-btn secondary" type="button" onClick={() => patch({ schoolFields: plan.schoolFields?.filter((_, i) => i !== index) })}>Remover campo</button></div>
          </fieldset>)}
          <button className="dash-btn secondary" type="button" onClick={() => patch({ schoolFields: [...(plan.schoolFields || []), { label: '', value: '' }] })}>Adicionar campo</button>
        </section>}
      </div>
      <aside className="dash-form-aside" id="plan-document">
        <h2>Documento</h2><p>Pré-visualize antes de guardar. Para PDF, escolha Guardar como PDF na impressão do navegador.</p>
        <button className="dash-btn secondary" type="button" aria-expanded={preview} onClick={() => setPreview(!preview)}>{preview ? 'Fechar pré-visualização' : 'Pré-visualizar plano'}</button>
        {preview && <div className="dash-plan-preview"><h3>{plan.title || 'Tema da aula'}</h3><dl>{planRows(plan, state).map(([label, text], i) => <div key={i}><dt>{label}</dt><dd>{text || 'Por preencher'}</dd></div>)}</dl></div>}
        <button className="dash-btn secondary" type="button" onClick={() => { if (!printLessonPlan(plan, state)) notify('Permita janelas para imprimir o plano.'); }}>Imprimir A4 / PDF</button>
        <Switch label="Reutilizar este modelo nas próximas aulas" checked={preferred} onChange={setPreferred} hint="Guarda a estrutura e os nomes dos campos, sem copiar o conteúdo da aula." />
        <Switch label="Guardar como plano reutilizável" checked={plan.template} onChange={(template) => patch({ template })} hint="Permite encontrar e duplicar este conteúdo na lista Reutilizáveis." />
        <details className="dash-plan-advanced"><summary>Mais opções: partilha e etiquetas</summary>
        <Field label="Visibilidade"><select value={plan.visibility} onChange={(e) => patch({ visibility: e.target.value })}>{['Apenas eu', 'Visível para os alunos', 'Visível para selecionados', 'Equipa pedagógica'].map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Etiquetas"><input value={plan.tags} onChange={(e) => patch({ tags: e.target.value })} /></Field>
        </details>
        {error && <p role="alert" className="dash-error-text">{error}</p>}
        <div className="dash-form-actions"><button type="button" className="dash-btn secondary" onClick={close}>Fechar e continuar depois</button><button type="submit" className="dash-btn">{old ? 'Guardar alterações' : 'Criar plano de aula'}</button></div>
        {state.planDrafts?.[draftKey] && <button type="button" className="dash-btn secondary" onClick={() => {
          if (!window.confirm('Descartar este rascunho automático? O último plano guardado será preservado.')) return;
          update((s) => ({ ...s, planDrafts: Object.fromEntries(Object.entries(s.planDrafts || {}).filter(([key]) => key !== draftKey)) }));
          close();
        }}>Descartar rascunho</button>}
      </aside>
    </form>
  </Modal>;
}
