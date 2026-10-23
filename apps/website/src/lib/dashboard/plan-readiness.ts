import type { LessonPlan } from '@/types/dashboard';

export function lessonPlanIsReady(plan: LessonPlan) {
  const hasRequiredDetails = Boolean(
    plan.title.trim() &&
      plan.classId &&
      plan.subjectId &&
      plan.date &&
      plan.startTime &&
      plan.objectives.trim() &&
      plan.methodology.trim() &&
      Number.isFinite(plan.duration) &&
      plan.duration > 0,
  );
  if (!hasRequiredDetails) return false;

  if (plan.modelId !== 'simple') {
    const totalMinutes = (plan.stages || []).reduce((total, stage) => total + stage.minutes, 0);
    if (totalMinutes !== plan.duration) return false;
  }

  if (plan.modelId === 'school' && plan.schoolFields?.some((field) => !field.label.trim())) {
    return false;
  }

  return true;
}
