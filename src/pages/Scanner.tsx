import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ChevronLeft, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Scanner() {
  const [scanResult, setScanResult] = useState<{success: boolean, message: string, data?: any} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize Scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      false
    );
    scannerRef.current = scanner;

    const onScanSuccess = async (decodedText: string) => {
      // Pause scanner while processing
      if (isProcessing) return;
      setIsProcessing(true);
      
      if (scannerRef.current) {
         scannerRef.current.pause(true);
      }
      
      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: decodedText })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setScanResult({ success: true, message: 'Berhasil Hadir', data: data.student });
        } else {
          setScanResult({ success: false, message: data.error || 'Terjadi kesalahan' });
        }
      } catch (err) {
        setScanResult({ success: false, message: 'Koneksi ke server gagal' });
      } finally {
        setIsProcessing(false);
        // Automatically clear result and resume after 2.5 seconds
        setTimeout(() => {
          setScanResult(null);
          if (scannerRef.current) {
            scannerRef.current.resume();
          }
        }, 2500);
      }
    };

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans h-[100dvh]">
      <header className="px-4 py-4 flex items-center border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <Link to="/" className="p-2 -ml-2 rounded-full text-slate-300 hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold text-white ml-2">Pemindai QR</h1>
      </header>

      <div className="flex-1 relative flex flex-col overflow-hidden">
        <div id="qr-reader" className="w-full flex-1 flex flex-col justify-center border-none [&>div]:border-none [&_video]:object-cover [&_video]:h-full [&_video]:w-full relative [&_#qr-reader__dashboard_section_csr_span]:text-black [&_#qr-reader__dashboard_section_csr_span]:bg-white [&_#qr-reader__dashboard_section_csr_span]:p-2 [&_#qr-reader__dashboard_section_csr_span]:rounded"></div>
        
        {/* Scanner frame overlay - purely visual */}
        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 z-10 flex flex-col">
          <div className="flex-1"></div>
          <div className="text-center pb-8 pt-4">
            <p className="text-white/90 text-sm font-bold bg-black/50 px-5 py-2.5 rounded-full inline-block backdrop-blur-md shadow-lg">
              Arahkan QR Code ke area kotak
            </p>
          </div>
        </div>

        {/* Processing & Result Overlays */}
        {(isProcessing || scanResult) && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            {isProcessing && !scanResult && (
              <div className="flex flex-col items-center text-blue-400">
                <Loader2 className="w-16 h-16 animate-spin mb-6" />
                <p className="font-bold text-xl tracking-tight">Memproses...</p>
              </div>
            )}
            
            {scanResult && scanResult.success && (
              <div className="flex flex-col items-center text-emerald-400 animate-in zoom-in-50 duration-300">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                   <CheckCircle className="w-16 h-16" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">{scanResult.message}</h2>
                <p className="text-xl font-bold text-emerald-100">{scanResult.data?.name}</p>
                <span className="mt-4 px-5 py-2 bg-emerald-500/20 rounded-full text-emerald-300 font-bold border border-emerald-500/30">
                  Kelas {scanResult.data?.class}
                </span>
              </div>
            )}

            {scanResult && !scanResult.success && (
              <div className="flex flex-col items-center text-rose-400 animate-in zoom-in-50 duration-300">
                <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                  <ShieldAlert className="w-16 h-16" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Gagal</h2>
                <p className="text-rose-200 font-bold text-lg px-4">{scanResult.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
