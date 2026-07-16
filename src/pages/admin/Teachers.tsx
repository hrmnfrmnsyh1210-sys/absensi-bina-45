import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, GraduationCap, Plus, Trash2, Loader2, BookOpen, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Teacher } from '../../types';

const emptyForm = { name: '', subject: '', username: '', password: '' };

export default function ManageTeachers() {
  const { apiFetch } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/teachers');
      if (res.ok) setTeachers(await res.json());
    } catch {
      // abaikan
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/teachers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambah guru');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah guru');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`Hapus akun guru "${teacher.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/teachers/${teacher.id}`, { method: 'DELETE' });
      if (res.ok) setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
    } catch {
      // abaikan
    }
  };

  const setField = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link to="/admin" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-slate-800 text-lg ml-2">Kelola Guru</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Form tambah */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Tambah Guru
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
              placeholder="Nama guru"
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
            <input
              value={form.subject}
              onChange={setField('subject')}
              placeholder="Mata pelajaran"
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
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
            Tambah Guru
          </button>
        </form>

        {/* Daftar guru */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 px-1">Daftar Guru ({teachers.length})</h3>
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed text-slate-500 font-medium text-sm">
              Belum ada akun guru.
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{t.name}</h4>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className="flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          <BookOpen className="w-3 h-3" /> {t.subject}
                        </span>
                        <span className="text-slate-400 font-medium">@{t.username}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(t)}
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
