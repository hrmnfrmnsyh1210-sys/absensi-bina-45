export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  timestamp: string;
  status: string;
  studentName?: string;
  studentNis?: string;
  studentClass?: string;
}
