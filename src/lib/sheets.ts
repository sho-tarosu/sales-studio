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
