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
import { apiMe, hasApiSession } from '@/lib/api/client';
import { loadApiDashboard, syncApiDashboard, type RecordIndex } from '@/lib/api/dashboard';
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
  syncStatus: 'syncing' | 'synced' | 'error';
  update: (fn: (state: DashboardState) => DashboardState) => void;
  notify: (message: string) => void;
  modal: ModalRequest;
  openModal: (modal: ModalRequest) => void;
  reset: () => void;
  selectSchool: (id: Id) => void;
  apiMode: boolean;
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
  const visibleAssessments = new Set(raw.assessments.filter((assessment) => classIds.has(assessment.classId)).map((assessment) => assessment.id));
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
    planDrafts: {
      ...Object.fromEntries(Object.entries(raw.planDrafts || {}).filter(([, draft]) => !classIds.has(draft.classId))),
      ...next.planDrafts,
    },
    assessmentDrafts: {
      ...Object.fromEntries(Object.entries(raw.assessmentDrafts || {}).filter(([id]) => !visibleAssessments.has(id))),
      ...next.assessmentDrafts,
    },
    attendanceDrafts: {
      ...Object.fromEntries(Object.entries(raw.attendanceDrafts || {}).filter(([key]) => ![...classIds].some((id) => key.startsWith(`${id}:`)))),
      ...next.attendanceDrafts,
    },
  };
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(createDashboardSeed);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing');
  const [apiMode, setApiMode] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, openModal] = useState<ModalRequest>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageReadable = useRef(false);
  const serverRecords = useRef<RecordIndex>({});
  const serverSchool = useRef({ id: '', name: '', address: '', academicYear: '' });
  const serverUser = useRef({ id: '', name: '', email: '', phone: '' });
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (hasApiSession()) {
        setApiMode(true);
        setSyncStatus('syncing');
        try {
          const user = await apiMe();
          if (!user.schools.length) throw new Error('A sua conta ainda não pertence a uma escola.');
          const schoolId = user.schools[0].id;
          const loaded = await loadApiDashboard(user, schoolId);
          if (!active) return;
          serverRecords.current = loaded.index;
          serverSchool.current = { id: schoolId, name: loaded.school.name, address: loaded.school.address, academicYear: loaded.school.academicYear };
          serverUser.current = { id: user.id, name: user.name, email: user.email, phone: user.phone || '' };
          setState(loaded.state);
          setSyncStatus('synced');
          setReady(true);
        } catch (cause) {
          if (!active) return;
          const empty = createDashboardSeed();
          setState({ ...empty, subjects: [], classes: [], students: [], plans: [], attendance: [], assessments: [], events: [], resources: [], library: [], folders: [], reports: [], conversations: [], tasks: [], schools: [], activeSchoolId: undefined });
          setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados da conta.');
          setSyncStatus('error');
          setReady(true);
        }
        return;
      }
    if (!active) return;
      setSyncStatus('synced');
      try {
        setState(localDashboardRepository.load());
        storageReadable.current = true;
      } catch {
        setError(
          'Não foi possível recuperar os dados locais. Pode continuar nesta sessão ou repor a demonstração.',
        );
      }
      setReady(true);
    };
    void load();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (apiMode) {
      const schoolId = serverSchool.current.id;
      if (!schoolId) return;
      const current = state;
      setSyncStatus('syncing');
      const timerId = setTimeout(() => {
        void syncApiDashboard(current, schoolId, serverRecords.current, serverSchool.current, serverUser.current)
          .then(() => { setError(''); setSyncStatus('synced'); })
          .catch((cause) => { setError(cause instanceof Error ? cause.message : 'Não foi possível sincronizar com o servidor.'); setSyncStatus('error'); });
      }, 450);
      return () => clearTimeout(timerId);
    }
    if (!storageReadable.current) return;
    try {
      localDashboardRepository.save(state);
    } catch {
      Promise.resolve().then(() =>
        setError(
          'O navegador não permitiu guardar as alterações. Os dados desta sessão continuam disponíveis; exporte-os antes de sair.',
        ),
      );
    }
  }, [state, ready, apiMode]);
  useEffect(() => {
    if (!apiMode) return;
    const resumeSync = () => setState((current) => ({ ...current }));
    window.addEventListener('online', resumeSync);
    return () => window.removeEventListener('online', resumeSync);
  }, [apiMode]);
  const update = useCallback((fn: (state: DashboardState) => DashboardState) => setState((raw) => {
    const view = schoolView(raw);
    const next = fn(view);
    return mergeSchoolView(raw, next, view.activeSchoolId || view.schools?.[0]?.id || 'school-demo');
  }), []);
  const selectSchool = useCallback((id: Id) => {
    if (!apiMode) { setState((raw) => raw.schools?.some((school) => school.id === id) ? { ...raw, activeSchoolId: id } : raw); return; }
    setSyncStatus('syncing');
    void apiMe().then((user) => loadApiDashboard(user, id)).then((loaded) => {
      serverRecords.current = loaded.index;
      serverSchool.current = { id, name: loaded.school.name, address: loaded.school.address, academicYear: loaded.school.academicYear };
      setState(loaded.state);
      setError('');
      setSyncStatus('synced');
    }).catch((cause) => { setError(cause instanceof Error ? cause.message : 'Não foi possível mudar de escola.'); setSyncStatus('error'); });
  }, [apiMode]);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 5000);
  }, []);
  const reset = () => {
    if (apiMode) {
      const empty = createDashboardSeed();
      setState((current) => ({ ...empty, user: current.user, schools: current.schools, activeSchoolId: current.activeSchoolId, settings: current.settings, subjects: [], classes: [], students: [], plans: [], attendance: [], assessments: [], events: [], resources: [], library: [], folders: [], reports: [], conversations: [], tasks: [], planDrafts: {}, assessmentDrafts: {}, attendanceDrafts: {} }));
      setError('');
      notify('Os dados desta escola foram removidos.');
      return;
    }
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
        syncStatus,
        update,
        notify,
        modal,
        openModal,
        reset,
        selectSchool,
        apiMode,
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
