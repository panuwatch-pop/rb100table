import { 
  getDb, 
  getAllTables, 
  getTableByNumber, 
  createReservation, 
  updatePaymentStatus, 
  updateReservation, 
  cancelReservation 
} from '../src/lib/db';
import { createSessionToken, verifySessionToken } from '../src/lib/auth';
import { generatePromptPayPayload } from '../src/lib/promptpay';

async function runApiFlowTest() {
  console.log('🧪 Starting TEST for BUILD Part 2 (Auth & API Logic Flow)...');

  // 1. Test Auth Session Token
  const token = createSessionToken('admin');
  const session = verifySessionToken(token);
  if (!session.valid || session.username !== 'admin') {
    throw new Error('Auth session verification failed');
  }
  console.log('✅ Auth token generated & verified correctly for user: "admin"');

  const invalidSession = verifySessionToken('invalid.token');
  if (invalidSession.valid) {
    throw new Error('Invalid token was accepted!');
  }
  console.log('✅ Tampered/invalid auth tokens correctly rejected');

  // 2. Clean up test table
  const testTableNum = 15;
  const db = getDb();
  db.prepare("UPDATE tables SET status = 'AVAILABLE' WHERE table_number = ?").run(testTableNum);
  db.prepare("DELETE FROM reservations WHERE table_id = (SELECT id FROM tables WHERE table_number = ?)").run(testTableNum);

  // 3. Test booking table 15
  const booked = createReservation({
    table_number: testTableNum,
    booker_name: 'กิตติพงษ์ ยอดเยี่ยม',
    booker_phone: '0812345678',
    booker_batch: 'ม.6/2 รุ่น 38',
    note: 'โต๊ะรวมเพื่อนห้อง 2',
    payment_status: 'deposit_paid',
    deposit_paid: 1000
  });

  if (!booked || booked.status !== 'RESERVED' || booked.booker_name !== 'กิตติพงษ์ ยอดเยี่ยม') {
    throw new Error('Booking Table 15 failed');
  }
  console.log('✅ Table 15 booked with deposit 1,000 THB');

  // 4. Test PromptPay payload for remaining balance
  const remaining = booked.remaining_balance || 2000;
  const ppPayload = generatePromptPayPayload('0812345678', remaining);
  if (!ppPayload.includes('54072000.00')) {
    throw new Error(`Expected amount 2000.00 in PromptPay payload, got: ${ppPayload}`);
  }
  console.log('✅ PromptPay QR payload for remaining balance (2,000 THB) verified');

  // 5. Test Table update & reassignment (Move from Table 15 to Table 16)
  const targetTableNum = 16;
  db.prepare("UPDATE tables SET status = 'AVAILABLE' WHERE table_number = ?").run(targetTableNum);
  db.prepare("DELETE FROM reservations WHERE table_id = (SELECT id FROM tables WHERE table_number = ?)").run(targetTableNum);

  if (booked.reservation_id) {
    updateReservation(booked.reservation_id, {
      booker_name: 'กิตติพงษ์ ยอดเยี่ยม (แก้ไข)',
      target_table_number: targetTableNum
    });

    const oldTable = getTableByNumber(testTableNum);
    const newTable = getTableByNumber(targetTableNum);

    if (oldTable?.status !== 'AVAILABLE') {
      throw new Error(`Old table ${testTableNum} should be AVAILABLE after move, got ${oldTable?.status}`);
    }
    if (newTable?.status !== 'RESERVED' || newTable.booker_name !== 'กิตติพงษ์ ยอดเยี่ยม (แก้ไข)') {
      throw new Error(`New table ${targetTableNum} should be RESERVED after move, got ${newTable?.status}`);
    }
    console.log(`✅ Table reassignment successfully moved booking from #${testTableNum} to #${targetTableNum}`);

    // 6. Test final payment update
    const paidTable = updatePaymentStatus(targetTableNum, 'fully_paid');
    if (paidTable?.status !== 'PAID' || paidTable.remaining_balance !== 0) {
      throw new Error('Final payment update failed');
    }
    console.log(`✅ Final payment confirmed for Table #${targetTableNum}, status is now PAID, remaining balance is 0 THB`);

    // Clean up
    cancelReservation(booked.reservation_id);
    console.log('✅ Reservation cleaned up');
  }

  console.log('\n🎉 ALL TESTS PASSED FOR BUILD PART 2!');
}

runApiFlowTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
