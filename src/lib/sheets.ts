import { google } from 'googleapis';
import path from 'path';
import type { User, Role } from '@/types';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const USER_SHEET_NAME = 'スタッフ';

export async function getSheetsClient() {
  let auth;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Vercel: credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
  } else {
    // Local: credentials from file
    const keyFilePath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json');
    auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: SCOPES,
    });
  }

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

export async function getSheetData(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  return (res.data.values || []) as string[][];
}

export async function getShiftSheetData(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SHIFT_SPREADSHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  return (res.data.values || []) as string[][];
}

// B列の背景色がオレンジ系かどうか（祝日判定）
function isOrangeBackground(color: { red?: number | null; green?: number | null; blue?: number | null } | null | undefined): boolean {
  if (!color) return false;
  const r = color.red ?? 0;
  const g = color.green ?? 0;
  const b = color.blue ?? 0;
  // オレンジ系: 赤が強く・緑が中程度・青が少ない。白(1,1,1)・黄(1,1,0)と区別する
  return r > 0.7 && g > 0.1 && g < 0.88 && b < 0.45 && r > g + 0.08;
}

// セル値と祝日日付セットを同時に取得（B列の背景色でオレンジ判定）
export async function getShiftSheetDataWithHolidays(
  sheetName: string
): Promise<{ values: string[][]; holidayDates: Set<string> }> {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SHIFT_SPREADSHEET_ID;

  const res = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId!,
    ranges: [sheetName],
    includeGridData: true,
    fields: 'sheets(data(rowData(values(formattedValue,effectiveFormat(backgroundColor)))))',
  });

  const rowData = res.data.sheets?.[0]?.data?.[0]?.rowData ?? [];
  const values: string[][] = [];
  const holidayDates = new Set<string>();

  for (const rd of rowData) {
    const cells = rd.values ?? [];
    const row = cells.map((c) => (c.formattedValue as string) ?? '');
    values.push(row);

    // B列（index 1）の背景色がオレンジなら祝日
    const colBBg = cells[1]?.effectiveFormat?.backgroundColor;
    if (isOrangeBackground(colBBg)) {
      const dateStr = row[0];
      if (dateStr && /\d/.test(dateStr)) {
        holidayDates.add(dateStr);
      }
    }
  }

  return { values, holidayDates };
}

export async function getUserById(userId: string): Promise<(User & { passwordHash: string; rowIndex: number }) | null> {
  const rows = await getSheetData(USER_SHEET_NAME);
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const [id, name, passwordHash, role, active] = rows[i];
    if (id === userId) {
      if (active?.toUpperCase() !== 'TRUE') return null;
      return {
        id,
        name,
        passwordHash,
        role: role as Role,
        active: true,
        rowIndex: i + 1, // 1-based for Sheets API
      };
    }
  }
  return null;
}

export async function updateLastLogin(rowIndex: number): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId!,
    range: `${USER_SHEET_NAME}!F${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[now]] },
  });
}
