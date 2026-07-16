import { Link } from 'react-router-dom';
import { QrCode, UserSquare, LogIn } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white md:bg-slate-50 flex flex-col font-sans">
      <div className="w-full max-w-md mx-auto bg-white md:shadow-xl md:rounded-2xl overflow-hidden flex-1 flex flex-col md:my-8 md:flex-initial">
        <div className="bg-emerald-600 p-8 pb-10 text-center text-white rounded-b-3xl md:rounded-none">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Absensi QR</h1>
          <p className="text-emerald-100 mt-2 text-sm font-medium">SMPT Islam Bina 45</p>
        </div>

        <div className="p-6 space-y-4 flex-1 mt-2">
          <p className="text-center text-slate-500 mb-6 font-bold text-sm uppercase tracking-wider">Pilih menu akses</p>

          <Link
            to="/student"
            className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 active:scale-[0.98] active:bg-emerald-50 hover:bg-emerald-50 transition-all group shadow-sm"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-sm">
              <UserSquare className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Kartu Siswa</h2>
              <p className="text-sm text-slate-500 font-medium">Tampilkan QR Code pribadi</p>
            </div>
          </Link>

          <Link
            to="/login"
            className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 active:scale-[0.98] active:bg-blue-50 hover:bg-blue-50 transition-all group shadow-sm"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm">
              <LogIn className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Login Guru / Admin</h2>
              <p className="text-sm text-slate-500 font-medium">Scan absensi & kelola data</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
