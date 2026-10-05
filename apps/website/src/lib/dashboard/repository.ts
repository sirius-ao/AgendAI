import type { DashboardState } from '@/types/dashboard';
import { createDashboardSeed } from '@/data/dashboard/seed';
const KEY = 'agendai-dashboard-demo-v1';
export interface DashboardRepository {
  load(): DashboardState;
  save(state: DashboardState): void;
  reset(): DashboardState;
}
// Replace this adapter with an API implementation when authentication and endpoints exist.
export const localDashboardRepository: DashboardRepository = {
  load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDashboardSeed();
    const stored = JSON.parse(raw) as { version?: number; state?: DashboardState };
    if (
      stored.version !== 1 ||
      !stored.state ||
      !Array.isArray(stored.state.classes) ||
      !Array.isArray(stored.state.students) ||
      !Array.isArray(stored.state.plans)
    )
      throw new Error('Os dados locais não são compatíveis.');
    const savedState = stored.state;
    const seed = createDashboardSeed();
    const state = { ...seed, ...savedState };
    const schools = Array.isArray(savedState.schools) && savedState.schools.length
      ? savedState.schools
      : [{
          ...seed.schools![0],
          name: savedState.settings?.school || seed.schools![0].name,
          address: savedState.settings?.address || seed.schools![0].address,
          year: savedState.settings?.year || seed.schools![0].year,
        }];
    const activeSchoolId = schools.some((school) => school.id === savedState.activeSchoolId)
      ? savedState.activeSchoolId!
      : schools[0].id;
    const defaultSchoolId = schools[0].id;
    const classSchool = new Map((state.classes || []).map((schoolClass) => [schoolClass.id, schoolClass.schoolId || defaultSchoolId]));
    const studentSchool = new Map((state.students || []).map((student) => [student.id, classSchool.get(student.classId) || defaultSchoolId]));
    return {
      ...state,
      schools,
      activeSchoolId,
      classes: state.classes.map((schoolClass) => ({ ...schoolClass, schoolId: schoolClass.schoolId || defaultSchoolId })),
      events: state.events.map((event) => ({ ...event, schoolId: event.schoolId || classSchool.get(event.classId) || defaultSchoolId })),
      conversations: state.conversations.map((conversation) => ({
        ...conversation,
        schoolId: conversation.schoolId || classSchool.get(conversation.classId || '') || conversation.memberIds.map((id) => studentSchool.get(id)).find(Boolean) || defaultSchoolId,
      })),
    };
  },
  save(state) {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, state }));
  },
  reset() {
    const state = createDashboardSeed();
    localStorage.removeItem(KEY);
    return state;
  },
};
