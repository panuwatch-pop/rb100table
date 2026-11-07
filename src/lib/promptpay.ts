import QRCode from 'qrcode';

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePromptPayPayload(target: string, amount?: number): string {
  // Normalize phone number (e.g. 0812345678 -> 0066812345678)
  const cleaned = target.replace(/[^0-9]/g, '');
  let formattedTarget = cleaned;
  let targetType = '01'; // 01 for mobile, 02 for national ID / tax ID

  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    formattedTarget = `0066${cleaned.substring(1)}`;
    targetType = '01';
  } else if (cleaned.length === 13) {
    formattedTarget = cleaned;
    targetType = '02';
  }

  const sub00 = formatField('00', 'A0000001770104011001');
  const sub01 = formatField(targetType, formattedTarget);
  const field29 = formatField('29', sub00 + sub01);

  let raw =
    formatField('00', '01') +
    formatField('01', amount ? '12' : '11') +
    field29 +
    formatField('53', '764') +
    formatField('58', 'TH');

  if (amount && amount > 0) {
    raw += formatField('54', amount.toFixed(2));
  }

  const withCheckField = raw + '6304';
  const checksum = crc16(withCheckField);
  return withCheckField + checksum;
}

export async function generatePromptPayQR(target: string, amount?: number): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    }
  });
}
