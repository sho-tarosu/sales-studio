import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SHEET_NAME = '出身地';

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
    let total = 0;

    // 1行目はヘッダーとしてスキップ
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[4]?.trim(); // E列: 名前
      if (!name) continue;

      total++;

      // 都/道/府/県 を除いた名前でマッピング
      const rawPref = row[10]?.trim(); // K列: 出身地
      const prefecture = rawPref ? rawPref.replace(/[都道府県]$/, '') : '';
      // 「型」をつけて統一（A→A型、A型→A型）
      const rawBlood = row[11]?.trim(); // L列: 血液型
      const bloodType = rawBlood ? (rawBlood.endsWith('型') ? rawBlood : rawBlood + '型') : '';

      if (prefecture) {
        prefectures[prefecture] = (prefectures[prefecture] || 0) + 1;
        const region = PREFECTURE_TO_REGION[prefecture] || '海外';
        regions[region] = (regions[region] || 0) + 1;
      }

      if (bloodType) {
        bloodTypes[bloodType] = (bloodTypes[bloodType] || 0) + 1;
      }
    }

    return NextResponse.json({ prefectures, regions, bloodTypes, total });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
