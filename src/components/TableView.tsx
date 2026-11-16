'use client';

import React, { useState, useMemo } from 'react';
import { TableItem } from '@/lib/db';
import { formatThaiDateTime } from '@/lib/date';
import { 
  Search, 
  Filter, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ArrowRight,
  Trash2,
  Edit3
} from 'lucide-react';

interface TableViewProps {
  tables: TableItem[];
  onSelectTable: (table: TableItem) => void;
  onDeleteReservation?: (reservationId: number, tableNumber: number) => void;
  searchQuery: string;
}

export default function TableView({
  tables,
  onSelectTable,
  onDeleteReservation,
  searchQuery
}: TableViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'RESERVED' | 'PAID'>('ALL');
  const [rowFilter, setRowFilter] = useState<string>('ALL');

  // Extract unique rows
  const availableRows = useMemo(() => {
    const rows = new Set(tables.map(t => t.row_label));
    return Array.from(rows).sort();
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      // Status filter
      if (statusFilter !== 'ALL' && table.status !== statusFilter) {
        return false;
      }
      // Row filter
      if (rowFilter !== 'ALL' && table.row_label !== rowFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = table.table_number.toString().includes(q);
        const matchesBooker = table.booker_name && table.booker_name.toLowerCase().includes(q);
        const matchesBatch = table.booker_batch && table.booker_batch.toLowerCase().includes(q);
        const matchesPhone = table.booker_phone && table.booker_phone.includes(q);
        if (!matchesNum && !matchesBooker && !matchesBatch && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [tables, statusFilter, rowFilter, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({tables.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('AVAILABLE')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'AVAILABLE'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            🟢 โต๊ะว่าง ({tables.filter(t => t.status === 'AVAILABLE').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('RESERVED')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'RESERVED'
                ? 'bg-amber-500 text-white font-semibold'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            🟡 มัดจำแล้ว ({tables.filter(t => t.status === 'RESERVED').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'PAID'
                ? 'bg-rose-600 text-white font-semibold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            🔴 ชำระครบแล้ว ({tables.filter(t => t.status === 'PAID').length})
          </button>
        </div>

        {/* Row Filter Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">กรองแถว:</span>
          <select
            value={rowFilter}
            onChange={(e) => setRowFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกแถว (A - M)</option>
            {availableRows.map(row => (
              <option key={row} value={row}>
                แถว {row}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredTables.map(table => {
          const isAvailable = table.status === 'AVAILABLE';
          const isPaid = table.status === 'PAID';

          return (
            <div
              key={table.table_number}
              onClick={() => onSelectTable(table)}
              className={`group bg-white p-4 rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between ${
                isAvailable
                  ? 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/20'
                  : isPaid
                  ? 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/20'
                  : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {table.table_number}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        โต๊ะหมายเลข {table.table_number}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        แถว {table.row_label} • {table.capacity} ที่นั่ง
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : isPaid
                        ? 'bg-rose-100 text-rose-800'
                        : table.payment_status === 'unpaid'
                        ? 'bg-slate-200 text-slate-800 border border-slate-300'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isAvailable 
                      ? 'ว่าง' 
                      : isPaid 
                      ? 'ชำระครบ' 
                      : table.payment_status === 'unpaid'
                      ? 'จอง (ยังไม่มัดจำ)'
                      : 'มัดจำแล้ว'}
                  </span>
                </div>

                {/* Reservation Details */}
                {!isAvailable && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>ผู้จอง:</span>
                      <strong className="text-slate-800 font-semibold">{table.booker_name}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>เบอร์โทร:</span>
                      <span className="text-slate-800 font-medium">{table.booker_phone}</span>
                    </div>
                    {table.booker_batch && (
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>รุ่น/ห้อง:</span>
                        <span>{table.booker_batch}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>ยอดชำระแล้ว:</span>
                      <span className="font-semibold text-emerald-600">
                        {(table.deposit_paid || 0).toLocaleString()} บ.
                      </span>
                    </div>
                    {table.created_at && (
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>วันที่จอง:</span>
                        <span className="text-blue-900 font-medium">
                          {formatThaiDateTime(table.created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Button */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">
                  {table.price.toLocaleString()} บาท
                </span>

                <div className="flex items-center gap-1.5">
                  {!isAvailable && table.reservation_id && onDeleteReservation && (
                    <button
                      type="button"
                      title="ลบ / ยกเลิกการจองโต๊ะนี้"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReservation(table.reservation_id!, table.table_number);
                      }}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <span className="text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {isAvailable ? 'จองโต๊ะนี้' : 'ดู / แก้ไข'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <p className="text-slate-500 text-sm">ไม่พบโต๊ะที่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      )}
    </div>
  );
}
