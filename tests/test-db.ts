import { 
  getDb, 
  getAllTables, 
  getTableByNumber, 
  createReservation, 
  updatePaymentStatus, 
  updateReservation, 
  cancelReservation, 
  getDashboardStats, 
  verifyPassword,
  getSettings 
} from '../src/lib/db';

async function runTests() {
  console.log('🧪 Starting TEST for BUILD Part 1 (Database & Schema)...');

  // Clean up any previous test state
  const db = getDb();
  db.prepare("UPDATE tables SET status = 'AVAILABLE' WHERE table_number = 5").run();
  db.prepare("DELETE FROM reservations WHERE table_id = (SELECT id FROM tables WHERE table_number = 5)").run();

  // 1. Verify DB initialization and table count
  const tables = getAllTables();
  console.log(`✅ Loaded ${tables.length} tables from SQLite.`);
  if (tables.length !== 107) {
    throw new Error(`Expected 107 tables, got ${tables.length}`);
  }

  // 2. Verify Table 1 and Table 107
  const t1 = getTableByNumber(1);
  if (!t1 || t1.row_label !== 'A' || t1.col_index !== 1) {
    throw new Error(`Table 1 metadata mismatch: ${JSON.stringify(t1)}`);
  }
  console.log('✅ Table 1 metadata verified (Row A, Col 1, 3000 THB, Deposit 1000 THB)');

  const t107 = getTableByNumber(107);
  if (!t107 || t107.table_number !== 107) {
    throw new Error(`Table 107 metadata mismatch: ${JSON.stringify(t107)}`);
  }
  console.log('✅ Table 107 metadata verified (Extra table, 3000 THB)');

  // 3. Test Admin authentication
  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin') as any;
  if (!admin || !verifyPassword('admin1234', admin.password_hash)) {
    throw new Error('Admin password verification failed');
  }
  console.log('✅ Admin credentials and password hashing verified');

  // 4. Test Settings
  const settings = getSettings();
  if (!settings.event_title || !settings.promptpay_number) {
    throw new Error('Settings verification failed');
  }
  console.log(`✅ Settings loaded: "${settings.event_title}", PromptPay: ${settings.promptpay_number}`);

  // 5. Test Reservation creation
  console.log('Testing reservation flow for Table 5...');
  const reservedT5 = createReservation({
    table_number: 5,
    booker_name: 'สมชาย ใจดี',
    booker_phone: '0891234567',
    booker_batch: 'ม.6/1 รุ่น 45',
    note: 'ขอเก้าอี้เสริม 2 ตัว',
    payment_status: 'deposit_paid'
  });

  if (!reservedT5 || reservedT5.status !== 'RESERVED' || reservedT5.booker_name !== 'สมชาย ใจดี') {
    throw new Error('Reservation creation failed');
  }
  console.log('✅ Reservation created for Table 5 with status RESERVED');

  // 6. Test Prevent Double Booking
  try {
    createReservation({
      table_number: 5,
      booker_name: 'สมหญิง รักสงบ',
      booker_phone: '0819999999'
    });
    throw new Error('Double booking should have failed but succeeded!');
  } catch (err: any) {
    console.log('✅ Anti-double booking successfully prevented concurrent reservation:', err.message);
  }

  // 7. Test Payment update to fully_paid
  console.log('Testing payment update to fully_paid...');
  const fullyPaidT5 = updatePaymentStatus(5, 'fully_paid');
  if (!fullyPaidT5 || fullyPaidT5.status !== 'PAID' || fullyPaidT5.payment_status !== 'fully_paid') {
    throw new Error('Payment status update to fully_paid failed');
  }
  console.log('✅ Payment status updated to fully_paid, Table 5 status is now PAID');

  // 8. Test Dashboard Stats
  const stats = getDashboardStats();
  console.log('✅ Dashboard Stats:', stats);
  if (stats.paid_tables < 1 || stats.available_tables !== 106) {
    throw new Error(`Stats mismatch: ${JSON.stringify(stats)}`);
  }

  // 9. Clean up test reservation
  if (fullyPaidT5.reservation_id) {
    cancelReservation(fullyPaidT5.reservation_id);
    const restoredT5 = getTableByNumber(5);
    if (!restoredT5 || restoredT5.status !== 'AVAILABLE') {
      throw new Error('Cancellation failed to restore table status to AVAILABLE');
    }
    console.log('✅ Reservation cancelled and Table 5 successfully restored to AVAILABLE');
  }

  console.log('\n🎉 ALL TESTS PASSED FOR BUILD PART 1!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
