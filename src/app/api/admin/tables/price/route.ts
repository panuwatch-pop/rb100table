import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateTablePrice, updateAllAvailableTablesPrice } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบแอดมิน' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { table_number, price, deposit_amount, apply_to_all_available } = body;

    const parsedPrice = Number(price);
    if (!parsedPrice || parsedPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุราคาโต๊ะที่ถูกต้อง (มากกว่า 0 บาท)' },
        { status: 400 }
      );
    }

    const parsedDeposit = deposit_amount !== undefined && Number(deposit_amount) > 0
      ? Number(deposit_amount)
      : undefined;

    // Bulk update all available tables
    if (apply_to_all_available) {
      const result = updateAllAvailableTablesPrice(parsedPrice, parsedDeposit);
      return NextResponse.json({
        success: true,
        message: `อัปเดตราคาโต๊ะว่างทั้งหมด ${result.updated_count} โต๊ะ เป็น ${parsedPrice.toLocaleString()} บาท เรียบร้อยแล้ว`,
        data: result
      });
    }

    // Update single table
    if (!table_number) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเลขโต๊ะที่ต้องการเปลี่ยนราคา' },
        { status: 400 }
      );
    }

    const updatedTable = updateTablePrice(Number(table_number), parsedPrice, parsedDeposit);
    return NextResponse.json({
      success: true,
      message: `อัปเดตราคาโต๊ะหมายเลข ${table_number} เป็น ${parsedPrice.toLocaleString()} บาท เรียบร้อยแล้ว`,
      data: { table: updatedTable }
    });
  } catch (err: any) {
    console.error('API /api/admin/tables/price error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการปรับราคาโต๊ะ' },
      { status: 500 }
    );
  }
}
