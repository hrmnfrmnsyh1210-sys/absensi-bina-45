/**
 * Lapisan data domain: menyimpan cache di memori dan (bila dikonfigurasi)
 * menulis-tembus ke Google Sheets. Semua pembacaan (cek "sudah absen",
 * roster) dilayani dari cache agar cepat dan hemat kuota API.
 */
import crypto from 'node:crypto';
import * as sheets from './sheets.js';

export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  parentName: string; // nama orang tua/wali — dipakai untuk login orang tua
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

const STUDENT_HEADERS = ['id', 'nis', 'name', 'class', 'parentName'];
const CLASS_HEADERS = ['name'];
const TEACHER_HEADERS = ['id', 'username', 'passwordHash', 'name', 'subject'];
const ATT_HEADERS = [
  'id', 'date', 'time', 'studentId', 'studentName', 'class',
  'subject', 'teacherId', 'teacherName', 'status',
];

const SAMPLE_STUDENTS: Student[] = [
  { id: 'S001', nis: '2024001', name: 'Ahmad Fauzi', class: '7', parentName: 'Hasan Fauzi' },
  { id: 'S002', nis: '2024002', name: 'Budi Santoso', class: '7', parentName: 'Joko Santoso' },
  { id: 'S003', nis: '2024003', name: 'Citra Kirana', class: '7', parentName: 'Sri Rahayu' },
  { id: 'S004', nis: '2024004', name: 'Dewi Lestari', class: '7', parentName: 'Bambang Lestari' },
  { id: 'S005', nis: '2024005', name: 'Eko Prasetyo', class: '8', parentName: 'Slamet Prasetyo' },
  { id: 'S006', nis: '2024006', name: 'Fitriani', class: '8', parentName: 'Siti Aminah' },
  { id: 'S007', nis: '2024007', name: 'Gilang Ramadhan', class: '8', parentName: 'Agus Ramadhan' },
  { id: 'S008', nis: '2024008', name: 'Haniifah', class: '8', parentName: 'Abdul Karim' },
];

let students: Student[] = [];
let classes: string[] = []; // daftar kelas eksplisit (boleh kosong tanpa siswa)
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
    classes = [...new Set(SAMPLE_STUDENTS.map((s) => s.class))];
    teachers = [];
    attendance = [];
    return;
  }

  await sheets.initSheets([
    { name: 'Students', headers: STUDENT_HEADERS },
    { name: 'Classes', headers: CLASS_HEADERS },
    { name: 'Teachers', headers: TEACHER_HEADERS },
    { name: 'Attendance', headers: ATT_HEADERS },
  ]);

  // Catatan: sheet TIDAK di-seed dengan data contoh — data real diisi lewat
  // halaman admin (Kelola Kelas & Siswa). Data contoh hanya untuk mode dev
  // tanpa Sheets (in-memory) di atas.
  students = (await sheets.getRows('Students'))
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0], nis: r[1] ?? '', name: r[2] ?? '', class: r[3] ?? '',
      parentName: r[4] ?? '',
    }));

  classes = (await sheets.getRows('Classes'))
    .filter((r) => r[0])
    .map((r) => r[0]);

  // Migrasi: bila sheet Classes masih kosong tapi sudah ada siswa,
  // isi daftar kelas dari kelas para siswa.
  if (classes.length === 0 && students.length > 0) {
    const derived = [...new Set(students.map((s) => s.class).filter(Boolean))];
    for (const name of derived) {
      await sheets.appendRow('Classes', [name]);
    }
    classes = derived;
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
      id: r[0], date: normalizeDateStr(r[1] ?? ''), time: r[2] ?? '', studentId: r[3] ?? '',
      studentName: r[4] ?? '', class: r[5] ?? '', subject: r[6] ?? '',
      teacherId: r[7] ?? '', teacherName: r[8] ?? '', status: r[9] ?? 'Hadir',
    }));
}

// ---------- util ----------

/**
 * Normalkan tanggal ke YYYY-MM-DD. Google Sheets bisa mengubah teks tanggal
 * menjadi sel Date yang ter-string-kan sebagai "Thu Jul 16 2026 ..." — tanpa
 * normalisasi, filter tanggal dan cek duplikat absen tidak cocok.
 */
function normalizeDateStr(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-CA');
}

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

function findStudentByNis(nis: string, excludeId?: string): Student | undefined {
  return students.find((s) => s.nis === nis && s.id !== excludeId);
}

export async function addStudent(input: {
  nis: string;
  name: string;
  class: string;
  parentName: string;
}): Promise<Student> {
  const nis = input.nis.trim();
  if (nis && findStudentByNis(nis)) throw new Error('NIS_EXISTS');

  const student: Student = {
    id: randomId('S'),
    nis,
    name: input.name.trim(),
    class: input.class.trim(),
    parentName: input.parentName.trim(),
  };
  students.push(student);
  if (sheets.sheetsEnabled) {
    await sheets.appendRow('Students', [
      student.id, student.nis, student.name, student.class, student.parentName,
    ]);
  }
  return student;
}

export async function updateStudent(
  id: string,
  input: { nis: string; name: string; class: string; parentName: string },
): Promise<Student> {
  const student = students.find((s) => s.id === id);
  if (!student) throw new Error('STUDENT_NOT_FOUND');
  const nis = input.nis.trim();
  if (nis && findStudentByNis(nis, id)) throw new Error('NIS_EXISTS');

  student.nis = nis;
  student.name = input.name.trim();
  student.class = input.class.trim();
  student.parentName = input.parentName.trim();

  if (sheets.sheetsEnabled) {
    const row = [student.id, student.nis, student.name, student.class, student.parentName];
    try {
      await sheets.updateRowByMatch('Students', 0, id, row);
    } catch (err) {
      // Apps Script lama belum punya aksi updateRowByMatch: fallback hapus+tulis.
      console.error('updateRowByMatch gagal, fallback ke delete+append:', err);
      await sheets.deleteRowByMatch('Students', 0, id);
      await sheets.appendRow('Students', row);
    }
  }
  return student;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  students.splice(idx, 1);
  if (sheets.sheetsEnabled) {
    await sheets.deleteRowByMatch('Students', 0, id);
  }
  return true;
}

// ---------- classes ----------

export function listClasses(): string[] {
  // Gabungan kelas eksplisit + kelas yang tercantum pada data siswa.
  const all = new Set([...classes, ...students.map((s) => s.class).filter(Boolean)]);
  return [...all].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export async function addClass(name: string): Promise<string> {
  const cls = name.trim();
  if (!cls) throw new Error('CLASS_NAME_REQUIRED');
  if (listClasses().some((c) => c.toLowerCase() === cls.toLowerCase())) {
    throw new Error('CLASS_EXISTS');
  }
  classes.push(cls);
  if (sheets.sheetsEnabled) {
    await sheets.appendRow('Classes', [cls]);
  }
  return cls;
}

export async function deleteClass(name: string): Promise<boolean> {
  if (students.some((s) => s.class === name)) throw new Error('CLASS_HAS_STUDENTS');
  const idx = classes.indexOf(name);
  if (idx === -1) return false;
  classes.splice(idx, 1);
  if (sheets.sheetsEnabled) {
    await sheets.deleteRowByMatch('Classes', 0, name);
  }
  return true;
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

function usernameTaken(username: string): boolean {
  return Boolean(findTeacherByUsername(username));
}

export async function addTeacher(input: {
  username: string;
  password: string;
  name: string;
  subject: string;
}): Promise<PublicTeacher> {
  if (usernameTaken(input.username)) {
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

// ---------- parents ----------

export function getStudentById(id: string): Student | undefined {
  return students.find((s) => s.id === id);
}

/** Normalkan nama untuk pencocokan login ortu: huruf kecil + spasi tunggal. */
function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Login orang tua tanpa akun: cocokkan nama orang tua + nama siswa dengan
 * data siswa (case-insensitive). Kedua nama harus cocok agar tidak ambigu.
 */
export function findStudentByParentLogin(parentName: string, studentName: string): Student | undefined {
  const pn = normalizeName(parentName);
  const sn = normalizeName(studentName);
  if (!pn || !sn) return undefined;
  return students.find(
    (s) => s.parentName && normalizeName(s.parentName) === pn && normalizeName(s.name) === sn,
  );
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

export interface RecordFilter {
  from?: string; // YYYY-MM-DD inklusif
  to?: string; // YYYY-MM-DD inklusif
  class?: string;
  subject?: string;
  studentId?: string;
}

/** Ambil catatan absensi dengan filter opsional, terbaru lebih dulu. */
export function getRecords(filter: RecordFilter = {}): Attendance[] {
  return attendance
    .filter((a) => {
      if (filter.from && a.date < filter.from) return false;
      if (filter.to && a.date > filter.to) return false;
      if (filter.class && a.class !== filter.class) return false;
      if (filter.subject && a.subject !== filter.subject) return false;
      if (filter.studentId && a.studentId !== filter.studentId) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}
