/**
 * Membuat aplikasi Express (rute API) tanpa memanggil listen dan tanpa Vite.
 * Dipakai bersama oleh:
 *  - server.ts (dev lokal: + Vite middleware + listen)
 *  - api/index.ts (Vercel: diekspor sebagai serverless function)
 *
 * Rute didefinisikan pada Router tanpa prefix, lalu di-mount di '/api' DAN '/'.
 * Dengan begitu handler tetap cocok baik ketika platform meneruskan path asli
 * ("/api/auth/login") maupun path hasil rewrite tanpa prefix ("/auth/login").
 */
import express from 'express';
import { login, parentLogin, requireAuth, type AuthedRequest } from './auth.js';
import * as store from './store.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  // Pastikan store siap sebelum menangani request (lazy, memoized).
  // Penting di serverless: tiap cold start memuat cache dari Sheets sekali.
  app.use(async (_req, res, next) => {
    try {
      await store.ensureStore();
      next();
    } catch (err) {
      console.error('Inisialisasi store gagal:', err);
      res.status(503).json({ error: 'Penyimpanan belum siap, coba lagi' });
    }
  });

  const api = express.Router();

  // ---------------- Auth ----------------

  api.post('/auth/login', (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }
    const result = login(String(username), String(password));
    if (!result) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }
    res.json({ token: result.token, user: result.user });
  });

  // Login orang tua tanpa akun: cukup nama orang tua + nama siswa.
  api.post('/auth/parent-login', (req, res) => {
    const { parentName, studentName } = req.body ?? {};
    if (!parentName || !studentName) {
      return res.status(400).json({ error: 'Nama orang tua dan nama siswa wajib diisi' });
    }
    const result = parentLogin(String(parentName), String(studentName));
    if (!result) {
      return res.status(401).json({
        error: 'Data tidak cocok. Pastikan nama orang tua dan nama siswa sesuai dengan data sekolah.',
      });
    }
    res.json({ token: result.token, user: result.user });
  });

  // Token stateless: logout cukup dibuang di sisi klien.
  api.post('/auth/logout', (_req, res) => res.json({ ok: true }));

  api.get('/auth/me', requireAuth(), (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  });

  // ---------------- Students ----------------

  api.get('/students', (req, res) => {
    const cls = req.query.class ? String(req.query.class) : undefined;
    res.json(store.listStudents(cls));
  });

  api.post('/students', requireAuth('admin'), async (req, res) => {
    const { nis, name, class: cls, parentName } = req.body ?? {};
    if (!name || !cls) {
      return res.status(400).json({ error: 'Nama dan kelas wajib diisi' });
    }
    try {
      const student = await store.addStudent({
        nis: String(nis ?? ''),
        name: String(name),
        class: String(cls),
        parentName: String(parentName ?? ''),
      });
      res.status(201).json(student);
    } catch (err) {
      if (err instanceof Error && err.message === 'NIS_EXISTS') {
        return res.status(409).json({ error: 'NIS sudah dipakai siswa lain' });
      }
      console.error(err);
      res.status(500).json({ error: 'Gagal menambah siswa' });
    }
  });

  api.put('/students/:id', requireAuth('admin'), async (req, res) => {
    const { nis, name, class: cls, parentName } = req.body ?? {};
    if (!name || !cls) {
      return res.status(400).json({ error: 'Nama dan kelas wajib diisi' });
    }
    try {
      const student = await store.updateStudent(req.params.id, {
        nis: String(nis ?? ''),
        name: String(name),
        class: String(cls),
        parentName: String(parentName ?? ''),
      });
      res.json(student);
    } catch (err) {
      if (err instanceof Error && err.message === 'STUDENT_NOT_FOUND') {
        return res.status(404).json({ error: 'Siswa tidak ditemukan' });
      }
      if (err instanceof Error && err.message === 'NIS_EXISTS') {
        return res.status(409).json({ error: 'NIS sudah dipakai siswa lain' });
      }
      console.error(err);
      res.status(500).json({ error: 'Gagal memperbarui siswa' });
    }
  });

  api.delete('/students/:id', requireAuth('admin'), async (req, res) => {
    const ok = await store.deleteStudent(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    res.json({ ok: true });
  });

  // ---------------- Classes ----------------

  api.get('/classes', (_req, res) => {
    res.json(store.listClasses());
  });

  api.post('/classes', requireAuth('admin'), async (req, res) => {
    const { name } = req.body ?? {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Nama kelas wajib diisi' });
    }
    try {
      const cls = await store.addClass(String(name));
      res.status(201).json({ name: cls });
    } catch (err) {
      if (err instanceof Error && err.message === 'CLASS_EXISTS') {
        return res.status(409).json({ error: 'Kelas sudah ada' });
      }
      console.error(err);
      res.status(500).json({ error: 'Gagal menambah kelas' });
    }
  });

  api.delete('/classes/:name', requireAuth('admin'), async (req, res) => {
    try {
      const ok = await store.deleteClass(req.params.name);
      if (!ok) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'CLASS_HAS_STUDENTS') {
        return res.status(409).json({ error: 'Kelas masih punya siswa. Pindahkan atau hapus siswanya dulu.' });
      }
      console.error(err);
      res.status(500).json({ error: 'Gagal menghapus kelas' });
    }
  });

  // ---------------- Teachers (admin) ----------------

  api.get('/teachers', requireAuth('admin'), (_req, res) => {
    res.json(store.listTeachers());
  });

  api.post('/teachers', requireAuth('admin'), async (req, res) => {
    const { username, password, name, subject } = req.body ?? {};
    if (!username || !password || !name || !subject) {
      return res.status(400).json({ error: 'Username, password, nama, dan mata pelajaran wajib diisi' });
    }
    try {
      const teacher = await store.addTeacher({
        username: String(username),
        password: String(password),
        name: String(name),
        subject: String(subject),
      });
      res.status(201).json(teacher);
    } catch (err) {
      if (err instanceof Error && err.message === 'USERNAME_EXISTS') {
        return res.status(409).json({ error: 'Username sudah dipakai' });
      }
      console.error(err);
      res.status(500).json({ error: 'Gagal menambah guru' });
    }
  });

  api.delete('/teachers/:id', requireAuth('admin'), async (req, res) => {
    const ok = await store.deleteTeacher(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    res.json({ ok: true });
  });

  // ---------------- Attendance ----------------

  // Guru merekam absensi untuk mata pelajarannya sendiri.
  api.post('/attendance', requireAuth('teacher'), async (req: AuthedRequest, res) => {
    const { studentId } = req.body ?? {};
    if (!studentId) return res.status(400).json({ error: 'studentId wajib diisi' });

    const teacher = req.user!;
    const result = await store.recordAttendance(String(studentId), {
      id: teacher.id,
      name: teacher.name,
      subject: teacher.subject ?? '',
    });

    if (result.ok && result.record) {
      return res.json({ message: 'Absensi berhasil', record: result.record, student: result.student });
    }
    if (result.error === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }
    return res.status(409).json({
      error: `${result.student?.name ?? 'Siswa'} sudah absen ${teacher.subject} hari ini`,
      student: result.student,
    });
  });

  // Roster kelas untuk mapel guru: siapa sudah/belum absen hari ini.
  api.get('/attendance/roster', requireAuth('teacher'), (req: AuthedRequest, res) => {
    const cls = req.query.class ? String(req.query.class) : '';
    if (!cls) return res.status(400).json({ error: 'Parameter class wajib diisi' });
    const teacher = req.user!;
    const roster = store.getRoster(cls, teacher.subject ?? '');
    const present = roster.filter((r) => r.attended).length;
    res.json({ class: cls, subject: teacher.subject, total: roster.length, present, entries: roster });
  });

  // Rekap hari ini untuk admin (semua mapel).
  api.get('/attendance/today', requireAuth('admin'), (_req, res) => {
    res.json(store.getRecordsByDate());
  });

  // Rekap rentang tanggal. Guru dipaksa hanya melihat mapelnya sendiri;
  // admin bebas memfilter kelas/mapel apa pun.
  api.get('/attendance/recap', requireAuth(['teacher', 'admin']), (req: AuthedRequest, res) => {
    const user = req.user!;
    const q = req.query;
    const filter = {
      from: q.from ? String(q.from) : undefined,
      to: q.to ? String(q.to) : undefined,
      class: q.class ? String(q.class) : undefined,
      subject: user.role === 'teacher' ? (user.subject ?? '') : q.subject ? String(q.subject) : undefined,
    };
    res.json(store.getRecords(filter));
  });

  // Orang tua: rekap absensi anaknya sendiri (per mapel dihitung di klien).
  api.get('/attendance/child', requireAuth('parent'), (req: AuthedRequest, res) => {
    const user = req.user!;
    const student = user.studentId ? store.getStudentById(user.studentId) : undefined;
    if (!student) {
      return res.status(404).json({ error: 'Data siswa tidak ditemukan. Hubungi admin sekolah.' });
    }
    const q = req.query;
    const records = store.getRecords({
      studentId: student.id,
      from: q.from ? String(q.from) : undefined,
      to: q.to ? String(q.to) : undefined,
    });
    res.json({ student, records });
  });

  app.use('/api', api);
  app.use('/', api);

  return app;
}
