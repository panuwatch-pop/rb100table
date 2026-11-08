import { NextRequest, NextResponse } from 'next/server';
import { createReservation, getSettings, getTableByNumber } from '@/lib/db';
import { generatePromptPayQR } from '@/lib/promptpay';
import { notifyNewBooking } from '@/lib/line';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { table_number, booker_name, booker_phone, booker_batch, note, payment_status, slip_url, deposit_amount } = body;

    if (!table_number || !booker_name || !booker_phone) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเลขโต๊ะ ชื่อผู้จอง และเบอร์โทรศัพท์ให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const table = getTableByNumber(Number(table_number));
    if (!table) {
      return NextResponse.json(
        { success: false, error: `ไม่พบโต๊ะหมายเลข ${table_number}` },
        { status: 404 }
      );
    }

    if (table.status !== 'AVAILABLE') {
      return NextResponse.json(
        { success: false, error: `โต๊ะหมายเลข ${table_number} มีการจองแล้ว กรุณาเลือกโต๊ะอื่น` },
        { status: 409 }
      );
    }

    // Flexible deposit amount
    const isUnpaid = payment_status === 'unpaid';
    const parsedDeposit = isUnpaid
      ? 0
      : (deposit_amount !== undefined && Number(deposit_amount) > 0)
        ? Math.min(Number(deposit_amount), table.price)
        : table.deposit_amount;

    const updatedTable = createReservation({
      table_number: Number(table_number),
      booker_name: booker_name.trim(),
      booker_phone: booker_phone.trim(),
      booker_batch: booker_batch ? booker_batch.trim() : undefined,
      note: note ? note.trim() : undefined,
      payment_status: payment_status || 'unpaid',
      deposit_amount: parsedDeposit,
      deposit_paid: isUnpaid ? 0 : undefined,
      slip_url: slip_url || undefined
    });

    const settings = getSettings();
    const promptpayTarget = settings.promptpay_number || '';
    let depositQR = '';
    let fullQR = '';

    if (promptpayTarget && !isUnpaid) {
      depositQR = await generatePromptPayQR(promptpayTarget, parsedDeposit || table.deposit_amount);
      fullQR = await generatePromptPayQR(promptpayTarget, table.price);
    }

    // Send LINE Notification asynchronously (non-blocking)
    notifyNewBooking({
      tableNumber: Number(table_number),
      bookerName: booker_name.trim(),
      bookerPhone: booker_phone.trim(),
      bookerBatch: booker_batch ? booker_batch.trim() : null,
      totalPrice: table.price,
      depositAmount: parsedDeposit,
      paymentStatus: payment_status || 'unpaid',
      note: note ? note.trim() : null
    }).catch(err => console.error('Background LINE notification error:', err));

    return NextResponse.json({
      success: true,
      data: {
        table: updatedTable,
        deposit_required: parsedDeposit,
        qr: {
          deposit: depositQR,
          full: fullQR,
          promptpay_target: promptpayTarget,
          promptpay_name: settings.promptpay_name || ''
        }
      }
    });
  } catch (err: any) {
    console.error('API /api/reservations POST error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการจองโต๊ะ' },
      { status: 500 }
    );
  }
}
