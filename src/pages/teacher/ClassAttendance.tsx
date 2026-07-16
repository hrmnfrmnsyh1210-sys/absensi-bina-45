import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ChevronLeft, CheckCircle2, Circle, RefreshCw, CheckCircle, ShieldAlert, Loader2, CameraOff } from 'lucide-react';
import { safeJson, useAuth } from '../../context/AuthContext';
import type { RosterResponse } from '../../types';

type Toast = { type: 'success' | 'error'; title: string; sub?: string };
type CamStatus = 'starting' | 'on' | 'error';

function cameraErrorMessage(err: unknown): string {
  const msg = String((err as Error)?.message ?? err ?? '');
  const name = (err as DOMException)?.name ?? '';
  if (name === 'NotAllowedError' || /permission/i.test(msg)) {
    return 'Izin kamera ditolak. Buka pengaturan situs di browser lalu izinkan akses kamera.';
  }
  if (name === 'NotFoundError' || /no.*camera|not.*found/i.test(msg)) {
    return 'Kamera tidak ditemukan di perangkat ini.';
  }
  if (name === 'NotReadableError' || /in use|could not start/i.test(msg)) {
    return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Kamera hanya bisa diakses lewat HTTPS (atau localhost). Buka halaman ini lewat alamat https.';
  }
  return `Gagal menyalakan kamera. ${msg}`.trim();
}

export default function ClassAttendance() {
  const { user, apiFetch } = useAuth();
  const [params] = useSearchParams();
  const cls = params.get('class') || '';

  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [camStatus, setCamStatus] = useState<CamStatus>('starting');
  const [camError, setCamError] = useState('');
  const [camAttempt, setCamAttempt] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
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
      if (fromScan) {
        try {
          scannerRef.current?.pause(true);
        } catch {
          // scanner belum/berhenti berjalan; abaikan
        }
      }

      try {
        const res = await apiFetch('/api/attendance', {
          method: 'POST',
          body: JSON.stringify({ studentId }),
        });
        const data = await safeJson(res);
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
          if (fromScan) {
            try {
              scannerRef.current?.resume();
            } catch {
              // scanner sudah dibongkar; abaikan
            }
          }
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

  // Nyalakan kamera langsung (tanpa UI bawaan html5-qrcode).
  // Aman terhadap double-mount StrictMode: cleanup menunggu start() selesai
  // sebelum menghentikan kamera, agar mount kedua tidak bentrok.
  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    setCamStatus('starting');
    setCamError('');

    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          // Kotak scan mengikuti ukuran viewfinder agar tidak error di layar kecil.
          qrbox: (w, h) => {
            const size = Math.max(120, Math.floor(Math.min(w, h) * 0.7));
            return { width: size, height: size };
          },
        },
        (decodedText) => submitRef.current(decodedText, true),
        () => {},
      )
      .then(() => {
        if (!cancelled) setCamStatus('on');
      })
      .catch((err) => {
        if (!cancelled) {
          setCamStatus('error');
          setCamError(cameraErrorMessage(err));
        }
      });

    return () => {
      cancelled = true;
      startPromise.finally(() => {
        if (scanner.isScanning) {
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {});
        } else {
          try {
            scanner.clear();
          } catch {
            // elemen sudah dibongkar; abaikan
          }
        }
      });
    };
  }, [camAttempt]);

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
        <div className="bg-black rounded-2xl overflow-hidden relative shadow-md min-h-65">
          <div id="qr-reader" className="w-full [&_video]:w-full [&_video]:block" />
          {camStatus === 'starting' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-slate-300">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-semibold">Menyalakan kamera…</p>
            </div>
          )}
          {camStatus === 'error' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <CameraOff className="w-10 h-10 text-rose-400" />
              <p className="text-sm font-semibold text-slate-200">{camError}</p>
              <button
                onClick={() => setCamAttempt((n) => n + 1)}
                className="mt-1 bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all"
              >
                Coba Lagi
              </button>
            </div>
          )}
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
