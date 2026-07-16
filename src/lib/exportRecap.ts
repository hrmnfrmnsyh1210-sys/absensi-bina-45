/**
 * Util export rekap absensi ke Excel (.xlsx) dan PDF.
 * Dipakai oleh halaman rekap guru dan admin.
 */
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SCHOOL_NAME = 'SMPT Islam Bina 45';

/** Baris data tabel: array of array (baris pertama BUKAN header — header terpisah). */
export type TableRows = (string | number)[][];

/**
 * Unduh file Excel berisi beberapa baris judul, lalu tabel (header + rows).
 */
export function exportExcel(opts: {
  filename: string; // tanpa ekstensi
  sheetName?: string; // default: 'Rekap'
  titleLines: string[];
  header: string[];
  rows: TableRows;
}): void {
  const aoa: (string | number)[][] = [
    ...opts.titleLines.map((t) => [t]),
    [],
    opts.header,
    ...opts.rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Lebar kolom sederhana: sesuaikan dengan isi terpanjang (dibatasi 30).
  ws['!cols'] = opts.header.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...opts.rows.map((r) => String(r[i] ?? '').length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 6), 30) };
  });
  const wb = XLSX.utils.book_new();
  // Nama sheet Excel maksimal 31 karakter dan tanpa karakter khusus.
  const safeSheet = (opts.sheetName ?? 'Rekap').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Rekap';
  XLSX.utils.book_append_sheet(wb, ws, safeSheet);
  XLSX.writeFile(wb, `${opts.filename}.xlsx`);
}

/**
 * Unduh file PDF berisi judul + tabel. Orientasi otomatis landscape bila
 * kolom banyak (mis. matriks tanggal).
 */
export function exportPdf(opts: {
  filename: string; // tanpa ekstensi
  titleLines: string[];
  header: string[];
  rows: TableRows;
}): void {
  const landscape = opts.header.length > 7;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(SCHOOL_NAME, 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  opts.titleLines.forEach((line, i) => {
    doc.text(line, 14, 22 + i * 5.5);
  });

  autoTable(doc, {
    startY: 24 + opts.titleLines.length * 5.5,
    head: [opts.header],
    body: opts.rows.map((r) => r.map((c) => String(c))),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [4, 120, 87], fontSize: 8 }, // emerald-700
    alternateRowStyles: { fillColor: [240, 253, 244] }, // emerald-50
    margin: { left: 14, right: 14 },
  });

  doc.save(`${opts.filename}.pdf`);
}

/** dd/MM dari YYYY-MM-DD (label kolom matriks). */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Nama file aman: buang karakter aneh, spasi → underscore. */
export function safeFilename(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('_')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_');
}
