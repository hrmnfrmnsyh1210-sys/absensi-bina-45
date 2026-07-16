# Absensi QR — SMPT Islam Bina 45

Aplikasi absensi berbasis QR Code. Siswa membawa kartu QR, guru memindai QR
untuk mencatat kehadiran **per mata pelajaran**, dan admin mengelola akun guru
serta mencetak kartu QR siswa. Data disimpan di **Google Sheets** (atau mode
in-memory untuk uji coba).

## Fitur

- **Login** untuk Admin dan Guru (bearer token sederhana).
- **Admin**: menambah/menghapus akun guru (lengkap dengan mata pelajaran),
  melihat rekap kehadiran hari ini, dan **mencetak kartu QR siswa** (halaman
  cetak `Ctrl+P`).
- **Guru**: login → pilih kelas → scan QR siswa → lihat langsung siapa yang
  **sudah** dan **belum** absen untuk mata pelajarannya hari itu. Bisa juga
  absen manual dengan mengetuk nama siswa.
- **Siswa**: halaman "Kartu Siswa" untuk menampilkan QR pribadi.
- Absensi dihitung **per mapel/sesi**: satu siswa bisa hadir di Matematika
  tapi belum di B. Indonesia pada hari yang sama.

## Menjalankan secara lokal

**Prasyarat:** Node.js

```bash
npm install
copy .env.example .env      # Windows (atau: cp .env.example .env)
npm run dev
```

Buka **http://localhost:3000** di browser.

> Catatan: jangan buka `http://0.0.0.0:3000` — alamat itu tidak valid di
> browser dan memunculkan `ERR_ADDRESS_INVALID`. Selalu pakai `localhost`.

Login admin default: **admin / admin123** (ganti di `.env`).

Tanpa konfigurasi Google Sheets, app berjalan dalam **mode in-memory** dengan 8
siswa contoh — cocok untuk mencoba dulu. Data akan hilang saat server restart.

## Menyambungkan ke Google Sheets (penyimpanan permanen)

Penyimpanan memakai **Google Apps Script** yang menempel di spreadsheet — tidak
perlu service account atau Google Cloud. Server Node memanggil Apps Script
(server-to-server), jadi tidak ada masalah CORS.

1. Buat **Google Spreadsheet** baru.
2. Di spreadsheet itu: menu **Extensions → Apps Script**. Hapus isi default,
   lalu tempel seluruh isi [apps-script/Code.gs](apps-script/Code.gs).
3. Di baris `var SECRET = '...'`, ganti dengan kata sandi acak Anda.
4. **Deploy → New deployment → Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**

   Klik Deploy, izinkan akses saat diminta, lalu salin **Web app URL**
   (berakhiran `/exec`).
5. Isi `.env`:
   ```
   APPS_SCRIPT_URL="https://script.google.com/macros/s/XXXX/exec"
   APPS_SCRIPT_SECRET="samakan-dengan-SECRET-di-Code.gs"
   SESSION_SECRET="string-acak-panjang"
   ADMIN_PASSWORD="passwordAnda"
   ```
6. Jalankan ulang `npm run dev`. Log akan menampilkan
   `[data] Tersambung ke Google Sheets.` App otomatis membuat tab `Students`,
   `Teachers`, dan `Attendance` beserta headernya. Bila tab `Students` masih
   kosong, 8 siswa contoh akan diisikan.

> **Memperbarui `Code.gs`** (mis. mengganti SECRET, atau menambah aksi baru
> seperti `appendUnique` untuk dedup absensi): tempel ulang isi terbaru, lalu
> Apps Script → **Deploy → Manage deployments → Edit (✏️) → Version: New
> version → Deploy**. URL `/exec` tetap sama.

### Struktur data di spreadsheet

| Tab | Kolom |
| --- | --- |
| `Students` | id, nis, name, class |
| `Teachers` | id, username, passwordHash, name, subject |
| `Attendance` | id, date, time, studentId, studentName, class, subject, teacherId, teacherName, status |

Untuk menambah siswa, cukup tambahkan baris pada tab `Students` (atau ubah data
contoh), lalu restart server. Password guru disimpan dalam bentuk hash.

## Alur pemakaian

1. **Admin** login → **Kelola Guru** → tambah guru (nama, mapel, username,
   password).
2. **Admin** → **Cetak Kartu QR** → pilih kelas → **Cetak** → bagikan kartu ke
   siswa.
3. **Guru** login → pilih kelas → arahkan kamera ke QR siswa (atau ketuk nama).
   Panel menampilkan jumlah **Hadir/Total** dan status tiap siswa secara live.

## Deploy ke Vercel

Aplikasi sudah disiapkan untuk Vercel: frontend disajikan statis, dan API
berjalan sebagai *serverless function* ([api/[...path].ts](api/%5B...path%5D.ts)
membungkus Express dari [src/server/app.ts](src/server/app.ts)). Auth memakai
token bertanda tangan (stateless), jadi tidak bergantung pada memori server.

**Langkah:**

1. **Redeploy Apps Script dulu.** Kode [apps-script/Code.gs](apps-script/Code.gs)
   kini punya aksi `appendUnique` (dedup absensi yang andal di serverless).
   Tempel ulang ke Apps Script → **Deploy → Manage deployments → Edit → New
   version**. (Tanpa ini, absensi tetap jalan lewat fallback, tapi dedup lintas
   instance tidak dijamin.)
2. Push repo ini ke GitHub, lalu di [vercel.com](https://vercel.com) **Add New →
   Project → Import** repo tersebut. Konfigurasi build sudah ada di
   [vercel.json](vercel.json) (`vite build` → `dist`), biarkan default.
3. Di **Settings → Environment Variables**, isi:
   ```
   APPS_SCRIPT_URL      = https://script.google.com/macros/s/XXXX/exec
   APPS_SCRIPT_SECRET   = (sama dengan SECRET di Code.gs)
   SESSION_SECRET       = (string acak panjang)
   ADMIN_USERNAME       = admin
   ADMIN_PASSWORD       = (password kuat)
   ```
4. **Deploy.** Selesai — frontend + API jalan di satu domain Vercel; data tetap
   di Google Sheets.

**Catatan serverless (jujur):**
- Tiap panggilan ke Apps Script ~0.5–1 dtk; cold start memuat ulang cache dari
  Sheets. Nyaman untuk skala sekolah, tapi tidak se-instan server hidup-terus.
- Untuk kecepatan maksimal (cache in-memory yang persist), alternatifnya deploy
  seluruh server Node ke host long-running (Render/Railway/Fly) memakai
  `npm run build` + `npm run start`.

## Skrip

- `npm run dev` — mode pengembangan (Vite + Express).
- `npm run build` — build produksi.
- `npm run start` — jalankan hasil build.
- `npm run lint` — cek TypeScript (`tsc --noEmit`).
