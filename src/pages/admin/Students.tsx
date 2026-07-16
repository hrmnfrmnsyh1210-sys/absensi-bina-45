import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, Loader2, ShieldAlert, User, X, Save } from 'lucide-react';
import { safeJson, useAuth } from '../../context/AuthContext';
import type { Student } from '../../types';

export default function ManageStudents() {
  const { apiFetch } = useAuth();
  const [params] = useSearchParams();
  const cls = params.get('class') || '';

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [form, setForm] = useState({ nis: '', name: '', class: cls });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [resStudents, resClasses] = await Promise.all([
        apiFetch(`/api/students?class=${encodeURIComponent(cls)}`),
        apiFetch('/api/classes'),
      ]);
      const dataStudents = await resStudents.json();
      const dataClasses = await resClasses.json();
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);
      setClasses(Array.isArray(dataClasses) ? dataClasses : []);
    } catch {
      // abaikan; user bisa muat ulang
    } finally {
      setLoading(false);
    }
  }, [apiFetch, cls]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ nis: '', name: '', class: cls });
    setEditingId(null);
    setError('');
  };

  const startEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({ nis: s.nis, name: s.name, class: s.class });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(editingId ? `/api/students/${editingId}` : '/api/students', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan siswa');
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan siswa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Student) => {
    if (!confirm(`Hapus siswa "${s.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/students/${s.id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents((prev) => prev.filter((x) => x.id !== s.id));
        if (editingId === s.id) resetForm();
      }
    } catch {
      // abaikan
    }
  };

  const setField = (key: 'nis' | 'name') => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link to="/admin/classes" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="ml-2">
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Siswa Kelas {cls}</h1>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Manajemen Data</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Form tambah / edit siswa */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="w-5 h-5 text-blue-600" /> Edit Siswa
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" /> Tambah Siswa
                </>
              )}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Batal
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-sm font-semibold px-3 py-2.5 rounded-xl border border-rose-100">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.nis}
              onChange={setField('nis')}
              placeholder="NIS"
              inputMode="numeric"
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
            <input
              value={form.name}
              onChange={setField('name')}
              placeholder="Nama siswa"
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm"
            />
            <select
              value={form.class}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
              required
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 text-sm sm:col-span-2"
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full text-white font-bold py-3 rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
              editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : editingId ? (
              <Save className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {editingId ? 'Simpan Perubahan' : 'Tambah Siswa'}
          </button>
        </form>

        {/* Daftar siswa */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 px-1">Daftar Siswa ({students.length})</h3>
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed text-slate-500 font-medium text-sm">
              Belum ada siswa di kelas ini. Tambahkan lewat form di atas.
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <div
                  key={s.id}
                  className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between gap-3 transition-colors ${
                    editingId === s.id ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{s.name}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        NIS {s.nis || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      className="p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 active:scale-95 transition-all"
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 active:scale-95 transition-all"
                      aria-label={`Hapus ${s.name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
