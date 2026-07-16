import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { BookOpen, CalendarCheck, ChevronDown, LogOut, Loader2, ShieldAlert, UserSquare } from 'lucide-react';
import { safeJson, useAuth } from '../../context/AuthContext';
import type { AttendanceRecord, Student } from '../../types';

export default function ChildRecap() {
  const { user, logout, apiFetch } = useAuth();
  const navigate = useNavigate();

  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openSubject, setOpenSubject] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/attendance/child?from=${from}&to=${to}`);
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Gagal memuat data');
      setStudent(data.student ?? null);
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Kelompokkan per mata pelajaran.
  const bySubject = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
      const list = map.get(r.subject) ?? [];
      list.push(r);
      map.set(r.subject, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [records]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const fmtDate = (iso: string) => {
    try {
      return format(new Date(`${iso}T00:00:00`), 'EEEE, dd MMM yyyy', { locale: localeId });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-bold text-slate-800 text-base leading-tight truncate">{user?.name}</h1>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Orang Tua / Wali</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-full hover:bg-slate-200 active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Info anak */}
        {student && (
          <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <UserSquare className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wide">Rekap Absensi Anak</p>
              <h2 className="text-lg font-black leading-tight truncate">{student.name}</h2>
              <p className="text-emerald-100 text-xs font-semibold">
                Kelas {student.class} {student.nis ? `• NIS ${student.nis}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Filter periode */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 grid grid-cols-2 gap-3">
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

        {error && (
          <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-sm font-semibold px-4 py-3 rounded-xl border border-rose-100">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Rekap per mapel */}
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : bySubject.length === 0 ? (
          !error && (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 border-dashed">
              <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">
                Belum ada absensi pada periode ini.
              </p>
            </div>
          )
        ) : (
          <div>
            <h3 className="font-bold text-slate-800 mb-3 px-1">
              Kehadiran per Mata Pelajaran ({records.length} total)
            </h3>
            <div className="space-y-2">
              {bySubject.map(([subject, list]) => {
                const open = openSubject === subject;
                return (
                  <div key={subject} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <button
                      onClick={() => setOpenSubject(open ? null : subject)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">{subject}</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Terakhir hadir {list[0]?.date} • {list[0]?.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                          {list.length}× hadir
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>
                    {open && (
                      <div className="border-t border-slate-100 divide-y divide-slate-50">
                        {list.map((r) => (
                          <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-600 capitalize">{fmtDate(r.date)}</span>
                            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {r.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
