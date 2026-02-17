import { google } from 'googleapis';
import path from 'path';
import bcrypt from 'bcryptjs';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_NAME = 'スタッフ';

async function main() {
  let auth;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  } else {
    const keyFilePath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json');
    auth = new google.auth.GoogleAuth({ keyFile: keyFilePath, scopes: SCOPES });
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  // Check if sheet already exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId! });
  const existing = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME);

  if (!existing) {
    // Create the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId!,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: SHEET_NAME } },
        }],
      },
    });
    console.log(`「${SHEET_NAME}」シートを作成しました`);
  } else {
    console.log(`「${SHEET_NAME}」シートは既に存在します`);
  }

  // Generate test user data
  const password = 'password123';
  const hash = bcrypt.hashSync(password, 10);

  const rows = [
    ['ユーザーID', '名前', 'パスワード(ハッシュ)', 'ロール', '有効'],
    ['admin', '管理者', hash, '幹部', 'TRUE'],
    ['tanaka', '田中 太郎', hash, '社員', 'TRUE'],
    ['suzuki', '鈴木 一郎', hash, 'アルバイト', 'FALSE'],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId!,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });

  console.log('テストユーザーを登録しました:');
  console.log('  admin    / password123 (幹部・有効)');
  console.log('  tanaka   / password123 (社員・有効)');
  console.log('  suzuki   / password123 (アルバイト・無効 → ログイン不可)');
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
