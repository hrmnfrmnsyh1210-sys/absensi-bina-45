import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ChevronLeft, CheckCircle2, Circle, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { RosterResponse } from '../../types';

type Toast = { type: 'success' | 'error'; title: string; sub?: string };

export default function ClassAttendance() {
  const { user, apiFetch } = useAuth();
  const [params] = useSearchParams();
  const cls = params.get('class') || '';

  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const processingRef = useRef(false);
  // Ref ke handler terbaru agar callback scanner (dibuat sekali) selalu fresh.
  const submitRef = useRef<(studentId: string, fromScan: boolean) => void>(() => {});

  const loadRoster = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/attendance/roster?class=${encodeURIComponent(cls)}`);
      if (res.ok) setRoster(await res.json());
    } catch {
      // biarkan; dicoba lagi di refresh berikutnya
    }
  }, [apiFetch, cls]);

  const submitAttendance = useCallback(
    async (studentId: string, fromScan: boolean) => {
      if (processingRef.current) return;
      processingRef.current = true;
      if (fromScan) scannerRef.current?.pause(true);

      try {
        const res = await apiFetch('/api/attendance', {
          method: 'POST',
          body: JSON.stringify({ studentId }),
        });
        const data = await res.json();
        if (res.ok) {
          setToast({ type: 'success', title: 'Hadir', sub: `${data.student.name} • Kelas ${data.student.class}` });
        } else {
          setToast({ type: 'error', title: 'Gagal', sub: data.error });
        }
        await loadRoster();
      } catch {
        setToast({ type: 'error', title: 'Gagal', sub: 'Koneksi ke server gagal' });
      } finally {
        setTimeout(() => {
          processingRef.current = false;
          setToast(null);
          if (fromScan) scannerRef.current?.resume();
        }, 1800);
      }
    },
    [apiFetch, loadRoster],
  );

  useEffect(() => {
    submitRef.current = submitAttendance;
  }, [submitAttendance]);

  // Muat roster + auto-refresh.
  useEffect(() => {
    loadRoster();
    const interval = setInterval(loadRoster, 10000);
    return () => clearInterval(interval);
  }, [loadRoster]);

  // Inisialisasi kamera scanner sekali.
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: true },
      false,
    );
    scannerRef.current = scanner;
    scanner.render(
      (decodedText) => submitRef.current(decodedText, true),
      () => {},
    );
    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const present = roster?.present ?? 0;
  const total = roster?.total ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-6">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <Link to="/teacher" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 text-base leading-tight">Kelas {cls}</h1>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider truncate">
                {user?.subject}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Hadir</span>
            <span className="font-black text-slate-800">
              {present}<span className="text-slate-400 font-bold">/{total}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-5">
        {/* Kamera scanner */}
        <div className="bg-black rounded-2xl overflow-hidden relative shadow-md">
          <div id="qr-reader" className="w-full [&_img]:hidden [&>div]:border-none" />
          {toast && (
            <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              {toast.type === 'success' ? (
                <CheckCircle className="w-16 h-16 text-emerald-400 mb-3" />
              ) : (
                <ShieldAlert className="w-16 h-16 text-rose-400 mb-3" />
              )}
              <h2 className="text-2xl font-black text-white">{toast.title}</h2>
              {toast.sub && <p className="text-slate-200 font-semibold mt-1 text-sm">{toast.sub}</p>}
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-500 font-medium -mt-2">
          Arahkan QR siswa ke kamera. Atau ketuk nama di bawah untuk absen manual.
        </p>

        {/* Roster */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-slate-800">Daftar Siswa</h3>
            <button
              onClick={loadRoster}
              className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 active:scale-95 transition-all"
              aria-label="Muat ulang"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {roster?.entries.map(({ student, attended, time }) => (
              <button
                key={student.id}
                disabled={attended}
                onClick={() => submitAttendance(student.id, false)}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all ${
                  attended
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-white border-slate-200 hover:border-emerald-300 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {attended ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{student.name}</p>
                    <p className="text-xs text-slate-500 font-medium">NIS {student.nis}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md flex-shrink-0 ${
                    attended ? 'text-emerald-700 bg-emerald-100' : 'text-slate-400 bg-slate-100'
                  }`}
                >
                  {attended ? time : 'Belum'}
                </span>
              </button>
            ))}
            {roster && roster.entries.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 border-dashed text-slate-500 font-medium text-sm">
                Tidak ada siswa di kelas ini.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
