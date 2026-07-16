import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, School, Plus, Trash2, Loader2, ShieldAlert, Users } from 'lucide-react';
import { safeJson, useAuth } from '../../context/AuthContext';
import type { Student } from '../../types';

export default function ManageClasses() {
  const { apiFetch } = useAuth();
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [resClasses, resStudents] = await Promise.all([
        apiFetch('/api/classes'),
        apiFetch('/api/students'),
      ]);
      const dataClasses = await resClasses.json();
      const dataStudents = await resStudents.json();
      setClasses(Array.isArray(dataClasses) ? dataClasses : []);
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);
    } catch {
      // abaikan; user bisa muat ulang
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const countByClass = (cls: string) => students.filter((s) => s.class === cls).length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/classes', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Gagal menambah kelas');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah kelas');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cls: string) => {
    if (!confirm(`Hapus kelas "${cls}"?`)) return;
    setError('');
    try {
      const res = await apiFetch(`/api/classes/${encodeURIComponent(cls)}`, { method: 'DELETE' });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus kelas');
      setClasses((prev) => prev.filter((c) => c !== cls));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kelas');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link to="/admin" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-slate-800 text-lg ml-2">Kelola Kelas</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Form tambah kelas */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Tambah Kelas
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-sm font-semibold px-3 py-2.5 rounded-xl border border-rose-100">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kelas (mis. 7A)"
              required
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white font-bold px-5 rounded-xl shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Tambah
            </button>
          </div>
        </form>

        {/* Daftar kelas */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 px-1">Daftar Kelas ({classes.length})</h3>
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed text-slate-500 font-medium text-sm">
              Belum ada kelas. Tambahkan kelas di atas.
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => (
                <div
                  key={cls}
                  className="bg-white p-2 pr-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2"
                >
                  <Link
                    to={`/admin/students?class=${encodeURIComponent(cls)}`}
                    className="flex-1 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-emerald-50 transition-colors min-w-0 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <School className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">Kelas {cls}</h4>
                        <p className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                          <Users className="w-3 h-3" /> {countByClass(cls)} siswa
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 flex-shrink-0" />
                  </Link>
                  <button
                    onClick={() => handleDelete(cls)}
                    className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 active:scale-95 transition-all flex-shrink-0"
                    aria-label={`Hapus kelas ${cls}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
