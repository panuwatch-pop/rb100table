import { 
  getDb, 
  getTableByNumber, 
  updateTablePrice, 
  updateAllAvailableTablesPrice, 
  getAllTables 
} from '../src/lib/db';

async function runTest() {
  console.log('=== TEST 1: Single Table Price Update ===');
  const initialT1 = getTableByNumber(1);
  console.log(`Table 1 Initial: Price = ${initialT1?.price}, Deposit = ${initialT1?.deposit_amount}`);

  const updatedT1 = updateTablePrice(1, 4500, 1500);
  console.log(`Table 1 After update: Price = ${updatedT1?.price}, Deposit = ${updatedT1?.deposit_amount}`);

  if (updatedT1?.price !== 4500 || updatedT1?.deposit_amount !== 1500) {
    throw new Error(`Expected price 4500 and deposit 1500, got price ${updatedT1?.price}, deposit ${updatedT1?.deposit_amount}`);
  }
  console.log(' Single Table Price Update passed!');

  console.log('\n=== TEST 2: Bulk Update All Available Tables ===');
  const bulkResult = updateAllAvailableTablesPrice(3200, 800);
  console.log(`Bulk update result: ${bulkResult.updated_count} tables updated to price ${bulkResult.price}, deposit ${bulkResult.deposit}`);

  const checkT1 = getTableByNumber(1);
  const checkT50 = getTableByNumber(50);
  const checkT107 = getTableByNumber(107);

  console.log(`Check T1: Price = ${checkT1?.price}, Deposit = ${checkT1?.deposit_amount}`);
  console.log(`Check T50: Price = ${checkT50?.price}, Deposit = ${checkT50?.deposit_amount}`);
  console.log(`Check T107: Price = ${checkT107?.price}, Deposit = ${checkT107?.deposit_amount}`);

  if (checkT1?.price !== 3200 || checkT50?.price !== 3200 || checkT107?.price !== 3200) {
    throw new Error('Bulk update did not apply to all available tables properly');
  }
  console.log(' Bulk Update passed!');

  console.log('\n=== Cleanup: Resetting all tables back to standard 3,000 THB (Deposit 1,000 THB) ===');
  const resetResult = updateAllAvailableTablesPrice(3000, 1000);
  console.log(`Reset ${resetResult.updated_count} tables back to 3,000 THB.`);

  console.log('\n ALL TABLE PRICING TESTS PASSED (100%)');
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
