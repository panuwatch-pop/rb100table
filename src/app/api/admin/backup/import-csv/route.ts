import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseCSV(text: string): Record<string, string>[] {
  const cleanText = text.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx].trim();
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ CSV' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไฟล์ CSV ว่างเปล่าหรือไม่ถูกต้อง' }, { status: 400 });
    }

    const db = getDb();
    let restoredCount = 0;

    db.exec('BEGIN TRANSACTION');
    try {
      for (const r of rows) {
        const tableNumStr = r['หมายเลขโต๊ะ'] || r['table_number'];
        const statusStr = r['สถานะ'] || r['status'];
        const bookerName = r['ชื่อผู้จอง'] || r['booker_name'];

        if (!tableNumStr || !bookerName || statusStr === 'ว่าง' || statusStr === 'AVAILABLE') {
          continue;
        }

        const tableNum = parseInt(tableNumStr, 10);
        const tRow = db.prepare('SELECT id FROM tables WHERE table_number = ?').get(tableNum) as { id: number } | undefined;
        if (!tRow) continue;

        const tableId = tRow.id;
        const bookerPhone = r['เบอร์โทร'] || r['booker_phone'] || '';
        const bookerBatch = r['รุ่น/ห้อง'] || r['booker_batch'] || '';
        const note = r['หมายเหตุ'] || r['note'] || '';
        const totalPrice = parseInt(r['ยอดค่าโต๊ะ'] || '8000', 10) || 8000;
        const depositPaid = parseInt(r['มัดจำที่ชำระแล้ว'] || '0', 10) || 0;
        const remainingBalance = parseInt(r['คงเหลือค้างชำระ'] || String(totalPrice - depositPaid), 10);
        const paymentStatus = r['สถานะการชำระ'] || (statusStr === 'ชำระครบ' ? 'fully_paid' : 'unpaid');
        const createdAt = r['วันที่จอง'] || new Date().toISOString();
        const depositRequired = depositPaid > 0 ? depositPaid : 1000;

        // Delete existing reservation for this table to prevent duplicates
        db.prepare('DELETE FROM reservations WHERE table_id = ?').run(tableId);

        // Insert restored reservation
        db.prepare(`
          INSERT INTO reservations (
            table_id, booker_name, booker_phone, booker_batch, note,
            total_price, deposit_required, deposit_paid, remaining_balance,
            payment_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          tableId, bookerName, bookerPhone, bookerBatch, note,
          totalPrice, depositRequired, depositPaid, remainingBalance,
          paymentStatus, createdAt, createdAt
        );

        // Update table status
        const tableStatus = paymentStatus === 'fully_paid' ? 'PAID' : 'RESERVED';
        db.prepare(`
          UPDATE tables 
          SET status = ?, price = ?, updated_at = ?
          WHERE id = ?
        `).run(tableStatus, totalPrice, createdAt, tableId);

        restoredCount++;
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าและกู้คืนข้อมูลการจองสำเร็จทั้งหมด ${restoredCount} โต๊ะ`,
      restored_count: restoredCount
    });
  } catch (err: any) {
    console.error('POST /api/admin/backup/import-csv error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
