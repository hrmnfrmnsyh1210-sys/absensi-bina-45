import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, LogOut, School, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SelectClass() {
  const { user, logout, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/classes')
      .then((res) => res.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-bold text-slate-800 text-base leading-tight truncate">{user?.name}</h1>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider truncate">
              Guru • {user?.subject}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-full hover:bg-slate-200 active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-md mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wide">Mata Pelajaran</p>
            <h2 className="text-xl font-black">{user?.subject}</h2>
          </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-3 px-1 flex items-center gap-2">
          <School className="w-5 h-5 text-slate-400" /> Pilih Kelas untuk Absensi
        </h3>

        {loading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed text-slate-500 font-medium text-sm">
            Belum ada data kelas / siswa.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {classes.map((cls) => (
              <button
                key={cls}
                onClick={() => navigate(`/teacher/attendance?class=${encodeURIComponent(cls)}`)}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] transition-all group"
              >
                <span className="text-2xl font-black text-slate-800">{cls}</span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
