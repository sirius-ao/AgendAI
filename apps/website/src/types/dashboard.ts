export type Id = string;
export type Tone = 'green' | 'blue' | 'purple' | 'red' | 'amber' | 'teal' | 'gray';
export interface User {
  id: Id;
  name: string;
  email: string;
  role: string;
  avatar: string;
  phone: string;
}
export interface Subject {
  id: Id;
  name: string;
  tone: Tone;
}
export interface Student {
  id: Id;
  name: string;
  classId: Id;
  avatar: string;
  contact: string;
  status: 'Ativo' | 'Transferido';
}
export interface SchoolClass {
  id: Id;
  name: string;
  year: string;
  level: string;
  room: string;
  shift: string;
  director: string;
  subjectIds: Id[];
}
export type PlanStatus = 'Em utilização' | 'Planeado' | 'Concluído' | 'Rascunho';
export interface LessonPlan {
  id: Id;
  teacherId: Id;
  title: string;
  description: string;
  subjectId: Id;
  classId: Id;
  date: string;
  duration: number;
  status: PlanStatus;
  favorite: boolean;
  shared: boolean;
  template: boolean;
  ai: boolean;
  lessonType: string;
  modality: string;
  objectives: string;
  content: string;
  methodology: string;
  resources: string;
  evaluation: string;
  tags: string;
  visibility: string;
  attachments: string[];
  resourceIds: Id[];
}
export type AttendanceStatus = 'Presente' | 'Falta' | 'Justificada';
export interface Attendance {
  classId: Id;
  date: string;
  records: Record<Id, { status: AttendanceStatus; note: string }>;
}
export type AssessmentType =
  'Prova/Teste' | 'Trabalho' | 'Projeto' | 'Apresentação' | 'Quiz' | 'Exame' | 'Competências';
export interface Assessment {
  id: Id;
  title: string;
  subjectId: Id;
  classId: Id;
  type: AssessmentType;
  date: string;
  duration: number;
  weight: number;
  description: string;
  criteria: string;
  visibility: string;
  published: boolean;
  reminder: boolean;
  tags: string;
  attachments: string[];
  grades: Record<Id, number | null>;
}
export interface CalendarEvent {
  id: Id;
  title: string;
  description: string;
  type: string;
  category: string;
  classId: Id;
  subjectId: Id;
  date: string;
  endDate: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  participants: string;
  owner: string;
  color: Tone;
  attachments: string[];
  emailReminder: boolean;
  emailDelay: string;
  notification: boolean;
  notificationDelay: string;
  repetition: string;
  visibility: string;
  tags: string;
  sourceId?: Id;
}
export type ResourceCategory =
  | 'Planos de Aula'
  | 'Fichas e Exercícios'
  | 'Apresentações'
  | 'Vídeos'
  | 'Avaliações'
  | 'Projetos'
  | 'Documentos'
  | 'Imagens'
  | 'Áudios'
  | 'Outros';
export interface Resource {
  id: Id;
  title: string;
  category: ResourceCategory;
  subjectId: Id;
  level: string;
  format: string;
  image?: string;
  date: string;
  bytes: number;
  downloads: number;
  ownerId: Id;
  description: string;
  favorite: boolean;
}
export interface LibraryItem {
  id: Id;
  resourceId: Id;
  folder: string;
  favorite: boolean;
  deleted: boolean;
  shared: boolean;
}
export interface Report {
  id: Id;
  name: string;
  classId: Id;
  type: string;
  period: string;
  date: string;
}
export interface Message {
  id: Id;
  senderId: Id;
  text: string;
  time: string;
  attachments: string[];
}
export interface Conversation {
  id: Id;
  title: string;
  subtitle: string;
  classId?: Id;
  avatar?: string;
  tone: Tone;
  memberIds: Id[];
  unread: number;
  favorite: boolean;
  archived: boolean;
  notifications: boolean;
  messages: Message[];
}
export interface DashboardSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  school: string;
  address: string;
  year: string;
  notifications: Record<string, boolean>;
  twoFactor: boolean;
}
export interface DashboardState {
  onboarding?: { classId?: Id; step: number; name: string; year: string; subjectId: string; names: string; title: string; date: string; objectives: string; time: string };
  attendanceDrafts?: Record<string, Record<Id, { status: AttendanceStatus | ''; note: string }>>;
  user: User;
  subjects: Subject[];
  classes: SchoolClass[];
  students: Student[];
  plans: LessonPlan[];
  attendance: Attendance[];
  assessments: Assessment[];
  events: CalendarEvent[];
  resources: Resource[];
  library: LibraryItem[];
  folders: string[];
  reports: Report[];
  conversations: Conversation[];
  tasks: { id: Id; title: string; due: string; done: boolean }[];
  settings: DashboardSettings;
}
