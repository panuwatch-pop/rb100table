import { getSettings } from './db';

interface BookingNotificationData {
  tableNumber: number;
  bookerName: string;
  bookerPhone: string;
  bookerBatch?: string | null;
  totalPrice: number;
  depositAmount: number;
  paymentStatus: 'unpaid' | 'deposit_paid' | 'fully_paid';
  note?: string | null;
}

interface PaymentNotificationData {
  tableNumber: number;
  bookerName: string;
  paymentStatus: 'unpaid' | 'deposit_paid' | 'fully_paid';
  depositPaid: number;
  remainingBalance: number;
}

export async function sendLineMessage(messages: any[]): Promise<{ success: boolean; message?: string }> {
  try {
    const settings = getSettings();
    const token = settings.line_channel_access_token;
    const groupId = settings.line_group_id;
    const isEnabled = settings.line_notify_enabled === 'true';

    if (!isEnabled || !token || !groupId) {
      return { success: false, message: 'LINE notifications are not enabled or credentials not configured' };
    }

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        to: groupId,
        messages: messages
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('LINE Push API error:', res.status, errText);
      return { success: false, message: `LINE API Error ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to send LINE notification:', err);
    return { success: false, message: err.message };
  }
}

export async function notifyNewBooking(data: BookingNotificationData) {
  const statusText =
    data.paymentStatus === 'fully_paid'
      ? 'ชำระเงินครบแล้ว (100%)'
      : data.paymentStatus === 'deposit_paid'
      ? 'ชำระค่ามัดจำเรียบร้อย'
      : 'รอชำระเงิน';

  const statusColor =
    data.paymentStatus === 'fully_paid'
      ? '#10b981'
      : data.paymentStatus === 'deposit_paid'
      ? '#f59e0b'
      : '#6b7280';

  const flexMessage = {
    type: 'flex',
    altText: `🔔 มีการจองโต๊ะใหม่: โต๊ะ ${data.tableNumber} (${data.bookerName})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1e3a8a',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: '🎉 มีการจองโต๊ะใหม่!',
            weight: 'bold',
            color: '#ffffff',
            size: 'md'
          },
          {
            type: 'text',
            text: `โต๊ะหมายเลข ${data.tableNumber}`,
            weight: 'bold',
            color: '#fbbf24',
            size: 'xxl',
            margin: 'sm'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '15px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '👤 ผู้จอง:', color: '#64748b', size: 'sm', flex: 3 },
              { type: 'text', text: data.bookerName, weight: 'bold', color: '#1e293b', size: 'sm', flex: 7 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '📞 เบอร์โทร:', color: '#64748b', size: 'sm', flex: 3 },
              { type: 'text', text: data.bookerPhone, color: '#1e293b', size: 'sm', flex: 7 }
            ]
          },
          ...(data.bookerBatch
            ? [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: '🎓 รุ่น/ห้อง:', color: '#64748b', size: 'sm', flex: 3 },
                    { type: 'text', text: data.bookerBatch, color: '#1e293b', size: 'sm', flex: 7 }
                  ]
                }
              ]
            : []),
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '💵 ค่าโต๊ะรวม:', color: '#64748b', size: 'sm', flex: 4 },
              { type: 'text', text: `${data.totalPrice.toLocaleString()} บาท`, weight: 'bold', color: '#1e293b', size: 'sm', flex: 6, align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '💳 ยอดมัดจำ:', color: '#64748b', size: 'sm', flex: 4 },
              { type: 'text', text: `${data.depositAmount.toLocaleString()} บาท`, weight: 'bold', color: '#0284c7', size: 'sm', flex: 6, align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: '📊 สถานะเงิน:', color: '#64748b', size: 'sm', flex: 4 },
              { type: 'text', text: statusText, weight: 'bold', color: statusColor, size: 'sm', flex: 6, align: 'end' }
            ]
          },
          ...(data.note
            ? [
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'md',
                  contents: [
                    { type: 'text', text: '📝 หมายเหตุ:', color: '#64748b', size: 'xs' },
                    { type: 'text', text: data.note, color: '#475569', size: 'xs', wrap: true }
                  ]
                }
              ]
            : [])
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'ระบบจองโต๊ะงานเลี้ยงรุ่น School Reunion',
            color: '#94a3b8',
            size: 'xxs',
            align: 'center'
          }
        ]
      }
    }
  };

  return sendLineMessage([flexMessage]);
}

export async function notifyPaymentUpdate(data: PaymentNotificationData) {
  const statusLabel =
    data.paymentStatus === 'fully_paid'
      ? '✅ ชำระเงินครบแล้ว (100%)'
      : data.paymentStatus === 'deposit_paid'
      ? '🟡 ชำระค่ามัดจำแล้ว'
      : '⚪ ยกเลิก/รอชำระเงิน';

  const statusColor =
    data.paymentStatus === 'fully_paid'
      ? '#10b981'
      : data.paymentStatus === 'deposit_paid'
      ? '#f59e0b'
      : '#6b7280';

  const flexMessage = {
    type: 'flex',
    altText: `💰 อัปเดตยอดเงินโต๊ะ ${data.tableNumber}: ${statusLabel}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0f766e',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: '💰 อัปเดตสถานะการชำระเงิน',
            weight: 'bold',
            color: '#ffffff',
            size: 'md'
          },
          {
            type: 'text',
            text: `โต๊ะหมายเลข ${data.tableNumber}`,
            weight: 'bold',
            color: '#a7f3d0',
            size: 'xxl',
            margin: 'sm'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '15px',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '👤 ผู้จอง:', color: '#64748b', size: 'sm', flex: 3 },
              { type: 'text', text: data.bookerName, weight: 'bold', color: '#1e293b', size: 'sm', flex: 7 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '📊 สถานะใหม่:', color: '#64748b', size: 'sm', flex: 4 },
              { type: 'text', text: statusLabel, weight: 'bold', color: statusColor, size: 'sm', flex: 6, align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '💵 ชำระแล้ว:', color: '#64748b', size: 'sm', flex: 4 },
              { type: 'text', text: `${data.depositPaid.toLocaleString()} บาท`, weight: 'bold', color: '#10b981', size: 'sm', flex: 6, align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '⏳ คงเหลือค้างชำระ:', color: '#64748b', size: 'sm', flex: 5 },
              { type: 'text', text: `${data.remainingBalance.toLocaleString()} บาท`, weight: 'bold', color: data.remainingBalance > 0 ? '#ef4444' : '#64748b', size: 'sm', flex: 5, align: 'end' }
            ]
          }
        ]
      }
    }
  };

  return sendLineMessage([flexMessage]);
}

export async function testLineConnection() {
  const textMessage = {
    type: 'text',
    text: '🔔 ทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE Group สำหรับงานเลี้ยงรุ่น สำเร็จเรียบร้อย! 🎉'
  };
  return sendLineMessage([textMessage]);
}
