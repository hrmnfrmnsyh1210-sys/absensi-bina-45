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
import { login, requireAuth, type AuthedRequest } from './auth.js';
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

  api.get('/classes', (_req, res) => {
    res.json(store.listClasses());
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

  app.use('/api', api);
  app.use('/', api);

  return app;
}
