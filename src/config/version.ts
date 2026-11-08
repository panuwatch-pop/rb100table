export const APP_VERSION = 'v1.1.0';
export const APP_RELEASE_DATE = '2026-11-08';

export interface VersionHistoryItem {
  version: string;
  date: string;
  changes: string[];
}

export const VERSION_HISTORY: VersionHistoryItem[] = [
  {
    version: 'v1.1.0',
    date: '2026-11-08',
    changes: [
      'เปลี่ยนรหัสผ่านแอดมินเป็น RB@100 พร้อมซ่อนการแสดงรหัสผ่านในหน้าจอเข้าสู่ระบบ',
      'เพิ่มช่องตัวเลือกจองแบบยังไม่ได้จ่ายมัดจำ (0 บาท - ชำระภายหลัง)',
      'เพิ่มฟังก์ชันให้แอดมินยกเลิกการจองโต๊ะและคืนสถานะโต๊ะว่างได้ทันที',
      'แสดงหมายเลขเวอร์ชันของระบบที่หัวเว็บ (Header / Navbar)',
      'เพิ่มฟังก์ชันจดจำการเข้าสู่ระบบแอดมิน (Remember Admin Session)',
      'ปรับปรุงการซิงค์ไฟล์ CSS และการแตะ Pin บนแผนผัง'
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-11-07',
    changes: [
      'เปิดตัวระบบจองโต๊ะงานเลี้ยงรุ่น ผังโต๊ะ 107 โต๊ะ',
      'รองรับการชำระเงินมัดจำและการชำระเต็มจำนวนพร้อม PromptPay QR Code',
      'ระบบแจ้งเตือนเข้ากลุ่ม LINE อัตโนมัติ',
      'แผงควบคุมผู้ดูแลระบบ (Admin Portal)'
    ]
  }
];
