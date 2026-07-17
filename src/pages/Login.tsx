import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogIn, Loader2, ShieldAlert, HeartHandshake, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'staff' | 'parent';

export default function Login() {
  const { login, parentLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user =
        mode === 'parent'
          ? await parentLogin(parentName.trim(), studentName.trim())
          : await login(username.trim(), password);
      const home = { admin: '/admin', teacher: '/teacher', parent: '/parent' } as const;
      navigate(home[user.role] ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
      active ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="w-full max-w-md mx-auto bg-white min-h-[100dvh] flex flex-col shadow-xl">
        <header className="px-4 py-4 flex items-center border-b border-slate-100 sticky top-0 bg-white z-10">
          <Link to="/" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold text-slate-800 ml-2">Login</h1>
        </header>

        <div className="p-6 flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl mx-auto flex items-center justify-center mb-4 text-emerald-600">
              <LogIn className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Masuk Akun</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Guru, Administrator, atau Orang Tua</p>
          </div>

          {/* Pilih jenis login */}
          <div className="flex bg-slate-100 rounded-2xl p-1.5 mb-5">
            <button type="button" onClick={() => switchMode('staff')} className={tabClass(mode === 'staff')}>
              <GraduationCap className="w-4 h-4" /> Guru / Admin
            </button>
            <button type="button" onClick={() => switchMode('parent')} className={tabClass(mode === 'parent')}>
              <HeartHandshake className="w-4 h-4" /> Orang Tua
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-sm font-semibold px-4 py-3 rounded-xl border border-rose-100">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'staff' ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Username</label>
                  <input
                    type="text"
                    autoCapitalize="none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                    placeholder="mis. budi atau admin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                    placeholder="mis. Hasan Fauzi"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Siswa (Anak)</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                    placeholder="mis. Ahmad Fauzi"
                    required
                  />
                </div>

                <p className="text-xs text-slate-400 font-medium px-1">
                  Isi sesuai nama yang terdaftar di sekolah — tanpa perlu akun atau password.
                </p>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
