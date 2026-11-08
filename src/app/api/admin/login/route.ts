import { NextRequest, NextResponse } from 'next/server';
import { getDb, verifyPassword } from '@/lib/db';
import { createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const db = getDb();
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return NextResponse.json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const token = createSessionToken(admin.username);

    const response = NextResponse.json({
      success: true,
      user: {
        username: admin.username,
        display_name: admin.display_name,
        role: admin.role
      }
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: false, // Allow admin login even if SSL certificate is self-signed / temporary
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (err: any) {
    console.error('Admin login error:', err);
    return NextResponse.json({ success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' }, { status: 500 });
  }
}
