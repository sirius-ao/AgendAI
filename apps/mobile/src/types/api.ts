export type SchoolRole = 'OWNER' | 'ADMIN' | 'COORDINATOR' | 'TEACHER' | string;

export interface MobileSchool {
  id: string;
  name: string;
  address?: string;
  academicYear?: string;
  role: SchoolRole;
}

export interface MobileUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  schools: MobileSchool[];
}

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; phone?: string };
}

export interface DashboardRow {
  recordId: string;
  payload: Record<string, unknown>;
  updatedAt?: string;
}

export interface DashboardSnapshot {
  school: { id: string; name: string; address: string; academicYear: string; timezone: string };
  data: Record<string, DashboardRow[]>;
}

export interface ApiDashboardSnapshot {
  school: DashboardSnapshot['school'];
  classes?: Array<Record<string, unknown> & { id: string }>;
  students?: Array<Record<string, unknown> & { id: string; classId: string; name: string }>;
  data: Record<
    string,
    Array<{ id?: string; recordId?: string; payload: Record<string, unknown>; updatedAt?: string }>
  >;
}

export interface QueuedOperation {
  id: string;
  schoolId: string;
  collection: string;
  recordId: string;
  method: 'PUT' | 'DELETE';
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface StudentRecord extends Record<string, unknown> {
  id: string;
  name: string;
  classId: string;
  contact?: string;
  status?: string;
}

export interface ClassRecord extends Record<string, unknown> {
  id: string;
  name: string;
  year?: string;
  subjectIds?: string[];
  students?: number;
}

export interface LessonPlanRecord extends Record<string, unknown> {
  id: string;
  title: string;
  subjectId: string;
  classId: string;
  date: string;
  startTime?: string;
  objectives?: string;
  status?: string;
}
