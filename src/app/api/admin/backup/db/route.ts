import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDbPath } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ฐานข้อมูล' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `reunion-backup-${dateStr}.db`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (err: any) {
    console.error('GET /api/admin/backup/db error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
