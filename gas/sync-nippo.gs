/**
 * ============================================================
 *  sync-nippo.gs  —  【loker用】日報合算 Apps Script
 * ============================================================
 *
 * 【初回セットアップ手順】
 *   1. このファイルを Apps Script に丸ごとコピペして保存
 *   2. 下の「▼ここだけ変更してください」を編集する
 *   3. 画面上部のドロップダウンで「setupTriggers」を選び「実行」
 *      → 以降はすべて自動で動きます
 *
 * 【機能一覧と自動実行タイミング】
 *   ① Talknoteメール取得 → DB反映   ……… 5分おきに自動実行
 *   ② スプレッドシート → DB同期      ……… 10分おきに自動実行
 *   ③ 明日のシフト通知メール          ……… 毎日18時に自動実行
 *   ④ 日報未提出者への催促メール      ……… 毎日21時に自動実行
 *   ⑤ スタッフ情報の同期             ……… 毎日 6時に自動実行
 *
 * 【手動で実行できる関数】
 *   - syncSpecificMonth()            … 特定の月のデータをDBに入れ直す
 *   - fetchTalknoteEmails_PastData() … 過去メールをまとめてシートに記録
 *   - setupTriggers()                … トリガーを再設定したいとき
 *   - clearTriggers()                … トリガーをすべて削除したいとき
 *
 * ============================================================
 *
 * 【目次】Ctrl+F でセクション名を検索してジャンプできます
 *
 *   [設定]    44〜135行   ▼ここだけ変更してください（設定エリア）
 *   [機能②]  136〜252行  スプレッドシート → DB同期
 *   [機能①]  253〜349行  Talknoteメール取得 → シート記録 → DB同期
 *   [補助]    350〜444行  日報合算（フォーム回答 → 合算データシート）
 *   [機能④]  445〜470行  日報未提出者への催促メール（毎日21時自動実行）
 *   [機能③]  471〜563行  明日のシフト通知メール（毎日18時自動実行）
 *   [機能⑤]  564〜629行  スタッフ情報同期（毎日6時自動実行）
 *   [内部]    630〜847行  内部ヘルパー関数（触らなくてOK）
 *   [トリガー] 848〜882行 トリガー管理（初回セットアップ時に1回だけ実行）
 *
 * ============================================================
 */


// ============================================================
//  [設定] ▼ここだけ変更してください（設定エリア）
//    ※ここ以外は基本的に触らなくてOKです
// ============================================================

const CONFIG = {
  // Vercelアプリの URL（末尾スラッシュなし）
  SYNC_URL:    'https://YOUR_APP_NAME.vercel.app/api/sync',
  // .env.local の SYNC_SECRET と同じ値
  SYNC_SECRET: 'my-super-secret-key-2026',
};

// 各スプレッドシートのID（URLの /d/〇〇〇/ の部分）
const DAWIN = {
  shiftSheetId: '1KmmKchHMKOvCHXp8Qkki6FDa2LMxDKzE_S4zXqxJKM8', // シフト表
  idSheetId:    '1zbZFiAOCtvFfOGEO6mE1jV-Sh99SoaoxHZROzXNdsyE',   // スタッフ情報（このスプレッドシート自身）
  formSheetId1: '1gq06U0WG8ZxMLXP6Hy-hngxTW379Yz3SY2-CJt_BBCE',  // 日報フォーム①
  formSheetId2: '1s8xPwsQ2KyxcfHy9g0zFxaVRSzlK8jrNqN0DzjuaYpE',  // 日報フォーム②
  formUrl:      'https://forms.gle/c2XY1krdoSKbc9Ma8',             // 日報提出フォームURL

  // シフト表のシート名の末尾パターン（「26年4月【東京】」のような形式）
  shiftSheetNames: ['【東京】', '【福岡】'],

  // このスプレッドシート内のシート名
  reportSheetName: '合算データ',
  idSheetName:     'スタッフ情報',

  // シフト表の列番号ヘッダー（スタッフが入る列の見出し）
  targetHeaderNames: ['1','2','3','4','5','6','7','8','9','10','11','12'],

  // 催促・通知を送らない名前キーワード（スタッフ以外の記載）
  ignoreWords:      ['管理費','備品','休み','O','交通費','・','坊薗','橋本','欠員','未定','調整','超サブ','サブ','赤松','重松','犬束','お初','齋藤','印南','中嶋','なし','回答','宮崎','平野'],
  shiftIgnoreWords: ['管理費','備品','休み','O','交通費','・','欠員','未定','調整','超サブ','サブ','なし','回答'],
  ignoreRowWords:   ['管理費','備品'],

  // このプレフィックスで始まる名前は「別人」として扱う（同姓問題の回避）
  distinctPrefixes: ['FFU','salud','✖','EZ','アスクラ','HE','出来れば'],
  ignoreSuffixes:   ['ガール','バルーン'],
};

// スタッフ情報の転記元スプレッドシート設定
const STAFF_SYNC = {
  sourceSpreadsheetId: '1vtXt9UJ87EGtjNEiVYH2R4nUQQdgKmYGMsE04WU-G_A', // 転記元
  sourceSheetName:     'シート1',
  targetSheetName:     'スタッフ情報',
};

// ▲ここまでが設定エリアです
// ============================================================


// ============================================================
//  内部シート名の定数（シート名を変更したときだけ修正）
// ============================================================

const SHEET_NIPPO    = '合算データ';           // 日報合算シート
const SHEET_AGE      = 'グラフ用データ_年代';  // 年代集計シート
const SHEET_TYPE     = 'グラフ用データ_家族構成'; // 家族構成集計シート
const SHEET_TALKNOTE = 'トークノート受信録';   // Talknoteメール記録シート


// ============================================================
//  共通処理（触らなくてOK）
// ============================================================

// 現在の月を 'YYYY-MM' 形式で返す
function getCurrentMonth_() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

// Vercel API にデータを送信する共通処理
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


// ============================================================
//  [機能②] スプレッドシート → DB同期
//    10分おきに自動実行。シートの内容をアプリのDBへ送る。
//    手動で今すぐ同期したい場合は syncAll() を実行。
// ============================================================

// 合算データシートをDBへ送る
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

// 年代シートをDBへ送る
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

// 家族構成シートをDBへ送る
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

// トークノート受信録シートをDBへ送る
function syncTalknote(month) {
  month = month || getCurrentMonth_();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TALKNOTE);
  if (!sheet) { Logger.log(SHEET_TALKNOTE + ' が見つかりません'); return; }

  const data   = sheet.getDataRange().getValues();
  const [y, m] = month.split('-').map(Number);
  const rows   = [];

  for (var i = 1; i < data.length; i++) {
    var raw = data[i];
    var ts  = raw[0]; // A列：日時
    if (!ts) continue;

    var date;
    if (ts instanceof Date) {
      date = ts;
    } else {
      // 'yyyy/MM/dd HH:mm:ss' → ISO形式に変換してパース
      var str = String(ts).replace(/\//g, '-').replace(' ', 'T');
      date = new Date(str);
    }
    if (isNaN(date.getTime())) continue;
    if (date.getFullYear() !== y || date.getMonth() + 1 !== m) continue;

    var staffName = String(raw[1] || '').trim(); // B列：送信者名
    var message   = String(raw[2] || '').trim(); // C列：メッセージ
    if (!staffName || !message) continue;

    var pad      = function(n) { return String(n).padStart(2, '0'); };
    var dateStr  = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    var postedAt = dateStr + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
    rows.push({ postedAt: postedAt, staffName: staffName, message: message });
  }

  if (rows.length === 0) { Logger.log('対象月のTalknoteデータがありません: ' + month); return; }
  callSyncApi_({ type: 'talknote', month: month, rows: rows });
}

// 全シートを現在月で一括同期（10分おき自動実行 / 手動実行も可）
function syncAll() {
  const month = getCurrentMonth_();
  Logger.log('DB同期開始: ' + month);
  syncNippoSheet(month);
  syncAgeSheet(month);
  syncTypeSheet(month);
  syncTalknote(month);
  Logger.log('DB同期完了');
}

// 特定の月のデータをDBに入れ直したい場合は month を書き換えて手動実行
function syncSpecificMonth() {
  const month = '2026-03'; // ← ここを変更して実行してください（例：'2026-05'）
  syncNippoSheet(month);
  syncAgeSheet(month);
  syncTypeSheet(month);
}


// ============================================================
//  [機能①] Talknoteメール取得 → シート記録 → DB同期
//    5分おきに自動実行。
//    Gmailの未読Talknote通知を読み取り、シートに書き込んだあと
//    すぐにDBへ送るため、アプリへの反映が最速5分以内に行われる。
// ============================================================

// 未読メールを取得してシートに記録し、DBへ同期する（自動実行用）
function fetchAndSyncTalknote() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_TALKNOTE);

  // シートが存在しない場合は自動作成
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TALKNOTE);
    sheet.appendRow(['受信日時', '送信者', 'メッセージ内容']);
  }

  const threads = GmailApp.search('from:no-reply@talknote.com is:unread');
  if (threads.length === 0) {
    Logger.log('[Talknote] 新着メールなし');
    return;
  }

  let count = 0;
  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      if (!message.isUnread()) continue;

      const date    = message.getDate();
      const subject = message.getSubject();
      const body    = message.getPlainBody();

      // 件名から送信者名を抽出（例：「Talknote：○○さんからメッセージ」）
      let senderName = '不明';
      const nameMatch = subject.match(/Talknote\s*[：:]\s*(.+?)さんからメッセージ/);
      if (nameMatch && nameMatch[1]) senderName = nameMatch[1].trim();

      // 本文からメッセージ内容を抽出
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

  Logger.log('[Talknote] ' + count + '件をシートに記録');
  if (count > 0) syncTalknote(getCurrentMonth_()); // すぐDBへ反映
}

// 過去の既読メールをまとめてシートに記録する（手動実行用・初回データ取込に使う）
// ※最新50スレッド分。もっと必要な場合は「50」を増やして実行してください
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


// ============================================================
//  [補助] 日報合算
//    フォームの回答①②を合算データシートにまとめる。
//    mainToday_ReportReminder() の中で自動的に呼ばれるため
//    通常は個別に実行しなくてOK。
// ============================================================

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
    const ssC = SpreadsheetApp.getActiveSpreadsheet(); // このスプレッドシート（日報合算）

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
      let col = 0; for (let row of finalData) { col = row.length; break; }
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


// ============================================================
//  [機能④] 日報未提出者への催促メール（毎日21時自動実行）
//    シフトに入っているのに日報を出していないスタッフへ
//    Talknoteアドレス宛にメールを送る。
// ============================================================

function mainToday_ReportReminder() {
  mergeSheets_Complete(); // まず最新の日報データを合算
  const targetDate = new Date();
  const staffMap   = getStaffMap_(DAWIN);
  const submitted  = getSubmittedNames_(targetDate, DAWIN);
  const remindList = getUnsubmittedNames_(targetDate, submitted, DAWIN);

  remindList.forEach(shiftName => {
    const email = staffMap[shiftName];
    if (!email) return;
    sendEmailToTalknote_(
      email,
      '【日報提出】',
      shiftName + 'さん\n\n本日中に提出をお願いします！\n\n▼提出フォーム\n' + DAWIN.formUrl
    );
    Logger.log('[催促] ' + shiftName + ' / ' + email);
  });
}


// ============================================================
//  [機能③] 明日のシフト通知メール（毎日18時自動実行）
//    シフト表を確認し、翌日出勤予定のスタッフへ
//    担当現場をTalknoteアドレス宛にメールで通知する。
// ============================================================

function mainTomorrow_ShiftNotify() {
  const staffMap = getStaffMap_(DAWIN);
  if (Object.keys(staffMap).length === 0) return;

  let ss;
  try { ss = SpreadsheetApp.openById(DAWIN.shiftSheetId); } catch(e) { return; }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 当月・前月のシートを両方チェック（月またぎ対応）
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
            if (c === colIdx)     cellName  = normalizeName_(v);
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

  // 同じメールアドレスへの重複送信を防ぐ
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
    Logger.log('[シフト通知] ' + shiftName + ' / ' + email);
    sentEmails.push(email);
  }
}


// ============================================================
//  [機能⑤] スタッフ情報同期（毎日6時自動実行）
//    転記元スプレッドシートのシート1から
//    スタッフ情報スプレッドシートの「スタッフ情報」シートへ
//    Talknoteアドレス・出身地域・星座を自動追加しながら転記する。
// ============================================================

function syncStaffInfo_New() {
  try {
    const sourceSS    = SpreadsheetApp.openById(STAFF_SYNC.sourceSpreadsheetId);
    const sourceSheet = sourceSS.getSheetByName(STAFF_SYNC.sourceSheetName);
    if (!sourceSheet) { Logger.log('転記元のシートが見つかりません'); return; }

    const lastRow = sourceSheet.getLastRow();
    if (lastRow === 0) return;

    // B列から15列分取得
    const data = sourceSheet.getRange(1, 2, lastRow, 15).getValues();

    const targetSS    = SpreadsheetApp.getActiveSpreadsheet(); // スタッフ情報はこのスプレッドシート内
    let   targetSheet = targetSS.getSheetByName(STAFF_SYNC.targetSheetName);
    if (!targetSheet) targetSheet = targetSS.insertSheet(STAFF_SYNC.targetSheetName);
    targetSheet.clear();

    let finalData = [], isFirst = true;
    let talknoteIdIndex = 6, birthPlaceIndex = 7, birthdayIndex = 3;

    for (let row of data) {
      let newRow = [...row];
      if (isFirst) {
        // ヘッダー行にP・Q・R列の見出しを追加
        newRow.push('トークノートアドレス', '出身地域', '星座');
        // 列の位置をヘッダー名から自動判定
        let i = 0;
        for (let h of row) {
          const headerName = String(h);
          if (headerName.includes('トークノート') || headerName.includes('ユーザーID') || headerName === 'ID') talknoteIdIndex = i;
          if (headerName.includes('出身'))  birthPlaceIndex = i;
          if (headerName.includes('誕生'))  birthdayIndex   = i;
          i++;
        }
      } else {
        // P列：TalknoteユーザーIDからメールアドレスを自動生成
        const talknoteId = String(row[talknoteIdIndex]).trim();
        newRow.push(talknoteId && /[0-9]/.test(talknoteId)
          ? 'u-1000035345-' + talknoteId + '@mail.talknote.com'
          : '');
        // Q列：都道府県名から地域を判定
        newRow.push(getRegionFromPrefecture_(String(row[birthPlaceIndex]).trim()));
        // R列：生年月日から星座を判定
        newRow.push(getZodiacSign_(row[birthdayIndex]));
      }
      finalData.push(newRow);
      isFirst = false;
    }

    const numRows = finalData.length;
    let numCols = 0; for (let row of finalData) { numCols = row.length; break; }
    targetSheet.getRange(1, 1, numRows, numCols).setValues(finalData);
    Logger.log('[スタッフ同期] ' + numRows + '行を同期しました');
  } catch (e) {
    Logger.log('[スタッフ同期] エラー: ' + e.message);
  }
}


// ============================================================
//  [内部] 内部ヘルパー関数（触らなくてOK）
// ============================================================

// Gmailを使ってTalknoteアドレス宛にメールを送る
function sendEmailToTalknote_(toEmail, subject, body) {
  if (!toEmail || !toEmail.includes('@')) return;
  try {
    GmailApp.sendEmail(toEmail, subject, body, { name: 'Dawin Bot' });
  } catch (e) {
    Logger.log('[メール送信] エラー: ' + e.message);
  }
}

// スタッフ情報シートから「シフト名 → メールアドレス」のマップを作成
function getStaffMap_(config) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet(); // スタッフ情報はこのスプレッドシート内
  const sheet = ss.getSheetByName(config.idSheetName);
  if (!sheet) return {};
  const m = {};
  let isFirst = true;
  for (let row of sheet.getDataRange().getValues()) {
    if (isFirst) { isFirst = false; continue; }
    let shiftName = null, email = null, c = 0;
    for (let val of row) {
      if (c === 5)  shiftName = normalizeName_(val);  // F列：シフト名
      if (c === 15) email     = String(val).trim();   // P列：Talknoteアドレス
      c++;
    }
    if (shiftName && email && email.includes('@')) m[shiftName] = email;
  }
  return m;
}

// 指定日に日報を提出済みのスタッフ名一覧を取得
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

// シフト表から「指定日に出勤予定かつ日報未提出」のスタッフ名一覧を取得
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
        if (c === 0)           cellA    = v;
        if (c === timeColIdx)  timeCell = String(v);
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

// 2つの名前が同一人物か判定（部分一致・前方一致で照合）
function isNameMatch_(nameA, nameB) {
  if (!nameA || !nameB || nameA.length === 0 || nameB.length === 0) return false;
  // 特定プレフィックスが異なれば別人扱い
  for (const p of DAWIN.distinctPrefixes) {
    if (nameA.startsWith(p) !== nameB.startsWith(p)) return false;
  }
  // 同姓別人の個別対応
  if (nameA === '大野' && nameB.startsWith('大野賀')) return false;
  if (nameB === '大野' && nameA.startsWith('大野賀')) return false;
  if (nameA === '高橋' && nameB.startsWith('高橋史')) return false;
  if (nameB === '高橋' && nameA.startsWith('高橋史')) return false;
  return nameA.includes(nameB) || nameB.includes(nameA);
}

// 名前を正規化（スペース除去・旧字体統一）
function normalizeName_(n) {
  if (!n) return '';
  return n.toString().replace(/\s+/g, '').trim().replace(/髙/g, '高');
}

// 2つのDateが同じ日付かどうか判定
function isSameDate_(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()      === b.getMonth()
    && a.getDate()       === b.getDate();
}

// 都道府県名から地域名を返す
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

// 生年月日から星座を返す
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


// ============================================================
//  シート編集時トリガー（触らなくてOK）
//    人間がシートを手動編集したとき、該当シートをDBへ即時同期する。
// ============================================================

function onEditTrigger(e) {
  const sheetName = e.source.getActiveSheet().getName();
  const month     = getCurrentMonth_();
  if      (sheetName === SHEET_NIPPO)    syncNippoSheet(month);
  else if (sheetName === SHEET_AGE)      syncAgeSheet(month);
  else if (sheetName === SHEET_TYPE)     syncTypeSheet(month);
  else if (sheetName === SHEET_TALKNOTE) syncTalknote(month);
}


// ============================================================
//  [トリガー] トリガー管理（初回セットアップ時に1回だけ実行）
// ============================================================

/**
 * setupTriggers() — 全トリガーを設定する
 *
 * 実行すると以下が自動登録されます：
 *   ① Talknoteメール取得         5分おき
 *   ② スプレッドシート→DB同期   10分おき
 *   ③ 明日のシフト通知           毎日18時
 *   ④ 日報未提出催促             毎日21時
 *   ⑤ スタッフ情報同期           毎日 6時
 *   ⑥ シート編集時の即時同期     編集のたびに
 *
 * ※既存のトリガーはすべて削除してから再設定します
 */
function setupTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('onEditTrigger').forSpreadsheet(ss).onEdit().create();                        // ⑥ 編集時
  ScriptApp.newTrigger('syncAll').timeBased().everyMinutes(10).create();                             // ② 10分おき
  ScriptApp.newTrigger('fetchAndSyncTalknote').timeBased().everyMinutes(5).create();                 // ① 5分おき
  ScriptApp.newTrigger('mainTomorrow_ShiftNotify').timeBased().atHour(18).everyDays(1).create();     // ③ 18時
  ScriptApp.newTrigger('mainToday_ReportReminder').timeBased().atHour(21).everyDays(1).create();     // ④ 21時
  ScriptApp.newTrigger('syncStaffInfo_New').timeBased().atHour(6).everyDays(1).create();             // ⑤ 6時

  Logger.log('トリガーを設定しました ✅');
}

// トリガーをすべて削除したい場合に実行
function clearTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('トリガーを削除しました');
}
