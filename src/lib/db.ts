import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import seedData from '@/data/tables_seed.json';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'reunion.db');

// Password hashing helper using Node.js crypto
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Global DB instance for Next.js hot-reloading
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  // Create tables schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER UNIQUE NOT NULL,
      row_label TEXT NOT NULL,
      col_index REAL NOT NULL,
      x_px REAL NOT NULL,
      y_px REAL NOT NULL,
      x_percent REAL NOT NULL,
      y_percent REAL NOT NULL,
      price INTEGER NOT NULL DEFAULT 3000,
      deposit_amount INTEGER NOT NULL DEFAULT 1000,
      capacity INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      zone TEXT NOT NULL DEFAULT 'NORMAL',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      booker_name TEXT NOT NULL,
      booker_phone TEXT NOT NULL,
      booker_batch TEXT,
      note TEXT,
      total_price INTEGER NOT NULL,
      deposit_required INTEGER NOT NULL,
      deposit_paid INTEGER NOT NULL DEFAULT 0,
      remaining_balance INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      slip_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Check if tables need seeding
  const countRow = db.prepare('SELECT COUNT(*) as count FROM tables').get() as { count: number };
  if (countRow.count === 0) {
    const insertTable = db.prepare(`
      INSERT INTO tables (
        table_number, row_label, col_index, x_px, y_px, x_percent, y_percent,
        price, deposit_amount, capacity, status, zone, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const t of seedData) {
      insertTable.run(
        t.table_number,
        t.row_label,
        t.col_index,
        t.x_px,
        t.y_px,
        t.x_percent,
        t.y_percent,
        t.price,
        t.deposit_amount,
        t.capacity,
        t.status,
        t.zone,
        now
      );
    }
  }

  // Check if admin user exists and ensure password is updated to 'RB@100'
  const adminUser = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin') as any;
  const adminPasswordHash = hashPassword('RB@100');

  if (!adminUser) {
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (username, password_hash, display_name, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertAdmin.run('admin', adminPasswordHash, 'ผู้ดูแลระบบ (Admin)', 'admin', new Date().toISOString());
  } else {
    // Automatically update existing admin user password to RB@100
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(adminPasswordHash, 'admin');
  }

  // Seed default settings if missing
  const defaultSettings: Record<string, string> = {
    event_title: 'งานเลี้ยงรุ่นคืนสู่เหย้า ประจำปี',
    event_subtitle: 'ผังโต๊ะและการจองโต๊ะเข้าร่วมงาน',
    table_default_price: '3000',
    table_default_deposit: '1000',
    promptpay_number: '0812345678',
    promptpay_name: 'บัญชีจัดงานเลี้ยงรุ่น',
    line_channel_access_token: '',
    line_group_id: '',
    line_notify_enabled: 'false'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }
}

// Data types
export interface TableItem {
  id: number;
  table_number: number;
  row_label: string;
  col_index: number;
  x_px: number;
  y_px: number;
  x_percent: number;
  y_percent: number;
  price: number;
  deposit_amount: number;
  capacity: number;
  status: 'AVAILABLE' | 'RESERVED' | 'PAID' | 'LOCKED';
  zone: string;
  updated_at: string;
  // Joined reservation details if reserved
  reservation_id?: number | null;
  booker_name?: string | null;
  booker_phone?: string | null;
  booker_batch?: string | null;
  note?: string | null;
  payment_status?: 'unpaid' | 'deposit_paid' | 'fully_paid' | null;
  deposit_paid?: number | null;
  remaining_balance?: number | null;
  slip_url?: string | null;
  created_at?: string | null;
}

export interface ReservationItem {
  id: number;
  table_id: number;
  table_number: number;
  booker_name: string;
  booker_phone: string;
  booker_batch: string | null;
  note: string | null;
  total_price: number;
  deposit_required: number;
  deposit_paid: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'deposit_paid' | 'fully_paid';
  slip_url: string | null;
  created_at: string;
  updated_at: string;
}

export function getAllTables(): TableItem[] {
  const db = getDb();
  const query = `
    SELECT 
      t.*,
      r.id AS reservation_id,
      r.booker_name,
      r.booker_phone,
      r.booker_batch,
      r.note,
      r.payment_status,
      r.deposit_paid,
      r.remaining_balance,
      r.slip_url,
      r.created_at
    FROM tables t
    LEFT JOIN reservations r ON t.id = r.table_id
    ORDER BY t.table_number ASC
  `;
  return db.prepare(query).all() as unknown as TableItem[];
}

export function getTableByNumber(tableNumber: number): TableItem | null {
  const db = getDb();
  const query = `
    SELECT 
      t.*,
      r.id AS reservation_id,
      r.booker_name,
      r.booker_phone,
      r.booker_batch,
      r.note,
      r.payment_status,
      r.deposit_paid,
      r.remaining_balance,
      r.slip_url,
      r.created_at
    FROM tables t
    LEFT JOIN reservations r ON t.id = r.table_id
    WHERE t.table_number = ?
  `;
  const result = db.prepare(query).get(tableNumber);
  return (result as unknown as TableItem) || null;
}

export function createReservation(data: {
  table_number: number;
  booker_name: string;
  booker_phone: string;
  booker_batch?: string;
  note?: string;
  payment_status?: 'unpaid' | 'deposit_paid' | 'fully_paid';
  deposit_amount?: number;
  deposit_paid?: number;
  remaining_balance?: number;
  slip_url?: string;
}) {
  const db = getDb();
  const table = getTableByNumber(data.table_number);
  if (!table) {
    throw new Error(`ไม่พบโต๊ะหมายเลข ${data.table_number}`);
  }
  if (table.status !== 'AVAILABLE') {
    throw new Error(`โต๊ะหมายเลข ${data.table_number} ถูกจองแล้วหรือไม่อยู่ในสถานะเปิดจอง`);
  }

  const now = new Date().toISOString();
  const paymentStatus = data.payment_status || 'unpaid';
  const totalPrice = table.price;
  
  // Customizable deposit amount: use provided deposit_amount if specified and > 0
  const depositRequired = (data.deposit_amount !== undefined && data.deposit_amount > 0)
    ? Math.min(data.deposit_amount, totalPrice)
    : table.deposit_amount;
  
  let depositPaid = data.deposit_paid || 0;
  let remainingBalance = totalPrice - depositPaid;

  if (paymentStatus === 'deposit_paid' && depositPaid === 0) {
    depositPaid = depositRequired;
    remainingBalance = totalPrice - depositPaid;
  } else if (paymentStatus === 'fully_paid') {
    depositPaid = totalPrice;
    remainingBalance = 0;
  }

  // Determine table status
  let newTableStatus: 'RESERVED' | 'PAID' = 'RESERVED';
  if (paymentStatus === 'fully_paid') {
    newTableStatus = 'PAID';
  }

  // Use a transaction
  db.exec('BEGIN TRANSACTION');
  try {
    const insertRes = db.prepare(`
      INSERT INTO reservations (
        table_id, booker_name, booker_phone, booker_batch, note,
        total_price, deposit_required, deposit_paid, remaining_balance,
        payment_status, slip_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRes.run(
      table.id,
      data.booker_name,
      data.booker_phone,
      data.booker_batch || null,
      data.note || null,
      totalPrice,
      depositRequired,
      depositPaid,
      remainingBalance,
      paymentStatus,
      data.slip_url || null,
      now,
      now
    );

    const updateTable = db.prepare(`
      UPDATE tables SET status = ?, updated_at = ? WHERE id = ?
    `);
    updateTable.run(newTableStatus, now, table.id);

    // Log activity
    db.prepare(`
      INSERT INTO activity_logs (action, details, created_at)
      VALUES (?, ?, ?)
    `).run('RESERVATION_CREATED', `จองโต๊ะหมายเลข ${data.table_number} โดยคุณ ${data.booker_name} (${data.booker_phone})`, now);

    db.exec('COMMIT');
    return getTableByNumber(data.table_number);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function updatePaymentStatus(
  tableNumber: number,
  paymentStatus: 'unpaid' | 'deposit_paid' | 'fully_paid',
  options?: { depositPaid?: number; remainingBalance?: number; slipUrl?: string }
) {
  const db = getDb();
  const table = getTableByNumber(tableNumber);
  if (!table || !table.reservation_id) {
    throw new Error(`ไม่พบข้อมูลการจองของโต๊ะหมายเลข ${tableNumber}`);
  }

  const now = new Date().toISOString();
  let depositPaid = options?.depositPaid ?? table.deposit_paid ?? 0;
  let remaining = options?.remainingBalance ?? table.remaining_balance ?? table.price;

  if (paymentStatus === 'deposit_paid') {
    depositPaid = options?.depositPaid ?? table.deposit_amount;
    remaining = table.price - depositPaid;
  } else if (paymentStatus === 'fully_paid') {
    depositPaid = table.price;
    remaining = 0;
  } else if (paymentStatus === 'unpaid') {
    depositPaid = 0;
    remaining = table.price;
  }

  const tableStatus = paymentStatus === 'fully_paid' ? 'PAID' : 'RESERVED';

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare(`
      UPDATE reservations SET
        payment_status = ?,
        deposit_paid = ?,
        remaining_balance = ?,
        slip_url = COALESCE(?, slip_url),
        updated_at = ?
      WHERE id = ?
    `).run(paymentStatus, depositPaid, remaining, options?.slipUrl || null, now, table.reservation_id);

    db.prepare(`
      UPDATE tables SET status = ?, updated_at = ? WHERE id = ?
    `).run(tableStatus, now, table.id);

    db.prepare(`
      INSERT INTO activity_logs (action, details, created_at)
      VALUES (?, ?, ?)
    `).run('PAYMENT_UPDATED', `อัปเดตสถานะชำระเงินโต๊ะ ${tableNumber} เป็น ${paymentStatus}`, now);

    db.exec('COMMIT');
    return getTableByNumber(tableNumber);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function updateReservation(
  reservationId: number,
  data: {
    booker_name?: string;
    booker_phone?: string;
    booker_batch?: string;
    note?: string;
    target_table_number?: number;
  }
) {
  const db = getDb();
  const currentRes = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as any;
  if (!currentRes) {
    throw new Error('ไม่พบรายการจองนี้');
  }

  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION');
  try {
    if (data.target_table_number) {
      const targetTable = getTableByNumber(data.target_table_number);
      if (!targetTable) throw new Error(`ไม่พบโต๊ะเป้าหมาย ${data.target_table_number}`);
      if (targetTable.id !== currentRes.table_id && targetTable.status !== 'AVAILABLE') {
        throw new Error(`โต๊ะเป้าหมาย ${data.target_table_number} ไม่ว่าง`);
      }

      if (targetTable.id !== currentRes.table_id) {
        db.prepare("UPDATE tables SET status = 'AVAILABLE', updated_at = ? WHERE id = ?").run(now, currentRes.table_id);
        const newStatus = currentRes.payment_status === 'fully_paid' ? 'PAID' : 'RESERVED';
        db.prepare('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, targetTable.id);
        db.prepare('UPDATE reservations SET table_id = ? WHERE id = ?').run(targetTable.id, reservationId);
      }
    }

    db.prepare(`
      UPDATE reservations SET
        booker_name = COALESCE(?, booker_name),
        booker_phone = COALESCE(?, booker_phone),
        booker_batch = COALESCE(?, booker_batch),
        note = COALESCE(?, note),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.booker_name || null,
      data.booker_phone || null,
      data.booker_batch || null,
      data.note || null,
      now,
      reservationId
    );

    db.prepare(`
      INSERT INTO activity_logs (action, details, created_at)
      VALUES (?, ?, ?)
    `).run('RESERVATION_UPDATED', `แก้ไขข้อมูลการจอง #${reservationId}`, now);

    db.exec('COMMIT');
    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function updateTablePrice(
  tableNumber: number,
  price: number,
  depositAmount?: number
) {
  const db = getDb();
  const table = getTableByNumber(tableNumber);
  if (!table) {
    throw new Error(`ไม่พบโต๊ะหมายเลข ${tableNumber}`);
  }
  if (price <= 0) {
    throw new Error('ราคาโต๊ะต้องมากกว่า 0 บาท');
  }

  const now = new Date().toISOString();
  const deposit = depositAmount !== undefined && depositAmount > 0 
    ? Math.min(depositAmount, price) 
    : Math.min(table.deposit_amount, price);

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare(`
      UPDATE tables 
      SET price = ?, deposit_amount = ?, updated_at = ? 
      WHERE table_number = ?
    `).run(price, deposit, now, tableNumber);

    // If table is currently reserved, sync reservation total_price and remaining_balance
    if (table.reservation_id) {
      const paid = table.deposit_paid || 0;
      const remaining = Math.max(0, price - paid);
      db.prepare(`
        UPDATE reservations 
        SET total_price = ?, remaining_balance = ?, updated_at = ?
        WHERE id = ?
      `).run(price, remaining, now, table.reservation_id);
    }

    db.prepare(`
      INSERT INTO activity_logs (action, details, created_at)
      VALUES (?, ?, ?)
    `).run('TABLE_PRICE_UPDATED', `ปรับราคาโต๊ะ ${tableNumber} เป็น ${price} บาท (มัดจำ ${deposit} บาท)`, now);

    db.exec('COMMIT');
    return getTableByNumber(tableNumber);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function updateAllAvailableTablesPrice(
  price: number,
  defaultDeposit?: number
) {
  const db = getDb();
  if (price <= 0) {
    throw new Error('ราคาโต๊ะต้องมากกว่า 0 บาท');
  }

  const now = new Date().toISOString();
  const deposit = defaultDeposit !== undefined && defaultDeposit > 0
    ? Math.min(defaultDeposit, price)
    : Math.min(1000, price);

  db.exec('BEGIN TRANSACTION');
  try {
    const result = db.prepare(`
      UPDATE tables 
      SET price = ?, deposit_amount = ?, updated_at = ? 
      WHERE status = 'AVAILABLE'
    `).run(price, deposit, now);

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('table_default_price', String(price));
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('table_default_deposit', String(deposit));

    db.prepare(`
      INSERT INTO activity_logs (action, details, created_at)
      VALUES (?, ?, ?)
    `).run('BULK_TABLE_PRICE_UPDATED', `ปรับราคาโต๊ะว่างทั้งหมดเป็น ${price} บาท (มัดจำ ${deposit} บาท)`, now);

    db.exec('COMMIT');
    return {
      updated_count: (result as any).changes || 0,
      price,
      deposit
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function cancelReservation(reservationId: number) {
  const db = getDb();
  const currentRes = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as any;
  if (!currentRes) {
    throw new Error('ไม่พบรายการจองนี้');
  }

  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare("UPDATE tables SET status = 'AVAILABLE', updated_at = ? WHERE id = ?").run(now, currentRes.table_id);
    db.prepare('DELETE FROM reservations WHERE id = ?').run(reservationId);
    db.prepare(`
      INSERT INTO activity_logs (action, details, created_at)
      VALUES (?, ?, ?)
    `).run('RESERVATION_CANCELLED', `ยกเลิกการจอง #${reservationId}`, now);
    db.exec('COMMIT');
    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getDashboardStats() {
  const db = getDb();
  const totalTables = 107;
  
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM tables GROUP BY status
  `).all() as { status: string; count: number }[];

  const counts: Record<string, number> = {
    AVAILABLE: 0,
    RESERVED: 0,
    PAID: 0,
    LOCKED: 0
  };

  statusCounts.forEach(sc => {
    counts[sc.status] = sc.count;
  });

  const paymentStats = db.prepare(`
    SELECT 
      SUM(deposit_paid) as total_deposit_collected,
      SUM(remaining_balance) as total_remaining_balance,
      SUM(total_price) as total_booking_value
    FROM reservations
  `).get() as {
    total_deposit_collected: number | null;
    total_remaining_balance: number | null;
    total_booking_value: number | null;
  };

  return {
    total_tables: totalTables,
    available_tables: counts.AVAILABLE || 0,
    reserved_tables: counts.RESERVED || 0,
    paid_tables: counts.PAID || 0,
    locked_tables: counts.LOCKED || 0,
    total_deposit_collected: paymentStats?.total_deposit_collected || 0,
    total_remaining_balance: paymentStats?.total_remaining_balance || 0,
    total_booking_value: paymentStats?.total_booking_value || 0
  };
}

export function getSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

export function updateSetting(key: string, value: string) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getActivityLogs(limit = 50) {
  const db = getDb();
  return db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?').all(limit);
}
