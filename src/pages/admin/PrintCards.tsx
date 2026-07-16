import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, Printer, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Student } from '../../types';

export default function PrintCards() {
  const { apiFetch } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resStudents, resClasses] = await Promise.all([
        apiFetch('/api/students'),
        apiFetch('/api/classes'),
      ]);
      const dataStudents = await resStudents.json();
      const dataClasses = await resClasses.json();
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);
      setClasses(Array.isArray(dataClasses) ? dataClasses : []);
    } catch {
      // abaikan
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const visible =
    selectedClass === 'ALL' ? students : students.filter((s) => s.class === selectedClass);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Toolbar — disembunyikan saat mencetak */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center min-w-0">
            <Link to="/admin" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="font-bold text-slate-800 text-lg ml-2 truncate">Cetak Kartu QR</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-md hover:bg-emerald-700 active:scale-95 transition-all text-sm"
            >
              <Printer className="w-4 h-4" /> Cetak
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 print:px-0 print:py-0">
        <p className="text-slate-500 text-sm font-medium mb-4 px-1 print:hidden">
          Menampilkan {visible.length} siswa. Klik <b>Cetak</b> lalu simpan sebagai PDF atau cetak langsung.
          Gunting per kartu dan bagikan ke siswa.
        </p>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-2">
            {visible.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center text-center break-inside-avoid print:border print:border-slate-300 print:rounded-lg"
              >
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">
                  SMPT Islam Bina 45
                </div>
                <div className="bg-white p-1 rounded-lg border border-slate-100 mb-3">
                  <QRCodeSVG value={s.id} size={120} level="H" fgColor="#047857" />
                </div>
                <h3 className="font-black text-slate-800 leading-tight text-sm">{s.name}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">NIS {s.nis}</p>
                <span className="mt-2 inline-block text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full print:bg-transparent print:border print:border-emerald-300">
                  Kelas {s.class}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
