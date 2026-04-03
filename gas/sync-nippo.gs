/**
 * sync-nippo.gs
 * ───────────────────────────────────────────────
 * 【使い方】
 * 1. 【loker用】日報合算スプレッドシートを開く
 * 2. 拡張機能 → Apps Script
 * 3. このファイルの中身を全部貼り付けて保存
 * 4. setupTriggers() を一度だけ実行してトリガーを登録
 * ───────────────────────────────────────────────
 */

// ========== Vercel API 設定 ==========
const CONFIG = {
  SYNC_URL:    'https://YOUR_APP_NAME.vercel.app/api/sync',
  SYNC_SECRET: 'my-super-secret-key-2026',
};

// ========== DAWINmobilebot 設定 ==========
const DAWIN = {
  shiftSheetId:    '1KmmKchHMKOvCHXp8Qkki6FDa2LMxDKzE_S4zXqxJKM8',
  idSheetId:       '17Muwohwb65qa0NoKmnLPJDS952DKAIGHCM-_MJE-8L4',
  formSheetId1:    '1gq06U0WG8ZxMLXP6Hy-hngxTW379Yz3SY2-CJt_BBCE',
  formSheetId2:    '1s8xPwsQ2KyxcfHy9g0zFxaVRSzlK8jrNqN0DzjuaYpE',
  formUrl:         'https://forms.gle/c2XY1krdoSKbc9Ma8',
  shiftSheetNames: ['【東京】', '【福岡】'],
  reportSheetName: '合算データ',
  idSheetName:     'スタッフ情報',
  targetHeaderNames: ['1','2','3','4','5','6','7','8','9','10','11','12'],
  ignoreWords:      ['管理費','備品','休み','O','交通費','・','坊薗','橋本','欠員','未定','調整','超サブ','サブ','赤松','重松','犬束','お初','齋藤','印南','中嶋','なし','回答','宮崎','平野'],
  shiftIgnoreWords: ['管理費','備品','休み','O','交通費','・','欠員','未定','調整','超サブ','サブ','なし','回答'],
  ignoreRowWords:   ['管理費','備品'],
  distinctPrefixes: ['FFU','salud','✖','EZ','アスクラ','HE','出来れば'],
  ignoreSuffixes:   ['ガール','バルーン'],
};

// ========== スタッフ情報同期 設定 ==========
const STAFF_SYNC = {
  sourceSpreadsheetId: '1vtXt9UJ87EGtjNEiVYH2R4nUQQdgKmYGMsE04WU-G_A',
  sourceSheetName:     'シート1',
  targetSheetName:     'スタッフ情報',
};

// ========== シート名 ==========
const SHEET_NIPPO    = '合算データ';
const SHEET_AGE      = 'グラフ用データ_年代';
const SHEET_TYPE     = 'グラフ用データ_家族構成';
const SHEET_TALKNOTE = 'トークノート受信録';

// ──────────────────────────────────────────────
// 共通ユーティリティ
// ──────────────────────────────────────────────

function getCurrentMonth_() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function callSyncApi_(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + CONFIG.SYNC_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  try {
    const res  = UrlFetchApp.fetch(CONFIG.SYNC_URL, options);
    const body = res.getContentText();
    Logger.log('[sync] ' + payload.type + ' → ' + body);
    return JSON.parse(body);
  } catch (e) {
    Logger.log('[sync] エラー: ' + e.message);
    return null;
  }
}

// ──────────────────────────────────────────────
// DB同期：各シート → Vercel API
// ──────────────────────────────────────────────

function syncNippoSheet(month) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NIPPO);
  if (!sheet) { Logger.log(SHEET_NIPPO + ' が見つかりません'); return; }

  const rows = sheet.getDataRange().getValues().map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) {
        const y = cell.getFullYear();
        const m = String(cell.getMonth() + 1).padStart(2, '0');
        const d = String(cell.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
      }
      return String(cell);
    });
  });
  callSyncApi_({ type: 'sales', month: month || getCurrentMonth_(), rows: rows });
}

function syncAgeSheet(month) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_AGE);
  if (!sheet) { Logger.log(SHEET_AGE + ' が見つかりません'); return; }

  const rows = sheet.getDataRange().getValues().map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) return cell.toISOString();
      return String(cell);
    });
  });
  callSyncApi_({ type: 'age', month: month || getCurrentMonth_(), rows: rows });
}

function syncTypeSheet(month) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TYPE);
  if (!sheet) { Logger.log(SHEET_TYPE + ' が見つかりません'); return; }

  const rows = sheet.getDataRange().getValues().map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) return cell.toISOString();
      return String(cell);
    });
  });
  callSyncApi_({ type: 'type', month: month || getCurrentMonth_(), rows: rows });
}

function syncTalknote(month) {
  month = month || getCurrentMonth_();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TALKNOTE);
  if (!sheet) { Logger.log(SHEET_TALKNOTE + ' が見つかりません'); return; }

  const data    = sheet.getDataRange().getValues();
  const [y, m]  = month.split('-').map(Number);
  const rows    = [];

  for (var i = 1; i < data.length; i++) {
    var raw = data[i];
    var ts  = raw[0];
    if (!ts) continue;

    var date;
    if (ts instanceof Date) {
      date = ts;
    } else {
      var str = String(ts).replace(/\//g, '-').replace(' ', 'T');
      date = new Date(str);
    }
    if (isNaN(date.getTime())) continue;
    if (date.getFullYear() !== y || date.getMonth() + 1 !== m) continue;

    var staffName = String(raw[1] || '').trim();
    var message   = String(raw[2] || '').trim();
    if (!staffName || !message) continue;

    var pad      = function(n) { return String(n).padStart(2, '0'); };
    var dateStr  = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    var postedAt = dateStr + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
    rows.push({ postedAt: postedAt, staffName: staffName, message: message });
  }

  if (rows.length === 0) { Logger.log('対象月のトークノートデータがありません: ' + month); return; }
  callSyncApi_({ type: 'talknote', month: month, rows: rows });
}

// 全シートを現在月で一括同期（定期実行用）
function syncAll() {
  const month = getCurrentMonth_();
  Logger.log('日報同期開始: ' + month);
  syncNippoSheet(month);
  syncAgeSheet(month);
  syncTypeSheet(month);
  syncTalknote(month);
  Logger.log('日報同期完了');
}

// 任意の月を指定して同期する場合はここを編集して実行
function syncSpecificMonth() {
  const month = '2026-03'; // ← 変更してください
  syncNippoSheet(month);
  syncAgeSheet(month);
  syncTypeSheet(month);
}

// ──────────────────────────────────────────────
// Talknoteメール取得 → シート記録 → DB同期
// ──────────────────────────────────────────────

function fetchAndSyncTalknote() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_TALKNOTE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TALKNOTE);
    sheet.appendRow(['受信日時', '送信者', 'メッセージ内容']);
  }

  const threads = GmailApp.search('from:no-reply@talknote.com is:unread');
  if (threads.length === 0) {
    Logger.log('[talknote] 新着メールなし');
    return;
  }

  let count = 0;
  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      if (!message.isUnread()) continue;

      const date    = message.getDate();
      const subject = message.getSubject();
      const body    = message.getPlainBody();

      let senderName = '不明';
      const nameMatch = subject.match(/Talknote\s*[：:]\s*(.+?)さんからメッセージ/);
      if (nameMatch && nameMatch[1]) senderName = nameMatch[1].trim();

      let msgContent = '（内容をうまく取得できませんでした）';
      const bodyMatch = body.match(/からのメッセージ\s*[：:]\s*([\s\S]*?)(?=\n+返信はこちらから)/);
      if (bodyMatch && bodyMatch[1]) msgContent = bodyMatch[1].trim();

      sheet.appendRow([
        Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
        senderName,
        msgContent,
      ]);
      message.markRead();
      count++;
    }
  }

  Logger.log('[talknote] ' + count + '件をシートに記録');
  if (count > 0) syncTalknote(getCurrentMonth_());
}

// 過去の既読メールをシートに記録する（手動実行用）
function fetchTalknoteEmails_PastData() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_TALKNOTE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TALKNOTE);
    sheet.appendRow(['受信日時', '送信者', 'メッセージ内容']);
  }

  const threads = GmailApp.search('from:no-reply@talknote.com', 0, 50);
  if (threads.length === 0) { Logger.log('過去のメールが見つかりませんでした'); return; }

  let count = 0;
  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      const date    = message.getDate();
      const subject = message.getSubject();
      const body    = message.getPlainBody();

      let senderName = '不明';
      const nameMatch = subject.match(/Talknote\s*[：:]\s*(.+?)さんからメッセージ/);
      if (nameMatch && nameMatch[1]) senderName = nameMatch[1].trim();

      let msgContent = '（内容をうまく取得できませんでした）';
      const bodyMatch = body.match(/からのメッセージ\s*[：:]\s*([\s\S]*?)(?=\n+返信はこちらから)/);
      if (bodyMatch && bodyMatch[1]) msgContent = bodyMatch[1].trim();

      sheet.appendRow([
        Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
        senderName,
        msgContent,
      ]);
      count++;
    }
  }
  Logger.log('過去のメッセージ ' + count + '件をシートに記録しました');
}

// ──────────────────────────────────────────────
// 日報合算（フォーム回答 → 合算データシート）
// ──────────────────────────────────────────────

function mergeSheets_Complete() {
  const config = DAWIN;
  try {
    const mapping = [
      {dest: 0, src: 0}, {dest: 1, src: 1}, {dest: 2, src: 3}, {dest: 5, src: 4},
      {dest: 6, src: 5, mul: 1.2}, {dest: 7, src: 6, mul: 1}, {dest: 8, src: 7, mul: 0.6},
      {dest: 9, src: 8, mul: 0.8}, {dest: 12, src: 9, mul: 1}, {dest: 13, src: 10, mul: 0.8},
      {dest: 14, src: 11, mul: 0.2}, {dest: 16, src: 12, mul: 0.1}, {dest: 17, src: 13, mul: 0.2},
      {dest: 18, src: 14}, {dest: 32, src: 15, mul: 1}, {dest: 33, src: 16, mul: 1},
    ];

    const ssA = SpreadsheetApp.openById(config.formSheetId1);
    const ssB = SpreadsheetApp.openById(config.formSheetId2);
    const ssC = SpreadsheetApp.getActiveSpreadsheet(); // ← 日報合算スプレッドシート

    const shA = ssA.getSheetByName('フォームの回答 1');
    const shB = ssB.getSheetByName('フォームの回答 1');
    let   shC = ssC.getSheetByName(config.reportSheetName);
    if (!shC) shC = ssC.insertSheet(config.reportSheetName);

    const lastRowA = shA.getLastRow();
    const lastColA = shA.getLastColumn();
    if (lastRowA < 1 || lastColA < 1) return;

    let dataA = lastRowA > 0 ? shA.getRange(1, 1, lastRowA, lastColA).getValues() : [];

    let dataB_Processed = [];
    const lastRowB = shB.getLastRow();
    if (lastRowB >= 2) {
      const dataB = shB.getRange(2, 1, lastRowB - 1, shB.getLastColumn()).getValues();
      dataB.forEach(rowB => {
        let newRow = new Array(lastColA).fill('');
        const tempRowB = [...rowB];
        tempRowB.shift(); tempRowB.shift();
        const val2 = tempRowB.shift();
        const val3 = tempRowB.shift();
        if (val2 && val3) newRow.splice(2, 1, val2 + ' ' + val3);
        else newRow.splice(2, 1, val3);

        mapping.forEach(map => {
          let val = null, counter = 0;
          for (let v of rowB) { if (counter === map.src) { val = v; break; } counter++; }
          if (map.dest !== 2 && val !== null) {
            if (map.mul !== undefined && typeof val === 'number') val *= map.mul;
            newRow.splice(map.dest, 1, val);
          }
        });
        dataB_Processed.push(newRow);
      });
    }

    let finalData = dataA.concat(dataB_Processed).filter((row, idx) => {
      if (idx === 0) return true;
      let val2 = null, c = 0;
      for (let v of row) { if (c === 2) { val2 = v; break; } c++; }
      return val2 && val2.toString().trim() !== '';
    });

    const colsDel = ['獲得例', '失注例', '必殺トーク', '目標振り返り', '目標達成'];
    let headers = finalData[0] || [];
    const keepIndices = [];
    let c = 0;
    for (let h of headers) { if (!colsDel.includes(h)) keepIndices.push(c); c++; }

    if (keepIndices.length > 0) {
      finalData = finalData.map(row => {
        let newRow = [], c = 0;
        for (let v of row) { if (keepIndices.includes(c)) newRow.push(v); c++; }
        return newRow;
      });
    }

    shC.clear();
    if (finalData.length > 0) {
      const r = finalData.length;
      let   col = 0; for (let row of finalData) { col = row.length; break; }
      const cur = shC.getMaxRows(), curC = shC.getMaxColumns();
      if (r   > cur)  shC.insertRowsAfter(cur,  r   - cur);
      if (col > curC) shC.insertColumnsAfter(curC, col - curC);
      shC.getRange(1, 1, r, col).setValues(finalData);
    }
    Logger.log('[merge] 日報合算完了');
  } catch (e) {
    Logger.log('[merge] エラー: ' + e.message);
  }
}

// ──────────────────────────────────────────────
// 日報未提出者への催促（毎日21時実行）
// ──────────────────────────────────────────────

function mainToday_ReportReminder() {
  mergeSheets_Complete();
  const targetDate    = new Date();
  const staffMap      = getStaffMap_(DAWIN);
  const submitted     = getSubmittedNames_(targetDate, DAWIN);
  const remindList    = getUnsubmittedNames_(targetDate, submitted, DAWIN);

  remindList.forEach(shiftName => {
    const email = staffMap[shiftName];
    if (!email) return;
    sendEmailToTalknote_(
      email,
      '【日報提出】',
      shiftName + 'さん\n\n本日中に提出をお願いします！\n\n▼提出フォーム\n' + DAWIN.formUrl
    );
    Logger.log('[remind] ' + shiftName + ' / ' + email);
  });
}

// ──────────────────────────────────────────────
// 明日のシフト通知（毎日18時実行）
// ──────────────────────────────────────────────

function mainTomorrow_ShiftNotify() {
  const staffMap = getStaffMap_(DAWIN);
  if (Object.keys(staffMap).length === 0) return;

  let ss;
  try { ss = SpreadsheetApp.openById(DAWIN.shiftSheetId); } catch(e) { return; }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetSheetNames = [];
  DAWIN.shiftSheetNames.forEach(base => {
    targetSheetNames.push(Utilities.formatDate(tomorrow, 'Asia/Tokyo', 'yy') + '年' + Utilities.formatDate(tomorrow, 'Asia/Tokyo', 'M') + '月' + base);
    const prev = new Date(tomorrow.getFullYear(), tomorrow.getMonth() - 1, 1);
    targetSheetNames.push(Utilities.formatDate(prev, 'Asia/Tokyo', 'yy') + '年' + Utilities.formatDate(prev, 'Asia/Tokyo', 'M') + '月' + base);
  });

  const userLocations = {};
  for (const name of Object.keys(staffMap)) userLocations[name] = [];

  targetSheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    let activeCols = [], storeColIdx = 3, headerRow = null;

    let rCount = 0;
    for (let row of data) {
      if (rCount >= 10) break;
      let tempCols = [], tempStoreIdx = 3, idx = 0;
      for (let val of row) {
        const cleanVal = String(val).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '');
        if (DAWIN.targetHeaderNames.includes(cleanVal)) tempCols.push(idx);
        if (cleanVal === '店舗') tempStoreIdx = idx;
        idx++;
      }
      if (tempCols.length >= 1) { activeCols = tempCols; storeColIdx = tempStoreIdx; headerRow = row; break; }
      rCount++;
    }
    if (activeCols.length === 0) return;

    let currentShiftDate = null;
    for (let row of data) {
      let cellA = null; let c = 0;
      for (let v of row) { if (c === 0) { cellA = v; break; } c++; }
      if (Object.prototype.toString.call(cellA) === '[object Date]') currentShiftDate = cellA;
      else if (cellA !== '') currentShiftDate = null;

      if (currentShiftDate && isSameDate_(currentShiftDate, tomorrow)) {
        activeCols.forEach(colIdx => {
          let cellName = null, storeName = null, hName = null, c = 0;
          for (let v of row) {
            if (c === colIdx) cellName = normalizeName_(v);
            if (c === storeColIdx) storeName = String(v).trim();
            c++;
          }
          if (headerRow) { c = 0; for (let v of headerRow) { if (c === colIdx) hName = v; c++; } }

          if (!/^[0-9０-９\.]+$/.test(cellName) && cellName && cellName.length > 1 && !DAWIN.shiftIgnoreWords.some(w => cellName.includes(w))) {
            const locName = storeName || '勤務地(' + hName + ')';
            for (const userName of Object.keys(staffMap)) {
              if (isNameMatch_(cellName, userName)) userLocations[userName].push(locName);
            }
          }
        });
      }
    }
  });

  const sentEmails = [];
  for (const [shiftName, locations] of Object.entries(userLocations)) {
    const email = staffMap[shiftName];
    if (!email || locations.length === 0 || sentEmails.includes(email)) continue;
    const uniqueLocations = [...new Set(locations)];
    sendEmailToTalknote_(
      email,
      '【明日のシフト連絡】',
      shiftName + 'さん、明日のシフトは「 ' + uniqueLocations.join(' / ') + ' 」です。\n\n※シフト表と相違がある場合は担当まで連絡ください！'
    );
    Logger.log('[shift-notify] ' + shiftName + ' / ' + email);
    sentEmails.push(email);
  }
}

// ──────────────────────────────────────────────
// スタッフ情報同期（1日1回実行）
// ──────────────────────────────────────────────

function syncStaffInfo_New() {
  try {
    const sourceSS    = SpreadsheetApp.openById(STAFF_SYNC.sourceSpreadsheetId);
    const sourceSheet = sourceSS.getSheetByName(STAFF_SYNC.sourceSheetName);
    if (!sourceSheet) { Logger.log('転送元のシートが見つかりません'); return; }

    const lastRow = sourceSheet.getLastRow();
    if (lastRow === 0) return;

    const data = sourceSheet.getRange(1, 2, lastRow, 15).getValues();

    const targetSS    = SpreadsheetApp.openById(DAWIN.idSheetId);
    let   targetSheet = targetSS.getSheetByName(STAFF_SYNC.targetSheetName);
    if (!targetSheet) targetSheet = targetSS.insertSheet(STAFF_SYNC.targetSheetName);
    targetSheet.clear();

    let finalData = [], isFirst = true;
    let talknoteIdIndex = 6, birthPlaceIndex = 7, birthdayIndex = 3;

    for (let row of data) {
      let newRow = [...row];
      if (isFirst) {
        newRow.push('トークノートアドレス', '出身地域', '星座');
        let i = 0;
        for (let h of row) {
          const headerName = String(h);
          if (headerName.includes('トークノート') || headerName.includes('ユーザーID') || headerName === 'ID') talknoteIdIndex = i;
          if (headerName.includes('出身'))  birthPlaceIndex = i;
          if (headerName.includes('誕生'))  birthdayIndex   = i;
          i++;
        }
      } else {
        const talknoteId = String(row[talknoteIdIndex]).trim();
        newRow.push(talknoteId && /[0-9]/.test(talknoteId) ? 'u-1000035345-' + talknoteId + '@mail.talknote.com' : '');
        newRow.push(getRegionFromPrefecture_(String(row[birthPlaceIndex]).trim()));
        newRow.push(getZodiacSign_(row[birthdayIndex]));
      }
      finalData.push(newRow);
      isFirst = false;
    }

    const numRows = finalData.length;
    let   numCols = 0; for (let row of finalData) { numCols = row.length; break; }
    targetSheet.getRange(1, 1, numRows, numCols).setValues(finalData);
    Logger.log('[staff-sync] ' + numRows + '行を同期しました');
  } catch (e) {
    Logger.log('[staff-sync] エラー: ' + e.message);
  }
}

// ──────────────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────────────

function sendEmailToTalknote_(toEmail, subject, body) {
  if (!toEmail || !toEmail.includes('@')) return;
  try {
    GmailApp.sendEmail(toEmail, subject, body, { name: 'Dawin Bot' });
  } catch (e) {
    Logger.log('[email] 送信エラー: ' + e.message);
  }
}

function getStaffMap_(config) {
  let ss; try { ss = SpreadsheetApp.openById(config.idSheetId); } catch(e) { return {}; }
  const sheet = ss.getSheetByName(config.idSheetName);
  if (!sheet) return {};
  const m = {};
  let isFirst = true;
  for (let row of sheet.getDataRange().getValues()) {
    if (isFirst) { isFirst = false; continue; }
    let shiftName = null, email = null, c = 0;
    for (let val of row) {
      if (c === 5)  shiftName = normalizeName_(val);
      if (c === 15) email     = String(val).trim();
      c++;
    }
    if (shiftName && email && email.includes('@')) m[shiftName] = email;
  }
  return m;
}

function getSubmittedNames_(targetDate, config) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(config.reportSheetName);
  if (!sheet) return [];
  const names = [];
  let isFirst = true;
  for (let row of sheet.getDataRange().getValues()) {
    if (isFirst) { isFirst = false; continue; }
    let dateVal = null, nameVal = null, c = 0;
    for (let val of row) {
      if (c === 1) dateVal = val;
      if (c === 2) nameVal = val;
      c++;
    }
    if (dateVal && isSameDate_(new Date(dateVal), targetDate)) {
      const nm = normalizeName_(nameVal);
      if (nm.length > 0) names.push(nm);
    }
  }
  return names;
}

function getUnsubmittedNames_(targetDate, submittedNames, config) {
  let ss; try { ss = SpreadsheetApp.openById(config.shiftSheetId); } catch(e) { return []; }
  const remindList = [];

  const targetSheetNames = [];
  config.shiftSheetNames.forEach(base => {
    targetSheetNames.push(Utilities.formatDate(targetDate, 'Asia/Tokyo', 'yy') + '年' + Utilities.formatDate(targetDate, 'Asia/Tokyo', 'M') + '月' + base);
    const prev = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    targetSheetNames.push(Utilities.formatDate(prev, 'Asia/Tokyo', 'yy') + '年' + Utilities.formatDate(prev, 'Asia/Tokyo', 'M') + '月' + base);
  });

  targetSheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    let activeCols = [], timeColIdx = 4;

    let rCount = 0;
    for (let row of data) {
      if (rCount >= 10) break;
      let tempCols = [], tempTimeIdx = 4, c = 0;
      for (let val of row) {
        const cleanVal = String(val).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '');
        if (config.targetHeaderNames.includes(cleanVal)) tempCols.push(c);
        if (cleanVal === '時間') tempTimeIdx = c;
        c++;
      }
      if (tempCols.length >= 1) { activeCols = tempCols; timeColIdx = tempTimeIdx; break; }
      rCount++;
    }
    if (activeCols.length === 0) return;

    let currentShiftDate = null;
    for (let row of data) {
      let cellA = null, timeCell = '', c = 0;
      for (let v of row) {
        if (c === 0)        cellA    = v;
        if (c === timeColIdx) timeCell = String(v);
        c++;
      }
      if (Object.prototype.toString.call(cellA) === '[object Date]') currentShiftDate = cellA;
      else if (cellA !== '') currentShiftDate = null;

      if (!currentShiftDate || !isSameDate_(currentShiftDate, targetDate)) continue;
      if (config.ignoreRowWords.some(w => timeCell.includes(w)) || !/[0-9]/.test(timeCell)) continue;

      activeCols.forEach(colIdx => {
        let nameRaw = null, c = 0;
        for (let v of row) { if (c === colIdx) { nameRaw = v; break; } c++; }
        const name = normalizeName_(nameRaw);
        const isIgnore = /^[0-9０-９\.]+$/.test(name)
          || config.ignoreWords.some(w => name.includes(w))
          || config.distinctPrefixes.some(p => name.startsWith(p))
          || config.ignoreSuffixes.some(s => name.endsWith(s));
        if (!isIgnore && name && name.length > 1) {
          if (!submittedNames.some(sub => isNameMatch_(name, sub)) && !remindList.includes(name)) {
            remindList.push(name);
          }
        }
      });
    }
  });
  return remindList;
}

function isNameMatch_(nameA, nameB) {
  if (!nameA || !nameB || nameA.length === 0 || nameB.length === 0) return false;
  for (const p of DAWIN.distinctPrefixes) {
    if (nameA.startsWith(p) !== nameB.startsWith(p)) return false;
  }
  if (nameA === '大野'  && nameB.startsWith('大野賀'))  return false;
  if (nameB === '大野'  && nameA.startsWith('大野賀'))  return false;
  if (nameA === '高橋'  && nameB.startsWith('高橋史'))  return false;
  if (nameB === '高橋'  && nameA.startsWith('高橋史'))  return false;
  return nameA.includes(nameB) || nameB.includes(nameA);
}

function normalizeName_(n) {
  if (!n) return '';
  return n.toString().replace(/\s+/g, '').trim().replace(/髙/g, '高');
}

function isSameDate_(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()      === b.getMonth()
    && a.getDate()       === b.getDate();
}

function getRegionFromPrefecture_(prefName) {
  if (!prefName) return '';
  const regions = {
    '北海道': ['北海道','北海'],
    '東北':   ['青森','岩手','秋田','宮城','山形','福島'],
    '北関東': ['茨城','栃木','群馬'],
    '甲信越': ['新潟','長野','山梨'],
    '南関東': ['埼玉','千葉','東京','神奈川'],
    '東海':   ['静岡','岐阜','愛知','三重'],
    '北陸':   ['富山','石川','福井'],
    '近畿':   ['滋賀','京都','奈良','和歌山','大阪','兵庫'],
    '中国':   ['鳥取','島根','岡山','広島','山口'],
    '四国':   ['徳島','香川','愛媛','高知'],
    '九州':   ['福岡','佐賀','長崎','大分','熊本','宮崎','鹿児島'],
    '沖縄':   ['沖縄'],
  };
  for (const [region, prefs] of Object.entries(regions)) {
    if (prefs.some(p => prefName.startsWith(p))) return region;
  }
  return '';
}

function getZodiacSign_(dateValue) {
  if (!dateValue) return '';
  let month, day;
  if (Object.prototype.toString.call(dateValue) === '[object Date]') {
    month = dateValue.getMonth() + 1;
    day   = dateValue.getDate();
  } else {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    month = d.getMonth() + 1;
    day   = d.getDate();
  }
  if ((month === 3  && day >= 21) || (month === 4  && day <= 19)) return '牡羊座';
  if ((month === 4  && day >= 20) || (month === 5  && day <= 20)) return '牡牛座';
  if ((month === 5  && day >= 21) || (month === 6  && day <= 21)) return '双子座';
  if ((month === 6  && day >= 22) || (month === 7  && day <= 22)) return '蟹座';
  if ((month === 7  && day >= 23) || (month === 8  && day <= 22)) return '獅子座';
  if ((month === 8  && day >= 23) || (month === 9  && day <= 22)) return '乙女座';
  if ((month === 9  && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '蠍座';
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
  if ((month === 12 && day >= 22) || (month === 1  && day <= 19)) return '山羊座';
  if ((month === 1  && day >= 20) || (month === 2  && day <= 18)) return '水瓶座';
  if ((month === 2  && day >= 19) || (month === 3  && day <= 20)) return '魚座';
  return '';
}

// ──────────────────────────────────────────────
// 編集トリガー
// ──────────────────────────────────────────────

function onEditTrigger(e) {
  const sheetName = e.source.getActiveSheet().getName();
  const month     = getCurrentMonth_();
  if      (sheetName === SHEET_NIPPO)    syncNippoSheet(month);
  else if (sheetName === SHEET_AGE)      syncAgeSheet(month);
  else if (sheetName === SHEET_TYPE)     syncTypeSheet(month);
  else if (sheetName === SHEET_TALKNOTE) syncTalknote(month);
}

// ──────────────────────────────────────────────
// トリガー設定（最初に一度だけ実行してください）
// ──────────────────────────────────────────────

function setupTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // ① 編集時：シート変更を自動同期
  ScriptApp.newTrigger('onEditTrigger').forSpreadsheet(ss).onEdit().create();

  // ② 10分おき：全シートをDB同期
  ScriptApp.newTrigger('syncAll').timeBased().everyMinutes(10).create();

  // ③ 5分おき：Talknoteメール取得 → DB同期
  ScriptApp.newTrigger('fetchAndSyncTalknote').timeBased().everyMinutes(5).create();

  // ④ 毎日18時：明日のシフト通知
  ScriptApp.newTrigger('mainTomorrow_ShiftNotify').timeBased().atHour(18).everyDays(1).create();

  // ⑤ 毎日21時：日報未提出者への催促
  ScriptApp.newTrigger('mainToday_ReportReminder').timeBased().atHour(21).everyDays(1).create();

  // ⑥ 毎日6時：スタッフ情報同期
  ScriptApp.newTrigger('syncStaffInfo_New').timeBased().atHour(6).everyDays(1).create();

  Logger.log('トリガーを設定しました ✅');
}

function clearTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('トリガーを削除しました');
}
