async function liveVerify() {
  console.log('=== 1. VERIFY LIVE API /api/tables ===');
  const resTables = await fetch('http://localhost:3000/api/tables');
  const dataTables = await resTables.json();
  console.log('API /api/tables success:', dataTables.success, 'Total tables:', dataTables.data?.tables?.length);
  if (!dataTables.success || dataTables.data?.tables?.length !== 107) {
    throw new Error('Expected 107 tables from /api/tables');
  }

  console.log('\n=== 2. VERIFY ADMIN LOGIN & TABLE PRICE UPDATE ===');
  const loginRes = await fetch('http://localhost:3000/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'RB@100' })
  });
  const loginData = await loginRes.json();
  console.log('Admin login success:', loginData.success);
  const cookie = loginRes.headers.get('set-cookie');

  // Update table 10 price to 3500, deposit 1250
  const priceRes = await fetch('http://localhost:3000/api/admin/tables/price', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    },
    body: JSON.stringify({
      table_number: 10,
      price: 3500,
      deposit_amount: 1250
    })
  });
  const priceData = await priceRes.json();
  console.log('Admin price update response:', priceData);
  if (!priceData.success) {
    throw new Error('Admin price update failed: ' + JSON.stringify(priceData));
  }

  console.log('\n=== 3. VERIFY FLEXIBLE DEPOSIT BOOKING ON TABLE 10 ===');
  const bookRes = await fetch('http://localhost:3000/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_number: 10,
      booker_name: 'คุณสมศักดิ์ มัดจำยืดหยุ่น',
      booker_phone: '0812345678',
      booker_batch: 'รุ่น 45',
      payment_status: 'deposit_paid',
      deposit_amount: 1250
    })
  });
  const bookData = await bookRes.json();
  console.log('Booking response success:', bookData.success);
  const reservation = bookData.data?.table;
  console.log('Total Price:', reservation?.price);
  console.log('Deposit Paid:', reservation?.deposit_paid);
  console.log('Remaining Balance:', reservation?.remaining_balance);
  console.log('Deposit QR Present:', Boolean(bookData.data?.qr?.deposit));

  if (reservation?.deposit_paid !== 1250) {
    throw new Error(`Expected deposit_paid = 1250, got ${reservation?.deposit_paid}`);
  }
  if (reservation?.remaining_balance !== 2250) {
    throw new Error(`Expected remaining_balance = 2250, got ${reservation?.remaining_balance}`);
  }

  console.log('\n=== 4. CLEANUP: CANCEL RESERVATION & RESET TABLE 10 ===');
  const deleteRes = await fetch(`http://localhost:3000/api/reservations/${reservation.reservation_id}`, {
    method: 'DELETE'
  });
  const deleteData = await deleteRes.json();
  console.log('Delete reservation result:', deleteData.success);

  // Reset table 10 price back to standard 3000
  await fetch('http://localhost:3000/api/admin/tables/price', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    },
    body: JSON.stringify({
      table_number: 10,
      price: 3000,
      deposit_amount: 1000
    })
  });

  const checkTable10 = await (await fetch('http://localhost:3000/api/tables')).json();
  const t10 = checkTable10.data.tables.find((t: any) => t.table_number === 10);
  console.log(`Table 10 final status: ${t10.status}, price: ${t10.price}, deposit: ${t10.deposit_amount}`);

  if (t10.status !== 'AVAILABLE') {
    throw new Error('Table 10 is not available after cleanup');
  }

  console.log('\n LIVE END-TO-END VERIFICATION PASSED 100% PERFECTLY!');
}

liveVerify().catch(err => {
  console.error('Live Verification Failed:', err);
  process.exit(1);
});
