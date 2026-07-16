/**
 * Backend penyimpanan Absensi QR — Google Apps Script.
 *
 * Cara pakai:
 *  1. Buka Google Spreadsheet tujuan.
 *  2. Menu Extensions > Apps Script. Hapus isi default, tempel seluruh file ini.
 *  3. Ganti nilai SECRET di bawah dengan kata sandi acak (samakan dengan
 *     APPS_SCRIPT_SECRET di file .env aplikasi).
 *  4. Deploy > New deployment > pilih "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Salin URL "/exec" yang muncul ke APPS_SCRIPT_URL di .env.
 *
 * Aplikasi Node memanggil doPost dengan JSON { secret, action, ... }.
 */

// GANTI dengan kata sandi acak Anda sendiri, dan samakan dengan APPS_SCRIPT_SECRET.
var SECRET = 'ganti-dengan-rahasia-acak';

function doGet() {
  return json({ ok: true, message: 'Absensi QR Apps Script aktif' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (SECRET && body.secret !== SECRET) {
      return json({ ok: false, error: 'unauthorized' });
    }

    switch (body.action) {
      case 'init':
        return json(handleInit(body.tabs));
      case 'getRows':
        return json(handleGetRows(body.tab));
      case 'appendRow':
        return json(handleAppendRow(body.tab, body.values));
      case 'appendUnique':
        return json(handleAppendUnique(body.tab, body.values, body.keyCols));
      case 'deleteRowByMatch':
        return json(handleDelete(body.tab, body.matchCol, body.matchValue));
      case 'updateRowByMatch':
        return json(handleUpdate(body.tab, body.matchCol, body.matchValue, body.values));
      default:
        return json({ ok: false, error: 'aksi tidak dikenal: ' + body.action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Buat tab bila belum ada + tulis header bila kosong.
// Seluruh kolom diformat sebagai teks ('@') agar Sheets TIDAK mengubah nilai
// seperti "2026-07-16" menjadi sel Date (yang merusak filter tanggal & dedup).
function handleInit(tabs) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    (tabs || []).forEach(function (tab) {
      var sheet = ss().getSheetByName(tab.name);
      if (!sheet) sheet = ss().insertSheet(tab.name);
      if (sheet.getLastRow() === 0 && tab.headers && tab.headers.length) {
        sheet.getRange(1, 1, 1, tab.headers.length).setValues([tab.headers]);
      }
      sheet
        .getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
        .setNumberFormat('@');
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// String-kan isi sel; sel Date lama (sebelum format teks) dinormalkan ke
// yyyy-MM-dd agar cocok dengan format tanggal aplikasi.
function cellToString(cell) {
  if (cell === null || cell === undefined) return '';
  if (Object.prototype.toString.call(cell) === '[object Date]') {
    return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(cell);
}

// Ambil baris data (tanpa header) sebagai string.
function handleGetRows(tabName) {
  var sheet = ss().getSheetByName(tabName);
  if (!sheet) return { ok: true, rows: [] };
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { ok: true, rows: [] };
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var rows = values.map(function (row) {
    return row.map(cellToString);
  });
  return { ok: true, rows: rows };
}

function handleAppendRow(tabName, values) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = ss().getSheetByName(tabName);
    if (!sheet) sheet = ss().insertSheet(tabName);
    sheet.appendRow(values || []);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Tambah baris hanya bila belum ada baris yang cocok di SEMUA kolom keyCols
// (0-based). Cek + tulis atomik (LockService) agar dedup benar walau dipanggil
// dari banyak instance serverless sekaligus.
function handleAppendUnique(tabName, values, keyCols) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = ss().getSheetByName(tabName);
    if (!sheet) sheet = ss().insertSheet(tabName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow >= 2 && keyCols && keyCols.length) {
      var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var i = 0; i < data.length; i++) {
        var match = true;
        for (var k = 0; k < keyCols.length; k++) {
          var c = keyCols[k];
          if (cellToString(data[i][c]) !== String(values[c])) {
            match = false;
            break;
          }
        }
        if (match) return { ok: true, duplicate: true };
      }
    }
    sheet.appendRow(values || []);
    return { ok: true, duplicate: false };
  } finally {
    lock.releaseLock();
  }
}

// Hapus baris pertama yang kolom matchCol (0-based) == matchValue.
function handleDelete(tabName, matchCol, matchValue) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = ss().getSheetByName(tabName);
    if (!sheet) return { ok: true, deleted: false };
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, deleted: false };
    var col = Number(matchCol) + 1; // 1-based
    var colValues = sheet.getRange(2, col, lastRow - 1, 1).getValues();
    for (var i = 0; i < colValues.length; i++) {
      if (String(colValues[i][0]) === String(matchValue)) {
        sheet.deleteRow(i + 2); // +2: lewati header & 0-based
        return { ok: true, deleted: true };
      }
    }
    return { ok: true, deleted: false };
  } finally {
    lock.releaseLock();
  }
}

// Timpa baris pertama yang kolom matchCol (0-based) == matchValue dengan values.
function handleUpdate(tabName, matchCol, matchValue, values) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = ss().getSheetByName(tabName);
    if (!sheet) return { ok: true, updated: false };
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, updated: false };
    var col = Number(matchCol) + 1; // 1-based
    var colValues = sheet.getRange(2, col, lastRow - 1, 1).getValues();
    for (var i = 0; i < colValues.length; i++) {
      if (String(colValues[i][0]) === String(matchValue)) {
        sheet.getRange(i + 2, 1, 1, values.length).setValues([values]);
        return { ok: true, updated: true };
      }
    }
    return { ok: true, updated: false };
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
