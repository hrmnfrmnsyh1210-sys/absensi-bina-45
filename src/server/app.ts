/**
 * Membuat aplikasi Express (rute API) tanpa memanggil listen dan tanpa Vite.
 * Dipakai bersama oleh:
 *  - server.ts (dev lokal: + Vite middleware + listen)
 *  - api/[...path].ts (Vercel: diekspor sebagai serverless function)
 */
import express from 'express';
import { login, requireAuth, type AuthedRequest } from './auth.ts';
import * as store from './store.ts';

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

  // ---------------- Auth ----------------

  app.post('/api/auth/login', (req, res) => {
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

  // Token stateless: logout cukup dibuang di sisi klien.
  app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));

  app.get('/api/auth/me', requireAuth(), (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  });

  // ---------------- Students ----------------

  app.get('/api/students', (req, res) => {
    const cls = req.query.class ? String(req.query.class) : undefined;
    res.json(store.listStudents(cls));
  });

  app.get('/api/classes', (_req, res) => {
    res.json(store.listClasses());
  });

  // ---------------- Teachers (admin) ----------------

  app.get('/api/teachers', requireAuth('admin'), (_req, res) => {
    res.json(store.listTeachers());
  });

  app.post('/api/teachers', requireAuth('admin'), async (req, res) => {
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

  app.delete('/api/teachers/:id', requireAuth('admin'), async (req, res) => {
    const ok = await store.deleteTeacher(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    res.json({ ok: true });
  });

  // ---------------- Attendance ----------------

  // Guru merekam absensi untuk mata pelajarannya sendiri.
  app.post('/api/attendance', requireAuth('teacher'), async (req: AuthedRequest, res) => {
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
  app.get('/api/attendance/roster', requireAuth('teacher'), (req: AuthedRequest, res) => {
    const cls = req.query.class ? String(req.query.class) : '';
    if (!cls) return res.status(400).json({ error: 'Parameter class wajib diisi' });
    const teacher = req.user!;
    const roster = store.getRoster(cls, teacher.subject ?? '');
    const present = roster.filter((r) => r.attended).length;
    res.json({ class: cls, subject: teacher.subject, total: roster.length, present, entries: roster });
  });

  // Rekap hari ini untuk admin (semua mapel).
  app.get('/api/attendance/today', requireAuth('admin'), (_req, res) => {
    res.json(store.getRecordsByDate());
  });

  return app;
}
