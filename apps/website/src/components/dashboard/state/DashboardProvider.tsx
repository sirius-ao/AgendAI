'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createDashboardSeed } from '@/data/dashboard/seed';
import { localDashboardRepository } from '@/lib/dashboard/repository';
import type { DashboardState, Id } from '@/types/dashboard';
type ModalRequest = {
  kind: 'plan' | 'assessment' | 'event';
  classId?: string;
  subjectId?: string;
  modelId?: 'simple' | 'detailed' | 'school';
  copyFrom?: string;
  resourceId?: string;
  eventId?: string;
  example?: 'math' | 'portuguese';
  id?: string;
  ai?: boolean;
  date?: string;
  type?: string;
} | null;
type Context = {
  state: DashboardState;
  ready: boolean;
  error: string;
  update: (fn: (state: DashboardState) => DashboardState) => void;
  notify: (message: string) => void;
  modal: ModalRequest;
  openModal: (modal: ModalRequest) => void;
  reset: () => void;
  selectSchool: (id: Id) => void;
  clearError: () => void;
};
const DashboardContext = createContext<Context | null>(null);

function schoolView(raw: DashboardState): DashboardState {
  const schools = raw.schools?.length ? raw.schools : [];
  const activeId = schools.some((school) => school.id === raw.activeSchoolId)
    ? raw.activeSchoolId!
    : schools[0]?.id;
  const activeSchool = schools.find((school) => school.id === activeId);
  const classes = raw.classes.filter((schoolClass) => (schoolClass.schoolId || schools[0]?.id) === activeId);
  const classIds = new Set(classes.map((schoolClass) => schoolClass.id));
  const plans = raw.plans.filter((plan) => classIds.has(plan.classId));
  const assessments = raw.assessments.filter((assessment) => classIds.has(assessment.classId));
  const visiblePlans = new Set(plans.map((plan) => plan.id));
  const visibleAssessments = new Set(assessments.map((assessment) => assessment.id));
  const settings = activeSchool
    ? { ...raw.settings, school: activeSchool.name, address: activeSchool.address, year: activeSchool.year }
    : raw.settings;
  const onboarding = activeId
    ? raw.onboardingBySchool?.[activeId] || (raw.onboarding && (raw.onboarding.schoolId === activeId || (!raw.onboarding.schoolId && activeId === schools[0]?.id)) ? raw.onboarding : undefined)
    : raw.onboarding;
  return {
    ...raw,
    schools,
    activeSchoolId: activeId,
    settings,
    onboarding,
    classes,
    students: raw.students.filter((student) => classIds.has(student.classId)),
    plans,
    assessments,
    attendance: raw.attendance.filter((entry) => classIds.has(entry.classId)),
    events: raw.events.filter((event) => event.schoolId === activeId || classIds.has(event.classId)),
    reports: raw.reports.filter((report) => classIds.has(report.classId)),
    conversations: raw.conversations.filter((conversation) => conversation.schoolId === activeId || Boolean(conversation.classId && classIds.has(conversation.classId))),
    planDrafts: Object.fromEntries(Object.entries(raw.planDrafts || {}).filter(([id]) => visiblePlans.has(id))),
    assessmentDrafts: Object.fromEntries(Object.entries(raw.assessmentDrafts || {}).filter(([id]) => visibleAssessments.has(id))),
    attendanceDrafts: Object.fromEntries(Object.entries(raw.attendanceDrafts || {}).filter(([key]) => [...classIds].some((id) => key.startsWith(`${id}:`)))),
  };
}

function mergeSchoolView(raw: DashboardState, next: DashboardState, schoolId: Id): DashboardState {
  const currentClasses = raw.classes.filter((schoolClass) => (schoolClass.schoolId || raw.schools?.[0]?.id) === schoolId);
  const classIds = new Set(currentClasses.map((schoolClass) => schoolClass.id));
  const merge = <T,>(all: T[], visible: T[], belongs: (item: T) => boolean): T[] => [
    ...all.filter((item) => !belongs(item)),
    ...visible,
  ];
  const nextClasses = next.classes.map((schoolClass) => ({ ...schoolClass, schoolId: schoolClass.schoolId || schoolId }));
  const classes = merge(raw.classes, nextClasses, (item) => (item as DashboardState['classes'][number]).schoolId === schoolId || (item as DashboardState['classes'][number]).schoolId == null && raw.schools?.[0]?.id === schoolId);
  const mergedPlans = merge(raw.plans, next.plans, (item) => classIds.has((item as DashboardState['plans'][number]).classId));
  const mergedAssessments = merge(raw.assessments, next.assessments, (item) => classIds.has((item as DashboardState['assessments'][number]).classId));
  const mergedEvents = merge(raw.events, next.events.map((event) => ({ ...event, schoolId: event.schoolId || schoolId })), (item) => (item as DashboardState['events'][number]).schoolId === schoolId || classIds.has((item as DashboardState['events'][number]).classId));
  const mergedConversations = merge(raw.conversations, next.conversations.map((conversation) => ({ ...conversation, schoolId: conversation.schoolId || schoolId })), (item) => (item as DashboardState['conversations'][number]).schoolId === schoolId || Boolean((item as DashboardState['conversations'][number]).classId && classIds.has((item as DashboardState['conversations'][number]).classId!)));
  const schools = next.schools || raw.schools;
  const settings = { ...raw.settings, ...next.settings };
  const activeSchool = schools?.find((school) => school.id === schoolId);
  if (activeSchool) {
    settings.school = activeSchool.name;
    settings.address = activeSchool.address;
    settings.year = activeSchool.year;
  }
  const nextActiveSchoolId = next.activeSchoolId;
  const onboardingBySchool = { ...(raw.onboardingBySchool || {}) };
  const currentOnboarding = next.onboarding
    ? { ...next.onboarding, schoolId }
    : undefined;
  if (currentOnboarding) onboardingBySchool[schoolId] = currentOnboarding;
  else delete onboardingBySchool[schoolId];
  return {
    ...raw,
    ...next,
    user: next.user,
    settings,
    schools,
    onboarding: currentOnboarding,
    onboardingBySchool,
    activeSchoolId: schools?.some((school) => school.id === nextActiveSchoolId) ? nextActiveSchoolId : raw.activeSchoolId,
    classes,
    students: merge(raw.students, next.students, (item) => classIds.has((item as DashboardState['students'][number]).classId)),
    plans: mergedPlans,
    assessments: mergedAssessments,
    attendance: merge(raw.attendance, next.attendance, (item) => classIds.has((item as DashboardState['attendance'][number]).classId)),
    events: mergedEvents,
    reports: merge(raw.reports, next.reports, (item) => classIds.has((item as DashboardState['reports'][number]).classId)),
    conversations: mergedConversations,
    planDrafts: { ...raw.planDrafts, ...next.planDrafts },
    assessmentDrafts: { ...raw.assessmentDrafts, ...next.assessmentDrafts },
    attendanceDrafts: { ...raw.attendanceDrafts, ...next.attendanceDrafts },
  };
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(createDashboardSeed);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, openModal] = useState<ModalRequest>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageReadable = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        setState(localDashboardRepository.load());
        storageReadable.current = true;
      } catch {
        setError(
          'Não foi possível recuperar os dados locais. Pode continuar nesta sessão ou repor a demonstração.',
        );
      }
      setReady(true);
    });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready || !storageReadable.current) return;
    try {
      localDashboardRepository.save(state);
    } catch {
      Promise.resolve().then(() =>
        setError(
          'O navegador não permitiu guardar as alterações. Os dados desta sessão continuam disponíveis; exporte-os antes de sair.',
        ),
      );
    }
  }, [state, ready]);
  const update = useCallback((fn: (state: DashboardState) => DashboardState) => setState((raw) => {
    const view = schoolView(raw);
    const next = fn(view);
    return mergeSchoolView(raw, next, view.activeSchoolId || view.schools?.[0]?.id || 'school-demo');
  }), []);
  const selectSchool = useCallback((id: Id) => setState((raw) => raw.schools?.some((school) => school.id === id) ? { ...raw, activeSchoolId: id } : raw), []);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 5000);
  }, []);
  const reset = () => {
    try {
      setState(localDashboardRepository.reset());
      storageReadable.current = true;
      setError('');
      notify('Demonstração reposta.');
    } catch {
      setError('Não foi possível limpar o armazenamento local.');
    }
  };
  return (
    <DashboardContext.Provider
      value={{
        state: schoolView(state),
        ready,
        error,
        update,
        notify,
        modal,
        openModal,
        reset,
        selectSchool,
        clearError: () => setError(''),
      }}
    >
      {children}
      {toast && (
        <div className="dash-toast" role="status">
          <span>✓</span>
          {toast}
          <button onClick={() => setToast('')} aria-label="Fechar notificação">
            ×
          </button>
        </div>
      )}
    </DashboardContext.Provider>
  );
}
export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('DashboardProvider em falta.');
  return value;
}
