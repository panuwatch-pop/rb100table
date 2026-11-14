import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateShirtOrderStatus, cancelShirtOrder } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const { id } = await context.params;
    const orderId = parseInt(id, 10);
    const body = await req.json();

    const updated = updateShirtOrderStatus(orderId, {
      payment_status: body.payment_status,
      order_status: body.order_status
    });

    return NextResponse.json({ success: true, message: 'อัปเดตสถานะออเดอร์เรียบร้อยแล้ว', data: updated });
  } catch (err: any) {
    console.error('PATCH /api/admin/shirts/orders/[id] error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const { id } = await context.params;
    const orderId = parseInt(id, 10);

    cancelShirtOrder(orderId);

    return NextResponse.json({ success: true, message: 'ยกเลิกออเดอร์เสื้อเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error('DELETE /api/admin/shirts/orders/[id] error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
