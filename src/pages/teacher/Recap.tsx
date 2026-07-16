import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { ChevronLeft, FileSpreadsheet, FileText, Loader2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { exportExcel, exportPdf, safeFilename, shortDate } from '../../lib/exportRecap';
import type { AttendanceRecord, Student } from '../../types';

export default function TeacherRecap() {
  const { user, apiFetch } = useAuth();
  const subject = user?.subject ?? '';

  const [classes, setClasses] = useState<string[]>([]);
  const [cls, setCls] = useState('');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Daftar kelas untuk dropdown.
  useEffect(() => {
    apiFetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        setCls((c) => c || list[0] || '');
      })
      .catch(() => setClasses([]));
  }, [apiFetch]);

  const load = useCallback(async () => {
    if (!cls) return;
    setLoading(true);
    try {
      const qs = `from=${from}&to=${to}&class=${encodeURIComponent(cls)}`;
      const [resRecords, resStudents] = await Promise.all([
        apiFetch(`/api/attendance/recap?${qs}`),
        apiFetch(`/api/students?class=${encodeURIComponent(cls)}`),
      ]);
      const dataRecords = await resRecords.json();
      const dataStudents = await resStudents.json();
      setRecords(Array.isArray(dataRecords) ? dataRecords : []);
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);
      setLoaded(true);
    } catch {
      // abaikan; user bisa coba lagi
    } finally {
      setLoading(false);
    }
  }, [apiFetch, cls, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Matriks: tanggal (kolom) × siswa (baris).
  const dates = useMemo(
    () => [...new Set(records.map((r) => r.date))].sort(),
    [records],
  );
  const cellMap = useMemo(() => {
    const map = new Map<string, string>(); // `${studentId}|${date}` -> time
    for (const r of records) map.set(`${r.studentId}|${r.date}`, r.time);
    return map;
  }, [records]);

  const matrixRows = useMemo(
    () =>
      students.map((s, i) => {
        const marks = dates.map((d) => cellMap.get(`${s.id}|${d}`) ?? '');
        const hadir = marks.filter(Boolean).length;
        const pct = dates.length ? Math.round((hadir / dates.length) * 100) : 0;
        return { student: s, no: i + 1, marks, hadir, pct };
      }),
    [students, dates, cellMap],
  );

  const exportData = () => ({
    filename: safeFilename('Rekap', subject, cls, from, to),
    titleLines: [
      `Rekap Absensi — ${subject}`,
      `Kelas ${cls} • Periode ${from} s.d. ${to} • ${dates.length} pertemuan`,
    ],
    header: ['No', 'Nama', 'NIS', ...dates.map(shortDate), 'Hadir', '%'],
    rows: matrixRows.map((r) => [
      r.no,
      r.student.name,
      r.student.nis,
      ...r.marks.map((m) => (m ? '✓' : '-')),
      `${r.hadir}/${dates.length}`,
      `${r.pct}%`,
    ]),
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link to="/teacher" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="ml-2">
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Rekap Absensi</h1>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">{subject}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Filter */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Kelas</span>
              <select
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Dari</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
              />
            </label>
            <label className="block col-span-2 sm:col-span-1">
              <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Sampai</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => exportExcel(exportData())}
              disabled={!loaded || matrixRows.length === 0}
              className="flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-emerald-700 active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" /> Unduh Excel
            </button>
            <button
              onClick={() => exportPdf(exportData())}
              disabled={!loaded || matrixRows.length === 0}
              className="flex items-center gap-1.5 bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-rose-700 active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Unduh PDF
            </button>
          </div>
        </div>

        {/* Tabel rekap */}
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : matrixRows.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 border-dashed">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">
              {loaded ? 'Tidak ada siswa di kelas ini.' : 'Pilih kelas dan periode.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                Kelas {cls} • {dates.length} pertemuan
              </h3>
              <span className="text-xs font-bold text-slate-400">{matrixRows.length} siswa</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase sticky left-0 bg-slate-50">Nama</th>
                    {dates.map((d) => (
                      <th key={d} className="px-2 py-2.5 font-bold text-slate-500 text-xs text-center whitespace-nowrap">
                        {shortDate(d)}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase text-center">Hadir</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map(({ student, marks, hadir, pct }) => (
                    <tr key={student.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 sticky left-0 bg-white">
                        <span className="font-bold text-slate-800 whitespace-nowrap">{student.name}</span>
                        <span className="block text-[11px] text-slate-400 font-medium">NIS {student.nis || '-'}</span>
                      </td>
                      {marks.map((m, i) => (
                        <td key={dates[i]} className="px-2 py-2.5 text-center">
                          {m ? (
                            <span className="inline-block text-emerald-600 font-black">✓</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">
                        {hadir}/{dates.length}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`font-bold text-xs px-2 py-0.5 rounded-md ${
                            pct >= 80
                              ? 'text-emerald-700 bg-emerald-100'
                              : pct >= 50
                                ? 'text-amber-700 bg-amber-100'
                                : 'text-rose-700 bg-rose-100'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dates.length === 0 && (
              <p className="px-4 py-3 text-center text-xs text-slate-400 font-medium border-t border-slate-100">
                Belum ada absensi {subject} untuk kelas ini pada periode terpilih.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
