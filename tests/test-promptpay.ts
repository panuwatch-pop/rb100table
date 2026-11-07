import { generatePromptPayPayload, generatePromptPayQR } from '../src/lib/promptpay';

async function main() {
  console.log('Testing PromptPay generator...');
  const payload = generatePromptPayPayload('0812345678', 1000);
  console.log('Payload generated:', payload);
  if (!payload.startsWith('000201')) {
    throw new Error('Invalid EMVCo payload format');
  }

  const qrDataUrl = await generatePromptPayQR('0812345678', 1000);
  console.log('QR Code generated. Length:', qrDataUrl.length);
  if (!qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Invalid QR Data URL format');
  }

  console.log('✅ PromptPay generator test passed!');
}

main().catch(err => {
  console.error('PromptPay test failed:', err);
  process.exit(1);
});
