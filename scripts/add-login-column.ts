import { google } from 'googleapis';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'スタッフ!F1',
    valueInputOption: 'RAW',
    requestBody: { values: [['最終ログイン']] },
  });

  console.log('「最終ログイン」列のヘッダーを追加しました');
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
