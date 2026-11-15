import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getAllShirtTypesAdmin, createShirtType } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const shirtTypes = getAllShirtTypesAdmin();
    return NextResponse.json({
      success: true,
      data: {
        shirt_types: shirtTypes
      }
    });
  } catch (err: any) {
    console.error('GET /api/admin/shirts/types error:', err);
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
    if (!body.name || !body.price) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุชื่อแบบเสื้อและราคา' }, { status: 400 });
    }

    const created = createShirtType({
      name: body.name.trim(),
      description: body.description ? body.description.trim() : '',
      price: Number(body.price),
      image_front: body.image_front || '/shirt_polo_front.svg',
      image_back: body.image_back || '/shirt_polo_back.svg',
      is_active: body.is_active !== undefined ? Number(body.is_active) : 1
    });

    return NextResponse.json({
      success: true,
      data: {
        shirt_type: created
      }
    });
  } catch (err: any) {
    console.error('POST /api/admin/shirts/types error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
