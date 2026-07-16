import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Users, UserCheck, Clock, RefreshCw, LogOut, Printer, GraduationCap, School, ClipboardList, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AttendanceRecord } from '../../types';

export default function AdminDashboard() {
  const { logout, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resAttendance, resStudents] = await Promise.all([
        apiFetch('/api/attendance/today'),
        apiFetch('/api/students'),
      ]);
      const dataAttendance = await resAttendance.json();
      const dataStudents = await resStudents.json();
      setRecords(Array.isArray(dataAttendance) ? dataAttendance : []);
      setTotalStudents(Array.isArray(dataStudents) ? dataStudents.length : 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Admin</h1>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              {format(new Date(), 'dd MMM yyyy', { locale: id })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
              aria-label="Muat ulang"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-full hover:bg-slate-200 active:scale-95 transition-all"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Aksi cepat */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            to="/admin/classes"
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">Kelola Kelas</h2>
              <p className="text-xs text-slate-500 font-medium">Kelas & siswa</p>
            </div>
          </Link>
          <Link
            to="/admin/teachers"
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">Kelola Guru</h2>
              <p className="text-xs text-slate-500 font-medium">Akun & mapel</p>
            </div>
          </Link>
          <Link
            to="/admin/parents"
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">Akun Ortu</h2>
              <p className="text-xs text-slate-500 font-medium">Akses wali murid</p>
            </div>
          </Link>
          <Link
            to="/admin/recap"
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">Rekap Absensi</h2>
              <p className="text-xs text-slate-500 font-medium">Excel & PDF</p>
            </div>
          </Link>
          <Link
            to="/admin/print"
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">Cetak Kartu QR</h2>
              <p className="text-xs text-slate-500 font-medium">Export siswa</p>
            </div>
          </Link>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Siswa</p>
            <h2 className="text-2xl font-black text-slate-800 mt-1">{totalStudents}</h2>
          </div>

          <div className="bg-emerald-600 rounded-2xl p-4 shadow-md text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wide">Absensi Hari Ini</p>
            <h2 className="text-2xl font-black mt-1">{records.length}</h2>
          </div>
        </div>

        {/* Log kehadiran */}
        <div>
          <h3 className="font-bold text-slate-800 mb-4 px-1 text-lg">Log Kehadiran Hari Ini</h3>
          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Belum ada data absensi hari ini</p>
              </div>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 font-bold text-lg">
                      {record.studentName?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{record.studentName}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Kls {record.class}
                        </span>
                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {record.subject}
                        </span>
                        <span className="text-slate-400 font-medium">oleh {record.teacherName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-xs font-bold text-slate-400 mb-0.5">Jam</span>
                    <span className="font-mono font-bold text-slate-700 text-sm">{record.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
