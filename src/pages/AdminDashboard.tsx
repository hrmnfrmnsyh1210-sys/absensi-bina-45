import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, Users, UserCheck, Clock, RefreshCw, UserX } from 'lucide-react';
import { AttendanceRecord } from '../types';

export default function AdminDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resAttendance, resStudents] = await Promise.all([
        fetch('/api/attendance/today'),
        fetch('/api/students')
      ]);
      const dataAttendance = await resAttendance.json();
      const dataStudents = await resStudents.json();
      setRecords(dataAttendance);
      setTotalStudents(dataStudents.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">Admin</h1>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                {format(new Date(), 'dd MMM yyyy', { locale: id })}
              </p>
            </div>
          </div>
          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
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
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wide">Hadir</p>
            <h2 className="text-2xl font-black mt-1">{records.length}</h2>
          </div>
          
          <div className="col-span-2 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Belum Hadir</p>
                <p className="text-sm text-slate-400 font-medium">Siswa belum absen hari ini</p>
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800">{Math.max(0, totalStudents - records.length)}</h2>
          </div>
        </div>

        {/* List Kehadiran Mobile-First */}
        <div>
          <h3 className="font-bold text-slate-800 mb-4 px-1 text-lg">Log Kehadiran</h3>
          
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
                <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 font-bold text-lg">
                      {record.studentName?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{record.studentName}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className="font-medium text-slate-500">{record.studentNis}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Kls {record.studentClass}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-xs font-bold text-slate-400 mb-0.5">Jam Masuk</span>
                    <span className="font-mono font-bold text-slate-700 text-sm">
                      {format(new Date(record.timestamp), 'HH:mm')}
                    </span>
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
