import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateReservation, cancelReservation } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const { id } = await context.params;
    const reservationId = parseInt(id, 10);
    const body = await req.json();

    updateReservation(reservationId, {
      booker_name: body.booker_name,
      booker_phone: body.booker_phone,
      booker_batch: body.booker_batch,
      note: body.note,
      target_table_number: body.target_table_number ? Number(body.target_table_number) : undefined
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update reservation error:', err);
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
    const reservationId = parseInt(id, 10);
    cancelReservation(reservationId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Cancel reservation error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
