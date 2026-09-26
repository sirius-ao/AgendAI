'use client';
import { useState, type FormEvent } from 'react';
import { BookOpen, CalendarPlus, FilePlus, Target } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Attachments, Field, Modal, Switch } from '../ui/Primitives';
import { DEMO_DATE } from '@/data/dashboard/seed';
import { localId } from '@/lib/dashboard/selectors';
import type { Assessment, CalendarEvent, LessonPlan, Tone } from '@/types/dashboard';
export function CreationModals() {
  const { modal } = useDashboard();
  return modal ? <CreationForm key={`${modal.kind}-${modal.id || 'new'}`} /> : null;
}
function CreationForm() {
  const { state, modal, openModal, update, notify } = useDashboard();
  const kind = modal!.kind;
  const old =
    kind === 'plan'
      ? state.plans.find((p) => p.id === modal?.id)
      : kind === 'assessment'
        ? state.assessments.find((p) => p.id === modal?.id)
        : state.events.find((p) => p.id === modal?.id);
  const [files, setFiles] = useState<string[]>(old?.attachments || []);
  const [draft, setDraft] = useState(
    kind === 'plan' && (!old || ('status' in old && old.status === 'Rascunho')),
  );
  const [publish, setPublish] = useState(old && 'published' in old ? old.published : true);
  const [reminder, setReminder] = useState(old && 'reminder' in old ? old.reminder : false);
  const [allDay, setAllDay] = useState(old && 'allDay' in old ? old.allDay : false);
  const [color, setColor] = useState<Tone>(old && 'color' in old ? old.color : 'green');
  const [error, setError] = useState('');
  const [ai, setAi] = useState(old && 'ai' in old ? old.ai : false);
  const title = kind === 'plan' ? 'plano de aula' : kind === 'assessment' ? 'avaliação' : 'evento';
  const close = () => openModal(null);
  const value = (key: string, fallback = '') =>
    old && key in old ? String(old[key as keyof typeof old] ?? fallback) : fallback;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (key: string, fallback = '') => String(data.get(key) ?? fallback).trim();
    const id = old?.id || localId(kind);
    const classId = get('classId');
    const date = get('date', DEMO_DATE);
    const common = {
      id,
      title: get('title'),
      classId,
      subjectId: get('subjectId', value('subjectId')),
      date,
      description: get('description', value('description')),
      attachments: files,
      tags: get('tags'),
      visibility: get('visibility'),
    };
    if (!common.title) {
      setError('Indique um título.');
      return;
    }
    if (kind === 'plan') {
      const plan: LessonPlan = {
        ...common,
        teacherId: state.user.id,
        duration: Number(get('duration', '50')),
        status: draft
          ? 'Rascunho'
          : old && 'status' in old && old.status !== 'Rascunho'
            ? old.status
            : 'Planeado',
        favorite: old && 'favorite' in old ? old.favorite : false,
        shared: old && 'shared' in old ? old.shared : false,
        template: old && 'template' in old ? old.template : false,
        ai,
        lessonType: get('lessonType'),
        modality: get('modality'),
        objectives: get('objectives'),
        content: get('content'),
        methodology: get('methodology'),
        resources: get('resources'),
        evaluation: get('evaluation'),
        resourceIds: old && 'resourceIds' in old ? old.resourceIds : [],
      };
      update((s) => ({
        ...s,
        plans: old ? s.plans.map((p) => (p.id === id ? plan : p)) : [plan, ...s.plans],
      }));
    } else if (kind === 'assessment') {
      const assessment: Assessment = {
        ...common,
        type: get('type') as Assessment['type'],
        duration: Number(get('duration', '50')),
        weight: Number(get('weight', '20')),
        criteria: get('criteria'),
        published: publish,
        reminder,
        grades: old && 'grades' in old && old.classId === classId ? old.grades : {},
      };
      update((s) => ({
        ...s,
        assessments: old
          ? s.assessments.map((a) => (a.id === id ? assessment : a))
          : [...s.assessments, assessment],
        events: [
          ...s.events.filter((ev) => ev.sourceId !== id),
          {
            ...eventDefaults(),
            id: `event-${id}`,
            title: assessment.title,
            classId,
            subjectId: assessment.subjectId,
            date,
            endDate: date,
            type: 'Avaliação',
            color: 'red',
            sourceId: id,
          },
        ],
      }));
    } else {
      const endDate = get('endDate', date),
        start = get('start', '00:00'),
        end = get('end', '23:59');
      if (endDate < date || (!allDay && endDate === date && end <= start)) {
        setError('O fim deve ser posterior ao início do evento.');
        return;
      }
      const event: CalendarEvent = {
        ...eventDefaults(),
        ...(old && 'start' in old ? old : {}),
        ...common,
        endDate,
        start,
        end,
        allDay,
        type: get('type'),
        category: get('category'),
        location: get('location'),
        participants: get('participants'),
        owner: get('owner'),
        color,
        emailReminder: data.has('emailReminder'),
        emailDelay: get('emailDelay'),
        notification: data.has('notification'),
        notificationDelay: get('notificationDelay'),
        repetition: get('repetition'),
      };
      update((s) => ({
        ...s,
        events: old ? s.events.map((ev) => (ev.id === id ? event : ev)) : [...s.events, event],
      }));
    }
    notify(
      `${kind === 'assessment' ? 'Avaliação' : kind === 'plan' ? 'Plano de aula' : 'Evento'} ${old ? 'atualizado' : 'criado'} na demonstração.`,
    );
    close();
  }
  function eventDefaults(): CalendarEvent {
    return {
      id: '',
      title: '',
      description: '',
      classId: '',
      subjectId: '',
      date: DEMO_DATE,
      endDate: DEMO_DATE,
      start: '08:00',
      end: '09:00',
      allDay: false,
      type: 'Aula',
      category: 'Escolar',
      location: '',
      participants: '',
      owner: state.user.id,
      color: 'green',
      attachments: [],
      emailReminder: false,
      emailDelay: '1 dia antes',
      notification: false,
      notificationDelay: '1 hora antes',
      repetition: 'Não se repete',
      visibility: 'Apenas eu',
      tags: '',
    };
  }
  const select = (
    name: string,
    label: string,
    options: string[],
    fallback = options[0],
    required = false,
  ) => (
    <Field label={label} required={required}>
      <select name={name} defaultValue={value(name, fallback)} required={required}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
  const text = (name: string, label: string, required = false, placeholder = '') => (
    <Field label={label} required={required}>
      <textarea
        name={name}
        required={required}
        defaultValue={value(name)}
        placeholder={placeholder}
        maxLength={2000}
      />
    </Field>
  );
  return (
    <Modal
      title={`${old ? 'Editar' : kind === 'assessment' ? 'Nova' : 'Novo'} ${title}`}
      description={`Organize ${kind === 'event' ? 'os seus eventos' : 'a aprendizagem dos seus alunos'} num só lugar.`}
      icon={kind === 'event' ? CalendarPlus : FilePlus}
      onClose={close}
      className={`dash-dialog-${kind}`}
    >
      <form onSubmit={submit} className="dash-creation-form">
        <div className="dash-form-main">
          <Field
            label={
              kind === 'plan'
                ? 'Título da aula'
                : `Título ${kind === 'assessment' ? 'da avaliação' : 'do evento'}`
            }
            required
          >
            <input
              name="title"
              required
              defaultValue={value('title')}
              placeholder={kind === 'plan' ? 'Ex.: Introdução às Frações' : 'Indique um título...'}
              maxLength={160}
            />
          </Field>
          {modal?.ai && (
            <div className="dash-tip">
              <strong>Assistente de demonstração</strong>
              <p>
                Sem ligação a um serviço de IA. Pode inserir uma estrutura de exemplo e
                personalizá-la.
              </p>
              <button
                type="button"
                className="dash-btn secondary"
                onClick={(e) => {
                  const form = e.currentTarget.form!;
                  for (const [key, val] of Object.entries({
                    objectives:
                      'Identificar conceitos, resolver problemas e explicar o raciocínio.',
                    content: 'Introdução ao tema; exemplos orientados; prática autónoma.',
                    methodology:
                      '10 min de introdução, 25 min de trabalho em pares e 15 min de síntese.',
                  })) {
                    const input = form.elements.namedItem(key) as HTMLTextAreaElement;
                    input.value = val;
                  }
                  setAi(true);
                }}
              >
                Inserir estrutura de exemplo
              </button>
            </div>
          )}
          {kind === 'event' &&
            text('description', 'Descrição', false, 'Adicione uma descrição detalhada...')}
          <div className="dash-fields-row">
            {kind !== 'event' && (
              <Field label="Disciplina" required>
                <select name="subjectId" required defaultValue={value('subjectId', modal?.subjectId || '')}>
                  <option value="">Selecionar disciplina</option>
                  {state.subjects.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field
              label={kind === 'event' ? 'Turma (opcional)' : 'Turma'}
              required={kind !== 'event'}
            >
              <select
                name="classId"
                required={kind !== 'event'}
                defaultValue={value('classId', modal?.classId || '')}
              >
                <option value="">{kind === 'event' ? 'Sem turma' : 'Selecionar turma'}</option>
                {state.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {kind === 'plan' && (
              <Field label="Data da aula" required>
                <input type="date" name="date" required defaultValue={value('date', modal?.date || DEMO_DATE)} />
              </Field>
            )}
          </div>
          {kind === 'plan' ? (
            <>
              <div className="dash-fields-row">
                {select('duration', 'Duração (minutos)', ['30', '45', '50', '60', '90'], '50')}
                {select('lessonType', 'Tipo de aula', [
                  'Aula teórica',
                  'Aula prática',
                  'Revisão',
                  'Laboratório',
                ])}
                {select('modality', 'Modalidade', ['Presencial', 'Online', 'Híbrida'])}
              </div>
              {text(
                'objectives',
                'Objetivos de aprendizagem',
                true,
                'Indique o que os alunos deverão ser capazes de fazer ao final da aula.',
              )}
              {text(
                'content',
                'Conteúdos programáticos',
                true,
                'Liste os principais conteúdos a abordar.',
              )}
              {text(
                'methodology',
                'Metodologia / Estratégias de ensino',
                true,
                'Descreva como a aula será conduzida.',
              )}
              <div className="dash-fields-row">
                <Field label="Recursos necessários">
                  <input
                    name="resources"
                    defaultValue={value('resources')}
                    placeholder="Quadro, projetor, fichas..."
                  />
                </Field>
                {select('evaluation', 'Avaliação', [
                  'Observação e exercícios',
                  'Trabalho em grupo',
                  'Teste escrito',
                  'Participação',
                ])}
              </div>
            </>
          ) : kind === 'assessment' ? (
            <>
              {select('type', 'Tipo de avaliação', [
                'Prova/Teste',
                'Trabalho',
                'Projeto',
                'Apresentação',
                'Quiz',
                'Exame',
                'Competências',
              ])}
              <div className="dash-fields-row">
                <Field label="Data de realização" required>
                  <input type="date" name="date" required defaultValue={value('date', modal?.date || DEMO_DATE)} />
                </Field>
                {select('duration', 'Duração (minutos)', ['30', '45', '50', '60', '90'], '50')}
                <Field label="Peso na média (%)" required>
                  <input
                    type="number"
                    name="weight"
                    min="1"
                    max="100"
                    required
                    defaultValue={value('weight', '20')}
                  />
                </Field>
              </div>
              {text(
                'description',
                'Descrição / Instruções',
                false,
                'Indique as instruções, materiais permitidos e critérios de correção.',
              )}
              {text('criteria', 'Critérios de avaliação (opcional)')}
              <Attachments initialNames={files} onChange={setFiles} />
            </>
          ) : (
            <>
              <div className="dash-fields-row">
                {select(
                  'type',
                  'Tipo de evento',
                  ['Aula', 'Avaliação', 'Reunião', 'Atividade', 'Pessoal'],
                  modal?.type || 'Aula',
                  true,
                )}
                {select('category', 'Categoria', ['Escolar', 'Profissional', 'Pessoal'])}
              </div>
              <div className="dash-fields-row">
                <Field label="Data de início" required>
                  <input
                    name="date"
                    type="date"
                    defaultValue={value('date', modal?.date || DEMO_DATE)}
                    required
                  />
                </Field>
                <Field label="Hora de início" required={!allDay}>
                  <input
                    name="start"
                    type="time"
                    defaultValue={value('start', '10:00')}
                    disabled={allDay}
                  />
                </Field>
                <Field label="Data de fim" required>
                  <input
                    name="endDate"
                    type="date"
                    defaultValue={value('endDate', modal?.date || DEMO_DATE)}
                    required
                  />
                </Field>
                <Field label="Hora de fim" required={!allDay}>
                  <input
                    name="end"
                    type="time"
                    defaultValue={value('end', '11:00')}
                    disabled={allDay}
                  />
                </Field>
              </div>
              <Switch label="Evento de dia inteiro" checked={allDay} onChange={setAllDay} />
              <Field label="Local">
                <input
                  name="location"
                  defaultValue={value('location')}
                  placeholder="Sala 1, Auditório, Online..."
                />
              </Field>
              <Field label="Participantes">
                <input
                  name="participants"
                  defaultValue={value('participants')}
                  placeholder="Turmas, alunos ou convidados"
                />
              </Field>
              <Field label="Responsável">
                <select name="owner">
                  <option value={state.user.id}>{state.user.name}</option>
                </select>
              </Field>
              <div className="dash-color-picker">
                <span>Cor do evento</span>
                {(['green', 'blue', 'purple', 'red', 'amber', 'teal', 'gray'] as Tone[]).map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Cor ${c}`}
                      aria-pressed={color === c}
                      style={{ background: `var(--dash-${c})` }}
                      onClick={() => setColor(c)}
                    >
                      {color === c ? '✓' : ''}
                    </button>
                  ),
                )}
              </div>
              <Attachments initialNames={files} onChange={setFiles} />
            </>
          )}
        </div>
        <aside className="dash-form-aside">
          <div className="dash-tip">
            {kind === 'assessment' ? <Target /> : <BookOpen />}
            <div>
              <strong>
                {kind === 'event'
                  ? 'Organize melhor o seu tempo'
                  : kind === 'plan'
                    ? 'Um plano de aula faz a diferença!'
                    : 'Avaliações bem planeadas'}
              </strong>
              <p>Mais organização para acompanhar os seus alunos e preparar melhores aulas.</p>
            </div>
          </div>
          {kind === 'plan' && (
            <>
              <h3>Materiais de apoio</h3>
              <Attachments initialNames={files} onChange={setFiles} />
            </>
          )}
          {kind === 'event' && (
            <>
              <h3>Lembretes</h3>
              <label className="dash-check">
                <input
                  type="checkbox"
                  name="emailReminder"
                  defaultChecked={old && 'emailReminder' in old ? old.emailReminder : false}
                />
                Enviar lembrete por e-mail
              </label>
              {select('emailDelay', 'Antecedência', [
                '1 dia antes',
                '2 dias antes',
                '1 hora antes',
              ])}
              <label className="dash-check">
                <input
                  type="checkbox"
                  name="notification"
                  defaultChecked={old && 'notification' in old ? old.notification : false}
                />
                Notificação no sistema
              </label>
              {select('notificationDelay', 'Antecedência da notificação', [
                '1 hora antes',
                '30 minutos antes',
              ])}
              {select('repetition', 'Repetição', [
                'Não se repete',
                'Diariamente',
                'Semanalmente',
                'Mensalmente',
              ])}
              <small>
                Lembretes e repetição são guardados como preferências locais; não são executados
                nesta demonstração.
              </small>
            </>
          )}
          {select(
            'visibility',
            kind === 'assessment' ? 'Visibilidade dos resultados' : 'Visibilidade',
            [
              'Apenas eu',
              'Visível para os alunos',
              'Visível para selecionados',
              'Equipa pedagógica',
            ],
          )}
          {kind === 'plan' && (
            <Switch
              label="Guardar como rascunho"
              checked={draft}
              onChange={setDraft}
              hint="Pode publicar mais tarde."
            />
          )}
          {kind === 'assessment' && (
            <>
              <Switch label="Publicar na demonstração" checked={publish} onChange={setPublish} />
              <Switch label="Agendar lembrete (local)" checked={reminder} onChange={setReminder} />
            </>
          )}
          <Field label="Etiquetas (opcional)">
            <input
              name="tags"
              defaultValue={value('tags')}
              placeholder="revisão, atividade prática, projeto..."
            />
          </Field>
          {error && (
            <p role="alert" className="dash-error-text">
              {error}
            </p>
          )}
          <div className="dash-form-actions">
            <button type="button" className="dash-btn secondary" onClick={close}>
              Cancelar
            </button>
            <button className="dash-btn" type="submit">
              <FilePlus size={18} />
              {old ? 'Guardar alterações' : `Criar ${title}`}
            </button>
          </div>
        </aside>
      </form>
    </Modal>
  );
}
