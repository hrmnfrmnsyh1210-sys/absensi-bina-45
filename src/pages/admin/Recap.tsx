import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { ChevronLeft, FileSpreadsheet, FileText, Loader2, Search, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { exportExcel, exportPdf, safeFilename } from '../../lib/exportRecap';
import type { AttendanceRecord, Teacher } from '../../types';

export default function AdminRecap() {
  const { apiFetch } = useAuth();

  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [cls, setCls] = useState('ALL');
  const [subject, setSubject] = useState('ALL');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Opsi filter: daftar kelas + daftar mapel (dari akun guru).
  useEffect(() => {
    apiFetch('/api/classes')
      .then((res) => res.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
    apiFetch('/api/teachers')
      .then((res) => res.json())
      .then((data: Teacher[]) =>
        setSubjects(Array.isArray(data) ? [...new Set(data.map((t) => t.subject).filter(Boolean))].sort() : []),
      )
      .catch(() => setSubjects([]));
  }, [apiFetch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (cls !== 'ALL') params.set('class', cls);
      if (subject !== 'ALL') params.set('subject', subject);
      const res = await apiFetch(`/api/attendance/recap?${params}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch {
      // abaikan; user bisa coba lagi
    } finally {
      setLoading(false);
    }
  }, [apiFetch, from, to, cls, subject]);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueStudents = useMemo(
    () => new Set(records.map((r) => r.studentId)).size,
    [records],
  );

  const exportData = () => ({
    filename: safeFilename(
      'Rekap_Absensi',
      cls === 'ALL' ? 'SemuaKelas' : cls,
      subject === 'ALL' ? 'SemuaMapel' : subject,
      from,
      to,
    ),
    titleLines: [
      'Rekap Absensi',
      `Kelas: ${cls === 'ALL' ? 'Semua' : cls} • Mapel: ${subject === 'ALL' ? 'Semua' : subject}`,
      `Periode ${from} s.d. ${to} • ${records.length} catatan • ${uniqueStudents} siswa`,
    ],
    header: ['No', 'Tanggal', 'Jam', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Guru', 'Status'],
    rows: records.map((r, i) => [
      i + 1,
      r.date,
      r.time,
      r.studentName,
      r.class,
      r.subject,
      r.teacherName,
      r.status,
    ]),
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link to="/admin" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-slate-800 text-lg ml-2">Rekap Absensi</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Filter */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Kelas</span>
              <select
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
              >
                <option value="ALL">Semua</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Mapel</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
              >
                <option value="ALL">Semua</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
            <label className="block">
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
              disabled={!loaded || records.length === 0}
              className="flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-emerald-700 active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" /> Unduh Excel
            </button>
            <button
              onClick={() => exportPdf(exportData())}
              disabled={!loaded || records.length === 0}
              className="flex items-center gap-1.5 bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-rose-700 active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Unduh PDF
            </button>
          </div>
        </div>

        {/* Statistik ringkas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Catatan</p>
              <h2 className="text-xl font-black text-slate-800">{records.length}</h2>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Siswa Unik</p>
              <h2 className="text-xl font-black text-slate-800">{uniqueStudents}</h2>
            </div>
          </div>
        </div>

        {/* Tabel */}
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 border-dashed">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Tidak ada data absensi pada filter terpilih.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase whitespace-nowrap">Tanggal</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase">Jam</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase">Nama Siswa</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase">Kelas</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase">Mapel</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500 text-xs uppercase">Guru</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-700">{r.time}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">{r.studentName}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-xs">
                          {r.class}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-xs whitespace-nowrap">
                          {r.subject}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-medium whitespace-nowrap">{r.teacherName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
