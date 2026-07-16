/**
 * Lapisan data domain: menyimpan cache di memori dan (bila dikonfigurasi)
 * menulis-tembus ke Google Sheets. Semua pembacaan (cek "sudah absen",
 * roster) dilayani dari cache agar cepat dan hemat kuota API.
 */
import crypto from 'node:crypto';
import * as sheets from './sheets';

export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
}

export interface Teacher {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  subject: string;
}

export type PublicTeacher = Omit<Teacher, 'passwordHash'>;

export interface Attendance {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  studentId: string;
  studentName: string;
  class: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  status: string;
}

const STUDENT_HEADERS = ['id', 'nis', 'name', 'class'];
const TEACHER_HEADERS = ['id', 'username', 'passwordHash', 'name', 'subject'];
const ATT_HEADERS = [
  'id', 'date', 'time', 'studentId', 'studentName', 'class',
  'subject', 'teacherId', 'teacherName', 'status',
];

const SAMPLE_STUDENTS: Student[] = [
  { id: 'S001', nis: '2024001', name: 'Ahmad Fauzi', class: '7A' },
  { id: 'S002', nis: '2024002', name: 'Budi Santoso', class: '7A' },
  { id: 'S003', nis: '2024003', name: 'Citra Kirana', class: '7B' },
  { id: 'S004', nis: '2024004', name: 'Dewi Lestari', class: '7B' },
  { id: 'S005', nis: '2024005', name: 'Eko Prasetyo', class: '8A' },
  { id: 'S006', nis: '2024006', name: 'Fitriani', class: '8A' },
  { id: 'S007', nis: '2024007', name: 'Gilang Ramadhan', class: '9A' },
  { id: 'S008', nis: '2024008', name: 'Haniifah', class: '9A' },
];

let students: Student[] = [];
let teachers: Teacher[] = [];
let attendance: Attendance[] = [];

export function isPersistent(): boolean {
  return sheets.sheetsEnabled;
}

// Inisialisasi dimemoisasi: dipanggil per request agar aman di serverless
// (tiap cold start memuat ulang cache dari Sheets sekali saja per instance).
let initPromise: Promise<void> | null = null;
export function ensureStore(): Promise<void> {
  if (!initPromise) {
    initPromise = initStore().catch((err) => {
      initPromise = null; // izinkan retry pada request berikutnya bila gagal
      throw err;
    });
  }
  return initPromise;
}

export async function initStore(): Promise<void> {
  if (!sheets.sheetsEnabled) {
    students = [...SAMPLE_STUDENTS];
    teachers = [];
    attendance = [];
    return;
  }

  await sheets.initSheets([
    { name: 'Students', headers: STUDENT_HEADERS },
    { name: 'Teachers', headers: TEACHER_HEADERS },
    { name: 'Attendance', headers: ATT_HEADERS },
  ]);

  students = (await sheets.getRows('Students'))
    .filter((r) => r[0])
    .map((r) => ({ id: r[0], nis: r[1] ?? '', name: r[2] ?? '', class: r[3] ?? '' }));

  // Bila sheet siswa masih kosong, isi dengan data contoh agar app bisa dipakai.
  if (students.length === 0) {
    for (const s of SAMPLE_STUDENTS) {
      await sheets.appendRow('Students', [s.id, s.nis, s.name, s.class]);
    }
    students = [...SAMPLE_STUDENTS];
  }

  teachers = (await sheets.getRows('Teachers'))
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0], username: r[1] ?? '', passwordHash: r[2] ?? '',
      name: r[3] ?? '', subject: r[4] ?? '',
    }));

  attendance = (await sheets.getRows('Attendance'))
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0], date: r[1] ?? '', time: r[2] ?? '', studentId: r[3] ?? '',
      studentName: r[4] ?? '', class: r[5] ?? '', subject: r[6] ?? '',
      teacherId: r[7] ?? '', teacherName: r[8] ?? '', status: r[9] ?? 'Hadir',
    }));
}

// ---------- util ----------

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD lokal
}

function nowTime(): string {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function randomId(prefix: string): string {
  return prefix + crypto.randomBytes(4).toString('hex');
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- students ----------

export function listStudents(cls?: string): Student[] {
  const list = cls ? students.filter((s) => s.class === cls) : students;
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function listClasses(): string[] {
  return [...new Set(students.map((s) => s.class))].sort();
}

// ---------- teachers ----------

export function listTeachers(): PublicTeacher[] {
  return teachers.map(({ passwordHash: _ph, ...rest }) => rest);
}

export function findTeacherByUsername(username: string): Teacher | undefined {
  return teachers.find((t) => t.username.toLowerCase() === username.toLowerCase());
}

export function findTeacherById(id: string): Teacher | undefined {
  return teachers.find((t) => t.id === id);
}

export async function addTeacher(input: {
  username: string;
  password: string;
  name: string;
  subject: string;
}): Promise<PublicTeacher> {
  if (findTeacherByUsername(input.username)) {
    throw new Error('USERNAME_EXISTS');
  }
  const teacher: Teacher = {
    id: randomId('T'),
    username: input.username.trim(),
    passwordHash: hashPassword(input.password),
    name: input.name.trim(),
    subject: input.subject.trim(),
  };
  teachers.push(teacher);
  if (sheets.sheetsEnabled) {
    await sheets.appendRow('Teachers', [
      teacher.id, teacher.username, teacher.passwordHash, teacher.name, teacher.subject,
    ]);
  }
  const { passwordHash: _ph, ...pub } = teacher;
  return pub;
}

export async function deleteTeacher(id: string): Promise<boolean> {
  const idx = teachers.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  teachers.splice(idx, 1);
  if (sheets.sheetsEnabled) {
    await sheets.deleteRowByMatch('Teachers', 0, id);
  }
  return true;
}

// ---------- attendance ----------

export interface RosterEntry {
  student: Student;
  attended: boolean;
  time: string | null;
}

export function getRoster(cls: string, subject: string, date = todayStr()): RosterEntry[] {
  return listStudents(cls).map((student) => {
    const rec = attendance.find(
      (a) => a.studentId === student.id && a.date === date && a.subject === subject,
    );
    return { student, attended: Boolean(rec), time: rec ? rec.time : null };
  });
}

// Field opsional (bukan discriminated union) agar aman tanpa strictNullChecks.
export interface RecordResult {
  ok: boolean;
  error?: 'STUDENT_NOT_FOUND' | 'ALREADY_ATTENDED';
  record?: Attendance;
  student?: Student;
}

export async function recordAttendance(
  studentId: string,
  teacher: { id: string; name: string; subject: string },
): Promise<RecordResult> {
  const student = students.find((s) => s.id === studentId);
  if (!student) return { ok: false, error: 'STUDENT_NOT_FOUND' };

  const date = todayStr();

  // Cek cepat dari cache (instan bila instance masih hangat).
  const dupCache = attendance.find(
    (a) => a.studentId === studentId && a.date === date && a.subject === teacher.subject,
  );
  if (dupCache) return { ok: false, error: 'ALREADY_ATTENDED', student };

  const record: Attendance = {
    id: randomId('A'),
    date,
    time: nowTime(),
    studentId,
    studentName: student.name,
    class: student.class,
    subject: teacher.subject,
    teacherId: teacher.id,
    teacherName: teacher.name,
    status: 'Hadir',
  };
  const row = [
    record.id, record.date, record.time, record.studentId, record.studentName,
    record.class, record.subject, record.teacherId, record.teacherName, record.status,
  ];

  if (sheets.sheetsEnabled) {
    try {
      // Otoritatif: cek duplikat + tulis atomik di Apps Script berdasarkan
      // (date=1, studentId=3, subject=6). Benar walau instance serverless beda.
      const { duplicate } = await sheets.appendUnique('Attendance', row, [1, 3, 6]);
      if (duplicate) return { ok: false, error: 'ALREADY_ATTENDED', student };
    } catch (err) {
      // Apps Script versi lama belum punya aksi appendUnique, atau jaringan
      // bermasalah: fallback tulis biasa agar data tidak hilang (dedup cache
      // di atas sudah dijalankan).
      console.error('appendUnique gagal, fallback ke appendRow:', err);
      sheets.appendRow('Attendance', row).catch((e) => console.error('append fallback gagal:', e));
    }
  }

  attendance.push(record);
  return { ok: true, record, student };
}

export function getRecordsByDate(date = todayStr()): Attendance[] {
  return attendance
    .filter((a) => a.date === date)
    .sort((a, b) => b.time.localeCompare(a.time));
}
