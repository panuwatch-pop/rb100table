async function testLifecycle() {
  console.log('--- 1. Testing Create Reservation on Table 27 ---');
  const createRes = await fetch('http://localhost:3000/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_number: 27,
      booker_name: 'สมศักดิ์ ทดสอบระบบ',
      booker_phone: '0812345678',
      booker_batch: 'รุ่น 45',
      note: 'ทดสอบการจองและการลบแบบทันที'
    })
  });
  const createData = await createRes.json();
  const reservationId = createData.data?.table?.reservation_id || createData.data?.table?.reservation?.id;
  console.log('Create result:', createData.success, 'Reservation ID:', reservationId);

  if (!createData.success || !reservationId) {
    throw new Error('Create reservation failed: ' + JSON.stringify(createData));
  }

  console.log('\n--- 2. Checking Table 27 status in /api/tables ---');
  const tablesRes1 = await fetch(`http://localhost:3000/api/tables?t=${Date.now()}`);
  const tablesData1 = await tablesRes1.json();
  const table27Before = tablesData1.data.tables.find((t: any) => t.table_number === 27);
  console.log('Table 27 status:', table27Before.status, 'Booker:', table27Before.reservation?.booker_name);
  console.log('Stats:', tablesData1.data.stats);

  if (table27Before.status !== 'RESERVED') {
    throw new Error(`Expected RESERVED, got ${table27Before.status}`);
  }

  console.log('\n--- 3. Testing DELETE /api/reservations/' + reservationId + ' ---');
  const deleteRes = await fetch(`http://localhost:3000/api/reservations/${reservationId}`, {
    method: 'DELETE'
  });
  const deleteData = await deleteRes.json();
  console.log('Delete result:', deleteData);

  if (!deleteData.success) {
    throw new Error('Delete failed: ' + JSON.stringify(deleteData));
  }

  console.log('\n--- 4. Checking Table 27 status in /api/tables immediately after delete ---');
  const tablesRes2 = await fetch(`http://localhost:3000/api/tables?t=${Date.now()}`);
  const tablesData2 = await tablesRes2.json();
  const table27After = tablesData2.data.tables.find((t: any) => t.table_number === 27);
  console.log('Table 27 status after delete:', table27After.status, 'Reservation:', table27After.reservation);
  console.log('Stats after delete:', tablesData2.data.stats);

  if (table27After.status !== 'AVAILABLE' || table27After.reservation !== null) {
    throw new Error(`Expected AVAILABLE with null reservation, got ${table27After.status}`);
  }

  // Clean up table 25 & 26 if they were reserved in earlier test steps
  for (const num of [25, 26]) {
    const tbl = tablesData2.data.tables.find((t: any) => t.table_number === num);
    if (tbl && tbl.reservation) {
      console.log(`Cleaning up table ${num} from earlier test step...`);
      await fetch(`http://localhost:3000/api/reservations/${tbl.reservation.id}`, { method: 'DELETE' });
    }
  }

  console.log('\n SUCCESS: Reservation lifecycle (Create -> Check -> Delete -> Immediate Available) passed 100% perfectly!');
}

testLifecycle().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
