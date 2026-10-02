import type { CalendarEvent, DashboardState, LessonPlan } from '@/types/dashboard';
export function syncPlanEvent(state: DashboardState, plan: LessonPlan, eventId?: string): CalendarEvent[] {
  const previous = state.events.find((event) => event.sourceId === plan.id) || state.events.find((event) => event.id === eventId && !event.sourceId);
  const start = plan.startTime || previous?.start || '08:00';
  const [hour, minute] = start.split(':').map(Number);
  const finish = hour * 60 + minute + plan.duration;
  const endDate = new Date(`${plan.date}T12:00:00`);
  endDate.setDate(endDate.getDate() + Math.floor(finish / 1440));
  const date = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return [...state.events.filter((event) => event.sourceId !== plan.id && event.id !== previous?.id), {
    id: previous?.id || `event-${plan.id}`, title: plan.title, description: plan.objectives,
    type: 'Aula', category: 'Escolar', classId: plan.classId, subjectId: plan.subjectId, teacherId: plan.teacherId,
    date: plan.date, endDate: date, start,
    end: `${String(Math.floor(finish / 60) % 24).padStart(2, '0')}:${String(finish % 60).padStart(2, '0')}`,
    allDay: false, location: state.classes.find((c) => c.id === plan.classId)?.room || '',
    participants: previous?.participants || '', owner: plan.teacherId, color: previous?.color || 'green',
    attachments: plan.attachments, emailReminder: previous?.emailReminder || false,
    emailDelay: previous?.emailDelay || '', notification: previous?.notification || false,
    notificationDelay: previous?.notificationDelay || '', repetition: previous?.repetition || 'Não se repete',
    visibility: plan.visibility, tags: plan.tags, sourceId: plan.id,
  }];
}
