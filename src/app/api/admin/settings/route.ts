import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSettings, updateSetting } from '@/lib/db';
import { testLineConnection } from '@/lib/line';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const settings = getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const body = await req.json();

    if (body.action === 'test_line') {
      const result = await testLineConnection();
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.message || 'ส่งข้อความทดสอบ LINE ล้มเหลว' });
      }
      return NextResponse.json({ success: true, message: 'ส่งข้อความทดสอบเข้ากลุ่ม LINE เรียบร้อยแล้ว!' });
    }

    // Otherwise save settings
    if (body.settings && typeof body.settings === 'object') {
      for (const [key, val] of Object.entries(body.settings)) {
        updateSetting(key, String(val));
      }
    }

    return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
