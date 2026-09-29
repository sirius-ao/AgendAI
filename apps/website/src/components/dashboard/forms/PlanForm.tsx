'use client';
import { useState, type FormEvent } from 'react';
import { FilePlus } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Attachments, Field, Modal, Switch } from '../ui/Primitives';
import { planModels, planRows } from '@/lib/dashboard/plan-models';
import { printLessonPlan } from '@/lib/dashboard/print-lesson-plan';
import { syncPlanEvent } from '@/lib/dashboard/plan-calendar';
import { planExamples } from '@/data/dashboard/plan-examples';
import { localId } from '@/lib/dashboard/selectors';
import { DEMO_DATE } from '@/data/dashboard/seed';
import type { LessonPlan } from '@/types/dashboard';

export function PlanForm() {
  const { state, modal, update, openModal, notify, error: storageError } = useDashboard();
  const old = state.plans.find((p) => p.id === modal?.id);
  const source = state.plans.find((p) => p.id === modal?.copyFrom);
  const draftKey = modal?.id || (modal?.copyFrom ? `copy-${modal.copyFrom}` : modal?.example ? `example-${modal.example}` : 'new');
  const initialClass = state.classes.find((c) => c.id === (old?.classId || modal?.classId));
  const [plan, setPlan] = useState<LessonPlan>(() => ({
    id: '', teacherId: state.user.id, title: '', description: '',
    subjectId: modal?.subjectId || initialClass?.subjectIds[0] || '',
    classId: initialClass?.id || '', date: modal?.date || DEMO_DATE, duration: 50,
    status: 'Rascunho', favorite: false, shared: false, template: false, ai: false,
    lessonType: 'Aula teórica', modality: 'Presencial', objectives: '', content: '',
    methodology: '', resources: '', evaluation: '', tags: '', visibility: 'Apenas eu', attachments: [], resourceIds: [],
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
  const [preview, setPreview] = useState(false);
  const [preferred, setPreferred] = useState(!old);
  const [error, setError] = useState('');
  const patch = (value: Partial<LessonPlan>) => {
    const next = { ...plan, ...value };
    setPlan(next);
    update((s) => ({ ...s, planDrafts: { ...s.planDrafts, [draftKey]: next } }));
  };
  const stages = plan.stages || [];
  const totalMinutes = stages.reduce((total, stage) => total + stage.minutes, 0);
  const close = () => openModal(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!plan.title.trim() || !plan.classId || !plan.subjectId || !plan.date || !plan.startTime || !Number.isFinite(plan.duration) || plan.duration < 1) {
      setError('Preencha o tema, a turma e a disciplina.'); return;
    }
    if (plan.status !== 'Rascunho' && (!plan.objectives.trim() || !plan.methodology.trim())) {
      setError('Preencha os objetivos e as atividades antes de guardar um plano pronto.'); return;
    }
    if (plan.modelId !== 'simple' && plan.status !== 'Rascunho' && totalMinutes !== plan.duration) {
      setError('A soma dos minutos das etapas deve corresponder à duração da aula. Pode guardar como rascunho.'); return;
    }
    if (plan.modelId === 'school' && plan.schoolFields?.some((field) => !field.label.trim())) {
      setError('Dê um nome a cada campo da escola ou remova os campos sem nome.'); return;
    }
    const saved = { ...plan, id: old?.id || localId('plan'), title: plan.title.trim() };
    update((s) => ({ ...s,
      plans: old ? s.plans.map((p) => p.id === old.id ? saved : p) : [saved, ...s.plans],
      events: syncPlanEvent(s, saved, modal?.eventId),
      planDrafts: Object.fromEntries(Object.entries(s.planDrafts || {}).filter(([key]) => key !== draftKey)),
      planPreferences: preferred ? { modelId: plan.modelId || 'simple', schoolFieldLabels: plan.modelId === 'school' ? (plan.schoolFields || []).map((field) => field.label.trim()) : s.planPreferences?.schoolFieldLabels || ['Unidade temática', 'Competências', 'Visto da coordenação'] } : s.planPreferences,
    }));
    notify('Plano guardado no espaço local.'); close();
  }
  const area = (key: 'objectives' | 'content' | 'methodology' | 'resources' | 'evaluation' | 'prerequisites', label: string) => <Field label={label}><textarea value={plan[key] || ''} maxLength={6000} rows={3} onChange={(e) => patch({ [key]: e.target.value })} /></Field>;
  return <Modal title={old ? 'Editar plano de aula' : 'Novo plano de aula'} icon={FilePlus} onClose={close} className="dash-dialog-plan">
    <form className="dash-creation-form" onSubmit={submit}>
      <div className="dash-form-main">
        <div className="dash-tip" role="status"><div>{storageError ? 'Não foi possível guardar no navegador. Mantenha esta página aberta.' : state.planDrafts?.[draftKey] ? 'Rascunho automático neste dispositivo. Pode fechar e retomar aqui.' : 'As alterações são guardadas automaticamente neste dispositivo.'}
        {source && <p>Escolha a turma e a nova data. O plano original não será alterado.</p>}
        <p>Guardar o plano cria ou atualiza a aula correspondente no calendário.</p></div></div>
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
        {modal?.ai && <div className="dash-tip"><div><strong>Estrutura de exemplo, sem serviço de IA</strong><p>Insere sugestões apenas nos campos vazios.</p><button className="dash-btn secondary" type="button" onClick={() => patch({ objectives: plan.objectives || 'Identificar conceitos e explicar o raciocínio.', content: plan.content || 'Introdução ao tema e exemplos orientados.', methodology: plan.methodology || 'Discussão inicial, prática em pares e síntese.', ai: true })}>Inserir exemplo</button></div></div>}
        {area('objectives', 'Objetivos de aprendizagem')}
        {area('content', 'Conteúdos programáticos')}
        {area('methodology', 'Atividades / Estratégias de ensino')}
        {area('resources', 'Recursos necessários')}
        {area('evaluation', 'Avaliação da aprendizagem')}
        {plan.modelId !== 'simple' && <>
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
        </>}
        {plan.modelId === 'school' && <section><h3>Campos da escola</h3><p>Defina os nomes e a ordem. Marque a opção de reutilização para guardar esta estrutura.</p>
          {plan.schoolFields?.map((field, index) => <fieldset className="dash-plan-stage" key={index}><legend>Campo {index + 1}</legend>
            <Field label="Nome do campo"><input required maxLength={100} value={field.label} onChange={(e) => patch({ schoolFields: plan.schoolFields?.map((f, i) => i === index ? { ...f, label: e.target.value } : f) })} /></Field>
            <Field label="Conteúdo"><textarea value={field.value} onChange={(e) => patch({ schoolFields: plan.schoolFields?.map((f, i) => i === index ? { ...f, value: e.target.value } : f) })} /></Field>
            <div className="dash-guide-actions"><button className="dash-btn secondary" disabled={index === 0} type="button" onClick={() => { const fields = [...(plan.schoolFields || [])]; [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]]; patch({ schoolFields: fields }); }}>Mover acima</button><button className="dash-btn secondary" type="button" onClick={() => patch({ schoolFields: plan.schoolFields?.filter((_, i) => i !== index) })}>Remover campo</button></div>
          </fieldset>)}
          <button className="dash-btn secondary" type="button" onClick={() => patch({ schoolFields: [...(plan.schoolFields || []), { label: '', value: '' }] })}>Adicionar campo</button>
        </section>}
      </div>
      <aside className="dash-form-aside">
        <h3>O seu documento</h3><p>Pré-visualize antes de guardar. Para PDF, escolha Guardar como PDF na impressão do navegador.</p>
        <button className="dash-btn secondary" type="button" aria-expanded={preview} onClick={() => setPreview(!preview)}>{preview ? 'Fechar pré-visualização' : 'Pré-visualizar plano'}</button>
        {preview && <div className="dash-plan-preview"><h3>{plan.title || 'Tema da aula'}</h3><dl>{planRows(plan, state).map(([label, text], i) => <div key={i}><dt>{label}</dt><dd>{text || 'Por preencher'}</dd></div>)}</dl></div>}
        <button className="dash-btn secondary" type="button" onClick={() => { if (!printLessonPlan(plan, state)) notify('Permita janelas para imprimir o plano.'); }}>Imprimir A4 / PDF</button>
        <Switch label="Guardar como rascunho" checked={plan.status === 'Rascunho'} onChange={(checked) => patch({ status: checked ? 'Rascunho' : old && old.status !== 'Rascunho' ? old.status : 'Planeado' })} hint="Pode completar os objetivos e atividades mais tarde." />
        <Switch label="Reutilizar este modelo nas próximas aulas" checked={preferred} onChange={setPreferred} hint="Guarda a estrutura e os nomes dos campos, sem copiar o conteúdo da aula." />
        <Switch label="Guardar como plano reutilizável" checked={plan.template} onChange={(template) => patch({ template })} hint="Permite encontrar e duplicar este conteúdo na lista Reutilizáveis." />
        <Field label="Visibilidade"><select value={plan.visibility} onChange={(e) => patch({ visibility: e.target.value })}>{['Apenas eu', 'Visível para os alunos', 'Visível para selecionados', 'Equipa pedagógica'].map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Etiquetas"><input value={plan.tags} onChange={(e) => patch({ tags: e.target.value })} /></Field>
        <Attachments initialNames={plan.attachments} onChange={(attachments) => patch({ attachments })} />
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
