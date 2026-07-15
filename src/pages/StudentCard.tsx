import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, CheckCircle2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Student } from '../types';

export default function StudentCard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetch('/api/students')
      .then(res => res.json())
      .then(data => setStudents(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="w-full max-w-md mx-auto bg-white min-h-[100dvh] flex flex-col shadow-xl relative">
        
        <header className="px-4 py-4 flex items-center border-b border-slate-100 sticky top-0 bg-white z-10">
          <Link to="/" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold text-slate-800 ml-2">Kartu Pelajar</h1>
        </header>
        
        <div className="p-5 flex-1 flex flex-col">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Pilih Identitas</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold text-slate-700 appearance-none shadow-sm"
              onChange={(e) => {
                const s = students.find(x => x.id === e.target.value);
                setSelectedStudent(s || null);
              }}
              defaultValue=""
            >
              <option value="" disabled>-- Pilih Nama Anda --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} - Kelas {s.class}</option>
              ))}
            </select>
          </div>

          {selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 fade-in duration-300">
              
              <div className="w-full bg-emerald-600 rounded-[2rem] p-1.5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-700 opacity-50 rounded-t-[2rem] pointer-events-none"></div>
                
                <div className="bg-white rounded-[1.7rem] pt-12 pb-8 px-6 flex flex-col items-center relative mt-16 text-center shadow-inner">
                  <div className="absolute -top-12 w-24 h-24 bg-white rounded-full p-2 shadow-lg">
                    <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                       <User className="w-10 h-10" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{selectedStudent.name}</h2>
                  <p className="text-slate-500 font-bold mb-1 mt-1">NIS: {selectedStudent.nis}</p>
                  <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-800 text-sm font-bold rounded-full mb-8 mt-2">
                    Kelas {selectedStudent.class}
                  </div>

                  <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-100 mb-4 inline-block">
                    <QRCodeSVG 
                      value={selectedStudent.id} 
                      size={180}
                      level="H"
                      includeMargin={false}
                      fgColor="#047857"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-full mt-2 border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5" />
                    Siap Dipindai
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <User className="w-10 h-10" />
              </div>
              <p className="text-slate-400 font-medium">Silakan pilih nama Anda<br/>untuk menampilkan kartu pelajar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
