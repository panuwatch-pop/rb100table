import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, createShirtOrder, ShirtOrderItem } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const cleanText = text.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = (values[idx] || '').trim();
      });
      rows.push(row);
    }
  }

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ CSV ที่อัปโหลด' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไฟล์ CSV ไม่มีข้อมูล หรือรูปแบบไม่ถูกต้อง' }, { status: 400 });
    }

    const db = getDb();
    let importedCount = 0;
    const errors: string[] = [];

    // Map rows to shirt orders
    for (const r of rows) {
      try {
        const customerName = r['ชื่อผู้สั่งจอง'] || r['ชื่อ'] || r['customer_name'] || r['ชื่อผู้จอง'] || '';
        const customerPhone = r['เบอร์โทรศัพท์'] || r['เบอร์โทร'] || r['customer_phone'] || r['เบอร์'] || '';
        const customerBatch = r['รุ่น/ห้อง'] || r['รุ่น'] || r['ห้อง'] || r['customer_batch'] || '';
        const deliveryType = (r['การจัดส่ง'] || r['delivery_type'] || '').includes('จัดส่ง') ? 'delivery' : 'pickup';
        const deliveryAddress = r['ที่อยู่จัดส่ง'] || r['ที่อยู่'] || r['delivery_address'] || '';
        const paymentStatusRaw = r['สถานะชำระเงิน'] || r['การชำระเงิน'] || r['payment_status'] || '';
        const paymentStatus = (paymentStatusRaw.includes('ชำระแล้ว') || paymentStatusRaw.includes('paid') || paymentStatusRaw.includes('ครบ')) ? 'paid' : 'unpaid';
        const note = r['หมายเหตุ'] || r['note'] || '';

        if (!customerName || !customerPhone) {
          continue;
        }

        // Parse items
        // Could be "รายการเสื้อ": "เสื้อโปโล (L) x2, เสื้อยืด (XL) x1"
        // Or individual columns "แบบเสื้อ", "ไซส์", "จำนวน"
        const itemsStr = r['รายการเสื้อ'] || r['รายการ'] || r['items'] || '';
        const shirtModel = r['แบบเสื้อ'] || r['ชนิดเสื้อ'] || 'เสื้อโปโล คืนสู่เหย้า 100 ปี (Polo Premium)';
        const size = r['ไซส์'] || r['ขนาด'] || 'L';
        const qty = parseInt(r['จำนวน'] || '1', 10) || 1;
        const price = parseInt(r['ราคา'] || r['ยอดรวม(บาท)'] || r['ยอดรวม'] || '300', 10) || (qty * 300);

        const items: ShirtOrderItem[] = [];
        if (itemsStr) {
          // Parse format "Shirt Name (Size) xQty"
          const parts = itemsStr.split(/,\s*/);
          for (const p of parts) {
            const m = p.match(/(.*?)\s*\((.*?)\)\s*x(\d+)/);
            if (m) {
              const pName = m[1].trim();
              const pSize = m[2].trim();
              const pQty = parseInt(m[3], 10) || 1;
              items.push({
                shirt_type_id: pName.includes('ยืด') ? 2 : 1,
                shirt_name: pName,
                size: pSize,
                quantity: pQty,
                unit_price: 300,
                subtotal: pQty * 300
              });
            }
          }
        }

        if (items.length === 0) {
          items.push({
            shirt_type_id: shirtModel.includes('ยืด') ? 2 : 1,
            shirt_name: shirtModel,
            size: size,
            quantity: qty,
            unit_price: 300,
            subtotal: qty * 300
          });
        }

        createShirtOrder({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_batch: customerBatch,
          delivery_type: deliveryType as 'pickup' | 'delivery',
          delivery_address: deliveryAddress,
          shipping_fee: deliveryType === 'delivery' ? 50 : 0,
          items,
          payment_status: paymentStatus as 'unpaid' | 'paid',
          note
        });

        importedCount++;
      } catch (err: any) {
        errors.push(`แถวที่ ${importedCount + 1}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าออเดอร์เสื้อสำเร็จ ${importedCount} รายการ`,
      imported_count: importedCount,
      errors: errors.slice(0, 5)
    });
  } catch (err: any) {
    console.error('Import shirt CSV error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
