/**
 * sync-nippo.gs
 * ───────────────────────────────────────────────
 * 【使い方】
 * 1. 日報スプレッドシートを開く
 * 2. 拡張機能 → Apps Script
 * 3. このファイルの中身を全部貼り付けて保存
 * 4. setupTriggers() を一度だけ実行してトリガーを登録
 * ───────────────────────────────────────────────
 */

// ========== 設定（ここだけ変更してください） ==========
const CONFIG = {
  // VercelのアプリURL（末尾スラッシュなし）
  SYNC_URL: 'https://YOUR_APP_NAME.vercel.app/api/sync',
  // .env.local の SYNC_SECRET と同じ値
  SYNC_SECRET: 'my-super-secret-key-2026',
};
// ======================================================

// シート名
const SHEET_NIPPO     = '合算データ';
const SHEET_AGE       = 'グラフ用データ_年代';
const SHEET_TYPE      = 'グラフ用データ_家族構成';
const SHEET_TALKNOTE  = 'トークノート受信録';

// 現在の月を 'YYYY-MM' 形式で返す
function getCurrentMonth_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return y + '-' + m;
}

// /api/sync にPOSTする共通処理
function callSyncApi_(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + CONFIG.SYNC_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  try {
    const res = UrlFetchApp.fetch(CONFIG.SYNC_URL, options);
    const body = res.getContentText();
    Logger.log('[sync] ' + payload.type + ' → ' + body);
    return JSON.parse(body);
  } catch (e) {
    Logger.log('[sync] エラー: ' + e.message);
    return null;
  }
}

// 合算データシートを同期
function syncNippoSheet(month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NIPPO);
  if (!sheet) { Logger.log(SHEET_NIPPO + ' が見つかりません'); return; }

  // セル値をすべて文字列に変換（日付オブジェクトなどを文字列化）
  const rows = sheet.getDataRange().getValues().map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) {
        // 'YYYY-MM-DD' 形式に変換
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

// 年代シートを同期
function syncAgeSheet(month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

// 家族構成シートを同期
function syncTypeSheet(month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

// トークノートシートを同期
function syncTalknote(month) {
  month = month || getCurrentMonth_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TALKNOTE);
  if (!sheet) { Logger.log(SHEET_TALKNOTE + ' が見つかりません'); return; }

  const data = sheet.getDataRange().getValues();
  const [y, m] = month.split('-').map(Number);
  const rows = [];

  for (var i = 1; i < data.length; i++) {
    var raw = data[i];
    var ts = raw[0]; // A列: 日時
    if (!ts) continue;

    var date;
    if (ts instanceof Date) {
      date = ts;
    } else {
      // 'yyyy/MM/dd HH:mm:ss' → 'yyyy-MM-ddTHH:mm:ss' に変換してパース
      var str = String(ts).replace(/\//g, '-').replace(' ', 'T');
      date = new Date(str);
    }
    if (isNaN(date.getTime())) continue;
    if (date.getFullYear() !== y || date.getMonth() + 1 !== m) continue;

    var staffName = String(raw[1] || '').trim(); // B列: 投稿者名
    var message   = String(raw[2] || '').trim(); // C列: 本文
    if (!staffName || !message) continue;

    var pad = function(n) { return String(n).padStart(2, '0'); };
    var dateStr   = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    var postedAt  = dateStr + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());

    rows.push({ postedAt: postedAt, staffName: staffName, message: message });
  }

  if (rows.length === 0) { Logger.log('対象月のトークノートデータがありません: ' + month); return; }
  callSyncApi_({ type: 'talknote', month: month, rows: rows });
}

// ──────────────────────────────────────────────
// Talknoteメール取得 → シート記録 → DB同期
// ──────────────────────────────────────────────
function fetchAndSyncTalknote() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TALKNOTE);

  // シートがなければ作成
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

      // 件名から送信者名を抽出
      let senderName = '不明';
      const nameMatch = subject.match(/Talknote\s*[：:]\s*(.+?)さんからメッセージ/);
      if (nameMatch && nameMatch[1]) senderName = nameMatch[1].trim();

      // 本文からメッセージを抽出
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

  // 記録があればそのままDBへ同期
  if (count > 0) {
    syncTalknote(getCurrentMonth_());
  }
}

// 全シートを現在月で一括同期（手動実行・定期実行用）
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
// 編集トリガー：シートが変更されたら自動で同期
// ──────────────────────────────────────────────
function onEditTrigger(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const month = getCurrentMonth_();

  if (sheetName === SHEET_NIPPO) {
    syncNippoSheet(month);
  } else if (sheetName === SHEET_AGE) {
    syncAgeSheet(month);
  } else if (sheetName === SHEET_TYPE) {
    syncTypeSheet(month);
  } else if (sheetName === SHEET_TALKNOTE) {
    syncTalknote(month);
  }
}

// ──────────────────────────────────────────────
// トリガー設定（最初に一度だけ実行してください）
// ──────────────────────────────────────────────
function setupTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 既存のトリガーをすべて削除（重複防止）
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  // ① 編集時トリガー（セル変更のたびに自動同期）
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // ② 10分ごとの定期同期（編集トリガーの取りこぼし防止）
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .everyMinutes(10)
    .create();

  // ③ 5分ごとにTalknoteメールを取得してDB同期
  ScriptApp.newTrigger('fetchAndSyncTalknote')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('トリガーを設定しました ✅');
}

// トリガーを全削除したい場合
function clearTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  Logger.log('トリガーを削除しました');
}
