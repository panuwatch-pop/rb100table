'use client';

import React, { useState, useEffect } from 'react';
import { TableItem } from '@/lib/db';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  User, 
  DollarSign, 
  Download, 
  Settings, 
  Bell, 
  Send, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Table as TableIcon,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
  tables: TableItem[];
  stats: {
    total_tables: number;
    available_tables: number;
    reserved_tables: number;
    paid_tables: number;
    total_deposit_collected: number;
    total_remaining_balance: number;
    total_booking_value: number;
  };
  onSelectTableForEdit: (table: TableItem) => void;
  onRefreshData: () => void;
}

export default function AdminModal({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogout,
  tables,
  stats,
  onSelectTableForEdit,
  onRefreshData
}: AdminModalProps) {
  // Login Form
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<'reservations' | 'settings'>('reservations');

  // Settings Form State
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lineTestLoading, setLineTestLoading] = useState(false);
  const [bulkPriceLoading, setBulkPriceLoading] = useState(false);

  // Filter reservations & tables
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [tableFilterMode, setTableFilterMode] = useState<'reserved' | 'all'>('reserved');

  // Fetch settings when logged in and tab is active
  useEffect(() => {
    if (isAdmin && isOpen) {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setSettings(data.settings);
          }
        })
        .catch(console.error);
    }
  }, [isAdmin, isOpen]);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');

      setPassword('');
      onLoginSuccess();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    onLogout();
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSettingsMsg({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว!' });
      onRefreshData();
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message });
    } finally {
      setSettingsLoading(false);
    }
  };

  // Test LINE Connection
  const handleTestLine = async () => {
    setLineTestLoading(true);
    setSettingsMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_line' })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSettingsMsg({ type: 'success', text: data.message || 'ส่งข้อความทดสอบเข้ากลุ่ม LINE สำเร็จแล้ว! 🎉' });
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message });
    } finally {
      setLineTestLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'หมายเลขโต๊ะ',
      'แถว',
      'สถานะ',
      'ชื่อผู้จอง',
      'เบอร์โทร',
      'รุ่น/ห้อง',
      'ยอดค่าโต๊ะ',
      'มัดจำที่ชำระแล้ว',
      'คงเหลือค้างชำระ',
      'สถานะการชำระ',
      'หมายเหตุ',
      'วันที่จอง'
    ];

    const rows = tables.map(t => [
      t.table_number,
      t.row_label,
      t.status === 'PAID' ? 'ชำระครบ' : t.status === 'RESERVED' ? 'มัดจำแล้ว' : 'ว่าง',
      t.booker_name || '',
      t.booker_phone || '',
      t.booker_batch || '',
      t.price,
      t.deposit_paid || 0,
      t.remaining_balance || 0,
      t.payment_status || 'unpaid',
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.created_at || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานการจองโต๊ะ_งานเลี้ยงรุ่น_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk update table prices
  const handleBulkUpdatePrice = async () => {
    const price = Number(settings.table_default_price);
    const deposit = Number(settings.table_default_deposit);
    if (!price || price <= 0) {
      alert('กรุณาระบุราคาค่าโต๊ะที่มากกว่า 0 บาท');
      return;
    }
    if (!confirm(`คุณต้องการปรับราคาโต๊ะที่ "ว่าง" ทั้งหมด เป็น ${price.toLocaleString()} บาท (มัดจำ ${deposit.toLocaleString()} บาท) ใช่หรือไม่?`)) {
      return;
    }

    setBulkPriceLoading(true);
    setSettingsMsg(null);
    try {
      const res = await fetch('/api/admin/tables/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apply_to_all_available: true,
          price,
          deposit_amount: deposit
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSettingsMsg({ type: 'success', text: data.message });
      onRefreshData();
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message });
    } finally {
      setBulkPriceLoading(false);
    }
  };

  // Edit single table price
  const handleEditTablePrice = async (tableNumber: number, currentPrice: number, currentDeposit: number) => {
    const inputPrice = prompt(`กำหนดราคาใหม่สำหรับ โต๊ะ #${tableNumber} (บาท):`, String(currentPrice));
    if (inputPrice === null) return;
    const numPrice = parseInt(inputPrice, 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      alert('กรุณาระบุราคาตัวเลขที่มากกว่า 0 บาท');
      return;
    }

    const inputDeposit = prompt(`กำหนดค่ามัดจำสำหรับ โต๊ะ #${tableNumber} (บาท):`, String(currentDeposit));
    const numDeposit = inputDeposit ? parseInt(inputDeposit, 10) : undefined;

    try {
      const res = await fetch('/api/admin/tables/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: tableNumber,
          price: numPrice,
          deposit_amount: numDeposit
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert(data.message);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Cancel single reservation by Admin
  const handleCancelReservation = async (table: TableItem) => {
    if (!table.reservation_id) {
      alert(`ไม่พบรหัสการจองของโต๊ะ #${table.table_number}`);
      return;
    }

    const booker = table.booker_name ? `ของคุณ ${table.booker_name}` : '';
    if (!confirm(`คุณต้องการ "ยกเลิกการจอง" โต๊ะหมายเลข ${table.table_number} ${booker} ใช่หรือไม่?\n\nเมื่อยกเลิกแล้ว โต๊ะจะกลับมาเป็นสถานะ "ว่าง" ทันที`)) {
      return;
    }

    try {
      const res = await fetch(`/api/reservations/${table.reservation_id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'ยกเลิกการจองไม่สำเร็จ');

      alert(`ยกเลิกการจองโต๊ะหมายเลข ${table.table_number} เรียบร้อยแล้ว`);
      onRefreshData();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  const reservedTablesList = tables.filter(t => t.status !== 'AVAILABLE');
  const displayedTables = tableFilterMode === 'reserved' 
    ? reservedTablesList 
    : tables;

  const filteredReservations = displayedTables.filter(t => {
    if (!searchTableQuery) return true;
    const q = searchTableQuery.toLowerCase().trim();
    return (
      t.table_number.toString().includes(q) ||
      (t.booker_name && t.booker_name.toLowerCase().includes(q)) ||
      (t.booker_phone && t.booker_phone.includes(q)) ||
      (t.booker_batch && t.booker_batch.toLowerCase().includes(q)) ||
      (t.row_label && t.row_label.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">แผงควบคุมระบบจัดงาน (Admin Portal)</h2>
              <p className="text-xs text-slate-400">จัดการข้อมูลการจอง ยอดเงิน และการแจ้งเตือน LINE</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NOT LOGGED IN -> SHOW LOGIN FORM */}
        {!isAdmin ? (
          <div className="p-6 sm:p-8 max-w-md mx-auto w-full space-y-5 my-auto">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-200 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">เข้าสู่ระบบผู้ดูแล</h3>
              <p className="text-xs text-slate-500">สำหรับคณะกรรมการจัดงานเพื่อบริหารจัดการโต๊ะ</p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ใช้ (Username)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่าน (ค่าเริ่มต้น: admin1234)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">รหัสผ่านเริ่มต้นคือ: <code>admin1234</code></p>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                {loginLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>
        ) : (
          /* LOGGED IN DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stats Cards Row */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-[11px]">ยอดจองรวมทั้งงาน</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {stats.total_booking_value.toLocaleString()} บาท
                </div>
                <span className="text-[10px] text-slate-400">จองแล้ว {tables.length - stats.available_tables} / 107 โต๊ะ</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-[11px]">ยอดมัดจำที่เก็บได้</span>
                <div className="text-base font-bold text-emerald-600 mt-0.5">
                  {stats.total_deposit_collected.toLocaleString()} บาท
                </div>
                <span className="text-[10px] text-emerald-600">เงินสดพร้อมใช้งาน</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-[11px]">ยอดคงเหลือค้างเก็บ</span>
                <div className="text-base font-bold text-amber-600 mt-0.5">
                  {stats.total_remaining_balance.toLocaleString()} บาท
                </div>
                <span className="text-[10px] text-amber-600">รอเก็บหน้างาน/งวดสอง</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <span className="text-slate-500 text-[11px]">ดาวน์โหลดรายงาน</span>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel (CSV)</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('reservations')}
                  className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'reservations'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  <span>จัดการข้อมูลโต๊ะ ({displayedTables.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>ตั้งค่าราคาโต๊ะ & LINE Group</span>
                </button>
              </div>

              {activeTab === 'reservations' && (
                <div className="flex items-center gap-2 py-1.5">
                  {/* Filter Toggle: Reserved vs All */}
                  <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTableFilterMode('reserved')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        tableFilterMode === 'reserved'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      จองแล้ว ({reservedTablesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableFilterMode('all')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        tableFilterMode === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      โต๊ะทั้งหมด ({tables.length})
                    </button>
                  </div>

                  <div className="relative w-40 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTableQuery}
                      onChange={(e) => setSearchTableQuery(e.target.value)}
                      placeholder="ค้นหาผู้จอง / เบอร์ / โต๊ะ..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {activeTab === 'reservations' ? (
                /* TAB 1: RESERVATIONS & TABLES LIST */
                <div className="space-y-3">
                  {filteredReservations.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      ยังไม่มีรายการโต๊ะในระบบ หรือไม่ตรงกับคำค้นหา
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                            <th className="py-2.5 px-3">โต๊ะ</th>
                            <th className="py-2.5 px-3">สถานะ</th>
                            <th className="py-2.5 px-3">ราคาโต๊ะ</th>
                            <th className="py-2.5 px-3">ผู้จอง</th>
                            <th className="py-2.5 px-3">เบอร์โทร</th>
                            <th className="py-2.5 px-3">รุ่น/ห้อง</th>
                            <th className="py-2.5 px-3">ยอดชำระแล้ว</th>
                            <th className="py-2.5 px-3">คงเหลือ</th>
                            <th className="py-2.5 px-3 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredReservations.map(t => (
                            <tr key={t.table_number} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                #{t.table_number} <span className="text-slate-400 text-[10px]">({t.row_label})</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : t.payment_status === 'unpaid'
                                      ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                      : t.status === 'RESERVED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {t.status === 'PAID' 
                                    ? 'ชำระครบ' 
                                    : t.payment_status === 'unpaid'
                                    ? 'จอง (ยังไม่มัดจำ)'
                                    : t.status === 'RESERVED' 
                                    ? 'มัดจำแล้ว' 
                                    : '🟢 ว่าง'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-blue-950">
                                {(t.price || 3000).toLocaleString()} บ.
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {t.booker_name || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {t.booker_phone || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {t.booker_batch || '-'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-600">
                                {t.status !== 'AVAILABLE' ? `${(t.deposit_paid || 0).toLocaleString()} บ.` : '-'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-rose-600">
                                {t.status !== 'AVAILABLE' ? `${(t.remaining_balance || 0).toLocaleString()} บ.` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {/* Edit table price button */}
                                  <button
                                    type="button"
                                    onClick={() => handleEditTablePrice(t.table_number, t.price, t.deposit_amount)}
                                    title="ตั้งราคาโต๊ะนี้"
                                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[11px] transition-all cursor-pointer"
                                  >
                                    ✏️ ตั้งราคา
                                  </button>

                                  {/* If table is reserved, allow editing/moving booking & cancel */}
                                  {t.status !== 'AVAILABLE' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onSelectTableForEdit(t);
                                          onClose();
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition-all cursor-pointer"
                                      >
                                        แก้ไข / ย้าย
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelReservation(t)}
                                        title="ยกเลิกการจองโต๊ะนี้"
                                        className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-600" />
                                        <span>ยกเลิก</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: SETTINGS & LINE NOTIFICATION */
                <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-4 text-xs">
                  {settingsMsg && (
                    <div
                      className={`p-3 rounded-xl flex items-center gap-2 font-medium ${
                        settingsMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {settingsMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{settingsMsg.text}</span>
                    </div>
                  )}

                  {/* Section 1: Event Information */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">ชื่องานเลี้ยงและหัวเรื่อง</h4>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">ชื่องาน (Event Title)</label>
                      <input
                        type="text"
                        value={settings.event_title || ''}
                        onChange={(e) => setSettings({ ...settings, event_title: e.target.value })}
                        placeholder="เช่น งานเลี้ยงรุ่นคืนสู่เหย้า ประจำปี"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">คำบรรยาย / สถานที่จัดงาน (Event Subtitle)</label>
                      <input
                        type="text"
                        value={settings.event_subtitle || ''}
                        onChange={(e) => setSettings({ ...settings, event_subtitle: e.target.value })}
                        placeholder="เช่น School Reunion Table Reservation • รวม 107 โต๊ะ"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Section 2: PromptPay Settings */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">ข้อมูลการรับเงินพร้อมเพย์ (PromptPay QR)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          เบอร์โทรศัพท์ / เลขประจำตัวผู้เสียภาษี
                        </label>
                        <input
                          type="text"
                          value={settings.promptpay_number || ''}
                          onChange={(e) => setSettings({ ...settings, promptpay_number: e.target.value })}
                          placeholder="เช่น 0812345678"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">ชื่อบัญชี</label>
                        <input
                          type="text"
                          value={settings.promptpay_name || ''}
                          onChange={(e) => setSettings({ ...settings, promptpay_name: e.target.value })}
                          placeholder="เช่น คณะกรรมการจัดงานเลี้ยงรุ่น"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Table Pricing & Default Deposit Configuration */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      <h4 className="font-bold text-slate-900 text-sm">กำหนดราคาค่าโต๊ะและเงินมัดจำ (Table Pricing)</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      แอดมินสามารถตั้งราคาค่าโต๊ะมาตรฐาน และค่ามัดจำเริ่มต้นของระบบ รวมถึงสามารถกดปุ่มเพื่อปรับใช้ราคาใหม่นี้กับโต๊ะที่ยังว่างทั้งหมดในคราวเดียวได้ทันที
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          ราคาค่าโต๊ะมาตรฐาน (บาท)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={settings.table_default_price || '3000'}
                          onChange={(e) => setSettings({ ...settings, table_default_price: e.target.value })}
                          placeholder="เช่น 3000"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          ค่ามัดจำเริ่มต้นมาตรฐาน (บาท)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={settings.table_default_deposit || '1000'}
                          onChange={(e) => setSettings({ ...settings, table_default_deposit: e.target.value })}
                          placeholder="เช่น 1000"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-900 font-medium">
                        ต้องการปรับราคาให้โต๊ะว่างทั้งหมดในระบบ ({stats.available_tables} โต๊ะ) ตอนนี้เลยหรือไม่?
                      </span>
                      <button
                        type="button"
                        onClick={handleBulkUpdatePrice}
                        disabled={bulkPriceLoading}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${bulkPriceLoading ? 'animate-spin' : ''}`} />
                        <span>{bulkPriceLoading ? 'กำลังปรับราคา...' : '🔄 ปรับใช้กับโต๊ะว่างทั้งหมด'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 4: LINE Messaging API Notifications */}
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 text-sm">การแจ้งเตือนเข้า LINE Group อัตโนมัติ</h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.line_notify_enabled === 'true'}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              line_notify_enabled: e.target.checked ? 'true' : 'false'
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      ระบบจะส่งการ์ด Flex Message แจ้งเตือนเข้ากลุ่ม LINE ทันทีที่มีการจองโต๊ะใหม่ หรือมีการอัปเดตการชำระเงิน
                    </p>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Channel Access Token (จาก LINE Developers Console)
                      </label>
                      <input
                        type="password"
                        value={settings.line_channel_access_token || ''}
                        onChange={(e) => setSettings({ ...settings, line_channel_access_token: e.target.value })}
                        placeholder="วาง Channel Access Token ที่นี่..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Group ID (ไอดีกลุ่มไลน์ที่เชิญบอทเข้าไป)
                      </label>
                      <input
                        type="text"
                        value={settings.line_group_id || ''}
                        onChange={(e) => setSettings({ ...settings, line_group_id: e.target.value })}
                        placeholder="เช่น C1234567890abcdef..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleTestLine}
                        disabled={lineTestLoading}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{lineTestLoading ? 'กำลังส่ง...' : 'ทดสอบส่งการ์ดเข้ากลุ่ม LINE'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    {settingsLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
