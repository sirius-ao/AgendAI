import type { DashboardState, LessonPlan } from '@/types/dashboard';
export const planModels = [
  { id: 'simple', name: 'Simplificado', description: 'O essencial para preparar uma aula rapidamente.', fields: ['Tema e objetivos', 'Conteúdos e atividades', 'Recursos e avaliação'] },
  { id: 'detailed', name: 'Detalhado', description: 'Organize a aula por etapas e distribua o tempo.', fields: ['Todos os campos do simplificado', 'Pré-requisitos', 'Etapas, duração e ações de professor e alunos'] },
  { id: 'school', name: 'Da escola', description: 'Adapte o cabeçalho e acrescente os campos da instituição.', fields: ['Estrutura detalhada', 'Cabeçalho da escola', 'Campos próprios e ordem personalizável'] },
] as const;
export function planRows(plan: LessonPlan, state: DashboardState): [string, string][] {
  const schoolClass = state.classes.find((c) => c.id === plan.classId);
  const rows: [string, string][] = [
    ['Modelo', planModels.find((m) => m.id === (plan.modelId || 'simple'))!.name],
    ['Escola', plan.schoolName ?? state.settings.school],
    ['Professor', plan.teacherName ?? state.user.name],
    ['Ano letivo', plan.schoolYear ?? schoolClass?.year ?? state.settings.year],
    ['Turma', schoolClass?.name || 'Por selecionar'],
    ['Disciplina', state.subjects.find((s) => s.id === plan.subjectId)?.name || 'Por selecionar'],
    ['Data', plan.date], ['Hora de início', plan.startTime || '08:00'], ['Duração', `${plan.duration} minutos`],
    ['Tipo / modalidade', `${plan.lessonType} · ${plan.modality}`],
    ['Estado', plan.status], ['Objetivos', plan.objectives], ['Conteúdos', plan.content],
    ['Atividades / metodologia', plan.methodology], ['Recursos', plan.resources], ['Avaliação', plan.evaluation],
  ];
  if (plan.modelId !== 'simple') {
    if (plan.prerequisites) rows.push(['Pré-requisitos', plan.prerequisites]);
    plan.stages?.forEach((stage, i) => rows.push([`${i + 1}. ${stage.title} · ${stage.minutes} min`, `Professor: ${stage.teacher}\nAlunos: ${stage.students}`]));
  }
  if (plan.modelId === 'school') plan.schoolFields?.forEach((field) => rows.push([field.label, field.value]));
  if (plan.attachments.length) rows.push(['Anexos (referências locais)', plan.attachments.join(', ')]);
  if (plan.resourceIds.length) rows.push(['Materiais associados', plan.resourceIds.map((id) => state.resources.find((r) => r.id === id)?.title || id).join(', ')]);
  return rows;
}
