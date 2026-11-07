import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updatePaymentStatus, getTableByNumber } from '@/lib/db';
import { notifyPaymentUpdate } from '@/lib/line';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

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
