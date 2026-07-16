import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, HeartHandshake, Plus, Trash2, Loader2, ShieldAlert, User } from 'lucide-react';
import { safeJson, useAuth } from '../../context/AuthContext';
import type { Parent, Student } from '../../types';

const emptyForm = { name: '', username: '', password: '', studentId: '' };

export default function ManageParents() {
  const { apiFetch } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [resParents, resStudents] = await Promise.all([
        apiFetch('/api/parents'),
        apiFetch('/api/students'),
      ]);
      const dataParents = await resParents.json();
      const dataStudents = await resStudents.json();
      setParents(Array.isArray(dataParents) ? dataParents : []);
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);
    } catch {
      // abaikan
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  // Kelompokkan siswa per kelas untuk dropdown (optgroup).
  const studentsByClass = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const s of students) {
      const list = map.get(s.class) ?? [];
      list.push(s);
      map.set(s.class, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.studentId) {
      setError('Pilih siswa (anak) terlebih dulu');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/parents', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Gagal menambah akun orang tua');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah akun orang tua');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (parent: Parent) => {
    if (!confirm(`Hapus akun orang tua "${parent.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/parents/${parent.id}`, { method: 'DELETE' });
      if (res.ok) setParents((prev) => prev.filter((p) => p.id !== parent.id));
    } catch {
      // abaikan
    }
  };

  const setField = (key: 'name' | 'username' | 'password') => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link to="/admin" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-slate-800 text-lg ml-2">Akun Orang Tua</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Form tambah */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Tambah Akun Orang Tua
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-sm font-semibold px-3 py-2.5 rounded-xl border border-rose-100">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={setField('name')}
              placeholder="Nama orang tua"
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
            <select
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            >
              <option value="">Pilih siswa (anak)…</option>
              {studentsByClass.map(([cls, list]) => (
                <optgroup key={cls} label={`Kelas ${cls}`}>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.nis ? `(${s.nis})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              value={form.username}
              onChange={setField('username')}
              placeholder="Username"
              autoCapitalize="none"
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
            <input
              value={form.password}
              onChange={setField('password')}
              placeholder="Password"
              type="text"
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Tambah Akun
          </button>
        </form>

        {/* Daftar akun ortu */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 px-1">Daftar Akun ({parents.length})</h3>
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : parents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed text-slate-500 font-medium text-sm">
              Belum ada akun orang tua.
            </div>
          ) : (
            <div className="space-y-2">
              {parents.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{p.name}</h4>
                      <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <User className="w-3 h-3" /> {p.studentName} • {p.studentClass}
                        </span>
                        <span className="text-slate-400 font-medium">@{p.username}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(p)}
                    className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 active:scale-95 transition-all flex-shrink-0"
                    aria-label="Hapus"
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
