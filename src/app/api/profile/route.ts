import { NextResponse } from 'next/server';
import { getSheetData, getStaffGenders } from '@/lib/sheets';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SHEET_NAME = 'スタッフ情報';

const PREFECTURE_TO_REGION: Record<string, string> = {
  '北海道': '北海道',
  '青森': '東北', '岩手': '東北', '宮城': '東北', '秋田': '東北', '山形': '東北', '福島': '東北',
  '茨城': '関東', '栃木': '関東', '群馬': '関東', '埼玉': '関東', '千葉': '関東', '東京': '関東', '神奈川': '関東',
  '新潟': '中部', '富山': '中部', '石川': '中部', '福井': '中部', '山梨': '中部', '長野': '中部', '岐阜': '中部', '静岡': '中部', '愛知': '中部',
  '三重': '関西', '滋賀': '関西', '京都': '関西', '大阪': '関西', '兵庫': '関西', '奈良': '関西', '和歌山': '関西',
  '鳥取': '中国', '島根': '中国', '岡山': '中国', '広島': '中国', '山口': '中国',
  '徳島': '四国', '香川': '四国', '愛媛': '四国', '高知': '四国',
  '福岡': '九州・沖縄', '佐賀': '九州・沖縄', '長崎': '九州・沖縄', '熊本': '九州・沖縄',
  '大分': '九州・沖縄', '宮崎': '九州・沖縄', '鹿児島': '九州・沖縄', '沖縄': '九州・沖縄',
};

function calcAge(birthday: string): number | null {
  if (!birthday) return null;
  // Google Sheets serial number (numeric string)
  const serial = Number(birthday);
  let birth: Date;
  if (!isNaN(serial) && serial > 10000) {
    birth = new Date((serial - 25569) * 86400 * 1000);
  } else {
    birth = new Date(birthday.replace(/\//g, '-'));
  }
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 && age < 100 ? age : null;
}

function ageBracket(age: number): string {
  const low = Math.floor(age / 5) * 5;
  return `${low}-${low + 4}`;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const rows = await getSheetData(SHEET_NAME);

    const prefectures: Record<string, number> = {};
    const regions: Record<string, number> = {};
    const bloodTypes: Record<string, number> = {};
    const roleCounts: Record<string, number> = { 社員: 0, アルバイト: 0, 業務委託: 0 };
    const animalTypes: Record<string, number> = {};
    const ageBrackets: Record<string, number> = {};
    let genderMale = 0, genderFemale = 0;
    let total = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name   = row[19]?.trim();
      if (!name) continue;

      const active = row[23]?.trim();
      if (active?.toUpperCase() !== 'TRUE') continue;

      total++;

      // ロール
      const role = row[22]?.trim();
      if (role === 'アルバイト') roleCounts['アルバイト']++;
      else if (role === '社員' || role === '管理者') roleCounts['社員']++;
      else roleCounts['業務委託']++;

      // 出身地
      const rawPref = row[7]?.trim();
      const prefecture = rawPref ? rawPref.replace(/[都道府県]$/, '') : '';
      if (prefecture) {
        prefectures[prefecture] = (prefectures[prefecture] || 0) + 1;
        const region = PREFECTURE_TO_REGION[prefecture] || '海外';
        regions[region] = (regions[region] || 0) + 1;
      }

      // 血液型
      const rawBlood = row[8]?.trim();
      const bloodType = rawBlood ? (rawBlood.endsWith('型') ? rawBlood : rawBlood + '型') : '';
      if (bloodType) bloodTypes[bloodType] = (bloodTypes[bloodType] || 0) + 1;

      // 動物占い（N列 = index 13）
      const animal = row[13]?.trim();
      if (animal) animalTypes[animal] = (animalTypes[animal] || 0) + 1;

      // 年齢（E列 = index 4）
      const age = calcAge(row[4]?.trim() ?? '');
      if (age !== null) {
        const bracket = ageBracket(age);
        ageBrackets[bracket] = (ageBrackets[bracket] || 0) + 1;
      }

      // 性別（AB列 = index 27）
      const gender = row[27]?.trim();
      if (gender === '男') genderMale++;
      else if (gender === '女') genderFemale++;
    }

    return NextResponse.json({
      prefectures, regions, bloodTypes, total, roleCounts,
      animalTypes, ageBrackets,
      genders: { male: genderMale, female: genderFemale },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
