import { NextResponse } from 'next/server';
import { getAllTables, getDashboardStats, getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const tables = getAllTables();
    const stats = getDashboardStats();
    const settings = getSettings();

    return NextResponse.json(
      {
        success: true,
        data: {
          tables,
          stats,
          settings: {
            event_title: settings.event_title || 'งานเลี้ยงรุ่นคืนสู่เหย้า ประจำปี',
            event_subtitle: settings.event_subtitle || 'ผังโต๊ะและการจองโต๊ะเข้าร่วมงาน',
            promptpay_number: settings.promptpay_number || '',
            promptpay_name: settings.promptpay_name || '',
            promptpay_bank: settings.promptpay_bank || 'ธนาคารกรุงไทย',
            promptpay_qr_image: settings.promptpay_qr_image || '/krungthai_qr.jpg',
            table_default_price: parseInt(settings.table_default_price || '3000', 10),
            table_default_deposit: parseInt(settings.table_default_deposit || '1000', 10)
          }
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (err: any) {
    console.error('API /api/tables error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
