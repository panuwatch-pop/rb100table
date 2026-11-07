import { 
  getTableByNumber, 
  createReservation, 
  cancelReservation 
} from '../src/lib/db';
import { generatePromptPayQR } from '../src/lib/promptpay';

async function runTest() {
  console.log('=== TEST 1: Flexible Custom Deposit Reservation ===');
  const targetTableNum = 42;
  const initialTable = getTableByNumber(targetTableNum);
  if (!initialTable || initialTable.status !== 'AVAILABLE') {
    throw new Error(`Table ${targetTableNum} is not available for testing`);
  }

  const customDepositAmount = 750; // Custom flexible deposit amount!
  console.log(`Booking Table ${targetTableNum} (Price: ${initialTable.price} THB) with custom deposit: ${customDepositAmount} THB`);

  const bookedTable = createReservation({
    table_number: targetTableNum,
    booker_name: 'นายทดสอบ มัดจำอิสระ',
    booker_phone: '0899999999',
    booker_batch: 'รุ่น 50',
    payment_status: 'deposit_paid',
    deposit_amount: customDepositAmount
  });

  console.log('Booked Table Status:', bookedTable?.status);
  console.log('Deposit Paid:', bookedTable?.deposit_paid);
  console.log('Remaining Balance:', bookedTable?.remaining_balance);

  if (bookedTable?.deposit_paid !== customDepositAmount) {
    throw new Error(`Expected deposit_paid = ${customDepositAmount}, got ${bookedTable?.deposit_paid}`);
  }

  const expectedRemaining = bookedTable.price - customDepositAmount;
  if (bookedTable?.remaining_balance !== expectedRemaining) {
    throw new Error(`Expected remaining_balance = ${expectedRemaining}, got ${bookedTable?.remaining_balance}`);
  }
  console.log(' Flexible Deposit DB Record passed!');

  console.log('\n=== TEST 2: PromptPay QR generation for exact custom deposit ===');
  const qr = await generatePromptPayQR('0812345678', customDepositAmount);
  if (!qr.startsWith('data:image/png;base64,')) {
    throw new Error('QR generation for custom deposit failed');
  }
  console.log(' Custom deposit QR generation passed! Length =', qr.length);

  console.log('\n=== Cleanup: Canceling test reservation ===');
  if (bookedTable.reservation_id) {
    cancelReservation(bookedTable.reservation_id);
  }
  const restoredTable = getTableByNumber(targetTableNum);
  console.log(`Table ${targetTableNum} Restored Status:`, restoredTable?.status);

  if (restoredTable?.status !== 'AVAILABLE') {
    throw new Error('Table did not return to AVAILABLE');
  }

  console.log('\n ALL FLEXIBLE DEPOSIT TESTS PASSED (100%)');
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
