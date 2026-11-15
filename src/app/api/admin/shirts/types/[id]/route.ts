import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateShirtType, deleteShirtType } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = updateShirtType(Number(id), {
      name: body.name !== undefined ? body.name.trim() : undefined,
      description: body.description !== undefined ? body.description.trim() : undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
      image_front: body.image_front,
      image_back: body.image_back,
      is_active: body.is_active !== undefined ? Number(body.is_active) : undefined,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        shirt_type: updated
      }
    });
  } catch (err: any) {
    console.error('PATCH /api/admin/shirts/types/[id] error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const { id } = await params;
    deleteShirtType(Number(id));

    return NextResponse.json({
      success: true,
      message: `ลบแบบเสื้อ #${id} เรียบร้อยแล้ว`
    });
  } catch (err: any) {
    console.error('DELETE /api/admin/shirts/types/[id] error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
