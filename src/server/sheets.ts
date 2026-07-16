/**
 * Lapisan penyimpanan Google Sheets via Google Apps Script Web App.
 *
 * Server Node memanggil URL Web App (server-to-server, jadi tidak ada masalah
 * CORS) dengan menyertakan secret. Apps Script yang membaca/menulis Sheet.
 * Bila APPS_SCRIPT_URL tidak di-set, `sheetsEnabled` = false dan pemanggil
 * harus fallback ke penyimpanan in-memory.
 */
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET || '';

export const sheetsEnabled = Boolean(APPS_SCRIPT_URL);

export interface TabSpec {
  name: string;
  headers: string[];
}

interface ScriptResponse {
  ok: boolean;
  error?: string;
  rows?: string[][];
  deleted?: boolean;
  duplicate?: boolean;
}

async function callScript(action: string, payload: Record<string, unknown>): Promise<ScriptResponse> {
  if (!APPS_SCRIPT_URL) throw new Error('APPS_SCRIPT_URL belum di-set');

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: APPS_SCRIPT_SECRET, action, ...payload }),
    redirect: 'follow', // Apps Script /exec me-redirect ke googleusercontent
  });

  const text = await res.text();
  let data: ScriptResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Respons Apps Script bukan JSON (status ${res.status}). ` +
        `Pastikan Web App sudah di-deploy & akses "Anyone". Cuplikan: ${text.slice(0, 120)}`,
    );
  }
  if (!data.ok) {
    throw new Error(`Apps Script error: ${data.error || 'tidak diketahui'}`);
  }
  return data;
}

/** Pastikan setiap tab ada dan punya baris header (dibuat oleh Apps Script). */
export async function initSheets(tabs: TabSpec[]): Promise<void> {
  await callScript('init', { tabs });
}

/** Ambil semua baris data (tanpa header) dari sebuah tab. */
export async function getRows(tab: string): Promise<string[][]> {
  const data = await callScript('getRows', { tab });
  return data.rows ?? [];
}

/** Tambah satu baris ke akhir tab. */
export async function appendRow(tab: string, values: (string | number)[]): Promise<void> {
  await callScript('appendRow', { tab, values });
}

/**
 * Tambah baris HANYA bila belum ada baris lain yang cocok pada semua kolom
 * `keyCols` (0-based). Cek + tulis dilakukan atomik di Apps Script (LockService)
 * sehingga dedup benar walau server dijalankan di banyak instance serverless.
 * Mengembalikan `duplicate: true` bila baris sudah ada (tidak ditulis ulang).
 */
export async function appendUnique(
  tab: string,
  values: (string | number)[],
  keyCols: number[],
): Promise<{ duplicate: boolean }> {
  const data = await callScript('appendUnique', { tab, values, keyCols });
  return { duplicate: Boolean(data.duplicate) };
}

/**
 * Hapus baris pertama yang kolom `matchCol`-nya (0-based) sama dengan
 * `matchValue`. Mengembalikan true bila ada baris yang dihapus.
 */
export async function deleteRowByMatch(
  tab: string,
  matchCol: number,
  matchValue: string,
): Promise<boolean> {
  const data = await callScript('deleteRowByMatch', { tab, matchCol, matchValue });
  return Boolean(data.deleted);
}
