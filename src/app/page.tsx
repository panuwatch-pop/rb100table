'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import FloorPlanViewer from '@/components/FloorPlanViewer';
import TableView from '@/components/TableView';
import BookingModal from '@/components/BookingModal';
import AdminModal from '@/components/AdminModal';
import ShirtShop from '@/components/ShirtShop';
import { TableItem } from '@/lib/db';
import initialSeedTables from '@/data/tables_seed.json';

export default function Home() {
  // Start with seed data so the page renders INSTANTLY (0ms latency, no spinner wait)
  const [tables, setTables] = useState<TableItem[]>(() => {
    return initialSeedTables.map(t => ({
      ...t,
      id: t.table_number,
      updated_at: new Date().toISOString()
    })) as TableItem[];
  });

  const [stats, setStats] = useState({
    total_tables: 107,
    available_tables: 107,
    reserved_tables: 0,
    paid_tables: 0,
    locked_tables: 0,
    total_deposit_collected: 0,
    total_remaining_balance: 0,
    total_booking_value: 0
  });

  const [settings, setSettings] = useState({
    event_title: 'งานเลี้ยงรุ่นคืนสู่เหย้า ประจำปี',
    event_subtitle: 'ผังโต๊ะและการจองโต๊ะเข้าร่วมงาน',
    promptpay_number: '0812345678',
    promptpay_name: 'บัญชีจัดงานเลี้ยงรุ่น',
    promptpay_bank: 'ธนาคารกรุงไทย',
    promptpay_qr_image: '/krungthai_qr.jpg',
    table_default_price: 3000,
    table_default_deposit: 1000
  });

  const [viewMode, setViewMode] = useState<'map' | 'list' | 'shirts'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep a ref to the current tables and selectedTable to avoid unnecessary state updates
  const tablesRef = useRef<TableItem[]>(tables);
  tablesRef.current = tables;

  const selectedTableRef = useRef<TableItem | null>(null);
  selectedTableRef.current = selectedTable;

  // Fetch data with cache-busting timestamp & smart diffing
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      // Add timestamp to strictly prevent browser caching
      const res = await fetch(`/api/tables?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newTables: TableItem[] = json.data.tables;
        const currentTables = tablesRef.current;

        // Fast diff check: did any table change status, booker, or payment?
        let hasAnyTableChange = newTables.length !== currentTables.length;
        if (!hasAnyTableChange) {
          for (let i = 0; i < newTables.length; i++) {
            const nt = newTables[i];
            const ot = currentTables[i];
            if (
              !ot ||
              nt.status !== ot.status ||
              nt.booker_name !== ot.booker_name ||
              nt.booker_phone !== ot.booker_phone ||
              nt.payment_status !== ot.payment_status ||
              nt.deposit_paid !== ot.deposit_paid ||
              nt.remaining_balance !== ot.remaining_balance
            ) {
              hasAnyTableChange = true;
              break;
            }
          }
        }

        // Always update tables when there is a change or when requested explicitly (non-silent)
        if (hasAnyTableChange || !silent) {
          setTables(newTables);
          setStats(json.data.stats);
        }

        if (json.data.settings) {
          setSettings(prev => {
            if (prev.event_title !== json.data.settings.event_title || prev.promptpay_number !== json.data.settings.promptpay_number) {
              return json.data.settings;
            }
            return prev;
          });
        }

        // If a modal is open, update its table data
        const currentModalTable = selectedTableRef.current;
        if (currentModalTable) {
          const updated = newTables.find(t => t.table_number === currentModalTable.table_number);
          if (updated) {
            const tableChanged =
              updated.status !== currentModalTable.status ||
              updated.booker_name !== currentModalTable.booker_name ||
              updated.payment_status !== currentModalTable.payment_status ||
              updated.deposit_paid !== currentModalTable.deposit_paid;

            if (tableChanged) {
              setSelectedTable(updated);
            }
          }
        }
      }
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Check admin session
  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/check?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      setIsAdmin(json.authenticated);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // Initial load & Polling
  useEffect(() => {
    fetchData(true);
    checkAdmin();

    // Quiet background polling every 6 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchData, checkAdmin]);

  const availableTables = tables.filter(t => t.status === 'AVAILABLE');

  // Optimistic Delete Reservation Handler (Updates UI in 0ms, no refresh needed!)
  const handleDeleteReservation = async (reservationId: number, tableNumber: number) => {
    if (!confirm(`คุณต้องการยกเลิกและลบการจองโต๊ะหมายเลข ${tableNumber} ใช่หรือไม่?\n\nโต๊ะจะกลับมาเป็นสถานะ "ว่าง" ทันที`)) {
      return;
    }

    // 1. OPTIMISTIC UPDATE: Instantly change table to AVAILABLE in React state
    const previousTables = tablesRef.current;
    setTables(prev =>
      prev.map(t =>
        t.table_number === tableNumber
          ? {
              ...t,
              status: 'AVAILABLE',
              reservation_id: null,
              booker_name: null,
              booker_phone: null,
              booker_batch: null,
              note: null,
              payment_status: null,
              deposit_paid: 0,
              remaining_balance: 0,
              slip_url: null
            }
          : t
      )
    );

    setStats(prev => ({
      ...prev,
      available_tables: Math.min(107, prev.available_tables + 1),
      reserved_tables: Math.max(0, prev.reserved_tables - 1)
    }));

    if (selectedTable?.table_number === tableNumber) {
      setSelectedTable(null);
    }

    // 2. Execute DELETE API request in background
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        // Rollback if failed
        setTables(previousTables);
        alert(data.error || 'ลบการจองไม่สำเร็จ');
      } else {
        // Sync fresh DB state quietly
        fetchData(true);
      }
    } catch (err: any) {
      // Rollback if network failed
      setTables(previousTables);
      alert('เกิดข้อผิดพลาดในการลบการจอง: ' + err.message);
    }
  };

  // Optimistic Table Update handler when edited from modal
  const handleTableModified = (tableNumber: number, newStatus?: 'AVAILABLE' | 'RESERVED' | 'PAID') => {
    if (newStatus === 'AVAILABLE') {
      setTables(prev =>
        prev.map(t =>
          t.table_number === tableNumber
            ? {
                ...t,
                status: 'AVAILABLE',
                reservation_id: null,
                booker_name: null,
                booker_phone: null,
                booker_batch: null,
                note: null,
                payment_status: null,
                deposit_paid: 0,
                remaining_balance: 0,
                slip_url: null
              }
            : t
        )
      );
    }
    fetchData(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        stats={stats}
        eventTitle={settings.event_title}
        eventSubtitle={settings.event_subtitle}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAdmin={isAdmin}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onRefresh={() => fetchData(false)}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area - Renders immediately with zero delay */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {viewMode === 'map' && (
          <FloorPlanViewer
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={table => setSelectedTable(table)}
            searchQuery={searchQuery}
          />
        )}
        {viewMode === 'list' && (
          <TableView
            tables={tables}
            onSelectTable={table => setSelectedTable(table)}
            onDeleteReservation={handleDeleteReservation}
            searchQuery={searchQuery}
          />
        )}
        {viewMode === 'shirts' && (
          <ShirtShop onBackToMap={() => setViewMode('map')} />
        )}
      </main>

      {/* Booking / Details / Edit / Delete Modal */}
      {selectedTable && (
        <BookingModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onBookingSuccess={() => fetchData(false)}
          onDeleteSuccess={(tNum) => handleTableModified(tNum, 'AVAILABLE')}
          isAdmin={isAdmin}
          availableTables={availableTables}
          promptpayNumber={settings.promptpay_number}
          promptpayName={settings.promptpay_name}
          promptpayQrImage={settings.promptpay_qr_image}
          promptpayBank={settings.promptpay_bank}
        />
      )}

      {/* Admin Portal Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        onLoginSuccess={() => {
          checkAdmin();
          fetchData(false);
        }}
        onLogout={() => {
          checkAdmin();
          fetchData(false);
        }}
        tables={tables}
        stats={stats}
        onSelectTableForEdit={table => {
          setSelectedTable(table);
        }}
        onRefreshData={() => fetchData(false)}
      />
    </div>
  );
}
