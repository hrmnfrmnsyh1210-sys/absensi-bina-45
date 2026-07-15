import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory Database
const students = [
  { id: 'S001', nis: '2024001', name: 'Ahmad Fauzi', class: '7A' },
  { id: 'S002', nis: '2024002', name: 'Budi Santoso', class: '7A' },
  { id: 'S003', nis: '2024003', name: 'Citra Kirana', class: '7B' },
  { id: 'S004', nis: '2024004', name: 'Dewi Lestari', class: '7B' },
  { id: 'S005', nis: '2024005', name: 'Eko Prasetyo', class: '8A' },
  { id: 'S006', nis: '2024006', name: 'Fitriani', class: '8A' },
  { id: 'S007', nis: '2024007', name: 'Gilang Ramadhan', class: '9A' },
  { id: 'S008', nis: '2024008', name: 'Haniifah', class: '9A' },
];

let attendanceRecords: any[] = [];

// API Routes
app.get('/api/students', (req, res) => {
  res.json(students);
});

app.post('/api/attendance', (req, res) => {
  const { studentId } = req.body;
  const student = students.find(s => s.id === studentId);
  
  if (!student) {
    return res.status(404).json({ error: 'Siswa tidak ditemukan' });
  }
  
  // Check if already attended today
  const today = new Date().toISOString().split('T')[0];
  const alreadyAttended = attendanceRecords.find(r => r.studentId === studentId && r.timestamp.startsWith(today));
  
  if (alreadyAttended) {
    return res.status(400).json({ error: 'Siswa sudah melakukan absensi hari ini' });
  }

  const newRecord = {
    id: Math.random().toString(36).substring(7),
    studentId,
    timestamp: new Date().toISOString(),
    status: 'Hadir'
  };
  
  attendanceRecords.push(newRecord);
  res.json({ message: 'Absensi berhasil', record: newRecord, student });
});

app.get('/api/attendance/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const todayRecords = attendanceRecords
    .filter(r => r.timestamp.startsWith(today))
    .map(record => {
      const student = students.find(s => s.id === record.studentId);
      return {
        ...record,
        studentName: student?.name || 'Unknown',
        studentNis: student?.nis || 'Unknown',
        studentClass: student?.class || 'Unknown'
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  res.json(todayRecords);
});

// Vite Middleware for Development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
