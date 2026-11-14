import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getAllShirtOrders, getShirtOrderSummary } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const orders = getAllShirtOrders();
    const summary = getShirtOrderSummary();

    return NextResponse.json({
      success: true,
      data: {
        orders,
        summary
      }
    });
  } catch (err: any) {
    console.error('GET /api/admin/shirts/orders error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
