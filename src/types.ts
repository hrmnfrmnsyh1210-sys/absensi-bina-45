export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  parentName: string;
}

export interface Teacher {
  id: string;
  username: string;
  name: string;
  subject: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  studentId: string;
  studentName: string;
  class: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  status: string;
}

export interface RosterEntry {
  student: Student;
  attended: boolean;
  time: string | null;
}

export interface RosterResponse {
  class: string;
  subject: string;
  total: number;
  present: number;
  entries: RosterEntry[];
}

export type Role = 'admin' | 'teacher' | 'parent';

export interface SessionUser {
  role: Role;
  id: string;
  name: string;
  subject?: string;
  studentId?: string;
}
