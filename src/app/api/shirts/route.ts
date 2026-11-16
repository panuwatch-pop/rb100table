import { NextRequest, NextResponse } from 'next/server';
import { getShirtTypes, createShirtOrder, getSettings, ShirtOrderItem } from '@/lib/db';
import { generatePromptPayQR } from '@/lib/promptpay';
import { notifyNewShirtOrder } from '@/lib/line';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shirtTypes = getShirtTypes();
    const settings = getSettings();

    return NextResponse.json({
      success: true,
      data: {
        shirt_types: shirtTypes,
        shipping_fee: parseInt(settings.shirt_shipping_fee || '50', 10),
        promptpay_number: settings.promptpay_number || '',
        promptpay_name: settings.promptpay_name || '',
        promptpay_bank: settings.promptpay_bank || 'ธนาคารกรุงไทย',
        promptpay_qr_image: settings.promptpay_qr_image || '/krungthai_qr.jpg'
      }
    });
  } catch (err: any) {
    console.error('GET /api/shirts error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, customer_phone, customer_batch, delivery_type, delivery_address, items, payment_status, slip_url, note } = body;

    if (!customer_name || !customer_phone) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกเสื้ออย่างน้อย 1 รายการ' }, { status: 400 });
    }

    if (delivery_type === 'delivery' && !delivery_address) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุที่อยู่สำหรับจัดส่งพัสดุ' }, { status: 400 });
    }

    const settings = getSettings();
    const shippingFee = parseInt(settings.shirt_shipping_fee || '50', 10);

    const order = createShirtOrder({
      customer_name,
      customer_phone,
      customer_batch,
      delivery_type: delivery_type || 'pickup',
      delivery_address,
      shipping_fee: shippingFee,
      items: items as ShirtOrderItem[],
      payment_status: payment_status || 'unpaid',
      slip_url,
      note
    });

    let qrCodeUrl = '';
    const promptpayTarget = settings.promptpay_number || '';
    if (promptpayTarget && order.total_price > 0 && payment_status === 'paid') {
      try {
        qrCodeUrl = await generatePromptPayQR(promptpayTarget, order.total_price);
      } catch (e) {
        console.error('QR generation error:', e);
      }
    }

    // Prepare items summary for LINE notification
    const itemsSummary = (items as ShirtOrderItem[])
      .map(it => `${it.shirt_name} (ไซส์ ${it.size} x ${it.quantity})`)
      .join(', ');

    // Send LINE Notification asynchronously
    notifyNewShirtOrder({
      orderCode: order.order_code,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerBatch: order.customer_batch,
      deliveryType: order.delivery_type,
      deliveryAddress: order.delivery_address,
      itemsSummary,
      totalQuantity: order.total_quantity,
      totalPrice: order.total_price,
      paymentStatus: order.payment_status
    }).catch(err => console.error('Background LINE notification error:', err));

    return NextResponse.json({
      success: true,
      message: 'บันทึกการสั่งจองเสื้อรุ่นเรียบร้อยแล้ว',
      data: {
        order,
        qr_code_url: qrCodeUrl
      }
    });
  } catch (err: any) {
    console.error('POST /api/shirts error:', err);
    return NextResponse.json({ success: false, error: err.message || 'บันทึกการสั่งจองไม่สำเร็จ' }, { status: 500 });
  }
}
