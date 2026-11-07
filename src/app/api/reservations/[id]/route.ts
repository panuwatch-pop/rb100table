import { NextRequest, NextResponse } from 'next/server';
import { updateReservation, cancelReservation, updatePaymentStatus, getTableByNumber } from '@/lib/db';
import { notifyPaymentUpdate } from '@/lib/line';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    // If payment status update is also requested
    if (body.table_number && body.payment_status) {
      updatePaymentStatus(Number(body.table_number), body.payment_status, {
        depositPaid: body.deposit_paid !== undefined ? Number(body.deposit_paid) : undefined,
        remainingBalance: body.remaining_balance !== undefined ? Number(body.remaining_balance) : undefined
      });
    }

    return NextResponse.json({ success: true, message: 'บันทึกการแก้ไขเรียบร้อยแล้ว' });
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
    const { id } = await context.params;
    const reservationId = parseInt(id, 10);
    
    cancelReservation(reservationId);

    return NextResponse.json({ success: true, message: 'ยกเลิกและลบการจองเรียบร้อยแล้ว โต๊ะกลับมาว่างทันที' });
  } catch (err: any) {
    console.error('Cancel reservation error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { table_number, payment_status, deposit_paid, remaining_balance } = body;

    if (!table_number || !payment_status) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const updatedTable = updatePaymentStatus(Number(table_number), payment_status, {
      depositPaid: deposit_paid !== undefined ? Number(deposit_paid) : undefined,
      remainingBalance: remaining_balance !== undefined ? Number(remaining_balance) : undefined
    });

    if (updatedTable && updatedTable.booker_name) {
      notifyPaymentUpdate({
        tableNumber: updatedTable.table_number,
        bookerName: updatedTable.booker_name,
        paymentStatus: payment_status,
        depositPaid: updatedTable.deposit_paid || 0,
        remainingBalance: updatedTable.remaining_balance || 0
      }).catch(err => console.error('Background LINE notification error:', err));
    }

    return NextResponse.json({ success: true, data: updatedTable });
  } catch (err: any) {
    console.error('Update payment status error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
